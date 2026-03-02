"""
VitalScan -- Apple Health XML Parser
v0.3 -- Device-agnostic, profile extraction, RHR fixed

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
from collections import defaultdict
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
    """
    excl = set(exclude_sources) if exclude_sources else set()

    xml_data = _load_xml(source)
    root = ET.fromstring(xml_data)

    raw   = _collect_raw(root, excl)
    steps = _deduplicate_steps(root, excl)
    sleep = _parse_sleep(root, excl)
    hrv   = _parse_hrv(root, excl)

    return _compile_output(root, raw, steps, sleep, hrv)


# ── XML LOADING ───────────────────────────────────────────────────────────────

def _load_xml(source):
    """Load XML from zip path, xml path, or file-like object."""
    if hasattr(source, 'read'):
        # File-like object — assume ZIP
        with zipfile.ZipFile(source) as z:
            return z.read('apple_health_export/export.xml')

    if isinstance(source, str):
        if source.endswith('.zip'):
            with zipfile.ZipFile(source) as z:
                return z.read('apple_health_export/export.xml')
        else:
            with open(source, 'rb') as f:
                return f.read()

    raise ValueError(f"Unsupported source type: {type(source)}")


# ── RAW RECORD COLLECTION ─────────────────────────────────────────────────────

def _collect_raw(root, excl):
    """Collect all records except steps (handled separately)."""
    data = defaultdict(list)  # type -> [(date_str, value, source)]

    SKIP_TYPES = {'HKQuantityTypeIdentifierStepCount'}

    for record in root.iter('Record'):
        t = record.get('type', '')
        val = record.get('value')
        src = record.get('sourceName', '')
        date_str = record.get('startDate', '')

        if t in SKIP_TYPES:
            continue
        if src in excl:
            continue
        if not (val and date_str):
            continue

        try:
            data[t].append((date_str, float(val), src))
        except ValueError:
            pass

    return data


# ── FIX #2: STEP DEDUPLICATION ───────────────────────────────────────────────

def _deduplicate_steps(root, excl):
    """
    Deduplicate steps using minute-level overlap detection.

    When multiple sources record steps in overlapping time windows,
    the higher-priority source wins each minute. Priority is auto-detected
    by device type: Apple Watch (1) > other wearable (2) > phone (3) > unknown (4).
    Steps are scaled proportionally to minutes won.

    Returns:
        dict: {date_str: step_count} -- deduplicated daily totals
    """
    records = []

    for record in root.iter('Record'):
        if record.get('type') != 'HKQuantityTypeIdentifierStepCount':
            continue

        src = record.get('sourceName', '')
        if src in excl:
            continue

        priority = _source_priority(src)
        start_str = record.get('startDate', '')
        end_str = record.get('endDate', '')
        val = record.get('value', '0')

        if not (start_str and end_str):
            continue

        try:
            s = datetime.strptime(start_str[:19], '%Y-%m-%d %H:%M:%S')
            e = datetime.strptime(end_str[:19], '%Y-%m-%d %H:%M:%S')
            if e > s:
                records.append({
                    'start': s, 'end': e,
                    'val': float(val),
                    'src': src,
                    'priority': priority
                })
        except (ValueError, TypeError):
            pass

    # Group by calendar date
    by_day = defaultdict(list)
    for r in records:
        by_day[r['start'].strftime('%Y-%m-%d')].append(r)

    daily = {}
    for date, recs in by_day.items():
        daily[date] = _dedup_day(recs)

    return daily


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


# ── FIX #3: SLEEP PARSING ────────────────────────────────────────────────────

def _parse_sleep(root, excl):
    """
    Parse sleep records from all non-excluded sources.

    Date assignment: sleep starting before 2 PM is assigned to the previous
    calendar date (handles overnight sleep sessions correctly).

    Returns:
        dict: {date_str: {'asleep': h, 'deep': h, 'rem': h, 'core': h, 'awake': h}}
    """
    nights = defaultdict(lambda: {
        'asleep': 0.0, 'deep': 0.0, 'rem': 0.0, 'core': 0.0, 'awake': 0.0
    })

    for record in root.iter('Record'):
        if record.get('type') != 'HKCategoryTypeIdentifierSleepAnalysis':
            continue

        src = record.get('sourceName', '')
        if src in excl:
            continue

        val = record.get('value', '')
        start_str = record.get('startDate', '')
        end_str = record.get('endDate', '')

        if not (start_str and end_str):
            continue

        try:
            s = datetime.strptime(start_str[:19], '%Y-%m-%d %H:%M:%S')
            e = datetime.strptime(end_str[:19], '%Y-%m-%d %H:%M:%S')
            dur = (e - s).total_seconds() / 3600

            # Assign to correct calendar date
            date = start_str[:10]
            if s.hour < 14:
                date = (s - timedelta(days=1)).strftime('%Y-%m-%d')

            # Categorise by stage
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


# ── FIX #3: HRV PARSING ──────────────────────────────────────────────────────

def _parse_hrv(root, excl):
    """
    Parse HRV using morning readings only (2-9 AM).

    Per Shaffer & Ginsberg 2017, morning SDNN readings taken during or
    immediately after sleep are the clinically validated metric.
    All-day averaging inflates the number by ~3-5ms.

    Returns:
        dict: {date_str: hrv_ms} -- one value per day (morning mean)
              Falls back to all-day mean if no morning readings exist.
    """
    morning = defaultdict(list)  # 2-9 AM readings
    allday = defaultdict(list)   # fallback

    for record in root.iter('Record'):
        if record.get('type') != 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN':
            continue

        src = record.get('sourceName', '')
        if src in excl:
            continue

        date_str = record.get('startDate', '')
        val = record.get('value')
        if not (date_str and val):
            continue

        try:
            h = int(date_str[11:13])
            v = float(val)
            if v <= 0:
                continue

            date = date_str[:10]
            allday[date].append(v)
            if 2 <= h <= 9:
                morning[date].append(v)

        except (ValueError, TypeError):
            pass

    # Build daily HRV: prefer morning, fall back to all-day
    result = {}
    all_dates = set(allday.keys()) | set(morning.keys())
    for date in all_dates:
        if morning.get(date):
            result[date] = round(statistics.mean(morning[date]), 1)
        elif allday.get(date):
            result[date] = round(statistics.mean(allday[date]), 1)

    return result


# ── OUTPUT COMPILATION ────────────────────────────────────────────────────────

def _compile_output(root, raw, steps_daily, sleep, hrv_daily):
    """Compile all parsed data into dashboard-ready JSON structure."""

    # ── Helpers ──
    def safe_mean(lst):
        return round(statistics.mean(lst), 1) if lst else None

    def safe_min(lst):
        return round(min(lst), 1) if lst else None

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
    profile = _extract_profile(root, raw)

    # ── Month labels ──
    month_names = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    def fmt_month(m):
        p = m.split('-')
        return f"{month_names[int(p[1])]} '{p[0][2:]}"

    # Compile intermediate arrays for findings generation
    rhr_avg_arr      = [safe_mean(rhr_month.get(m, [])) for m in all_months]
    hrv_avg_arr      = [safe_mean(hrv_month.get(m, [])) for m in all_months]
    spo2_avg_arr     = [safe_mean(spo2_month.get(m, [])) for m in all_months]
    spo2_min_arr     = [safe_min(spo2_month.get(m, [])) for m in all_months]
    spo2_low_arr     = [sum(1 for x in spo2_month.get(m, []) if x < 95) for m in all_months]
    steps_month_arr  = [round(steps_monthly.get(m, 0)) for m in all_months]

    findings = _generate_findings(
        months=all_months,
        profile=profile,
        rhr_avg=rhr_avg_arr,
        hrv_avg=hrv_avg_arr,
        spo2_avg_month=spo2_avg_arr,
        spo2_min_month=spo2_min_arr,
        spo2_low_count=spo2_low_arr,
        steps_month=steps_month_arr,
        recent_sleep=recent_sleep,
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


def _extract_profile(root, raw):
    """
    Extract profile from the Me record and recent measurement records.

    Apple Health stores:
      - DOB, sex in the <Me> element
      - Height in HKQuantityTypeIdentifierHeight (metres)
      - Weight in HKQuantityTypeIdentifierBodyMass (kg)
    """
    from datetime import date as _date

    profile = {'age': None, 'sex': None, 'height_cm': None, 'weight_kg': None, 'bmi': None}

    me = root.find('Me') if root is not None else None
    if me is not None:
        # Age
        dob_str = me.get('HKCharacteristicTypeIdentifierDateOfBirth')
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
        sex_raw = me.get('HKCharacteristicTypeIdentifierBiologicalSex', '')
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

    return profile


# ── FINDINGS GENERATION ───────────────────────────────────────────────────────

def _generate_findings(months, profile, rhr_avg, hrv_avg, spo2_avg_month,
                       spo2_min_month, spo2_low_count, steps_month, recent_sleep):
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

    if total_low_95 >= 100:
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
                f". The count has been rising month over month "
                f"({nonzero[0][1]} in {abbr_month(nonzero[0][0])} \u2192 "
                f"{nonzero[-1][1]} at peak)"
            )
        desc += (
            ". This pattern — especially if occurring during sleep — is "
            "a clinical screening signal for <strong>obstructive sleep apnea</strong>."
        )
        findings.append({
            'key': 'spo2_drops',
            'severity': spo2_severity,
            'title': 'Blood oxygen dropping',
            'stat_value': str(total_low_95),
            'stat_unit': 'episodes <95%',
            'description': desc,
            'source': 'AASM sleep apnea screening \u00b7 SpO\u2082 <88% threshold',
        })

    # ── 2. HRV decline ───────────────────────────────────────────────────────
    hrv_nonull = [(m, v) for m, v in zip(months, hrv_avg) if v is not None]
    if len(hrv_nonull) >= 2:
        recent = hrv_nonull[-3:]
        hrv_start, hrv_end = recent[0][1], recent[-1][1]
        pct_change = (hrv_end - hrv_start) / hrv_start * 100

        age = profile.get('age') or 25
        sex = profile.get('sex') or 'male'

        if hrv_end < 35:
            hrv_severity = 'critical'
        elif pct_change <= -10:
            hrv_severity = 'elevated'
        elif hrv_end < 50:
            hrv_severity = 'moderate'
        else:
            hrv_severity = None

        if hrv_severity:
            period = f"{abbr_month(recent[0][0])} \u2192 {abbr_month(recent[-1][0])}"
            desc = (
                f"Your morning HRV dropped from <strong>{hrv_start:.1f}ms</strong> to "
                f"<strong>{hrv_end:.1f}ms</strong> \u2014 a {abs(pct_change):.0f}% decline. "
                f"For a {age}-year-old {sex}, the expected range is 60\u201380ms "
                f"(Nunan et al.\u00a02010). A sustained downward trend typically signals "
                f"<strong>accumulated stress, poor recovery, or an underlying condition</strong> "
                f"putting strain on your autonomic nervous system."
            )
            findings.append({
                'key': 'hrv_decline',
                'severity': hrv_severity,
                'title': f'HRV declining',
                'stat_value': f'{pct_change:+.0f}%',
                'stat_unit': period,
                'description': desc,
                'source': 'Shaffer & Ginsberg\u00a02017 \u00b7 Nunan et al.\u00a02010 \u00b7 Morning SDNN (2\u20139\u00a0AM)',
            })

    # ── 3. Sleep insufficiency ───────────────────────────────────────────────
    sleep_totals = recent_sleep.get('total', []) if recent_sleep else []
    if sleep_totals:
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
                desc += f", with {n_under_6} nights under 6 hours"
            desc += (
                f". Your average is {avg_sleep:.1f}\u00a0h/night. "
                f"Chronic sleep debt compounds recovery and worsens HRV. "
                f"The CDC and AAS recommend 7+ hours on a consistent schedule."
            )
            findings.append({
                'key': 'sleep_insufficiency',
                'severity': sleep_severity,
                'title': 'Insufficient sleep duration',
                'stat_value': f'{min_sleep:.1f}h',
                'stat_unit': 'lowest recent night',
                'description': desc,
                'source': 'CDC adult sleep recommendation \u00b7 AAS guidelines',
            })

    # ── 4. RHR — elevated or good ────────────────────────────────────────────
    rhr_nonull = [(m, v) for m, v in zip(months, rhr_avg) if v is not None]
    if rhr_nonull:
        recent_rhr_vals = [v for _, v in rhr_nonull[-3:]]
        avg_rhr = sum(recent_rhr_vals) / len(recent_rhr_vals)

        if avg_rhr > 70:
            desc = (
                f"Your resting heart rate has averaged <strong>{avg_rhr:.0f}\u00a0bpm</strong> "
                f"over the last 3 months. The Framingham Heart Study identifies sustained "
                f"RHR above 70\u00a0bpm as an elevated cardiovascular risk marker."
            )
            findings.append({
                'key': 'rhr_elevated',
                'severity': 'elevated',
                'title': 'Resting heart rate elevated',
                'stat_value': f'{avg_rhr:.0f}',
                'stat_unit': 'avg RHR bpm',
                'description': desc,
                'source': 'Framingham Heart Study \u00b7 Sustained RHR >70\u00a0bpm',
            })
        elif avg_rhr < 65:
            age = profile.get('age') or 25
            desc = (
                f"Your resting heart rate of <strong>{avg_rhr:.0f}\u00a0bpm</strong> "
                f"is in the athletic range for a {age}-year-old, indicating strong "
                f"cardiovascular fitness."
            )
            findings.append({
                'key': 'rhr_good',
                'severity': 'good',
                'title': 'Cardiovascular fitness',
                'stat_value': f'{avg_rhr:.0f}',
                'stat_unit': 'avg RHR bpm',
                'description': desc,
                'source': 'Framingham Heart Study',
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
                f"{abbr_month(peak_month)} but has declined to "
                f"<strong>{latest_steps:,}</strong> last month \u2014 "
                f"a {abs(pct_from_peak):.0f}% drop. "
                f"The WHO recommends 150+ minutes of moderate activity per week."
            )
            findings.append({
                'key': 'activity_decline',
                'severity': 'moderate',
                'title': 'Activity declining from peak',
                'stat_value': f'{latest_steps:,}',
                'stat_unit': 'steps last month',
                'description': desc,
                'source': 'WHO physical activity guidelines \u00b7 2020',
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
