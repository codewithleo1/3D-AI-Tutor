import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
from db.neon import get_connection
from routes.chat import router as chat_router
from routes.teaching import router as teaching_router
from routes.payments import router as payments_router
from routes.baseline import router as baseline_router
from routes.certificate import router as certificate_router
from routes.streak import router as streak_router
from routes.confidence import router as confidence_router

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

app = FastAPI(title="Miss Nova API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api")
app.include_router(teaching_router, prefix="/api")
app.include_router(payments_router, prefix="/api")
app.include_router(baseline_router, prefix="/api")
app.include_router(certificate_router, prefix="/api")
app.include_router(streak_router, prefix="/api")
app.include_router(confidence_router, prefix="/api")

@app.get("/health")
def health():
    try:
        conn = get_connection()
        conn.close()
        return {"status": "ok", "agent": "Miss Nova", "db": "connected"}
    except Exception as e:
        return {"status": "error", "db": str(e)}