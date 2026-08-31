import os
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from db.neon import get_connection

router = APIRouter()

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "missnova-admin")


class XAPIStatement(BaseModel):
    user_id: str
    user_email: str = ""
    user_name: str = ""
    verb: str
    object_type: str = ""
    object_id: str = ""
    object_name: str = ""
    result_success: Optional[bool] = None
    result_completion: Optional[bool] = None
    result_duration_seconds: Optional[int] = None
    result_score: Optional[int] = None
    context_course: str = ""
    context_module: str = ""
    context_subtopic: str = ""


def check_admin(authorization: str = None):
    if not authorization or authorization != f"Bearer {ADMIN_PASSWORD}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.post("/xapi/statement")
def record_statement(statement: XAPIStatement):
    """Record an xAPI learning statement."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO xapi_statements (
                user_id, user_email, user_name, verb,
                object_type, object_id, object_name,
                result_success, result_completion,
                result_duration_seconds, result_score,
                context_course, context_module, context_subtopic
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            statement.user_id, statement.user_email, statement.user_name,
            statement.verb, statement.object_type, statement.object_id,
            statement.object_name, statement.result_success,
            statement.result_completion, statement.result_duration_seconds,
            statement.result_score, statement.context_course,
            statement.context_module, statement.context_subtopic,
        ))
        conn.commit()
        cur.close()
        conn.close()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/admin/dashboard")
def get_dashboard(authorization: Optional[str] = Header(None)):
    """Admin dashboard — aggregated stats."""
    check_admin(authorization)
    try:
        conn = get_connection()
        cur = conn.cursor()

        # Total unique students
        cur.execute("SELECT COUNT(DISTINCT user_id) as total FROM xapi_statements")
        total_students = cur.fetchone()["total"]

        # Active students (last 7 days)
        cur.execute("""
            SELECT COUNT(DISTINCT user_id) as active
            FROM xapi_statements
            WHERE timestamp >= NOW() - INTERVAL '7 days'
        """)
        active_students = cur.fetchone()["active"]

        # Total statements
        cur.execute("SELECT COUNT(*) as total FROM xapi_statements")
        total_statements = cur.fetchone()["total"]

        # Verb breakdown
        cur.execute("""
            SELECT verb, COUNT(*) as count
            FROM xapi_statements
            GROUP BY verb ORDER BY count DESC
        """)
        verb_counts = {r["verb"]: r["count"] for r in cur.fetchall()}

        # Top courses
        cur.execute("""
            SELECT context_course, COUNT(DISTINCT user_id) as learners
            FROM xapi_statements
            WHERE context_course != ''
            GROUP BY context_course
            ORDER BY learners DESC LIMIT 10
        """)
        top_courses = [{"course": r["context_course"], "learners": r["learners"]}
                      for r in cur.fetchall()]

        # Certificates issued
        cur.execute("SELECT COUNT(*) as total FROM certificates")
        certificates = cur.fetchone()["total"]

        # Quiz pass rate
        cur.execute("""
            SELECT
                COUNT(*) FILTER (WHERE result_success = true) as passed,
                COUNT(*) as total
            FROM xapi_statements
            WHERE verb = 'answered'
        """)
        quiz_row = cur.fetchone()
        quiz_pass_rate = round(
            (quiz_row["passed"] / quiz_row["total"] * 100)
            if quiz_row["total"] > 0 else 0, 1
        )

        # Average time per topic
        cur.execute("""
            SELECT AVG(result_duration_seconds) as avg_seconds
            FROM xapi_statements
            WHERE verb = 'completed' AND object_type = 'topic'
            AND result_duration_seconds IS NOT NULL
        """)
        avg_time = cur.fetchone()["avg_seconds"] or 0

        # Skip rate
        cur.execute("""
            SELECT COUNT(*) as skipped FROM xapi_statements WHERE verb = 'skipped'
        """)
        skipped = cur.fetchone()["skipped"]

        cur.execute("""
            SELECT COUNT(*) as completed FROM xapi_statements
            WHERE verb = 'completed' AND object_type = 'topic'
        """)
        completed = cur.fetchone()["completed"]
        skip_rate = round(
            skipped / (skipped + completed) * 100
            if (skipped + completed) > 0 else 0, 1
        )

        cur.close()
        conn.close()

        return {
            "total_students": total_students,
            "active_students_7d": active_students,
            "total_statements": total_statements,
            "certificates_issued": certificates,
            "quiz_pass_rate": quiz_pass_rate,
            "avg_topic_time_seconds": int(avg_time),
            "skip_rate": skip_rate,
            "verb_counts": verb_counts,
            "top_courses": top_courses,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/students")
def get_students(authorization: Optional[str] = Header(None)):
    """List all students with summary."""
    check_admin(authorization)
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT
                user_id, user_email, user_name,
                COUNT(*) as total_events,
                MIN(timestamp) as first_seen,
                MAX(timestamp) as last_seen,
                COUNT(*) FILTER (WHERE verb = 'completed' AND object_type = 'topic') as topics_completed,
                COUNT(*) FILTER (WHERE verb = 'skipped') as topics_skipped,
                COUNT(*) FILTER (WHERE verb = 'passed') as quizzes_passed,
                COUNT(*) FILTER (WHERE verb = 'failed') as quizzes_failed,
                SUM(result_duration_seconds) FILTER (WHERE result_duration_seconds IS NOT NULL) as total_seconds
            FROM xapi_statements
            GROUP BY user_id, user_email, user_name
            ORDER BY last_seen DESC
        """)
        students = []
        for r in cur.fetchall():
            students.append({
                "user_id": r["user_id"],
                "user_email": r["user_email"],
                "user_name": r["user_name"],
                "total_events": r["total_events"],
                "first_seen": r["first_seen"].isoformat() if r["first_seen"] else None,
                "last_seen": r["last_seen"].isoformat() if r["last_seen"] else None,
                "topics_completed": r["topics_completed"],
                "topics_skipped": r["topics_skipped"],
                "quizzes_passed": r["quizzes_passed"],
                "quizzes_failed": r["quizzes_failed"],
                "total_minutes": round((r["total_seconds"] or 0) / 60, 1),
            })
        cur.close()
        conn.close()
        return {"students": students}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/student/{user_id}")
def get_student_journey(user_id: str, authorization: Optional[str] = Header(None)):
    """Full xAPI timeline for one student."""
    check_admin(authorization)
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT * FROM xapi_statements
            WHERE user_id = %s
            ORDER BY timestamp ASC
        """, (user_id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()

        timeline = []
        for r in rows:
            timeline.append({
                "id": r["id"],
                "verb": r["verb"],
                "object_type": r["object_type"],
                "object_name": r["object_name"],
                "result_success": r["result_success"],
                "result_completion": r["result_completion"],
                "result_duration_seconds": r["result_duration_seconds"],
                "result_score": r["result_score"],
                "context_course": r["context_course"],
                "context_module": r["context_module"],
                "context_subtopic": r["context_subtopic"],
                "timestamp": r["timestamp"].isoformat(),
            })
        return {"user_id": user_id, "timeline": timeline}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))