# Aven Health Metrics: Deep Dive Analysis by Health Indicator

> **Purpose**: Detailed research on each health metric: normal ranges, clinical significance, data sources, integration strategies, and actionable insights.

---

## 1. Glucose Monitoring & Management

### 1.1 Overview

**Clinical Significance:**
Glucose is the body's primary fuel. Abnormal levels indicate diabetes, prediabetes, or metabolic dysfunction. Proper glucose management prevents cardiovascular disease, neuropathy, nephropathy, and retinopathy.

### 1.2 Data Sources

**CGM (Continuous Glucose Monitor):**
- Real-time glucose readings every 1-5 minutes
- Wearable sensor worn on abdomen/arm
- Bluetooth to mobile app
- Devices: Freestyle Libre, Dexcom, Medtronic Guardian

**Fasting Blood Glucose:**
- Lab test after 8-hour fast
- Point-in-time measurement
- Standard reference: 100-125 mg/dL = prediabetes; ≥126 = diabetes

**HbA1c (see Section 4):**
- 3-month average glucose control
- Lab test quarterly or annually

### 1.3 Reference Ranges (2026 Standards)

| Population | Fasting (mg/dL) | Postprandial (mg/dL) | CGM TIR Goal |
|---|---|---|---|
| Non-diabetic | 70-100 | <140 | 87-100% in 70-140 mg/dL |
| Prediabetic | 100-125 | 140-199 | N/A |
| Type 1 Diabetes | 70-180 | <200 | 70-180 mg/dL for 70% of day |
| Type 2 Diabetes | 80-180 | <200 | 70-180 mg/dL for 70% of day |

### 1.4 CGM Algorithm Considerations

**Critical Finding (2026):**
Identical CGM sensors with different algorithm generations show significant differences:
- Formula: y = 0.9728x + 10.024
- Older vs newer generation readers can differ by 10+ mg/dL on same reading
- Algorithm version MUST be tracked for consistency

### 1.5 Time in Range (TIR) Metrics

**Key Measurements:**
- **TIR (Time in Range):** % time glucose 70-180 mg/dL (goal ≥70%)
- **TIR Tight:** % time glucose 70-140 mg/dL (goal ≥50%)
- **TAR (Time Above Range):** % time >180 mg/dL (goal <25%)
- **TBR (Time Below Range):** % time <70 mg/dL (goal <4%)
- **GMI (Glucose Management Indicator):** Estimated A1c from CGM data

### 1.6 Aven Integration Strategy

**Data Flow:**
```
CGM Device → Bluetooth → Mobile App → Backend → FHIR Observation
                                          ↓
                                  Normalization
                                          ↓
                              Dashboard Display
                                          ↓
                              AI Anomaly Detection
```

**Insight Generation:**
1. **Daily Pattern:** Identify meal response patterns, dawn phenomenon
2. **Variability:** Calculate coefficient of variation (goal <36%)
3. **Trends:** Detect hyperglycemia or hypoglycemia patterns
4. **Predictions:** Alert 15-30 min before predicted low glucose
5. **Correlations:** Link glucose to exercise, sleep, stress, diet

**Dashboard Display:**
```
┌─────────────────────────────────────────┐
│ Glucose Status                          │
│ Current: 125 mg/dL (good) ✓            │
├─────────────────────────────────────────┤
│ 24-Hour Trend [graph showing TIR]       │
│ TIR: 78% (target: 70%)                 │
│ TAR: 18% (target: <25%)                │
│ TBR: 4% (risk)                          │
├─────────────────────────────────────────┤
│ Weekly Average: 132 mg/dL               │
│ Variability: 34% (good)                 │
├─────────────────────────────────────────┤
│ Alerts                                  │
│ • Low in 2pm-3pm window                │
│ • High post-dinner trend                │
└─────────────────────────────────────────┘
```

**AI/ML Opportunities:**
- LSTM network predicts glucose 30-45 min ahead
- Anomaly detection flags unusual patterns
- Correlate glucose vs step count, sleep, stress

**Sources:**
- [Continuous Glucose Monitoring: Clinical Applications - Endotext](https://www.ncbi.nlm.nih.gov/books/NBK279046/)
- [CGM Time in Range Definition - Journal of Clinical Endocrinology & Metabolism](https://academic.oup.com/jcem/article/110/4/1128/7754867)
- [CGM Data Analysis 2.0: Functional Data Pattern Recognition - arXiv](https://arxiv.org/pdf/2505.07885)

---

## 2. Blood Pressure Monitoring & Hypertension Detection

### 2.1 Clinical Significance

**Impact:**
- Leading modifiable risk factor for cardiovascular disease
- Strong correlation with stroke, heart failure, CKD
- 2025 AHA/ACC guidelines recommend treatment starting at 130/80 mmHg

### 2.2 Reference Ranges (2025 AHA/ACC Guidelines)

| Category | Systolic | Diastolic | Action |
|---|---|---|---|
| Normal | <120 | <80 | Monitor annually |
| Elevated | 120-129 | <80 | Lifestyle modifications |
| Stage 1 HTN | 130-139 | 80-89 | Consider treatment |
| Stage 2 HTN | ≥140 | ≥90 | Initiate treatment |
| Hypertensive Crisis | >180 | >120 | Emergency care |

**ESH (European) vs ACC/AHA:**
- ESH threshold: >140/90 mmHg (more conservative)
- ACC/AHA threshold: >130/80 mmHg (more aggressive)
- Aven should support both standards (user-configurable)

### 2.3 Data Sources

**Automated Home BP Monitor:**
- Omron, Withings, etc.
- WiFi/Bluetooth sync to app
- Reads in 30-60 seconds

**Wearable Continuous Monitoring:**
- Apple Watch (emerging 2026)
- Some advanced smartwatches
- Less accurate than cuff; good for trends

**Ambulatory BP Monitoring (ABPM):**
- 24-hour continuous cuff readings
- Captures masked hypertension, nocturnal patterns
- Best for risk stratification

### 2.4 Risk Stratification

**Cardiovascular Risk Factors to Monitor:**
- 24-hour BP pattern (elevated nocturnal = higher risk)
- Daytime vs nighttime BP ratio
- BP variability (high variability = worse prognosis)
- Pulse pressure (systolic - diastolic; >60 is risk factor)

**Masked Hypertension Detection:**
- Normal office BP but elevated home BP
- Detected via home/ambulatory monitoring
- Aven can flag through automated pattern detection

### 2.5 Aven Integration Strategy

**Data Collection:**
```
BP Device → WiFi/Bluetooth → Mobile App → Backend → FHIR Observation
                                               ↓
                                        Time-Series DB
                                               ↓
                                      Statistical Analysis
```

**Insight Generation:**
1. **Trends:** 7-day, 30-day, 90-day average tracking
2. **Patterns:** Identify white-coat effect, time-of-day patterns
3. **Variability:** Calculate standard deviation, coefficient of variation
4. **Correlations:** Link BP to stress, sleep, sodium intake
5. **Predictions:** Alert on rising trend before crossing threshold

**Alert Thresholds:**
- Elevated reading: >140/90 → note for follow-up
- Critical reading: >180/120 → urgent notification
- Persistent elevation: >135/85 for 3+ days → recommend clinician contact

**Dashboard Display:**
```
┌─────────────────────────────────────┐
│ Blood Pressure Status               │
│ Current: 138/88 (stage 1) ⚠️        │
├─────────────────────────────────────┤
│ 7-Day Average: 136/86              │
│ 30-Day Trend: ↑ (slowly rising)    │
├─────────────────────────────────────┤
│ Variability: 12 mmHg (good)        │
│ Pulse Pressure: 50 mmHg (normal)   │
├─────────────────────────────────────┤
│ Patterns                            │
│ • Morning SBP elevated 10-15 mmHg  │
│ • Evening readings more stable     │
│ • Post-exercise drop (normal)      │
├─────────────────────────────────────┤
│ Recommendations                     │
│ • Continue home monitoring          │
│ • Schedule BP check with provider   │
│ • Consider lifestyle interventions  │
└─────────────────────────────────────┘
```

**ML Opportunities:**
- Random Forest model: predict hypertension 6-12 months ahead
- Anomaly detection: flag unusual readings requiring verification
- Classification: white-coat vs real hypertension

**Sources:**
- [Hypertension: Major Modifiable Risk Factor - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12711354/)
- [2025 AHA/ACC Hypertension Guidelines - Hypertension Journal](https://www.ahajournals.org/doi/10.1161/HYP.0000000000000249)
- [Definition and Classification of BP - Hypertension Research](https://www.nature.com/articles/s41440-025-02543-y)

---

## 3. Heart Rate Variability (HRV) & Autonomic Function

### 3.1 Clinical Significance

**What HRV Measures:**
- Millisecond variations between consecutive heartbeats
- Reflects parasympathetic vs sympathetic nervous system balance
- Indicator of recovery, stress, cardiovascular health, disease risk

**Clinical Applications:**
- Athletic recovery monitoring
- Stress/anxiety detection
- Cardiovascular disease prediction
- Mental health assessment

### 3.2 Reference Ranges & Interpretation

**Resting HRV (Normal Population):**
- RMSSD (root mean square of successive differences): 20-200 ms
- Higher values = better parasympathetic tone (relaxed state)
- Lower values = sympathetic dominance (stressed state)

**Athletic Population:**
- Well-trained athletes: RMSSD 50-100+ ms
- Sedentary: RMSSD 20-40 ms
- Individual baseline matters more than absolute values

**Disease/Stress Correlation:**
- Low HRV (<20 ms) = elevated heart disease risk, chronic stress
- HRV drop >20% from baseline = potential illness/overtraining

### 3.3 Data Sources

**Wearable Devices:**
- Apple Watch (via HealthKit)
- Oura Ring (excellent HRV accuracy)
- Whoop (specialized athletic recovery)
- Polar sports watches
- Chest straps (most accurate)

**Measurement Methods:**
- ECG-based (most accurate)
- PPG (photoplethysmography) from smartwatches (less accurate)
- Chest strap monitors

### 3.4 HRV Metrics

**Common Measures:**
- **RMSSD:** Parasympathetic indicator; primary metric
- **SDNN:** Overall HRV (includes both sympathetic and parasympathetic)
- **LF/HF Ratio:** Low frequency / High frequency power (sympathetic/parasympathetic balance)
- **Poincaré Plot:** Visual representation of HRV pattern

**Best Practices:**
- Measure at rest, same time daily (morning best)
- Minimum 5 minutes of data
- Control variables: caffeine, exercise, sleep, stress

### 3.5 Aven Integration Strategy

**Data Collection:**
```
Wearable Device (HRV) → Mobile App → Backend → Time-Series DB
                                           ↓
                              Baseline Calculation (30 days)
                                           ↓
                                Daily Comparison & Alerts
```

**Insight Generation:**
1. **Recovery Status:** HRV vs baseline = recovery score (green/yellow/red)
2. **Stress Indicator:** HRV drop from baseline = stress detection
3. **Trends:** 7/14/30-day moving average
4. **Correlations:** HRV vs sleep quality, exercise, caffeine
5. **Predictions:** Detect illness 24-48 hours before symptoms

**Alert Conditions:**
- HRV drop >20% from 7-day avg → possible illness/overtraining
- HRV critically low for 2+ days → medical attention recommended
- Unusual pattern change → anomaly flag

**Dashboard Display:**
```
┌─────────────────────────────────────┐
│ Heart Rate Variability              │
│ Current RMSSD: 62 ms (good) ✓       │
├─────────────────────────────────────┤
│ vs Baseline (avg): +5% ✓            │
│ Recovery Status: READY 🟢           │
├─────────────────────────────────────┤
│ 7-Day Trend: Stable                 │
│ 30-Day Average: 60 ms               │
├─────────────────────────────────────┤
│ Correlations                        │
│ • Sleep 8h → HRV +12%              │
│ • Stress days → HRV -15%           │
│ • Exercise → HRV -8%, recover 24h  │
├─────────────────────────────────────┤
│ Interpretation                      │
│ Parasympathetic dominant, well rested│
│ Recommended: Light activity today   │
└─────────────────────────────────────┘
```

**ML Opportunities:**
- Stress classification: HRV thresholds for stress detection
- Illness prediction: HRV patterns predict infection onset
- Overtraining detection: HRV decline with high training volume
- Recovery scoring: Multi-factor recovery index

**Sources:**
- [Understanding Shortcomings of HRV as Autonomic Tool - Frontiers](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2026.1760160/full)
- [Monitoring Training Adaptation via HRV - MDPI Sensors](https://www.mdpi.com/1424-8220/26/1/3)
- [Heart Rate Variability in Sports: Multi-Signal Integration - Frontiers](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2026.1720495/full)
- [Mapping HRV in Sports: From Monitoring to ML - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12833080/)

---

## 4. Sleep Quality & Circadian Rhythm

### 4.1 Clinical Significance

**Health Impact:**
- Sleep deprivation linked to obesity, diabetes, cardiovascular disease
- Poor sleep quality impairs immune function
- Circadian misalignment increases cancer, metabolic disease risk
- Recovery and athletic performance depend on sleep quality

### 4.2 Sleep Architecture & Stages

**Sleep Cycle (90 minutes):**
1. **Light Sleep (N1):** 2-5% of night (transition)
2. **N2 Sleep:** 45-55% of night (memory consolidation)
3. **Deep Sleep (N3/SWS):** 13-23% of night (physical recovery)
4. **REM Sleep:** 20-25% of night (mental processing, dreaming)

**Optimal Distribution:**
- Deep sleep: 1-2 hours per night (13-23%)
- REM sleep: 1.5-2 hours per night (20-25%)
- Total efficiency: >85% (time asleep / time in bed)

### 4.3 Data Sources

**Wearable Sleep Trackers:**
- **Accuracy Levels:**
  - EEG-based (Muse S Athena): 88-96% vs polysomnography (PSG)
  - Chest/wrist PPG + accelerometer: 70-86% sensitivity
  - Passive wearables (Oura Ring): ~75% alignment with PSG

- **Sensors:**
  - Photoplethysmography (PPG): heart rate/HRV
  - Skin temperature: circadian rhythm, sleep onset
  - Galvanic skin response (GSR): arousal detection
  - Motion sensors: position, restlessness

**Smartwatches (2026):**
- Apple Watch, Garmin, Samsung Galaxy Watch
- Moderate accuracy; good for trends
- Limited to sleep-wake vs stage detection

### 4.4 Sleep Metrics & Thresholds

| Metric | Optimal Range | Alert Threshold |
|---|---|---|
| Total Sleep | 7-9 hours | <6 hours or >10 hours |
| Sleep Efficiency | >85% | <75% |
| Deep Sleep % | 13-23% | <10% |
| REM Sleep % | 20-25% | <15% |
| Sleep Latency | 10-20 min | >30 min |
| WASO (Wakefulness) | <5% | >15% |
| Circadian Phase | Consistent ±30 min | Shift >2 hours |

### 4.5 Circadian Rhythm Analysis

**Key Markers:**
- Sleep midpoint timing (when peak sleep occurs)
- Chronotype (early bird vs night owl)
- Temperature nadir (lowest body temp, indicates circadian phase)

**Circadian Health:**
- Consistent sleep/wake times align with natural rhythm
- Misalignment (shift work, jet lag) increases disease risk
- Temperature monitoring can track circadian adjustment

### 4.6 Aven Integration Strategy

**Data Collection:**
```
Sleep Device (PPG/EEG) → Mobile App → Backend → Time-Series DB
                                           ↓
                          Sleep Stage Classification
                                           ↓
                        Circadian Analysis + Trends
```

**Insight Generation:**
1. **Sleep Quality Score:** Multi-factor index (duration, efficiency, stages)
2. **Recovery Status:** Link sleep quality to HRV recovery
3. **Circadian Health:** Track consistency, detect phase shifts
4. **Correlations:** Sleep quality vs stress, exercise, caffeine timing
5. **Predictions:** Predict poor sleep based on activity, stress patterns

**Alert Conditions:**
- <6 hours sleep for 2+ nights → health risk
- Sleep efficiency <75% for 3+ nights → insomnia alert
- Circadian phase shift >2 hours from baseline → adjustment needed
- REM/deep sleep drops >20% → recovery concern

**Dashboard Display:**
```
┌─────────────────────────────────────┐
│ Sleep & Recovery                    │
│ Last Night: 7h 22m (excellent) ✓   │
├─────────────────────────────────────┤
│ Sleep Stages                        │
│ Deep: 1h 15m (18%) ✓               │
│ REM: 1h 38m (22%) ✓                │
│ Light: 4h 29m (60%) ✓              │
├─────────────────────────────────────┤
│ Metrics                             │
│ Efficiency: 92% (excellent)         │
│ Latency: 12 min (good)             │
│ WASO: 3% (excellent)               │
├─────────────────────────────────────┤
│ Circadian Rhythm                    │
│ Sleep Midpoint: 2:45 AM            │
│ Consistency: ±18 min (good)        │
│ Chronotype: Slightly Evening       │
├─────────────────────────────────────┤
│ 7-Day Trend                         │
│ Avg Sleep: 7h 15m                  │
│ Deep Sleep: 18% avg                │
│ Sleep Quality Score: 85/100        │
└─────────────────────────────────────┘
```

**ML Opportunities:**
- Sleep quality prediction: forecast sleep quality from daily factors
- Circadian disruption detection: identify abnormal patterns
- REM/Deep optimization: recommend timing adjustments
- Insomnia classification: differentiate onset, maintenance, early-morning

**Sources:**
- [Multisensory Wearable Technology for Sleep Monitoring - MedLink](https://www.medlink.com/articles/multisensory-wearable-technology-to-monitor-sleep-and-circadian-rhythms)
- [Best Sleep Devices for Tracking 2026 - Muse Headband](https://choosemuse.com/blogs/news/best-sleep-devices-for-tracking-and-improving-sleep-2026)
- [Reliability in Wearable Devices for Sleep Staging - npj Digital Medicine](https://www.nature.com/articles/s41746-024-01016-9)
- [Circadian Phase and Sleep Architecture Interrelationships - PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12011970/)

---

## 5. Lipid Panel & Cardiovascular Risk

### 5.1 Clinical Significance

**Role:**
- Lipids are transport molecules for cholesterol and fats
- Abnormal lipid profiles → atherosclerosis → MI, stroke, peripheral disease
- "Silent" risk factor (no symptoms until advanced)

### 5.2 Lipid Components & Reference Ranges

| Metric | Optimal | Borderline | High Risk |
|---|---|---|---|
| **Total Cholesterol** | <200 | 200-239 | ≥240 |
| **LDL Cholesterol** | <100 | 100-129 | ≥160 |
| **HDL Cholesterol** | >40 (men), >50 (women) | — | <40 (men), <50 (women) |
| **Triglycerides** | <150 | 150-199 | ≥200 |
| **LDL:HDL Ratio** | <2.5 | 2.5-5 | >5 |
| **TC:HDL Ratio** | <3.5 | 3.5-5 | >5 |

### 5.3 Individual Risk Stratification (2026 ACC/AHA)

**LDL Targets by Risk:**
- **Low Risk:** LDL <100 mg/dL
- **Intermediate Risk:** LDL <70 mg/dL
- **High Risk** (prior MI/stroke): LDL <55 mg/dL
- **Very High Risk** (established CVD + risk factors): LDL <40 mg/dL

### 5.4 Advanced Lipid Metrics

**Emerging 2026 Recommendations:**
- **Apolipoprotein B (ApoB):** Better predictor than LDL; captures all atherogenic particles
- **Lipoprotein(a) [Lp(a)]:** Genetic risk factor; stable across life
- **Small Dense LDL:** More atherogenic subtype
- **Remnant Cholesterol:** Reflects triglyceride-rich particles

### 5.5 Data Sources

**Fasting Lipid Panel:**
- Collected via lab (LabCorp, Quest)
- Requires 9-12 hour fast for triglycerides accuracy
- Usually ordered annually or per physician request
- Can upload via blood report OCR

**Non-Fasting Alternatives:**
- Becoming more common (reduced TG overestimation)
- Easier for patients (no fasting required)

### 5.6 Aven Integration Strategy

**Data Collection:**
```
Lab Upload (PDF/OCR) → Parse Values → FHIR DiagnosticReport
                                      ↓
                         Normalize to Mg/dL
                                      ↓
                         Risk Assessment Algorithm
```

**Insight Generation:**
1. **Lipid Panel Interpretation:** Flag abnormal values with clinical context
2. **Cardiovascular Risk Score:** Calculate 10-year ASCVD risk
3. **Trend Tracking:** Monitor lipid movement across panels (6-month intervals)
4. **Treatment Response:** Track LDL reduction on statin therapy
5. **ApoB Tracking:** Advanced users get atherogenic particle burden

**Alert Conditions:**
- LDL >160 mg/dL (high) → recommend statin evaluation
- Triglycerides >200 mg/dL → metabolic concern
- HDL <40 men/<50 women (low) → cardiovascular risk
- LDL decrease <20% after 6 weeks on statin → adherence/dose issue

**Dashboard Display:**
```
┌──────────────────────────────────────┐
│ Lipid Panel (Last: 6 months ago)    │
│ Status: ELEVATED RISK ⚠️             │
├──────────────────────────────────────┤
│ LDL Cholesterol: 145 mg/dL (high) ↑ │
│ HDL Cholesterol: 35 mg/dL (low) ↓   │
│ Triglycerides: 180 mg/dL (borderline)│
│ Total Cholesterol: 245 mg/dL (high) │
├──────────────────────────────────────┤
│ Ratios                               │
│ LDL:HDL Ratio: 4.1 (moderate risk)  │
│ TC:HDL Ratio: 7.0 (high risk)       │
├──────────────────────────────────────┤
│ Cardiovascular Risk                  │
│ 10-Year ASCVD Risk: 12% (borderline) │
│ LDL Target (your risk): <70 mg/dL   │
│ Current Gap: +75 mg/dL              │
├──────────────────────────────────────┤
│ Recommendations                      │
│ • Schedule lipid panel in 3 months  │
│ • Discuss statin with provider      │
│ • Increase exercise (HDL boost)     │
│ • Reduce saturated fats             │
└──────────────────────────────────────┘
```

**Trend Analysis:**
- If on statin therapy: track LDL reduction % over 8-12 weeks
- Monitor triglyceride/HDL improvement with lifestyle
- Alert if values worsen despite therapy

**ML Opportunities:**
- Predict lipid levels from lifestyle factors (diet, exercise)
- Identify non-responders to statins early
- Estimate ASCVD risk trajectory

**Sources:**
- [LDL Cholesterol: Understanding Results - HealthMatters](https://healthmatters.io/understand-blood-test-results/ldl-c)
- [2026 Cholesterol Guidelines - Cardiovascular Health Clinic](https://cvhealthclinic.com/news/2026-cholesterol-guidelines-heart-health/)
- [2026 ACC/AHA Dyslipidemia Guideline - Circulation](https://www.ahajournals.org/doi/10.1161/CIR.0000000000001423)
- [LDL-Triglyceride Content Equation for Risk Stratification - PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11543484/)

---

## 6. HbA1c: Long-Term Glucose Control

### 6.1 Overview

**What It Measures:**
- Glucose attached to hemoglobin protein in red blood cells
- Reflects average glucose over 90-day lifespan of RBC
- Most important marker for diabetes control assessment

### 6.2 Reference Ranges & Diagnostic Thresholds

| Range | Status | Action |
|---|---|---|
| <5.7% | Normal | No diabetes |
| 5.7-6.4% | Prediabetes | Lifestyle intervention |
| ≥6.5% | Diabetes Diagnostic | Medical management |
| <7% | Well-Controlled (Most patients) | Continue current therapy |
| <6.5% | Tight Control (Intensive management) | High hypoglycemia risk |
| >8% | Poor Control | Treatment intensification needed |

### 6.3 Clinical Significance

**Complications Risk Reduction:**
- Each 1% A1c reduction = 35-76% decrease in microvascular complications (retinopathy, nephropathy, neuropathy)
- Tighter control (6-6.5%) helps prevent progression but risks hypoglycemia
- 2026 guidelines emphasize individualized targets (not one-size-fits-all)

### 6.4 Factors Affecting Accuracy

**Conditions That Reduce A1c Reliability:**
- Hemolytic anemia
- Hemoglobinopathies (sickle cell, thalassemia)
- Pregnancy
- Recent blood transfusion
- Rapid RBC turnover

**2026 Recommendation:**
- Use A1c + CGM metrics for comprehensive assessment
- A1c alone insufficient for diabetes management

### 6.5 Aven Integration Strategy

**Data Collection:**
```
Lab Test Results → PDF Upload/OCR → Parse A1c Value
                                    ↓
                         Calculate eA1c from CGM (if available)
                                    ↓
                         Compare A1c vs CGM-derived estimate
```

**Insight Generation:**
1. **A1c Trend:** Track over quarters/years (goal: declining or stable)
2. **A1c vs GMI Alignment:** Compare lab A1c vs CGM-estimated A1c (should align)
3. **Target Status:** Show progress to individual target
4. **Complication Risk:** Calculate microvascular/macrovascular risk reduction at current A1c
5. **Intervention Impact:** Show A1c change after medication/lifestyle changes

**Alert Conditions:**
- A1c >8% → treatment intensification recommended
- Rising A1c trend (2+ consecutive tests) → therapy adjustment needed
- Discrepancy between A1c and CGM GMI >1% → investigate (lab error? recent changes?)

**Dashboard Display:**
```
┌────────────────────────────────────┐
│ Long-Term Glucose Control          │
│ Last A1c: 7.2% (3 months ago)      │
│ Status: NEAR TARGET ✓              │
├────────────────────────────────────┤
│ A1c Trend                          │
│ 3 months ago: 7.2% ✓               │
│ 6 months ago: 7.5% (improving)    │
│ 12 months ago: 7.8% (good progress)│
│ Trend: ↓ Declining (goal)          │
├────────────────────────────────────┤
│ Your Target: <7% (balanced)        │
│ Gap to Target: +0.2%              │
│ Expected to reach target: ~2 months│
├────────────────────────────────────┤
│ CGM Comparison                     │
│ A1c (lab): 7.2%                   │
│ GMI (from CGM): 7.0%              │
│ Alignment: Good (0.2% diff)       │
├────────────────────────────────────┤
│ Complication Risk Reduction        │
│ At A1c 7.2%, you reduce risk of:  │
│ • Retinopathy: ~40% reduction     │
│ • Nephropathy: ~35% reduction     │
│ • Neuropathy: ~30% reduction      │
└────────────────────────────────────┘
```

**Next Lab Recommendation:**
- After medication change: 8-12 weeks
- At target: 6-month intervals
- Monitoring compliance: 3-month intervals

**Sources:**
- [Glycemic Goals, Hypoglycemia, Hyperglycemic Crises: 2026 ADA Standards - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12690178/)
- [Hemoglobin A1C - StatPearls NCBI](https://www.ncbi.nlm.nih.gov/books/NBK549816/)
- [A View Beyond HbA1c: CGM Role - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6531520/)

---

## 7. Oxygen Saturation (SpO2) & Respiratory Health

### 7.1 Clinical Significance

**What It Measures:**
- Percentage of hemoglobin saturated with oxygen
- Reflects respiratory and cardiovascular efficiency
- Critical for all tissue oxygenation

### 7.2 Reference Ranges

| SpO2 Level | Status | Action |
|---|---|---|
| 95-100% | Normal | OK |
| 90-94% | Low-Normal | Monitor, investigate if new |
| 85-89% | Hypoxemia | Medical evaluation needed |
| <85% | Severe Hypoxemia | Emergency care |

**Clinical Notes:**
- Normal range is population-dependent (altitude, age, lung disease)
- SpO2 <92% in asymptomatic = concerning
- SpO2 naturally drops during sleep (by 3-5%), more in REM

### 7.3 Wearable SpO2 Accuracy (2026)

**2026 Validation Study Results:**

| Device | <88% SpO2 Accuracy | Bias | Issue |
|---|---|---|---|
| Masimo MightySat Rx | 3.52% error | ±2% | Better at low SpO2 |
| Apple Watch Series 7 | 5.82% error | +2.7% (overestimate) | Misses hypoxemia |

**Key Finding:**
- Apple Watch tends to overestimate SpO2
- Likely to miss actual hypoxemia (read normal when truly low)
- Masimo devices more reliable but still have limitations

**General Wearable Limitations:**
- Performance degrades with motion
- Less accurate at low SpO2 (<88%)
- Darker skin tones may affect optical sensors (bias issue)
- Individual variation in readings

### 7.4 Data Sources

**Continuous Wearable Monitoring:**
- Apple Watch Series 7/8/9
- Smartwatches with SpO2 sensor
- Chest straps (e.g., fitness monitors)
- Finger pulse oximeters (most accurate)

**Clinical Pulse Oximetry:**
- Hospital/clinic SpO2 readings (gold standard)
- Used during sleep studies (polysomnography)

### 7.5 Aven Integration Strategy

**Data Collection:**
```
Wearable SpO2 → Mobile App → Backend → Time-Series DB
                                  ↓
                      Flag Quality (confidence score)
                                  ↓
                      Normalize + Alert on Abnormal
```

**Special Handling:**
- Track SpO2 during DIFFERENT activities (sleep vs exercise vs rest)
- Tag readings with motion/activity context (context matters)
- Show confidence score with reading (device certainty)
- Alert on sustained low readings (not single spike)

**Insight Generation:**
1. **Baseline Establishment:** Identify patient's normal range (95-100 vs 93-96)
2. **Sleep Apnea Detection:** Monitor SpO2 drops during sleep (dips >4% = abnormal)
3. **Exercise Response:** Track SpO2 during activity (should stay ≥90%)
4. **Trend Analysis:** Monitor for decline over weeks/months
5. **Hypoxemia Alerts:** Flag sustained <92% for medical evaluation

**Alert Conditions:**
- SpO2 <92% for >10 consecutive minutes → urgent alert
- Repeated SpO2 drops >4% during sleep → sleep apnea screening recommended
- Declining trend: 3% drop over 3 months → investigate
- Low during exertion: SpO2 <85% with activity → concerning

**Dashboard Display:**
```
┌────────────────────────────────────┐
│ Oxygen Saturation (SpO2)           │
│ Current (resting): 97% ✓           │
├────────────────────────────────────┤
│ Readings Today                     │
│ 8:00 AM (resting): 98%            │
│ 10:30 AM (during walk): 94%       │
│ 2:00 PM (resting): 97%            │
│ 7:00 PM (exercise): 92%           │
├────────────────────────────────────┤
│ Sleep Data (Last Night)            │
│ Average: 95%                       │
│ Lowest: 88% (4 dips below 90%)    │
│ Pattern: ⚠️ Possible apnea events │
├────────────────────────────────────┤
│ 7-Day Trend: Stable 96-98%        │
│ Status: NORMAL ✓                   │
├────────────────────────────────────┤
│ Note: Apple Watch readings         │
│ (Confidence: Moderate due to motion)
│                                    │
│ Recommendation:                    │
│ Consider sleep study given apnea   │
│ pattern during sleep              │
└────────────────────────────────────┘
```

**ML Opportunities:**
- Sleep apnea detection: HMM for SpO2 drop patterns
- Hypoxemia prediction: alert before critical dips
- Activity-specific baselines: separate sleep/exercise/rest norms

**Critical Design Note:**
Due to wearable inaccuracy at low SpO2, don't rely solely on smartwatch for clinical SpO2 decisions. Always recommend clinical validation for abnormal readings.

**Sources:**
- [Performance of Wearable Pulse Oximetry During Controlled Hypoxia - JMIR Formative](https://formative.jmir.org/2026/1/e85253)
- [Wearable Pulse Oximeters for Prompt Hypoxemia Detection - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC8889481/)
- [Evaluation of Smartwatches for Hypoxemia Detection - MDPI Sensors](https://www.mdpi.com/1424-8220/23/22/9164)

---

## 8. Body Mass Index (BMI) & Body Composition

### 8.1 Clinical Significance & Limitations

**Traditional BMI:**
- Simple height/weight ratio: weight(kg) / height²(m²)
- **2026 Finding:** Misclassifies >33% of people (normal weight but high body fat)
- Doesn't account for muscle mass, fat distribution

### 8.2 BMI Categories (WHO Standard)

| BMI | Classification | Health Risk |
|---|---|---|
| <18.5 | Underweight | Nutritional, bone health risks |
| 18.5-24.9 | Normal Weight | Lowest risk |
| 25-29.9 | Overweight | Moderate increased risk |
| 30-34.9 | Obesity Class I | Increased risk |
| 35-39.9 | Obesity Class II | High risk |
| ≥40 | Obesity Class III | Very high risk |

### 8.3 2026 Updated Assessment Approach

**metBMI (Metabolic BMI):**
- Includes metabolic factors: glucose, insulin, lipids, CRP, BP
- Identifies "metabolically unhealthy normal weight" people
- Better predictor of disease risk than traditional BMI alone

**Measurement Methods (Preference Order):**
1. **DXA (Dual-Energy X-ray Absorptiometry):** Gold standard; body fat %
2. **BodPod:** Air displacement; accurate for body composition
3. **DEXA/BodPod:** Only available in clinics
4. **Bioimpedance:** Affordable wearables (Withings, Omron)
5. **Tape Measurement:** Waist circumference (proxy for visceral fat)
6. **Photogrammetry:** Phone camera 3D body scans (emerging)

### 8.4 Body Composition Metrics

**Key Measurements:**
- **Body Fat %:** Ideal ranges by age/sex (varies 10-20% for women, 15-25% for men)
- **Visceral Fat:** Fat around organs (most metabolically active, most dangerous)
- **Muscle Mass:** Lean body mass (higher = metabolic protection)
- **Waist Circumference:** >40" men / >35" women = elevated risk

### 8.5 Metabolically Healthy Obesity (MHO)

**Definition:**
- BMI ≥30 (obese by traditional definition)
- BUT metabolically healthy: normal glucose, lipids, BP, no inflammation

**2026 Evidence:**
- ~30% of people with high BMI are metabolically healthy
- Still have some increased disease risk (not zero)
- May benefit more from fitness than weight loss

### 8.6 Aven Integration Strategy

**Data Collection:**
```
Manual Entry (Height/Weight) → Calculate BMI
                              ↓
        Optional: Bioimpedance → Body Fat %
                              ↓
        Optional: Lab Metabolic Panel → metBMI
                              ↓
            Composite Metabolic Health Score
```

**Insight Generation:**
1. **BMI Tracking:** Monitor weight/BMI trends (goal: stable or gradual loss if overweight)
2. **Body Composition:** If available, track fat % vs muscle % (not just total weight)
3. **Metabolic Health:** Combine BMI + glucose + lipids + BP into single metabolic score
4. **Waist Circumference:** Monitor visceral fat proxy
5. **Weight Loss Progress:** If on diet, show % goal completion + timeline to goal

**Alert Conditions:**
- Rapid weight gain (>2 lbs/week for 2+ weeks) → investigate
- BMI entering obesity class → lifestyle intervention recommended
- metBMI unhealthy despite normal BMI → metabolic intervention
- Waist circumference increasing despite stable weight → visceral fat gain

**Dashboard Display:**
```
┌──────────────────────────────────┐
│ Weight & Body Composition         │
│ Current Weight: 185 lbs          │
│ BMI: 28.4 (overweight) ⚠️        │
├──────────────────────────────────┤
│ Traditional Assessment           │
│ Height: 5'11"                   │
│ BMI Status: Overweight           │
│ Metabolic Status: HEALTHY ✓      │
│ → Likely low disease risk        │
├──────────────────────────────────┤
│ Body Composition (Bioimpedance)  │
│ Body Fat: 24% (elevated)         │
│ Muscle Mass: 142 lbs (good)      │
│ Visceral Fat: 85 (borderline)    │
│ Water: 60% (normal)              │
├──────────────────────────────────┤
│ Metabolic Health Score: 7/10     │
│ • Glucose: Normal ✓              │
│ • Lipids: Good ✓                 │
│ • BP: Normal ✓                   │
│ • Inflammation (CRP): Low ✓      │
├──────────────────────────────────┤
│ Trend (3 months)                 │
│ Weight: ↑ +3 lbs (slight gain)   │
│ Body Fat %: ↑ +1% (worrying)     │
│ Muscle: → Stable                 │
├──────────────────────────────────┤
│ Recommendation                   │
│ Focus on body composition,       │
│ not just weight. Increase        │
│ resistance training to build     │
│ muscle + reduce body fat %.      │
└──────────────────────────────────┘
```

**ML Opportunities:**
- Predict weight change from activity, calorie intake
- Identify "metabolically unhealthy normal weight" risk
- Estimate sustainable weight loss timeline
- Personalize calorie/macronutrient targets

**Sources:**
- [BMI Misclassification Study 2026 - ScienceDaily](https://www.sciencedaily.com/releases/2026/04/260402000229.htm)
- [Impact of 2025 Lancet Diagnostic Criteria on Obesity - Clinical Obesity](https://onlinelibrary.wiley.com/doi/10.1111/cob.70050)
- [Metabolic Tool Predicts Obesity Risks at Normal BMI - Medscape](https://www.medscape.com/viewarticle/metabolic-tool-predicts-obesity-risks-even-normal-bmi-2026a10002ut)
- [Metabolically Healthy vs Unhealthy Obesity - International Journal of Obesity](https://www.nature.com/articles/s41366-023-01425-y)

---

## 9. Kidney Function (Creatinine & eGFR)

### 9.1 Clinical Significance

**Why Monitor:**
- Kidneys filter waste, regulate electrolytes, produce hormones
- Chronic kidney disease (CKD) often asymptomatic until advanced
- Early detection enables intervention before dialysis need

### 9.2 Reference Ranges & CKD Stages

| Stage | eGFR | Description | Action |
|---|---|---|---|
| 1 | ≥90 | Normal, but kidney damage present | Monitor |
| 2 | 60-89 | Mild loss of kidney function | Monitor annually |
| 3a | 45-59 | Moderate loss | Monitor 1-2x/year |
| 3b | 30-44 | Moderate loss (more severe) | Monitor 2-4x/year |
| 4 | 15-29 | Severe loss | Close monitoring, plan for kidney replacement |
| 5 | <15 | Kidney failure | Dialysis or transplant |

**Normal Creatinine:**
- Men: 0.7-1.3 mg/dL
- Women: 0.6-1.1 mg/dL
- Varies by age, muscle mass

### 9.3 eGFR Calculation

**CKD-EPI Formula (2021 Update):**
- Incorporates creatinine, cystatin C (more accurate)
- Age, sex, race adjustments
- More accurate than older MDRD formula

**Key Point:**
- Small creatinine increases can indicate significant kidney loss (especially in elderly/low muscle mass)
- Must use proper formula, not just creatinine alone

### 9.4 Additional Kidney Markers

**Urinary Albumin-to-Creatinine Ratio (UACR):**
- Detects early kidney damage (proteinuria)
- Normal: <30 mg/g creatinine
- Microalbuminuria: 30-300 mg/g (kidney damage developing)
- Macroalbuminuria: >300 mg/g (significant proteinuria)

**Cystatin C:**
- More sensitive than creatinine alone
- Less affected by muscle mass/age
- Better for elderly, cachectic patients

### 9.5 Risk Factors for CKD

- Diabetes (most common cause)
- Hypertension
- Chronic kidney disease family history
- Recurrent kidney infections
- Kidney stones
- Autoimmune diseases
- Age >60

### 9.6 Aven Integration Strategy

**Data Collection:**
```
Lab Test Upload → Parse eGFR, Creatinine, UACR
                              ↓
                        CKD Stage Classification
                              ↓
                      Risk Stratification Algorithm
                              ↓
                   Personalized Monitoring Schedule
```

**Insight Generation:**
1. **CKD Stage Assessment:** Classify kidney function level
2. **Trend Analysis:** Monitor eGFR decline rate (normal <1 mL/min/year; >3 = rapid decline)
3. **UACR Status:** Flag proteinuria development
4. **Medication Review:** Check if current meds nephrotoxic (NSAIDs, ACE-I/ARB appropriate?)
5. **Risk Reduction:** Calculate CVD risk (CKD patients high CV risk)

**Alert Conditions:**
- eGFR drop >10 in 3 months → investigate cause
- New proteinuria (UACR increase) → intervention recommended
- Creatinine rising despite stable appearance → early CKD sign
- eGFR <60 → CKD diagnosis; increased monitoring needed

**Dashboard Display:**
```
┌──────────────────────────────────────┐
│ Kidney Function                      │
│ Last Test: 2 months ago             │
│ Status: CKD Stage 2 (Mild) ⚠️       │
├──────────────────────────────────────┤
│ Key Markers                          │
│ eGFR: 72 mL/min/1.73m² (Stage 2)   │
│ Creatinine: 1.1 mg/dL (normal)     │
│ UACR: 28 mg/g (normal, no protein) │
├──────────────────────────────────────┤
│ eGFR Trend                           │
│ Current: 72 (stable)                │
│ 6 months ago: 74                    │
│ 12 months ago: 75                   │
│ Trend: → Stable (-1/year, normal)   │
├──────────────────────────────────────┤
│ CKD Risk Factors                     │
│ • Hypertension: Yes (BP controlled) │
│ • Diabetes: No                       │
│ • Age: 58 years                      │
│ • Family history: Unknown            │
├──────────────────────────────────────┤
│ Recommendations                      │
│ • Annual eGFR/UACR monitoring       │
│ • Continue BP control               │
│ • Avoid NSAIDs when possible        │
│ • Maintain hydration                │
│ • Schedule repeat lab in 12 months  │
└──────────────────────────────────────┘
```

**Monitoring Schedule Recommendations:**
- Stage 1-2: Annual testing
- Stage 3a: 1-2x annually
- Stage 3b: 2-4x annually
- Stage 4: 4x+ annually + specialist (nephrologist)

**ML Opportunities:**
- Predict eGFR decline trajectory (personalized)
- Estimate years to CKD progression
- Identify rapid decliners early

**Sources:**
- [KDIGO 2026 Diabetes and CKD Guideline Update - KDIGO](https://kdigo.org/wp-content/uploads/2026/03/KDIGO-2026-Diabetes-and-CKD-Guideline-Update-Public-Review-Draft-March-2026.pdf)
- [Understanding CKD Stages: Creatinine & eGFR - Medical Daily](https://www.medicaldaily.com/understanding-chronic-kidney-disease-stages-how-doctors-use-creatinine-egfr-ckd-lab-monitoring-475148)
- [2026 ADA Standards of Care: CKD and Risk Management - Diabetes Journals](https://diabetesjournals.org/care/article/49/Supplement_1/S246/163914/11-Chronic-Kidney-Disease-and-Risk-Management)

---

## 10. Inflammatory Markers (CRP, ESR)

### 10.1 Clinical Significance

**What Inflammation Indicates:**
- Active infection (bacterial, viral)
- Autoimmune/rheumatologic disease (RA, lupus)
- Cardiovascular disease risk marker
- Cancer-related inflammation
- General systemic stress state

**Key Point:**
- Nonspecific (not diagnostic alone)
- Support differential diagnosis with other findings

### 10.2 Reference Ranges

**C-Reactive Protein (CRP):**
- **Normal:** <3 mg/L
- **Mild Elevation:** 3-10 mg/L (monitor, investigate)
- **Moderate Elevation:** 10-100 mg/L (likely infection/inflammation)
- **High Elevation:** >100 mg/L (severe infection/inflammation)

**High-Sensitivity CRP (hs-CRP):**
- More sensitive measure of chronic inflammation
- **Low cardiovascular risk:** <1.0 mg/L
- **Intermediate risk:** 1.0-3.0 mg/L
- **High risk:** >3.0 mg/L

**ESR (Erythrocyte Sedimentation Rate):**
- Less specific; slower to change than CRP
- Normal: <20 mm/hour (varies by age, sex)
- Primarily used to monitor chronic conditions

### 10.3 CRP vs ESR

| Property | CRP | ESR |
|---|---|---|
| Changes after | 6-8 hours | 24-48 hours |
| Peaks | 48 hours | 3-5 days |
| Sensitivity | High for acute | Moderate |
| Specificity | Low | Low |
| Recommended for | Acute infection detection | Monitoring chronic disease |

**2026 Clinical Preference:**
- CRP preferred over ESR for acute inflammation detection
- Procalcitonin (PCT) more sensitive for sepsis/pneumonia

### 10.4 Clinical Contexts

**When to Check CRP:**
- Fever, chills (infection screening)
- Post-surgical monitoring (should decline)
- Autoimmune disease monitoring (disease activity)
- Cardiovascular risk assessment (hs-CRP)
- Unexplained systemic symptoms

### 10.5 Aven Integration Strategy

**Data Collection:**
```
Lab Test Upload (CRP, ESR values) → Parse Result
                                    ↓
                            Classify Severity
                                    ↓
                        Correlate with Symptoms
                                    ↓
                      Alert if Abnormal + Symptoms
```

**Insight Generation:**
1. **Inflammation Status:** Current CRP classification (normal/elevated)
2. **Trend Tracking:** Monitor CRP over time (rising vs declining)
3. **Context Understanding:** Link CRP to recent infection/symptoms
4. **Treatment Response:** Track CRP decline on antibiotics or anti-inflammatories
5. **Cardiovascular Risk:** hs-CRP as part of CV risk profile

**Alert Conditions:**
- CRP >100 mg/L + fever → urgent medical evaluation
- Rising CRP trend with symptoms → likely infection, recommend testing
- Persistently elevated hs-CRP (>3) → cardiovascular risk factor
- CRP >10 without obvious cause → investigate autoimmune, malignancy

**Dashboard Display:**
```
┌──────────────────────────────────────┐
│ Inflammatory Markers                 │
│ Last Test: 1 month ago               │
│ Status: ELEVATED ⚠️                  │
├──────────────────────────────────────┤
│ C-Reactive Protein (CRP)             │
│ Value: 8.2 mg/L (elevated)          │
│ Normal: <3 mg/L                      │
│ Status: Mild inflammation            │
├──────────────────────────────────────┤
│ ESR (Sedimentation Rate)             │
│ Value: 18 mm/hour (borderline)      │
│ Normal (age-adjusted): <20 mm/hr    │
├──────────────────────────────────────┤
│ CRP Trend                            │
│ 1 month ago: 5.2 (rising) ↑        │
│ 3 months ago: 2.1 (normal)          │
│ Trend: Worsening                     │
├──────────────────────────────────────┤
│ Clinical Context                     │
│ • Recent illness: Resolved 2 weeks  │
│ • Current fever: No                  │
│ • Joint/bone pain: No                │
│ • Fatigue: Mild                      │
├──────────────────────────────────────┤
│ Interpretation                       │
│ Mild systemic inflammation, likely  │
│ resolving from recent infection but │
│ not yet normalized.                  │
│                                      │
│ Recommendation:                      │
│ • Repeat test in 2-4 weeks         │
│ • If worsens or symptoms return:   │
│   contact provider                  │
│ • If autoimmune symptoms develop:  │
│   rheumatology referral             │
└──────────────────────────────────────┘
```

**Clinical Decision Support:**
- CRP + symptoms → infection likely
- CRP + joint pain/fatigue → autoimmune screening recommended
- Persistent hs-CRP elevation → cardiovascular risk factor; address lifestyle

**ML Opportunities:**
- Infection trajectory prediction
- Discriminate infection vs non-infectious inflammation
- CRP recovery rate after antibiotics

**Sources:**
- [C-Reactive Protein: Clinical Relevance - StatPearls NCBI](https://www.ncbi.nlm.nih.gov/books/NBK441843/)
- [Inflammation Blood Tests: ESR, CRP, PV - Patient.info](https://patient.info/treatment-medication/blood-tests/blood-tests-to-detect-inflammation)
- [Blood Test Infection Markers: CRP and ESR - Walk in Clinic London](https://www.walkinclinic.london/blog/blood-test-infection-markers-understanding-crp-and-esr)
- [Common and Novel Markers for Inflammation - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC8001241/)

---

## Aven Metrics Integration Matrix

### Data Sources Summary

```
┌─ Blood Labs (Upload/OCR)         → FHIR DiagnosticReport
│  ├─ Glucose/HbA1c
│  ├─ Lipid Panel
│  ├─ Kidney Function (eGFR, Creatinine)
│  └─ Inflammatory Markers (CRP, ESR)
│
├─ Continuous Wearables           → FHIR Observation (ongoing)
│  ├─ CGM (Glucose)
│  ├─ Blood Pressure Monitor
│  ├─ SpO2 Wearable
│  ├─ HRV (Apple Watch, Oura)
│  └─ Sleep Tracker
│
├─ Real-time IoT Sensors          → FHIR Observation (streaming)
│  └─ Temperature, HR, BP, SpO2
│
└─ Apple HealthKit (iOS Native)   → FHIR Observation
   ├─ Heart Rate
   ├─ Steps/Activity
   ├─ Sleep Stages
   └─ Workouts
```

### Correlation Opportunities (ML)

**High-Value Cross-Metric Insights:**
1. **Glucose + Sleep:** Poor sleep → elevated morning glucose
2. **HRV + CRP:** HRV drop before CRP rises (illness prediction)
3. **BP + Activity:** Exercise → temporary BP elevation → return to baseline
4. **SpO2 + Sleep:** SpO2 dips predict sleep apnea
5. **Lipids + Exercise:** Regular exercise → improved lipid profile in 8-12 weeks
6. **Body Composition + Glucose:** Weight loss → improved insulin sensitivity
7. **CRP + HRV:** Inflammation → autonomic dysfunction (low HRV)

### Risk Stratification Strategy

**Multi-Factor Risk Scoring:**
```
Score = (Glucose Risk × 0.25) + (BP Risk × 0.25) + 
        (Lipid Risk × 0.2) + (Kidney Risk × 0.15) + 
        (Inflammation Risk × 0.15)

Risk = (0-1.0 scale)
- 0-0.3: Low Risk
- 0.3-0.6: Moderate Risk
- 0.6-0.8: High Risk
- 0.8-1.0: Very High Risk
```

**Personalization:**
- Weight factors by patient risk profile
- High diabetes risk → glucose gets 40% weight
- Young healthy → cardiovascular risk reduced weighting

---

**Document Version:** 1.0  
**Last Updated:** June 2026  
**Scope:** 10 Core Health Metrics for Aven Platform  
**Use:** Detailed implementation guide for metric dashboards, alerts, and AI/ML insights

*Import to Obsidian with tags: #aven-metrics #glucose #bloodpressure #heartrate #sleep #lipids #oxygen #bodymass #kidney #inflammation*
