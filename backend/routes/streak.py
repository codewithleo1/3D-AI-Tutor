from datetime import date, timedelta
from fastapi import APIRouter
from pydantic import BaseModel
from db.neon import get_connection

router = APIRouter()


class StreakUpdateRequest(BaseModel):
    user_id: str


@router.post("/streak/update")
def update_streak(request: StreakUpdateRequest):
    """Called when a topic is completed. Updates streak based on today's date."""
    try:
        conn = get_connection()
        cur = conn.cursor()

        today = date.today()

        # Get existing streak record
        cur.execute("""
            SELECT current_streak, best_streak, last_study_date
            FROM streaks WHERE user_id = %s
        """, (request.user_id,))
        row = cur.fetchone()

        if not row:
            # First time — create record
            cur.execute("""
                INSERT INTO streaks (user_id, current_streak, best_streak, last_study_date)
                VALUES (%s, 1, 1, %s)
            """, (request.user_id, today))
            conn.commit()
            cur.close()
            conn.close()
            return {"current_streak": 1, "best_streak": 1}

        current = row["current_streak"]
        best = row["best_streak"]
        last_date = row["last_study_date"]

        if last_date == today:
            # Already studied today — no change
            cur.close()
            conn.close()
            return {"current_streak": current, "best_streak": best}

        # Check if yesterday
        yesterday = today - timedelta(days=1)

        if last_date == yesterday:
            # Consecutive day — increment
            current += 1
        else:
            # Missed a day — reset
            current = 1

        best = max(best, current)

        cur.execute("""
            UPDATE streaks
            SET current_streak = %s, best_streak = %s,
                last_study_date = %s, updated_at = NOW()
            WHERE user_id = %s
        """, (current, best, today, request.user_id))
        conn.commit()
        cur.close()
        conn.close()

        return {"current_streak": current, "best_streak": best}

    except Exception:
        return {"current_streak": 0, "best_streak": 0}


@router.get("/streak")
def get_streak(user_id: str):
    """Get current streak for a user."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT current_streak, best_streak, last_study_date
            FROM streaks WHERE user_id = %s
        """, (user_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            return {"current_streak": 0, "best_streak": 0}

        return {
            "current_streak": row["current_streak"],
            "best_streak": row["best_streak"],
        }
    except Exception:
        return {"current_streak": 0, "best_streak": 0}