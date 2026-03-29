# VitalScan — Product Decisions Log

Decisions made during Claude.ai sessions. Append new decisions here as the project evolves.

---

## Session 2 — Mar 30 2026

### Infrastructure: migrated backend from Cloud Run → Railway

Backend is now deployed at `https://vitalscan-production.up.railway.app`.
Frontend (Vercel) updated to call Railway for both `/health` ping and `/analyze`.

### Fix: large file handling (400MB+ exports no longer OOM)

Three bugs fixed:

**1. parser.py — full DOM load (root cause)**
- Old: `z.read('export.xml')` + `ET.fromstring()` loaded entire XML into a DOM tree. For a 400MB ZIP, decompressed XML is ~600MB and the DOM is 1–3GB on top of that. Crashed any server instance with <2GB RAM.
- New: `zipfile.ZipFile.open()` (streaming decompressor) + `ET.iterparse()` + `root_elem.clear()` after each element. Only the current XML element is held in RAM. Peak memory drops from 2–4GB → ~100–300MB.
- Also merged the old 4-pass approach (`_collect_raw`, `_deduplicate_steps`, `_parse_sleep`, `_parse_hrv`) into a single iterparse pass.

**2. main.py — read before size check**
- Old: `await file.read()` loaded the full ZIP into RAM before checking the 500MB limit.
- New: Check `Content-Length` header first. Pass `file.file` (spooled temp file) directly to parser — no full read into RAM.

**3. processing.html — hardcoded 90s timeout**
- Old: AbortController hardcoded to 90s. Large files take 2–5 min; frontend killed the request.
- New: Scales with file size — `90s base + 0.5s per MB`, capped at 10 min.

### Decision: AI Q&A deferred

Discussed adding an AI to answer questions about the report. Decided against for now:
- Core funnel (verdict screen + paywall) not built yet — AI Q&A is premature.
- Health-anxious persona wants structured answers, not a chatbox.
- Open-ended Q&A increases medical liability vs structured findings.
- Adds per-query API cost — conflicts with one-time $29 model.
- Revisit as a scoped premium feature after verdict screen ships.

### Next up
1. Verdict screen — free tier gating (top 3 findings, rest paywalled)
2. Doctor letter — $29 premium differentiator

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
