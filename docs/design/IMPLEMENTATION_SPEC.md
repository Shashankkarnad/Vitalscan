# VitalScan redesign — implementation spec

Source of truth for visuals: `docs/design/VitalScan.dc.html` (Claude Design export).
Target: `frontend-next/` (Next.js App Router). Replace the current page UI with this design, wired to the real backend.

## Design language (fixed — do not restyle)

- Surface `#0a0a10`, ink `#e8eaf2`, cards `rgba(255,255,255,.03)` with `1px rgba(255,255,255,.08)` border, radius 16–18px, inset top highlight + soft drop shadow (copy exact values from the design file).
- Fonts: Space Grotesk (display/h1), IBM Plex Sans (body), IBM Plex Mono (labels, numbers, badges). Load via `next/font/google`.
- Series colors: coral `#ff5b46` (cardiac), teal `#34d6c0` (recovery/good), amber `#f3b13e` (activity/watching), blue `#6c8cff` (sleep), slate `#98a2b8` (neutral/data-gap/suppressed).
  - Palette validated on the dark surface: CVD ΔE 40.1, contrast ≥3:1 — PASS. Constraint that keeps it legal: **every chart is single-series with a direct label; never encode identity by color alone.** Status words always accompany status dots.
- `rise` keyframe entrance animation with staggered delays; respect `prefers-reduced-motion`.
- All text wears ink tokens (`#e8eaf2` at various opacities), never the series color — colored dots/badges carry identity.

## Architecture

- Port the design's 5 views as routes (or a single client view-switcher matching the design's nav — routes preferred for URL addressability): `/` (Home), `/dashboard`, `/evidence`, `/instruments`, `/audit`.
- The design's `data()`/`renderVals()` logic in the `<script type="text/x-dc">` block is the reference implementation of all derived values (bands, z-scores, status words, findings shape, nav states, chart path building). Re-implement it in TypeScript against REAL backend data — do not keep its synthetic generators (`rng`, hardcoded `sick`/`trav` events, fake trust tables).
- Chart rendering: keep the design's custom-SVG approach for the band timelines (the `chart()` function, `docs/design/VitalScan.dc.html:391-422`, is the exact geometry spec: W×H, padding PL46/PR14/PT16/PB22, band polygon, gap rects, ref lines, outlier dots, month ticks). Build it as a reusable `<BandChart>` React component that takes `{ values: (number|null)[], dates: Date[], lo, hi, color, ref?, annotations?, gapFrom?, fmt }`.
- Personal-normal band: rolling 60-day median ± 2 robust SD (MAD-based) per metric, computed from real data (see data mapping section). The design's `lo0/hi0` static band is a placeholder for this.
- Status logic (from the design): z vs personal band → `In range` / `Watching` (|z| ≥ 2 with corroboration logic) / `Data gap` (no samples ≥ 7 days). Findings/audit entries derive from these rules.

## Screens

1. **Home** (`data-screen-label="Home — weekly note"`, design lines 37–121): week label, verdict h1 + sub, SYSTEMS grid of 4 category cards (CARDIAC→rhr+mhr, RECOVERY→hrv+br+spo2, ACTIVITY→steps, SLEEP→sleep) each with status pill, mini band-sparkline, metric rows; FINDINGS cards (expandable: evidence chart + mono key-value rationale box); STEADY footer line + next-note note.
2. **Dashboard** (lines 123–221): 7 metric tiles (name, status dot, big current value + unit, sparkline, status word, z text) linking to Evidence; Instruments tile with per-source grades; hero resting-HR chart (620×210) with annotations + distrusted-source dashed overlay if applicable; Recent decisions list → audit link.
3. **Evidence** (lines 223–278): full-width 90-day `BandChart` per metric (940×176) with band, outlier dots, NO DATA gap rect, 7h reference line for sleep, month ticks, per-chart note.
4. **Instruments** (lines 280–312): per-source cards, per-metric rows (dot, metric, r/coverage, grade pill TRUSTED/PARTIAL/DISTRUST/UNGRADED, note), methodology footer.
5. **Audit log** (lines 314–350): dated entries (signal, title, badge ESCALATED/SUPPRESSED/RESOLVED/SOURCE DISTRUSTED, mono key-value rationale box).

## Charts per vital section (MOST IMPORTANT user requirement)

Each vital section carries its domain-appropriate visualization, not just a generic line:

- **SLEEP** → the **sleep hypnogram** (stage-step chart of last night: Awake/REM/Core/Deep lanes over time) alongside the 90-day sleep-duration band chart. Hypnogram styling: blue family on the dark surface, stage lanes labeled in IBM Plex Mono, ≥2px step lines / lane blocks with 2px surface gaps; direct lane labels (never color-alone). Reuse/adapt the existing hypnogram component if one exists (audit will confirm).
- **CARDIAC** → resting-HR 90-day band timeline (hero) + mean-HR timeline.
- **RECOVERY** → morning-HRV band timeline; breathing rate + SpO2 timelines.
- **ACTIVITY** → steps as a band timeline (or bars if daily totals read better — keep marks thin, 4px rounded ends, baseline-anchored).
- Sparklines on tiles/cards are miniature versions of the same section chart (same color, band + line only).
- Every full-size chart gets a hover layer: crosshair + tooltip showing date, value, band range, z — per-mark tooltip on hypnogram blocks. Sparklines are exempt.

## Data mapping (from backend audit)

Backend today: single `POST /analyze` (multipart zip) → JSON compiled in `backend/parser.py:_compile_output` (343–531), no persistence; frontend stores the JSON in sessionStorage (`lib/store.ts`, key `vitalscan_result`). API URL hardcoded at `frontend-next/lib/utils.ts:72`. Existing per-day data: HRV (`hrv_dates`/`hrv_values`), steps (`steps_daily`), sleep (`sleep_nights`, hypnogram `sleep_timeline` last 14 nights). RHR/SpO2/mean-HR are monthly-only today; breathing rate is not parsed at all.

### New response contract (version bump → "0.3"; ALL existing fields kept unchanged for the old pages)

```jsonc
{
  // ... all existing 0.2 fields unchanged ...
  "daily": {
    "dates": ["YYYY-MM-DD"],          // last 90 calendar days ending at the last day with any data
    "rhr": [62.1, null],              // per-day resting HR (HKQuantityTypeIdentifierRestingHeartRate, daily mean)
    "mean_hr": [], "hrv": [], "steps": [], "sleep_hours": [], "spo2": [],
    "breathing": []                    // NEW: parse HKQuantityTypeIdentifierRespiratoryRate, daily mean
  },                                   // every array aligned to dates, null = no samples that day
  "bands": {                           // one entry per metric key above (7 keys)
    "rhr": {
      "lo": [], "hi": [],             // aligned to daily.dates; rolling 60-day window ending that day:
                                       // median ± 2 * 1.4826 * MAD; null until window has ≥14 samples
      "current": 61.0, "z": 0.4,      // latest non-null value; z = (current − median60) / robustSD (null if no data)
      "status": "in_range",           // "in_range" | "watching" (|z|≥2) | "data_gap" (gap_days≥7) | "no_data" (never seen)
      "gap_days": 0, "last_sample": "YYYY-MM-DD"
    }
  },
  "sources": [{                        // NEW: emit per-source summary (sourceName is currently discarded)
    "name": "Apple Watch",
    "role": "reference",              // source with most heart-metric coverage = "reference"; others "secondary"
    "metrics": [{ "metric": "rhr", "coverage_pct": 98, "shared_days": 54, "r": -0.26,
                  "grade": "DISTRUST",  // r≥0.70 TRUSTED · 0.40–0.69 PARTIAL · <0.40 DISTRUST · shared_days<15 UNGRADED
                  "note": "anticorrelated with reference" }]
  }],
  "decisions": [{                      // NEW: audit-log engine over the last 90 days, newest first
    "date": "YYYY-MM-DD", "signal": "Steps · Apple Watch", "metric": "steps",
    "title": "Step count 3.2 SD below band",
    "badge": "WATCHING",               // "WATCHING" | "ATTENTION" | "DATA_GAP" | "SUPPRESSED" | "RESOLVED" | "SOURCE_DISTRUSTED"
    "suppressed": false,
    "lines": [{ "k": "value", "v": "2,104 · 60-day median 11,480 · z = −3.2 · threshold ±2.0" }]
  }],
  "weekly": {                          // NEW: verdict inputs for Home (frontend composes the copy)
    "label": "Week of 29 Jun – 5 Jul 2026", "records_read": 731204,
    "in_band": ["rhr","hrv"], "watching": ["steps"], "gaps": ["sleep_hours"], "no_data": ["breathing"]
  }
}
```

Decision-engine rules (backend, documented in code): escalate WATCHING when |z|≥2 on one signal; ATTENTION when ≥2 related signals cross ±2 the same day or a signal stays out 3+ consecutive days; SUPPRESSED when a single signal crosses for a single day with no corroboration (logged, `suppressed:true`); DATA_GAP when gap_days≥7; RESOLVED when a previously escalated metric is back in band 3 consecutive days; SOURCE_DISTRUSTED when a source-metric grade computes < 0.40. Corroboration values (wear-time proxies, other signals' z) go in `lines`.

### Screen → data

- Home: `weekly` → label/verdict; category cards CARDIAC(rhr, mean_hr) / RECOVERY(hrv, breathing, spo2) / ACTIVITY(steps) / SLEEP(sleep_hours) from `bands` + `daily` sparklines; findings = non-suppressed `decisions` with badge WATCHING/ATTENTION/DATA_GAP that are still active (no later RESOLVED for that metric).
- Dashboard: 7 tiles from `bands[k].current/z/status` + `daily` sparklines; hero = rhr BandChart; recent decisions = `decisions[0..3]`; instruments tile = `sources` grades.
- Evidence: BandChart per metric from `daily` + `bands` (lo/hi arrays are the shaded band; dots where value outside band; NO DATA rect from trailing nulls; sleep chart gets `ref: 7`h line).
- Instruments: `sources`. Audit: `decisions` (with show-suppressed toggle). Metrics with `status:"no_data"` (e.g. breathing on exports without respiratory rate) render the tile/chart in slate with "no data" — never hide the section.
- Missing-field tolerance: frontend must treat `daily/bands/sources/decisions/weekly` as optional (old cached results in sessionStorage lack them → show an "re-upload to unlock" note on new screens).

### Flow

- `/` stays the upload screen; `/processing` now routes to `/home` on success (old `/verdict` + `/results` routes stay untouched and reachable).
- New routes share a layout with the design's mono nav: `/home`, `/dashboard`, `/evidence`, `/instruments`, `/audit`.

## Non-goals

- Do not redesign or restyle the design file's visuals.
- Do not keep the old UI pages alongside; this replaces the frontend-next UI (old components may be reused where they fit the new design).
- No new backend storage; extend existing FastAPI endpoints only if the audit shows a needed metric isn't exposed.
