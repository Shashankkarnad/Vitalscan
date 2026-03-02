# VitalScan

> Apple Health analytics engine. Parses 5 years of biometric data from Apple Watch + smart ring exports and generates a clinical health dashboard.

---

## Context for Claude Code

This project was started in Claude.ai. Full session transcript with all decisions, product strategy, and engineering context is at:

```
/mnt/transcripts/2026-02-27-05-30-01-vitalscan-health-dashboard-production-planning.txt
```

**Read the transcript before writing any code.** It contains:
- Every product decision and why
- All 5 math bugs found and fixed in v0.2
- ML model decisions and limitations
- Business model (freemium, $29 premium, doctor letter)
- Competitive analysis vs Whoop/Oura
- User persona: health-anxious (suspects something is wrong)
- MESA dataset plan for population-level ML

---

## Project Status

**Current version: v0.2**

### What's done
- ✅ Python parsing pipeline (`backend/parser.py`) — all 5 audit bugs fixed
- ✅ Full HTML dashboard (`frontend/dashboard.html`) — 11 charts, dark medical theme
- ✅ FastAPI skeleton (`backend/main.py`) — POST /analyze endpoint stubbed
- ✅ Clinical thresholds all verified against published guidelines

### What's next (in priority order)
1. Wire FastAPI to parser — make `/analyze` actually work end-to-end
2. Test with Vedant's real ZIP (`~/vedant_data/` or re-upload)
3. Build Next.js upload page (drag-drop ZIP → loading → dashboard)
4. Add background job queue for large exports (400MB takes 30–60s to parse)
5. Verdict screen (free tier — top 3 findings only, rest blurred/paywalled)
6. Doctor letter template (premium feature, $29 one-time)

---

## How We Work

**Daily cadence. One task at a time. Review together before moving on.**

- Vedant (user) = Product / UX / Strategy
- Claude = All engineering

Vedant does not write code. Every decision gets a brief explanation before building.

---

## The 5 Bugs Fixed in v0.2

All fixed in `backend/parser.py`:

| # | Bug | Impact | Fix |
|---|-----|--------|-----|
| 1 | SpO₂: conditional ×100 | 299 records showing as 1% instead of 100% | Always multiply by 100 |
| 2 | Steps: HART + iPhone double-counted | Jan inflated 408K→291K (−29%), Feb 437K→278K (−36%) | Minute-level deduplication |
| 3 | HRV: averaging all-day readings | 45.5ms reported, correct is 42.7ms | Morning (2–9 AM) only |
| 4 | "kabra's iPhone" included | Another person's data in the export | Excluded source entirely |
| 5 | HART treated as unvalidated | Sleep staging source questioned | Confirmed as smart ring, trusted |

---

## Architecture

```
vitalscan/
├── backend/
│   ├── parser.py        # Apple Health XML parser (v0.2, all bugs fixed)
│   ├── main.py          # FastAPI app (skeleton — needs wiring)
│   └── requirements.txt
├── frontend/
│   └── dashboard.html   # Full dashboard (static, hardcoded Vedant's data)
│                        # Next step: make it accept dynamic JSON from API
├── docs/
│   └── decisions.md     # Product decisions log
└── README.md
```

### Data flow (target)
```
User uploads ZIP
    → POST /analyze
    → parser.py parses XML in memory
    → Returns structured JSON
    → Next.js frontend renders dashboard from JSON
    → Free tier: top 3 findings only
    → Paywall → $29 → full report + PDF + doctor letter
```

---

## Clinical Reference

All thresholds sourced from published guidelines:

| Metric | Threshold | Source |
|--------|-----------|--------|
| SpO₂ normal | >95% | AHA / WHO |
| SpO₂ OSA screen | <88% recurring | AASM |
| RHR elevated | >70 bpm sustained | Framingham Heart Study |
| HRV low (M 20–30) | <35ms SDNN | Shaffer & Ginsberg 2017 |
| HRV expected (M 23) | 60–80ms SDNN | Nunan et al. 2010 |
| Sleep minimum | 7h/night | AAS + CDC |
| BMI overweight | >25 | WHO |
| VO₂ Max avg (M 20–29) | 42–50 mL/kg/min | ACSM |

---

## ML Decisions

### Current models (within-person)
- **Poor Sleep Predictor**: AUC 0.60 ± 0.089, n=30. Weak but honest. Steps is primary predictor.
- **HRV Crash Predictor**: Cannot train — 18-month data gap (HRV ended Aug 2024, HR resumed Jan 2026).

### Planned: Population-level detection (MESA dataset)
- Apply for MESA Sleep Study data via BioLINCC (free for research, 1–2 week approval)
- Train OSA screening model on 2,000+ clinically diagnosed patients
- Expected AUC: 0.85–0.92 vs current 0.60
- Timeline: 4–6 weeks of model development once data access approved
- This is the key ML upgrade — detection not prediction

### Framing rule
Never say "our AI detected X". Say "your data shows a pattern that clinical guidelines flag as worth investigating." This is accurate, defensible, and what the health-anxious persona trusts.

---

## Vedant's Profile (test subject)

- Male, age 23, DOB 2001-11-24
- 172.7cm, 75.1kg, BMI 25.2, body fat 24.4%
- VO₂ Max: 42.0 mL/kg/min
- Data: Apple Watch + HART smart ring
- 5 years of data (Feb 2021 – Feb 2026)
- Key findings: elevated RHR (73 bpm, 3yr flat), suppressed HRV (42.7ms), good sleep architecture, genuine activity increase (+39% from Aug 2025 low)

---

## Running Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
python main.py
# API at http://localhost:8000

# Test parser directly
python parser.py path/to/export.zip output.json

# Frontend (static for now)
open frontend/dashboard.html
```

---

## Business Model

- **Free**: Upload ZIP → Top 3 findings only (verdict screen)
- **Premium**: $29 one-time → Full report + PDF export + Doctor letter
- **Doctor letter**: 1–2 page clinical summary formatted for GP appointment. Unique differentiator — no competitor has this.

Target user: Apple Watch owner who suspects something is wrong and wants answers before paying for a doctor.

---

## Competitive Position

| Feature | Whoop/Oura | VitalScan |
|---------|-----------|-----------|
| Hardware required | Yes ($200+) | No |
| Works with Apple Watch | No | Yes |
| Historical analysis (years) | No | Yes |
| Clinical pattern detection | No | Yes |
| Personalised ML | No | Yes |
| One-time cost | No | Yes ($29) |

Real risk: Apple builds this natively. But they've had the data for 10 years and still show basic charts — FDA liability makes them move slowly on clinical features.
