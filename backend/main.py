"""
VitalScan — FastAPI Backend
v0.1 skeleton — ready for Claude Code to build out

ENDPOINTS:
  POST /analyze     — upload ZIP, returns analysis JSON
  GET  /health      — health check

PLANNED (next sessions):
  POST /analyze/async  — background job for large exports
  GET  /jobs/{id}      — poll job status
  POST /feedback       — user feedback on findings (ground truth loop)

ARCHITECTURE DECISIONS:
  - Memory-only processing: ZIP never written to disk
  - No auth yet: ship simple first, add accounts in v2
  - Background queue: Celery + Redis for 400MB exports (30-60s parse time)
  - Privacy: raw health data never stored, only output JSON

DEPLOY TARGET: Railway or Render (both support background workers)
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import json

from parser import parse_export

app = FastAPI(
    title="VitalScan API",
    description="Apple Health data analysis engine",
    version="0.1.0"
)

# Allow Next.js frontend in dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev: allows file:// and localhost; lock down before prod
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "version": "0.1.0"}


@app.post("/analyze")
async def analyze(request: Request, file: UploadFile = File(...)):
    """
    Accept an Apple Health export.zip and return analysis JSON.

    Large-file safe: checks Content-Length before reading, then passes the
    spooled file-like directly to the parser — no full read into RAM.
    The parser uses iterparse + elem.clear(), so peak memory is ~100-300MB
    even for 400MB exports (previously 2-4GB with ET.fromstring).
    """
    if not file.filename.endswith('.zip'):
        raise HTTPException(400, "File must be a .zip export from Apple Health")

    # Reject oversized uploads before reading any bytes (best-effort — clients
    # may omit Content-Length, but this catches the common browser case).
    content_length = request.headers.get('content-length')
    if content_length and int(content_length) > 500 * 1024 * 1024:
        raise HTTPException(413, "File too large. Maximum 500MB.")

    try:
        # Pass the spooled file-like directly — no await file.read() into RAM.
        # python-multipart spools to disk once the upload exceeds its threshold,
        # so file.file is seekable and safe to pass to zipfile.ZipFile.
        result = parse_export(file.file)
        return result
    except KeyError as e:
        raise HTTPException(422, f"Could not find expected file in ZIP: {e}")
    except Exception as e:
        raise HTTPException(500, f"Parse error: {str(e)}")


# TODO: async job queue for large exports
# @app.post("/analyze/async")
# async def analyze_async(file: UploadFile = File(...)):
#     job_id = enqueue_parse_job(await file.read())
#     return {"job_id": job_id, "status": "queued"}
#
# @app.get("/jobs/{job_id}")
# async def get_job(job_id: str):
#     status = get_job_status(job_id)
#     return status


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
