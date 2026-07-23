import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
from db.neon import get_connection
from routes.chat import router as chat_router
from routes.teaching import router as teaching_router

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


@app.get("/health")
def health():
    try:
        conn = get_connection()
        conn.close()
        return {"status": "ok", "agent": "Miss Nova", "db": "connected"}
    except Exception as e:
        return {"status": "error", "db": str(e)}