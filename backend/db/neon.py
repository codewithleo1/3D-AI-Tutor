import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")


def get_connection():
    """Get a connection to the Neon database."""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)