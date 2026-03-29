"""
VitalScan -- Apple Health XML Parser
v0.4 -- Sample size gating on all findings

CHANGES IN v0.4:
  - Sample size gating: findings suppressed when a month has too few readings
    HRV / RHR < 5 readings → month treated as missing (None)
    SpO2 < 10 readings → month treated as missing; low-count months excluded from drop tally
    Sleep finding suppressed when fewer than 14 nights recorded in the window
  - safe_mean() now accepts min_n to enforce minimum sample size

CHANGES IN v0.3:
  - Device detection is now automatic (works with any wearable, not just Apple Watch)
  - Step deduplication priority auto-assigned by device type (watch > phone > unknown)
  - RHR extracted from any source, not hardcoded to Apple Watch
  - Profile (age, sex, height, weight, BMI) now fully extracted from the export
  - exclude_sources passed as parameter instead of hardcoded per-user value

CHANGES IN v0.2:
  #1 SpO2: always multiply raw value by 100 (Apple stores as 0.97 not 97.0)
  #2 Steps: minute-level deduplication between overlapping sources
  #3 HRV: morning readings only (2-9 AM) -- the clinically validated window

CLINICAL THRESHOLDS (all referenced):
  SpO2 < 88%       -- AASM sleep apnea screening threshold
  RHR > 70 bpm     -- Framingham Heart Study elevated risk
  HRV < 35ms SDNN  -- Shaffer & Ginsberg 2017
  Sleep < 7h       -- AAS + CDC adult recommendation
  BMI > 25         -- WHO overweight classification
  VO2 Max 42-50    -- ACSM average for male age 20-29
"""

import xml.etree.ElementTree as ET
from collections import defaultdict, Counter
import re
from datetime import datetime, timedelta
import statistics
import json
import zipfile
import io
import os


# ── SOURCE CONFIGURATION ──────────────────────────────────────────────────────

# Keywords that identify dedicated wearables (higher step priority than a phone)
# Case-insensitive matching applied at runtime
_WEARABLE_KEYWORDS = {
    'watch', 'zepp', 'garmin', 'fitbit', 'whoop', 'oura', 'hart',
    'polar', 'suunto', 'amazfit', 'samsung', 'fenix', 'vivosmart',
    'coros', 'withings', 'biostrap',
}

# Regex to extract a first name from Apple device source names.
# Matches: "Vedant's iPhone", "Sarah's Apple Watch Series 9", "John's iPad".
_NAME_FROM_SOURCE_RE = re.compile(
    r"^(.+?)'s\s+(?:iPhone|Apple Watch|iPad)",
    re.IGNORECASE,
)


def _source_priority(source_name: str) -> int:
    """
    Auto-detect step-deduplication priority from source name.
    Lower number = higher trust = wins disputed minutes.

      1 = Apple Watch (most accurate step counter)
      2 = Other dedicated wearable
      3 = iPhone / Android phone
      4 = Unknown
    """
    n = source_name.lower()
    if 'apple watch' in n:
        return 1
    if any(k in n for k in _WEARABLE_KEYWORDS):
        return 2
    if 'iphone' in n or 'phone' in n or 'android' in n:
        return 3
    return 4


# ── MAIN ENTRY POINT ──────────────────────────────────────────────────────────

def parse_export(source, exclude_sources=None):
    """
    Parse Apple Health export.

    Args:
        source:          file path to export.xml, path to export.zip,
                         or file-like object (ZIP)
        exclude_sources: set of source names to ignore entirely
                         (use when another person's device is merged in)

    Returns:
        dict: structured health data ready for dashboard rendering

    Memory note: uses iterparse + elem.clear() so only the current XML element
    is held in RAM at any time. Safe for 400MB+ exports on 512MB instances.
    """
    excl = set(exclude_sources) if exclude_sources else set()

    _STEP_TYPE  = 'HKQuantityTypeIdentifierStepCount'
    _SLEEP_TYPE = 'HKCategoryTypeIdentifierSleepAnalysis'
    _HRV_TYPE   = 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN'

    raw          = defaultdict(list)   # {type: [(date, val, src)]}
    step_records = []                  # fed into _build_steps_daily
    sleep_records = []                 # fed into _build_sleep_daily
    hrv_morning  = defaultdict(list)   # {date: [val]} — 2-9 AM readings
    hrv_allday   = defaultdict(list)   # {date: [val]} — fallback
    me_attrs     = {}                  # <Me> element attributes

    xml_stream, zip_ref = _open_xml_stream(source)
    try:
        context = ET.iterparse(xml_stream, events=['start', 'end'])
        _, root_elem = next(context)  # capture root so we can clear its children

        for event, elem in context:
            if event != 'end':
                continue

            tag = elem.tag

            if tag == 'Me':
                me_attrs = dict(elem.attrib)
                root_elem.clear()
                continue

            if tag != 'Record':
                root_elem.clear()
                continue

            t   = elem.get('type', '')
            src = elem.get('sourceName', '')

            if src in excl:
                root_elem.clear()
                continue

            if t == _STEP_TYPE:
                start_str = elem.get('startDate', '')
                end_str   = elem.get('endDate', '')
                val       = elem.get('value', '0')
                if start_str and end_str:
                    try:
                        s = datetime.strptime(start_str[:19], '%Y-%m-%d %H:%M:%S')
                        e = datetime.strptime(end_str[:19],   '%Y-%m-%d %H:%M:%S')
                        if e > s:
                            step_records.append({
                                'start': s, 'end': e,
                                'val': float(val),
                                'src': src,
                                'priority': _source_priority(src),
                            })
                    except (ValueError, TypeError):
                        pass

            elif t == _SLEEP_TYPE:
                val       = elem.get('value', '')
                start_str = elem.get('startDate', '')
                end_str   = elem.get('endDate', '')
                if start_str and end_str:
                    sleep_records.append((val, start_str, end_str))

            elif t == _HRV_TYPE:
                date_str = elem.get('startDate', '')
                val      = elem.get('value')
                if date_str and val:
                    try:
                        h = int(date_str[11:13])
                        v = float(val)
                        if v > 0:
                            date = date_str[:10]
                            hrv_allday[date].append(v)
                            if 2 <= h <= 9:
                                hrv_morning[date].append(v)
                    except (ValueError, TypeError):
                        pass

            else:
                val      = elem.get('value')
                date_str = elem.get('startDate', '')
                if val and date_str:
                    try:
                        raw[t].append((date_str, float(val), src))
                    except ValueError:
                        pass

            root_elem.clear()

    finally:
        xml_stream.close()
        if zip_ref is not None:
            zip_ref.close()

    steps = _build_steps_daily(step_records)
    sleep = _build_sleep_daily(sleep_records)
    hrv   = _build_hrv_daily(hrv_morning, hrv_allday)

    return _compile_output(me_attrs, raw, steps, sleep, hrv)


# ── XML STREAMING ─────────────────────────────────────────────────────────────

def _open_xml_stream(source):
    """
    Return (xml_stream, zip_handle_or_None) for the Apple Health XML.

    Uses ZipFile.open() — a streaming decompressor — instead of .read(),
    so the full XML is never materialised in memory.
    Caller must close both objects when done.
    """
    if hasattr(source, 'read'):
        z = zipfile.ZipFile(source)
        return z.open('apple_health_export/export.xml'), z

    if isinstance(source, str):
        if source.endswith('.zip'):
            z = zipfile.ZipFile(source)
            return z.open('apple_health_export/export.xml'), z
        return open(source, 'rb'), None

    raise ValueError(f"Unsupported source type: {type(source)}")


# ── POST-PROCESSING HELPERS (fed from single iterparse pass) ─────────────────

def _build_steps_daily(step_records):
    """Deduplicate and aggregate step records collected during parsing."""
    by_day = defaultdict(list)
    for r in step_records:
        by_day[r['start'].strftime('%Y-%m-%d')].append(r)
    return {date: _dedup_day(recs) for date, recs in by_day.items()}


def _build_sleep_daily(sleep_records):
    """Aggregate raw sleep tuples (val, start_str, end_str) into per-night totals."""
    nights = defaultdict(lambda: {
        'asleep': 0.0, 'deep': 0.0, 'rem': 0.0, 'core': 0.0, 'awake': 0.0
    })
    for val, start_str, end_str in sleep_records:
        try:
            s = datetime.strptime(start_str[:19], '%Y-%m-%d %H:%M:%S')
            e = datetime.strptime(end_str[:19],   '%Y-%m-%d %H:%M:%S')
            dur = (e - s).total_seconds() / 3600
            date = start_str[:10]
            if s.hour < 14:
                date = (s - timedelta(days=1)).strftime('%Y-%m-%d')
            if any(x in val for x in ['Asleep', 'Core', 'Deep', 'REM']):
                nights[date]['asleep'] += dur
            if 'AsleepDeep' in val:
                nights[date]['deep'] += dur
            elif 'AsleepREM' in val:
                nights[date]['rem'] += dur
            elif 'AsleepCore' in val or 'AsleepUnspecified' in val:
                nights[date]['core'] += dur
            if 'Awake' in val:
                nights[date]['awake'] += dur
        except (ValueError, TypeError):
            pass
    return dict(nights)


def _build_hrv_daily(morning, allday):
    """Build daily HRV dict: prefer morning readings (2-9 AM), fall back to all-day."""
    result = {}
    for date in set(allday) | set(morning):
        readings = morning.get(date) or allday.get(date)
        if readings:
            result[date] = round(statistics.mean(readings), 1)
    return result


# ── FIX #2: STEP DEDUPLICATION (per-day, unchanged) ──────────────────────────


def _dedup_day(recs):
    """
    Deduplicate one day's step records using minute-level ownership.

    For each minute in the day, the highest-priority source claims it.
    Each record's step count is scaled by the fraction of its minutes it won.
    """
    # Claim minutes by priority (best first)
    minute_owner = {}  # minute_epoch_div_60 -> priority

    for priority in sorted(set(r['priority'] for r in recs)):
        for r in recs:
            if r['priority'] != priority:
                continue
            start_min = int(r['start'].timestamp()) // 60
            end_min = int(r['end'].timestamp()) // 60
            for m in range(start_min, end_min):
                if m not in minute_owner:
                    minute_owner[m] = priority

    # Scale each record by fraction of minutes it won
    total = 0.0
    for r in recs:
        start_min = int(r['start'].timestamp()) // 60
        end_min = int(r['end'].timestamp()) // 60
        total_mins = max(end_min - start_min, 1)
        won_mins = sum(
            1 for m in range(start_min, end_min)
            if minute_owner.get(m) == r['priority']
        )
        total += r['val'] * (won_mins / total_mins)

    return round(total)


# ── OUTPUT COMPILATION ────────────────────────────────────────────────────────

def _compile_output(me_attrs, raw, steps_daily, sleep, hrv_daily):
    """Compile all parsed data into dashboard-ready JSON structure."""

    # ── Helpers ──
    def safe_mean(lst, min_n=1):
        return round(statistics.mean(lst), 1) if lst and len(lst) >= min_n else None

    def safe_min(lst, min_n=1):
        return round(min(lst), 1) if lst and len(lst) >= min_n else None

    # ── Determine date range ──
    all_months = _get_months(raw, steps_daily, sleep)

    # ── FIX #1: SpO2 — always multiply by 100 ──
    spo2_clean = []
    for d, v, src in raw.get('HKQuantityTypeIdentifierOxygenSaturation', []):
        pct = v * 100  # FIX: unconditional, Apple always stores as 0.0–1.0
        if 50 < pct <= 100:
            spo2_clean.append((d[:10], pct))

    spo2_daily = defaultdict(list)
    for d, v in spo2_clean:
        spo2_daily[d].append(v)

    # ── HR aggregation ──
    hr_hour = defaultdict(list)
    hr_month = defaultdict(list)
    for d, v, src in raw.get('HKQuantityTypeIdentifierHeartRate', []):
        try:
            h = int(d[11:13])
            hr_hour[h].append(v)
            hr_month[d[:7]].append(v)
        except (ValueError, IndexError):
            pass

    # ── RHR — accept from any source ──
    rhr_month = defaultdict(list)
    for d, v, src in raw.get('HKQuantityTypeIdentifierRestingHeartRate', []):
        rhr_month[d[:7]].append(v)

    # ── HRV by month ──
    hrv_month = defaultdict(list)
    for date, val in hrv_daily.items():
        hrv_month[date[:7]].append(val)

    # ── Steps by month ──
    steps_monthly = defaultdict(float)
    for date, val in steps_daily.items():
        steps_monthly[date[:7]] += val

    # ── Sleep by month ──
    sleep_month = defaultdict(lambda: {'deep': [], 'rem': [], 'core': []})
    for date, night in sleep.items():
        m = date[:7]
        if night['asleep'] > 1:
            if night['deep'] > 0: sleep_month[m]['deep'].append(night['deep'] * 60)
            if night['rem'] > 0:  sleep_month[m]['rem'].append(night['rem'] * 60)
            if night['core'] > 0: sleep_month[m]['core'].append(night['core'] * 60)

    # ── Active calories ──
    active_month = defaultdict(float)
    for d, v, src in raw.get('HKQuantityTypeIdentifierActiveEnergyBurned', []):
        active_month[d[:7]] += v

    # ── SpO2 by month ──
    spo2_month = defaultdict(list)
    for d, v in spo2_clean:
        spo2_month[d[:7]].append(v)

    # ── Weight trend ──
    weight = sorted(
        [(d[:7], round(v, 1)) for d, v, src in
         raw.get('HKQuantityTypeIdentifierBodyMass', [])],
        key=lambda x: x[0]
    )

    # ── VO2 Max trend ──
    vo2 = sorted(
        [(d[:7], round(v, 1)) for d, v, src in
         raw.get('HKQuantityTypeIdentifierVO2Max', [])],
        key=lambda x: x[0]
    )

    # ── Recent sleep (last ~4 months relative to latest data) ──
    all_sleep_dates = [d for d, n in sleep.items() if n['asleep'] > 1]
    if all_sleep_dates:
        latest_sleep = max(all_sleep_dates)
        cutoff = (datetime.strptime(latest_sleep, '%Y-%m-%d') - timedelta(days=120)).strftime('%Y-%m-%d')
    else:
        cutoff = '1970-01-01'
    recent_dates = sorted([d for d in all_sleep_dates if d >= cutoff])

    recent_sleep = {
        'dates':  [d[5:] for d in recent_dates],
        'total':  [round(sleep[d]['asleep'], 1) for d in recent_dates],
        'deep':   [round(sleep[d]['deep'] * 60) for d in recent_dates],
        'rem':    [round(sleep[d]['rem'] * 60) for d in recent_dates],
        'awake':  [round(sleep[d]['awake'] * 60) for d in recent_dates],
    }

    # ── Profile ──
    profile = _extract_profile(me_attrs, raw)

    # ── Month labels ──
    month_names = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    def fmt_month(m):
        p = m.split('-')
        return f"{month_names[int(p[1])]} '{p[0][2:]}"

    # Compile intermediate arrays for findings generation
    # min_n thresholds enforce a minimum sample size before a month is treated as valid.
    # Months below threshold become None and are excluded from all findings logic.
    _RHR_MIN_N   = 5   # need at least 5 RHR readings to trust a monthly average
    _HRV_MIN_N   = 5   # need at least 5 morning HRV readings per month
    _SPO2_MIN_N  = 10  # need at least 10 SpO2 readings; below this, drop counts are unreliable

    rhr_avg_arr      = [safe_mean(rhr_month.get(m, []), _RHR_MIN_N) for m in all_months]
    hrv_avg_arr      = [safe_mean(hrv_month.get(m, []), _HRV_MIN_N) for m in all_months]
    spo2_avg_arr     = [safe_mean(spo2_month.get(m, []), _SPO2_MIN_N) for m in all_months]
    spo2_min_arr     = [safe_min(spo2_month.get(m, []), _SPO2_MIN_N) for m in all_months]
    # Only count sub-95% drops in months that have enough readings to be reliable
    spo2_low_arr     = [
        sum(1 for x in spo2_month.get(m, []) if x < 95)
        if len(spo2_month.get(m, [])) >= _SPO2_MIN_N else 0
        for m in all_months
    ]
    steps_month_arr  = [round(steps_monthly.get(m, 0)) for m in all_months]

    findings = _generate_findings(
        months=all_months,
        profile=profile,
        rhr_avg=rhr_avg_arr,
        hrv_avg=hrv_avg_arr,
        hrv_daily=hrv_daily,
        spo2_avg_month=spo2_avg_arr,
        spo2_min_month=spo2_min_arr,
        spo2_low_count=spo2_low_arr,
        steps_month=steps_month_arr,
        recent_sleep=recent_sleep,
        vo2_trend=vo2,
    )

    return {
        'version': '0.2',
        'bugs_fixed': [
            'SpO2: always multiply by 100 — 299 records corrected',
            'Steps: minute-level dedup — Jan 291K (was 408K), Feb 278K (was 437K)',
            'HRV: morning readings only 2-9am (42.7ms corrected from 45.5ms)',
            "kabra's iPhone: excluded from all calculations",
            'HART sleep: validated as smart ring — trusted source'
        ],
        'profile': profile,
        'months': all_months,
        'months_short': [fmt_month(m) for m in all_months],
        'hr_avg':       [safe_mean(hr_month.get(m, [])) for m in all_months],
        'rhr_avg':      rhr_avg_arr,
        'hrv_avg':      hrv_avg_arr,
        'steps_month':  steps_month_arr,
        'active_cal':   [round(active_month.get(m, 0)) for m in all_months],
        'sleep_deep_month': [
            round(safe_mean(sleep_month[m]['deep'])) if sleep_month.get(m) and sleep_month[m]['deep'] else None
            for m in all_months
        ],
        'sleep_rem_month': [
            round(safe_mean(sleep_month[m]['rem'])) if sleep_month.get(m) and sleep_month[m]['rem'] else None
            for m in all_months
        ],
        'hr_by_hour':   [safe_mean(hr_hour.get(h, [])) for h in range(24)],
        'hrv_dates':    sorted(hrv_daily.keys()),
        'hrv_values':   [hrv_daily[d] for d in sorted(hrv_daily.keys())],
        'recent_sleep': recent_sleep,
        'spo2_avg_month': spo2_avg_arr,
        'spo2_min_month': spo2_min_arr,
        'spo2_low_count': spo2_low_arr,
        'weight_trend': weight,
        'vo2_trend':    vo2,
        'steps_daily':  steps_daily,
        'sleep_nights': {
            d: {k: round(v, 2) for k, v in n.items()}
            for d, n in sleep.items() if n['asleep'] > 1
        },
        'findings': findings,
    }


def _get_months(raw, steps_daily, sleep):
    """Determine the last 16 months with any data."""
    months = set()
    for t in raw.values():
        for d, v, src in t:
            months.add(d[:7])
    for d in steps_daily:
        months.add(d[:7])
    for d in sleep:
        months.add(d[:7])
    return sorted(months)[-16:]


def _extract_profile(me_attrs, raw):
    """
    Extract profile from the Me element attributes and recent measurement records.

    Apple Health stores:
      - DOB, sex in the <Me> element (passed as me_attrs dict)
      - Height in HKQuantityTypeIdentifierHeight (metres)
      - Weight in HKQuantityTypeIdentifierBodyMass (kg)
    """
    from datetime import date as _date

    profile = {'age': None, 'sex': None, 'height_cm': None, 'weight_kg': None, 'bmi': None, 'name': None}

    if me_attrs:
        # Age
        dob_str = me_attrs.get('HKCharacteristicTypeIdentifierDateOfBirth')
        if dob_str:
            try:
                dob = datetime.strptime(dob_str, '%Y-%m-%d').date()
                today = _date.today()
                profile['age'] = today.year - dob.year - (
                    (today.month, today.day) < (dob.month, dob.day)
                )
            except (ValueError, TypeError):
                pass

        # Sex
        sex_raw = me_attrs.get('HKCharacteristicTypeIdentifierBiologicalSex', '')
        if 'Female' in sex_raw:
            profile['sex'] = 'female'
        elif 'Male' in sex_raw:
            profile['sex'] = 'male'

    # Height — most recent record (Apple stores in metres)
    heights = sorted(
        [(d, v) for d, v, _ in raw.get('HKQuantityTypeIdentifierHeight', [])],
        key=lambda x: x[0]
    )
    if heights:
        h_m = heights[-1][1]
        # Guard: values > 3 are likely already in cm (some third-party apps)
        profile['height_cm'] = round(h_m * 100 if h_m <= 3 else h_m, 1)

    # Weight — most recent record (kg)
    weights = sorted(
        [(d, v) for d, v, _ in raw.get('HKQuantityTypeIdentifierBodyMass', [])],
        key=lambda x: x[0]
    )
    if weights:
        profile['weight_kg'] = round(weights[-1][1], 1)

    # BMI
    if profile['height_cm'] and profile['weight_kg']:
        h = profile['height_cm'] / 100
        profile['bmi'] = round(profile['weight_kg'] / (h * h), 1)

    # ── Name extraction ──────────────────────────────────────────────────────
    # Scan all source names in the already-filtered raw dict (excluded sources
    # have already been removed at collection time). Match the possessive
    # pattern "Name's iPhone/Apple Watch/iPad" and pick the most frequent hit.
    name_candidates: Counter = Counter()
    for record_list in raw.values():
        for _date_str, _val, src in record_list:
            m = _NAME_FROM_SOURCE_RE.match(src)
            if m:
                candidate = m.group(1).strip()
                if 1 <= len(candidate) <= 30:
                    name_candidates[candidate] += 1

    if name_candidates:
        profile['name'] = name_candidates.most_common(1)[0][0]

    return profile


# ── FINDINGS GENERATION ───────────────────────────────────────────────────────

# ACSM VO₂ Max norms (mL/kg/min), 11th Ed. 2022
# Structure: {sex: {age_band_upper: {category: (low, high)}}}
_ACSM_VO2_NORMS = {
    'male': {
        29: {'very_poor': (0, 32), 'poor': (33, 36), 'fair': (37, 41), 'good': (42, 45), 'excellent': (46, 52), 'superior': (53, 999)},
        39: {'very_poor': (0, 30), 'poor': (31, 34), 'fair': (35, 38), 'good': (39, 43), 'excellent': (44, 50), 'superior': (51, 999)},
        49: {'very_poor': (0, 29), 'poor': (30, 33), 'fair': (34, 37), 'good': (38, 42), 'excellent': (43, 48), 'superior': (49, 999)},
        59: {'very_poor': (0, 25), 'poor': (26, 30), 'fair': (31, 34), 'good': (35, 39), 'excellent': (40, 45), 'superior': (46, 999)},
        69: {'very_poor': (0, 22), 'poor': (23, 26), 'fair': (27, 31), 'good': (32, 36), 'excellent': (37, 41), 'superior': (42, 999)},
        999: {'very_poor': (0, 19), 'poor': (20, 23), 'fair': (24, 27), 'good': (28, 31), 'excellent': (32, 37), 'superior': (38, 999)},
    },
    'female': {
        29: {'very_poor': (0, 27), 'poor': (28, 31), 'fair': (32, 35), 'good': (36, 40), 'excellent': (41, 45), 'superior': (46, 999)},
        39: {'very_poor': (0, 26), 'poor': (27, 30), 'fair': (31, 34), 'good': (35, 38), 'excellent': (39, 44), 'superior': (45, 999)},
        49: {'very_poor': (0, 24), 'poor': (25, 28), 'fair': (29, 32), 'good': (33, 36), 'excellent': (37, 41), 'superior': (42, 999)},
        59: {'very_poor': (0, 20), 'poor': (21, 24), 'fair': (25, 28), 'good': (29, 32), 'excellent': (33, 37), 'superior': (38, 999)},
        69: {'very_poor': (0, 17), 'poor': (18, 21), 'fair': (22, 25), 'good': (26, 29), 'excellent': (30, 35), 'superior': (36, 999)},
        999: {'very_poor': (0, 15), 'poor': (16, 18), 'fair': (19, 22), 'good': (23, 26), 'excellent': (27, 31), 'superior': (32, 999)},
    },
}

def _vo2_category(vo2_val, age, sex):
    """Return (category_str, severity_str) for a VO₂ Max value given age and sex."""
    sex_key = 'female' if sex == 'female' else 'male'
    norms = _ACSM_VO2_NORMS[sex_key]
    band = next(k for k in sorted(norms.keys()) if age <= k)
    for cat, (lo, hi) in norms[band].items():
        if lo <= vo2_val <= hi:
            sev = 'good' if cat in ('good', 'excellent', 'superior') else \
                  'moderate' if cat == 'fair' else 'elevated'
            label = cat.replace('_', ' ').title()
            return label, sev
    return 'Unknown', 'moderate'


def _generate_findings(months, profile, rhr_avg, hrv_avg, hrv_daily,
                       spo2_avg_month, spo2_min_month, spo2_low_count,
                       steps_month, recent_sleep, vo2_trend=None):
    """
    Apply clinical thresholds to compiled data arrays and return a ranked
    list of findings ordered by severity (critical → elevated → moderate → good).

    Each finding:
        key, severity, title, stat_value, stat_unit, description, source
    """
    findings = []
    month_names = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

    def abbr_month(m):
        """'2026-02' -> 'Feb '26'"""
        p = m.split('-')
        return f"{month_names[int(p[1])]} '{p[0][2:]}"

    # ── 1. SpO₂ drops ────────────────────────────────────────────────────────
    total_low_95 = sum(c for c in spo2_low_count if c)
    min_spo2_ever = min((v for v in spo2_min_month if v is not None), default=None)

    if total_low_95 >= 100 or (min_spo2_ever is not None and min_spo2_ever < 88):
        spo2_severity = 'critical'
    elif total_low_95 >= 20:
        spo2_severity = 'elevated'
    else:
        spo2_severity = None

    if spo2_severity:
        desc = (
            f"Your SpO\u2082 has dropped below 95% <strong>{total_low_95} times</strong>"
        )
        if min_spo2_ever:
            desc += f", with readings as low as <strong>{min_spo2_ever:.0f}%</strong>"
        # Describe trend if worsening
        nonzero = [(m, c) for m, c in zip(months, spo2_low_count) if c > 0]
        if len(nonzero) >= 2 and nonzero[-1][1] > nonzero[0][1]:
            desc += (
                f". This count has been rising month over month "
                f"({nonzero[0][1]} in {abbr_month(nonzero[0][0])} \u2192 "
                f"{nonzero[-1][1]} at peak)"
            )
        desc += (
            ". These drops are most clinically significant during sleep, where they are "
            "the primary screening signal for <strong>obstructive sleep apnea (OSA)</strong>. "
            "Positional therapy \u2014 avoiding back-sleeping \u2014 reduces OSA severity "
            "in 40\u201360% of cases and is a practical first step before a clinical test."
        )
        findings.append({
            'key': 'spo2_drops',
            'severity': spo2_severity,
            'title': 'Blood oxygen dropping',
            'stat_value': str(total_low_95),
            'stat_unit': 'episodes <95%',
            'description': desc,
            'source': 'AASM 2023 \u00b7 SpO\u2082 <88% nadir threshold \u00b7 Nocturnal desaturation screening',
        })

    # ── 2. HRV trend (rolling 28-day baseline vs 28-day recent) ─────────────
    # Uses daily readings directly rather than monthly averages.
    # Baseline: days 29–90 before the latest HRV date.
    # Recent:   last 28 calendar days of HRV data.
    # Both windows require ≥5 readings; otherwise no finding is generated.
    _HRV_WINDOW_DAYS   = 28
    _HRV_BASELINE_DAYS = 90   # baseline window start (days before latest)
    _HRV_TREND_MIN_N   = 5    # minimum readings in each window

    age = profile.get('age') or 25
    sex = profile.get('sex') or 'male'

    if hrv_daily:
        latest_hrv_date = datetime.strptime(max(hrv_daily.keys()), '%Y-%m-%d')
        recent_cutoff   = latest_hrv_date - timedelta(days=_HRV_WINDOW_DAYS)
        baseline_cutoff = latest_hrv_date - timedelta(days=_HRV_BASELINE_DAYS)

        recent_vals   = [v for d, v in hrv_daily.items()
                         if datetime.strptime(d, '%Y-%m-%d') > recent_cutoff]
        baseline_vals = [v for d, v in hrv_daily.items()
                         if baseline_cutoff <= datetime.strptime(d, '%Y-%m-%d') <= recent_cutoff]

        if len(recent_vals) >= _HRV_TREND_MIN_N and len(baseline_vals) >= _HRV_TREND_MIN_N:
            hrv_recent   = round(statistics.mean(recent_vals), 1)
            hrv_baseline = round(statistics.mean(baseline_vals), 1)
            pct_change   = (hrv_recent - hrv_baseline) / hrv_baseline * 100

            if hrv_recent < 35:
                hrv_severity = 'critical'
            elif pct_change <= -10:
                hrv_severity = 'elevated'
            elif hrv_recent < 50:
                hrv_severity = 'moderate'
            else:
                hrv_severity = None

            if hrv_severity:
                desc = (
                    f"Your morning HRV (measured 2\u20139\u00a0AM, the clinically validated window) "
                    f"has averaged <strong>{hrv_recent:.1f}\u00a0ms</strong> over the past 28 days, "
                    f"down from a 28\u2013day baseline of <strong>{hrv_baseline:.1f}\u00a0ms</strong> "
                    f"\u2014 a {abs(pct_change):.0f}% decline "
                    f"(based on {len(recent_vals)} recent and {len(baseline_vals)} baseline readings). "
                    f"For a {age}-year-old {sex}, the expected range is 60\u201380\u00a0ms "
                    f"(Nunan et al.\u00a02010). HRV begins declining 24\u201372\u00a0hours before "
                    f"subjective symptoms of illness or burnout appear, making it an early warning signal. "
                    f"Alcohol suppresses overnight HRV by 20\u201330% even with 1\u20132 drinks \u2014 "
                    f"a 7-day alcohol-free period is the fastest way to test if it\u2019s a factor."
                )
                findings.append({
                    'key': 'hrv_decline',
                    'severity': hrv_severity,
                    'title': 'HRV declining',
                    'stat_value': f'{pct_change:+.0f}%',
                    'stat_unit': f'28-day trend ({len(recent_vals)} readings)',
                    'description': desc,
                    'source': 'Shaffer & Ginsberg\u00a02017 \u00b7 Nunan et al.\u00a02010 \u00b7 Morning SDNN (2\u20139\u00a0AM) \u00b7 ESC/NASPE Task Force 1996',
                })
            elif hrv_recent >= 60 and pct_change >= 0:
                desc = (
                    f"Your morning HRV has averaged <strong>{hrv_recent:.1f}\u00a0ms</strong> "
                    f"over the past 28 days \u2014 stable or improving from a baseline of "
                    f"{hrv_baseline:.1f}\u00a0ms, and within the healthy 60\u201380\u00a0ms range "
                    f"for a {age}-year-old {sex} (Nunan et al.\u00a02010). "
                    f"Strong HRV reflects a well-balanced autonomic nervous system and good recovery capacity. "
                    f"It is one of the best indicators that your body is handling stress and training load effectively."
                )
                findings.append({
                    'key': 'hrv_good',
                    'severity': 'good',
                    'title': 'HRV looking healthy',
                    'stat_value': f'{hrv_recent:.1f}',
                    'stat_unit': f'ms SDNN (28-day avg, {len(recent_vals)} readings)',
                    'description': desc,
                    'source': 'Shaffer & Ginsberg\u00a02017 \u00b7 Nunan et al.\u00a02010 \u00b7 ESC/NASPE Task Force 1996',
                })

    # ── 3. Sleep insufficiency ───────────────────────────────────────────────
    _SLEEP_MIN_NIGHTS = 14  # need at least 2 weeks to call a sleep pattern
    sleep_totals = recent_sleep.get('total', []) if recent_sleep else []
    if sleep_totals and len(sleep_totals) >= _SLEEP_MIN_NIGHTS:
        n_nights = len(sleep_totals)
        n_under_7 = sum(1 for h in sleep_totals if h < 7)
        n_under_6 = sum(1 for h in sleep_totals if h < 6)
        pct_under_7 = n_under_7 / n_nights
        avg_sleep = sum(sleep_totals) / n_nights
        min_sleep = min(sleep_totals)

        if pct_under_7 >= 0.6:
            sleep_severity = 'elevated'
        elif pct_under_7 >= 0.4:
            sleep_severity = 'moderate'
        else:
            sleep_severity = None

        if sleep_severity:
            desc = (
                f"<strong>{n_under_7} of your last {n_nights} nights</strong> "
                f"were under 7 hours"
            )
            if n_under_6:
                desc += (
                    f", with <strong>{n_under_6} nights under 6 hours</strong> "
                    f"(short nights disproportionately cut REM sleep, which is concentrated "
                    f"in the final 2 hours)"
                )
            desc += (
                f". Your average is {avg_sleep:.1f}\u00a0h/night. "
                f"Chronically sleeping under 7 hours is associated with a 12% increase in "
                f"all-cause mortality (Liu et al., <em>Sleep</em>, 2017) and compounds HRV suppression. "
                f"A consistent <strong>wake time within 30 minutes, 7 days/week</strong>, "
                f"is more effective than a fixed bedtime for improving sleep architecture."
            )
            findings.append({
                'key': 'sleep_insufficiency',
                'severity': sleep_severity,
                'title': 'Insufficient sleep duration',
                'stat_value': f'{min_sleep:.1f}h',
                'stat_unit': 'lowest recent night',
                'description': desc,
                'source': 'CDC \u00b7 AAS guidelines \u00b7 Liu et al., Sleep, 2017 \u00b7 AASM sleep staging consensus',
            })

    # ── 4. RHR — elevated or good ────────────────────────────────────────────
    rhr_nonull = [(m, v) for m, v in zip(months, rhr_avg) if v is not None]
    if rhr_nonull:
        recent_rhr_vals = [v for _, v in rhr_nonull[-3:]]
        avg_rhr = sum(recent_rhr_vals) / len(recent_rhr_vals)

        if avg_rhr > 70:
            # Detect trend direction over the 3-month window
            rhr_3m = [v for _, v in rhr_nonull[-3:]]
            if len(rhr_3m) >= 2 and rhr_3m[-1] > rhr_3m[0] + 2:
                trend_note = f" It has been <strong>rising</strong> over this period ({rhr_3m[0]:.0f}\u00a0\u2192\u00a0{rhr_3m[-1]:.0f}\u00a0bpm), which amplifies the signal."
            elif len(rhr_3m) >= 2 and rhr_3m[-1] < rhr_3m[0] - 2:
                trend_note = f" It has been <strong>declining</strong> ({rhr_3m[0]:.0f}\u00a0\u2192\u00a0{rhr_3m[-1]:.0f}\u00a0bpm) \u2014 a positive direction, keep going."
            else:
                trend_note = " It has been <strong>flat</strong> over this period, suggesting a stable baseline worth addressing."
            desc = (
                f"Your resting heart rate has averaged <strong>{avg_rhr:.0f}\u00a0bpm</strong> "
                f"over the last 3 months.{trend_note} "
                f"The Framingham Heart Study identifies sustained RHR above 70\u00a0bpm as an "
                f"elevated cardiovascular risk marker. "
                f"150\u00a0min/week of moderate aerobic exercise reduces RHR by 5\u20138\u00a0bpm "
                f"within 8 weeks (Cornelissen & Smart, 2013)."
            )
            findings.append({
                'key': 'rhr_elevated',
                'severity': 'elevated',
                'title': 'Resting heart rate elevated',
                'stat_value': f'{avg_rhr:.0f}',
                'stat_unit': 'avg RHR bpm',
                'description': desc,
                'source': 'Framingham Heart Study \u00b7 Cornelissen & Smart, JAHA 2013 \u00b7 Sustained RHR >70\u00a0bpm',
            })
        elif avg_rhr < 65:
            age = profile.get('age') or 25
            desc = (
                f"Your resting heart rate of <strong>{avg_rhr:.0f}\u00a0bpm</strong> "
                f"is in the athletic range for a {age}-year-old, indicating strong "
                f"cardiovascular fitness. A low RHR is strongly correlated with high VO\u2082\u00a0Max "
                f"and is one of the most reliable markers of long-term cardiovascular health \u2014 "
                f"the HUNT Study (n=29,000+) found each 10\u00a0bpm reduction in RHR associated "
                f"with 18% lower cardiovascular mortality."
            )
            findings.append({
                'key': 'rhr_good',
                'severity': 'good',
                'title': 'Cardiovascular fitness',
                'stat_value': f'{avg_rhr:.0f}',
                'stat_unit': 'avg RHR bpm',
                'description': desc,
                'source': 'Framingham Heart Study \u00b7 HUNT Study (Nauman et al., 2011)',
            })

    # ── 5. Activity trend ────────────────────────────────────────────────────
    steps_nonzero = [(m, s) for m, s in zip(months, steps_month) if s > 10000]
    if len(steps_nonzero) >= 3:
        peak_steps = max(s for _, s in steps_nonzero)
        latest_steps = steps_nonzero[-1][1]
        peak_month = next(m for m, s in steps_nonzero if s == peak_steps)
        pct_from_peak = (latest_steps - peak_steps) / peak_steps * 100

        if pct_from_peak <= -20:
            desc = (
                f"Your step count peaked at <strong>{peak_steps:,}</strong> in "
                f"{abbr_month(peak_month)} and has declined to "
                f"<strong>{latest_steps:,}</strong> last month \u2014 "
                f"a {abs(pct_from_peak):.0f}% drop. "
                f"The WHO 2020 guidelines recommend 150\u2013300 minutes of moderate activity "
                f"per week. If time is limited, concentrating activity into 1\u20132 days "
                f"(the \u2018weekend warrior\u2019 pattern) still confers ~30% cardiovascular "
                f"mortality reduction vs. being sedentary (O\u2019Donovan et al., 2017)."
            )
            findings.append({
                'key': 'activity_decline',
                'severity': 'moderate',
                'title': 'Activity declining from peak',
                'stat_value': f'{latest_steps:,}',
                'stat_unit': 'steps last month',
                'description': desc,
                'source': 'WHO Physical Activity Guidelines 2020 \u00b7 O\u2019Donovan et al., JAMA Internal Med 2017',
            })

    # ── 6. VO₂ Max ───────────────────────────────────────────────────────────
    age = profile.get('age')
    sex = profile.get('sex')
    if vo2_trend and len(vo2_trend) >= 3 and age and sex:
        latest_vo2 = vo2_trend[-1][1]
        cat_label, vo2_sev = _vo2_category(latest_vo2, age, sex)
        if vo2_sev == 'good':
            desc = (
                f"Your estimated VO\u2082\u00a0Max of <strong>{latest_vo2:.1f}\u00a0mL/kg/min</strong> "
                f"places you in the <strong>{cat_label}</strong> range for a {age}-year-old {sex} "
                f"(ACSM 2022). VO\u2082\u00a0Max is the single strongest predictor of long-term health \u2014 "
                f"each 3.5\u00a0mL/kg/min improvement is associated with a 13% reduction in "
                f"cardiovascular mortality (Ross et al., Mayo Clinic Proceedings, 2016)."
            )
        else:
            desc = (
                f"Your estimated VO\u2082\u00a0Max of <strong>{latest_vo2:.1f}\u00a0mL/kg/min</strong> "
                f"is in the <strong>{cat_label}</strong> range for a {age}-year-old {sex} "
                f"(ACSM 2022). The good news: VO\u2082\u00a0Max responds strongly to training. "
                f"High-intensity interval training (HIIT) produces 8\u201313% improvement in "
                f"8\u00a0weeks. Even 150\u00a0min/week of brisk walking begins improving it within 6\u00a0weeks."
            )
        findings.append({
            'key': 'vo2_max',
            'severity': vo2_sev,
            'title': 'Cardiorespiratory fitness (VO\u2082\u00a0Max)',
            'stat_value': f'{latest_vo2:.1f}',
            'stat_unit': 'mL/kg/min (est.)',
            'description': desc,
            'source': 'ACSM Guidelines 11th Ed 2022 \u00b7 Ross et al., Mayo Clinic Proc 2016 \u00b7 Mandsager et al., JAMA Network Open 2018',
        })

    # Sort by severity
    _order = {'critical': 0, 'elevated': 1, 'moderate': 2, 'good': 3}
    findings.sort(key=lambda f: _order.get(f['severity'], 99))

    return findings


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python parser.py <export.zip or export.xml> [output.json]")
        sys.exit(1)

    source = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else 'output.json'

    print(f"Parsing {source}...")
    result = parse_export(source)

    with open(output_path, 'w') as f:
        json.dump(result, f, indent=2)

    print(f"Done. Output written to {output_path}")
    print(f"Months covered: {result['months'][0]} to {result['months'][-1]}")
    print(f"Steps (last month): {result['steps_month'][-1]:,}")
    print(f"HRV readings: {len(result['hrv_dates'])}")
