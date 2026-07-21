from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
from db.neon import get_connection

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

app = FastAPI(title="Miss Nova API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    try:
        conn = get_connection()
        conn.close()
        return {"status": "ok", "agent": "Miss Nova", "db": "connected"}
    except Exception as e:
        return {"status": "error", "db": str(e)}