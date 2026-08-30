from datetime import datetime, timedelta
from fastapi import APIRouter
from pydantic import BaseModel
from db.neon import get_connection

router = APIRouter()

# Days until next review based on confidence
REVIEW_SCHEDULE = {
    1: 1,   # Not sure → review tomorrow
    2: 4,   # Got it → review in 4 days
    3: 7,   # Nailed it → review in 7 days
}


class ConfidenceSaveRequest(BaseModel):
    user_id: str
    topic_key: str   # e.g. "0-2" (module-topic index)
    topic_title: str
    confidence: int  # 1, 2, or 3


@router.post("/confidence/save")
def save_confidence(request: ConfidenceSaveRequest):
    """Save confidence rating and schedule next review."""
    try:
        days = REVIEW_SCHEDULE.get(request.confidence, 7)
        next_review = datetime.now() + timedelta(days=days)

        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO topic_confidence
                (user_id, topic_key, confidence, last_reviewed, next_review)
            VALUES (%s, %s, %s, NOW(), %s)
            ON CONFLICT (user_id, topic_key) DO UPDATE SET
                confidence = EXCLUDED.confidence,
                last_reviewed = NOW(),
                next_review = EXCLUDED.next_review
        """, (request.user_id, request.topic_key,
              request.confidence, next_review))
        conn.commit()
        cur.close()
        conn.close()
        return {"success": True, "next_review_days": days}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/confidence/due")
def get_due_reviews(user_id: str):
    """Get topic keys due for review today."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT topic_key, confidence, next_review
            FROM topic_confidence
            WHERE user_id = %s AND next_review <= NOW()
            ORDER BY next_review ASC
        """, (user_id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return {
            "due": [
                {
                    "topic_key": r["topic_key"],
                    "confidence": r["confidence"],
                }
                for r in rows
            ]
        }
    except Exception:
        return {"due": []}
    