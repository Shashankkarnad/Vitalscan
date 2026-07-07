"""Tier-1 personal-baseline multivariate anomaly detector (numpy only).

Walk-forward and strictly causal: every statistic used on day t is computed
from days before t. There is NO point adjustment anywhere in this module and
none may be added — alerts are scored on the exact day they fire.

Design:
- Rolling 42-day robust z per metric (median / MAD), contamination-controlled:
  days previously flagged as anomalous are excluded from baseline buffers.
- Mahalanobis combo distance over the standardized personal vector, with
  pairwise-complete shrinkage correlation, normalized by metric count so days
  with different coverage are comparable.
- Self-calibrating cutoff: median + K*MAD_sd of the user's own distance
  history, floored at (and warmed up with) a chi-square quantile
  (Wilson-Hilferty approximation).
- Direction gate: an alert requires >=1 metric in its *concerning* tail
  (low HRV/SpO2/sleep, high RHR/mean HR/breathing). Steps never alert alone.
"""
from datetime import date, timedelta

import numpy as np

METRICS = ['rhr', 'mean_hr', 'hrv', 'steps', 'sleep_hours', 'spo2', 'breathing']
# +1 = high is concerning, -1 = low is concerning, 0 = contextual only
DIRECTION = {'rhr': 1, 'mean_hr': 1, 'breathing': 1,
             'hrv': -1, 'spo2': -1, 'sleep_hours': -1, 'steps': 0}

Z_WINDOW = 42        # rolling baseline days
MIN_BASELINE = 10    # min clean samples for a per-metric z
MIN_COVERAGE = 4     # min metrics with a z for the combo check
COV_WINDOW = 120     # trailing clean z-rows for the correlation estimate
PAIR_MIN = 10        # min pairwise-complete obs for a correlation entry
SHRINKAGE = 0.30     # shrink correlation toward identity
EIG_FLOOR = 0.05     # eigenvalue floor (keeps the inverse sane)
GATE_Z = 2.0         # concerning-tail z that opens the direction gate
CONTAM_Z = 2.5       # concerning-tail z that marks a day contaminated
Z_CLIP = 6.0         # cap on |z| feeding the combo (a bigger daily-mean move
                     # is a data artifact, not physiology — don't let it
                     # dominate the Mahalanobis distance)
# Cutoff. The normalized distance sqrt(z'C^-1 z / k) is ~1 on a typical day
# (chi-square/k under the null), so a STATIONARY chi-square quantile is the
# natural cutoff — no history feedback. (An earlier median+K*MAD self-calibrated
# cutoff was tried and rejected: on real non-stationary personal data an early
# high-excursion cluster inflated the cutoff and silenced every later event.)
# A gentle personal adjustment nudges the cutoff by the robust *center* of the
# person's own distance distribution, so a chronically-variable body isn't
# spammed — but it uses the median (bulk), which a minority sick cluster can't
# run away with.
CUT_ZP = 3.6         # normal quantile ~p0.99984 for the base chi-square cutoff
CUT_PERSONAL = 0.5   # weight on (personal median distance - expected ~1)
HIST_MIN = 40        # distances needed before the personal nudge engages
EPISODE_GAP = 3      # merge alert days <= this many calendar days apart


def _wh_norm_dist(z_p, k):
    """Wilson-Hilferty: sqrt(chi2_quantile(p, k) / k) for normal quantile z_p."""
    a = 2.0 / (9.0 * k)
    return max(1.0 - a + z_p * np.sqrt(a), 0.0) ** 1.5


def _robust(vals):
    med = float(np.median(vals))
    mad = float(np.median(np.abs(vals - med)))
    return med, 1.4826 * mad


def _corr_inv(Z):
    """Shrunk pairwise-complete correlation inverse for z-history rows Z."""
    k = Z.shape[1]
    C = np.eye(k)
    for a in range(k):
        for b in range(a + 1, k):
            m = ~np.isnan(Z[:, a]) & ~np.isnan(Z[:, b])
            if m.sum() >= PAIR_MIN:
                va = Z[m, a] - Z[m, a].mean()
                vb = Z[m, b] - Z[m, b].mean()
                denom = np.sqrt((va * va).sum() * (vb * vb).sum())
                if denom > 0:
                    C[a, b] = C[b, a] = float((va * vb).sum() / denom)
    C = (1.0 - SHRINKAGE) * C + SHRINKAGE * np.eye(k)
    w, V = np.linalg.eigh(C)
    w = np.clip(w, EIG_FLOOR, None)
    return (V / w) @ V.T


def detect(combined):
    """Run the detector over full history.

    combined: {metric: {'YYYY-MM-DD': value}} — the trusted combined daily
    series from parser._build_v03_blocks (all history, not just the window).

    Returns dict with contiguous calendar 'dates' and aligned arrays:
      z[metric], dist, cutoff, alert, plus an 'alerts' list with per-alert
      contributors. Missing values are None — never treated as zero deviation.
    """
    metrics = [m for m in METRICS if combined.get(m)]
    all_days = sorted({d for m in metrics for d in combined[m]
                       if len(d) == 10})
    if not all_days:
        return {'dates': [], 'z': {}, 'dist': [], 'cutoff': [], 'alert': [],
                'alerts': [], 'metrics': metrics}

    d0 = date.fromisoformat(all_days[0])
    n = (date.fromisoformat(all_days[-1]) - d0).days + 1
    dates = [(d0 + timedelta(days=i)).isoformat() for i in range(n)]
    k = len(metrics)

    V = np.full((n, k), np.nan)          # raw values
    for j, m in enumerate(metrics):
        for d, v in combined[m].items():
            if len(d) == 10:
                V[(date.fromisoformat(d) - d0).days, j] = v

    Zm = np.full((n, k), np.nan)         # per-day robust z
    clean = np.ones(n, dtype=bool)       # contamination mask
    dist = [None] * n
    cutoff = [None] * n
    alert = [False] * n
    alerts = []
    dist_hist = []                       # distances on clean days

    for i in range(n):
        lo = max(0, i - Z_WINDOW)
        base_rows = np.arange(lo, i)
        base_rows = base_rows[clean[lo:i]]
        for j in range(k):
            v = V[i, j]
            if np.isnan(v):
                continue
            samples = V[base_rows, j]
            samples = samples[~np.isnan(samples)]
            if len(samples) < MIN_BASELINE:
                continue
            med, rsd = _robust(samples)
            if rsd <= 1e-9:
                continue
            Zm[i, j] = (v - med) / rsd

        present = ~np.isnan(Zm[i])
        pj = np.flatnonzero(present)
        ki = int(present.sum())
        # clipped z for the combo math — a spiky daily mean can't dominate
        zc = np.clip(Zm[i, present], -Z_CLIP, Z_CLIP)
        contaminated = any(
            DIRECTION[metrics[j]] * Zm[i, j] >= CONTAM_Z for j in pj)

        if ki >= MIN_COVERAGE:
            clo = max(0, i - COV_WINDOW)
            rows = np.arange(clo, i)
            rows = rows[clean[clo:i]]
            Zwin = np.clip(Zm[np.ix_(rows, pj)], -Z_CLIP, Z_CLIP)
            Cinv = _corr_inv(Zwin)
            d2 = float(zc @ Cinv @ zc)
            di = float(np.sqrt(max(d2, 0.0) / ki))
            dist[i] = di

            # Stationary chi-square cutoff, nudged by the person's own median
            # distance once enough history exists (median only — robust to a
            # minority sick cluster). Expected median under the null ~= 1.
            base = _wh_norm_dist(CUT_ZP, ki)
            if len(dist_hist) >= HIST_MIN:
                med_d = float(np.median(dist_hist))
                cut = base + CUT_PERSONAL * (med_d - 1.0)
            else:
                cut = base
            cutoff[i] = cut
            dist_hist.append(di)

            gate = [metrics[j] for j in pj
                    if DIRECTION[metrics[j]] * Zm[i, j] >= GATE_Z]
            if di > cut and gate:
                alert[i] = True
                contrib = (zc * (Cinv @ zc))
                total = contrib.sum() or 1.0
                order = np.argsort(-np.abs(zc))
                alerts.append({
                    'date': dates[i],
                    'dist': round(di, 2),
                    'cutoff': round(cut, 2),
                    'gate': gate,
                    'contributors': [{
                        'metric': metrics[pj[o]],
                        'z': round(float(Zm[i, pj[o]]), 2),
                        'share': round(float(contrib[o] / total), 2),
                    } for o in order[:3]],
                })

        if alert[i] or contaminated:
            clean[i] = False

    z_out = {m: [round(float(Zm[i, j]), 2) if not np.isnan(Zm[i, j]) else None
                 for i in range(n)]
             for j, m in enumerate(metrics)}
    episodes = _episodes(alerts)
    return {'dates': dates, 'z': z_out,
            'dist': [round(d, 2) if d is not None else None for d in dist],
            'cutoff': [round(c, 2) if c is not None else None for c in cutoff],
            'alert': alert, 'alerts': alerts, 'episodes': episodes,
            'metrics': metrics}


def _episodes(alerts):
    """Merge alert days <= EPISODE_GAP calendar days apart into episodes.

    An episode is the honest human unit: one sustained multi-day deviation, not
    N separate alarms. Each carries its peak (most-deviant) day + contributors.
    """
    eps = []
    for a in alerts:
        ad = date.fromisoformat(a['date'])
        if eps and (ad - date.fromisoformat(eps[-1][-1]['date'])).days <= EPISODE_GAP:
            eps[-1].append(a)
        else:
            eps.append([a])
    out = []
    for grp in eps:
        peak = max(grp, key=lambda a: a['dist'])
        out.append({
            'start': grp[0]['date'],
            'end': grp[-1]['date'],
            'days': len(grp),
            'peak_date': peak['date'],
            'peak_dist': peak['dist'],
            'gate': peak['gate'],
            'contributors': peak['contributors'],
        })
    return out
