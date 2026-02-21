from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root — works whether you run via run.py or uvicorn directly
load_dotenv(Path(__file__).parent.parent / ".env")

from backend.routes.analyze import router as analyze_router
from backend.routes.rewrite import router as rewrite_router
from backend.routes.history import router as history_router

app = FastAPI(
    title="CodeRefine API",
    description="Generative AI-Powered Code Review & Optimization Engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes BEFORE mounting static files
app.include_router(analyze_router, prefix="/api", tags=["Analysis"])
app.include_router(rewrite_router, prefix="/api", tags=["Rewrite"])
app.include_router(history_router, prefix="/api", tags=["History"])

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "models": ["arcee-ai/trinity-large-preview:free", "stepfun/step-3.5-flash:free"],
        "version": "1.0.0"
    }

# Resolve frontend directory relative to this file
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"

@app.get("/style.css")
async def serve_css():
    return FileResponse(FRONTEND_DIR / "style.css", media_type="text/css")

@app.get("/app.js")
async def serve_js():
    return FileResponse(FRONTEND_DIR / "app.js", media_type="application/javascript")

@app.get("/")
async def serve_index():
    return FileResponse(FRONTEND_DIR / "index.html", media_type="text/html")

if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="static")