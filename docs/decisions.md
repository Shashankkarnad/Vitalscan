# VitalScan — Product Decisions Log

Decisions made during Claude.ai sessions. Append new decisions here as the project evolves.

---

## Session 1 — Feb 27 2026

### User persona
**Health-anxious** (suspects something is wrong, wants answers before booking a doctor).
Not: fitness optimizer, data nerd, Whoop user.

Core promise: "A doctor-level analysis of your health data in 60 seconds."

### Business model
- Free: Top 3 findings only (verdict screen). Full report blurred.
- Premium: $29 one-time → full report + PDF + doctor letter.
- No subscription. One-time feels right for health-anxious persona.
- Doctor letter is the key premium differentiator — no competitor has it.

### User flow
```
Landing → Upload ZIP → Processing (30–60s) → FREE: Verdict + Top 3 Findings → PAID: Full Report → PDF / Doctor Letter
```

### Competitive differentiation vs Whoop/Oura
- No hardware required — works with existing Apple Watch (100M+ users)
- Years of historical analysis vs today's recovery score
- Clinical pattern detection vs black-box wellness scores
- Data portability — Apple Health is open, competitors lock data

### Step count deduplication decision
Use **minute-level overlap detection** between iPhone and HART ring.
When both sources record steps in the same minute, the higher-priority source wins.
Priority: Apple Watch (1) > iPhone (2) > HART ring (3).
This is the most accurate method and aligns with how Apple Health deduplicates internally.

### HRV methodology
Use **morning readings only (2–9 AM)** per Shaffer & Ginsberg 2017.
All-day averaging inflates by 2.9ms and is not clinically validated.
Fall back to all-day mean only if no morning readings exist.

### ML strategy
- **Now**: Within-person logistic regression. Honest about AUC (0.60). Don't overclaim.
- **6 months**: Apply for MESA dataset. Train population-level OSA detection model.
- **12 months**: Clinical partnerships for ground truth labels. Path to FDA wellness screening clearance.

Framing rule: Never "our AI detected X". Always "your data shows a pattern clinical guidelines flag as worth investigating."

### Ship order (agreed)
1. Fix math accuracy (audit + corrections) ✅ Done in v0.2
2. Landing page + upload flow
3. Verdict screen (free tier)
4. Doctor letter template
5. Full dashboard becomes Screen 5 (reward after conversion)

### Working style
Daily cadence. One task at a time. Review together before moving on.
Vedant = Product / UX / Strategy. Claude = all engineering.
