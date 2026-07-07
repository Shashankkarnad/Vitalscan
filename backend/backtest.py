"""Honest offline backtest for the Tier-1 combo detector.

Usage: python backtest.py path/to/export.zip [--json out.json]

No point adjustment. Without labeled sick dates we CANNOT report
recall/sensitivity — only what is measurable: alert counts, the alert rate
(which, if the user was never sick, is the false-positive ceiling), and the
anatomy of each alert. If labeled sick dates are supplied later, add event
recall + lead time then — never fabricate labels.
"""
import json
import sys
from collections import Counter
from datetime import date

from parser import parse_export


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    zip_path = sys.argv[1]
    json_out = None
    if '--json' in sys.argv:
        json_out = sys.argv[sys.argv.index('--json') + 1]

    res = parse_export(zip_path)
    full = res['combo_full']
    dates, alerts = full['dates'], full['alerts']
    if not dates:
        print('No usable daily data.')
        sys.exit(1)

    evaluated = [i for i, d in enumerate(full['dist']) if d is not None]
    n_eval = len(evaluated)
    span_days = len(dates)
    months = span_days / 30.44
    eval_months = n_eval / 30.44 if n_eval else 0.0

    # Multivariate value = noise suppression. Count days where exactly one
    # metric was individually out (|z| >= 2) but the combo declined to alert
    # (coverage/distance/gate) — single-metric blips the combo filtered out.
    z = full['z']
    idx = {d: i for i, d in enumerate(dates)}
    alert_days = {a['date'] for a in alerts}
    single_out_total = 0
    single_out_suppressed = 0
    for i in evaluated:
        out = [m for m, zs in z.items()
               if zs[i] is not None and abs(zs[i]) >= 2.0]
        if len(out) == 1:
            single_out_total += 1
            if dates[i] not in alert_days:
                single_out_suppressed += 1

    top_metrics = Counter(a['contributors'][0]['metric']
                          for a in alerts if a['contributors'])

    print(f"VitalScan combo-detector backtest — no point adjustment")
    print(f"{'=' * 56}")
    print(f"History span      : {dates[0]} → {dates[-1]} ({span_days} days,"
          f" {months:.1f} months)")
    print(f"Days evaluated    : {n_eval} (had >= 4 metrics with a baseline)")
    print(f"Days not evaluable: {span_days - n_eval} (coverage/warmup gaps —"
          f" reported, not hidden)")
    print()
    episodes = full['episodes']
    print(f"Alert days        : {len(alerts)}")
    print(f"Episodes          : {len(episodes)} (alert days <= 3 apart merged"
          f" — one sustained deviation = one event)")
    print(f"Episode rate      : {len(episodes) / eval_months:.2f}/month over"
          f" the {eval_months:.1f} well-instrumented months  <-- honest headline")
    print(f"  (calendar-span rate {len(episodes) / months:.2f}/mo is diluted"
          f" by uninstrumented days; not the headline)")
    print(f"  If zero true events occurred, the episode rate IS the")
    print(f"  false-positive ceiling. Without labeled sick dates, recall is")
    print(f"  NOT measurable and is not reported.")
    print()
    print(f"Multivariate noise suppression:")
    print(f"  single-metric-out days (|z|>=2 on exactly one metric): "
          f"{single_out_total}")
    print(f"  of those, combo declined to alert (filtered as noise): "
          f"{single_out_suppressed}")
    if top_metrics:
        print(f"Top contributor across alerts: "
              + ', '.join(f'{m} x{c}' for m, c in top_metrics.most_common()))
    print()
    for e in episodes:
        contribs = ' · '.join(f"{c['metric']} z={c['z']:+.1f}"
                              for c in e['contributors'])
        span = e['start'] if e['days'] == 1 else f"{e['start']}→{e['end']}"
        print(f"  {span}  ({e['days']}d)  peak dist {e['peak_dist']:.2f}"
              f"  gate={','.join(e['gate'])}  [{contribs}]")

    if json_out:
        with open(json_out, 'w') as f:
            json.dump({
                'span': [dates[0], dates[-1]],
                'days': span_days, 'evaluated': n_eval,
                'alert_days': len(alerts),
                'episodes_total': len(episodes),
                'episodes_per_eval_month': round(len(episodes) / eval_months, 2)
                if eval_months else None,
                'episodes': episodes,
                'single_metric_days': single_out_total,
                'single_metric_suppressed': single_out_suppressed,
                'alerts': alerts,
                'note': 'no point adjustment; recall not measurable without labels',
            }, f, indent=2)
        print(f"\nWrote {json_out}")


if __name__ == '__main__':
    main()
