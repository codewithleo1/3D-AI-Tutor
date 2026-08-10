# Supervisor runs `uvicorn server:app` on port 8001.
# The actual FastAPI app lives in main.py; expose it here.
from main import app  # noqa: F401
