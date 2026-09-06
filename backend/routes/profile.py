from fastapi import APIRouter, HTTPException
from db.neon import get_connection

router = APIRouter()


@router.get("/profile")
def get_profile(user_id: str):
    """Return all profile data for a user in one call."""
    try:
        conn = get_connection()
        cur = conn.cursor()

        # 1. Streak
        cur.execute("""
            SELECT current_streak, best_streak, last_study_date
            FROM streaks WHERE user_id = %s
        """, (user_id,))
        streak_row = cur.fetchone()
        streak = {
            "current": streak_row["current_streak"] if streak_row else 0,
            "best": streak_row["best_streak"] if streak_row else 0,
            "last_study_date": streak_row["last_study_date"].isoformat()
                if streak_row and streak_row["last_study_date"] else None,
        }

        # 2. Certificates
        cur.execute("""
            SELECT verify_code, student_name, course_title, completed_at
            FROM certificates WHERE user_id = %s
            ORDER BY completed_at DESC
        """, (user_id,))
        cert_rows = cur.fetchall()
        certificates = [
            {
                "verify_code": str(r["verify_code"]),
                "student_name": r["student_name"],
                "course_title": r["course_title"],
                "completed_at": r["completed_at"].isoformat()
                    if r["completed_at"] else None,
            }
            for r in cert_rows
        ]

        # 3. Recent xAPI activity (last 10)
        cur.execute("""
            SELECT verb, object_name, object_type, context_course,
                   result_success, timestamp
            FROM xapi_statements WHERE user_id = %s
            ORDER BY timestamp DESC LIMIT 10
        """, (user_id,))
        activity_rows = cur.fetchall()
        activity = [
            {
                "verb": r["verb"],
                "object_name": r["object_name"],
                "object_type": r["object_type"],
                "course": r["context_course"],
                "success": r["result_success"],
                "timestamp": r["timestamp"].isoformat()
                    if r["timestamp"] else None,
            }
            for r in activity_rows
        ]

        # 4. Confidence map (all rated topics)
        cur.execute("""
            SELECT topic_key, confidence, last_reviewed, next_review
            FROM topic_confidence WHERE user_id = %s
            ORDER BY last_reviewed DESC
        """, (user_id,))
        conf_rows = cur.fetchall()
        confidence = [
            {
                "topic_key": r["topic_key"],
                "topic_title": r["topic_key"].replace("-", " ").title(),
                "confidence": r["confidence"],
                "last_reviewed": r["last_reviewed"].isoformat()
                    if r["last_reviewed"] else None,
                "next_review": r["next_review"].isoformat()
                    if r["next_review"] else None,
            }
            for r in conf_rows
        ]

        # 5. Total topics completed across all courses
        cur.execute("""
            SELECT COALESCE(SUM(array_length(completed_topics, 1)), 0)
            AS total
            FROM progress p
            JOIN courses c ON c.id = p.course_id
            WHERE c.user_id = %s
        """, (user_id,))
        total_row = cur.fetchone()
        total_topics = int(total_row["total"]) if total_row else 0

        # 6. Member since (earliest course)
        cur.execute("""
            SELECT MIN(created_at) as joined FROM courses WHERE user_id = %s
        """, (user_id,))
        joined_row = cur.fetchone()
        member_since = joined_row["joined"].isoformat() \
            if joined_row and joined_row["joined"] else None

        cur.close()
        conn.close()

        return {
            "streak": streak,
            "certificates": certificates,
            "activity": activity,
            "confidence": confidence,
            "total_topics_completed": total_topics,
            "member_since": member_since,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))