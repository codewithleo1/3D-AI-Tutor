from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from db.neon import get_connection

router = APIRouter()


class SaveCourseRequest(BaseModel):
    user_id: str
    goal: str
    level: str
    title: str
    roadmap: dict


class UpdateCourseRequest(BaseModel):
    user_id: str
    course_id: str
    last_accessed: Optional[str] = None
    is_completed: Optional[bool] = None


@router.get("/courses/my")
def get_my_courses(user_id: str):
    """Get all courses for a user."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT
                c.id, c.title, c.goal, c.level,
                c.is_completed, c.last_accessed, c.created_at,
                p.completed_topics, p.current_module, p.current_topic
            FROM courses c
            LEFT JOIN progress p ON p.course_id = c.id
            WHERE c.user_id = %s
            ORDER BY c.last_accessed DESC NULLS LAST
        """, (user_id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()

        courses = []
        for r in rows:
            completed = len(r["completed_topics"] or [])

            courses.append({
                "id": str(r["id"]),
                "title": r["title"] or "Untitled Course",
                "goal": r["goal"] or "",
                "level": r["level"] or "",
                "is_completed": r["is_completed"] or False,
                "last_accessed": r["last_accessed"].isoformat() if r["last_accessed"] else None,
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                "completed_topics": completed,
                "current_module": r["current_module"] or 0,
                "current_topic": r["current_topic"] or 0,
            })
        return {"courses": courses}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/courses/{course_id}")
def get_course(course_id: str, user_id: str):
    """Get a single course with full roadmap."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT c.*, p.completed_topics, p.current_module, p.current_topic,
                   p.current_subtopic
            FROM courses c
            LEFT JOIN progress p ON p.course_id = c.id
            WHERE c.id = %s AND c.user_id = %s
        """, (course_id, user_id))
        r = cur.fetchone()
        cur.close()
        conn.close()

        if not r:
            raise HTTPException(status_code=404, detail="Course not found")

        return {
            "id": str(r["id"]),
            "title": r["title"],
            "goal": r["goal"],
            "level": r["level"],
            "roadmap": r["roadmap"],
            "is_completed": r["is_completed"] or False,
            "completed_topics": r["completed_topics"] or [],
            "current_module": r["current_module"] or 0,
            "current_topic": r["current_topic"] or 0,
            "current_subtopic": r["current_subtopic"] or 0,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/courses/{course_id}")
def delete_course(course_id: str, user_id: str):
    """Delete a course and its progress."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        # Delete progress first (foreign key)
        cur.execute("DELETE FROM progress WHERE course_id = %s", (course_id,))
        # Delete course
        cur.execute(
            "DELETE FROM courses WHERE id = %s AND user_id = %s",
            (course_id, user_id)
        )
        conn.commit()
        cur.close()
        conn.close()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/courses/{course_id}/accessed")
def update_last_accessed(course_id: str, user_id: str):
    """Update last accessed timestamp."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE courses SET last_accessed = NOW()
            WHERE id = %s AND user_id = %s
        """, (course_id, user_id))
        conn.commit()
        cur.close()
        conn.close()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/courses/{course_id}/complete")
def mark_course_complete(course_id: str, user_id: str):
    """Mark a course as completed."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE courses SET is_completed = TRUE, last_accessed = NOW()
            WHERE id = %s AND user_id = %s
        """, (course_id, user_id))
        conn.commit()
        cur.close()
        conn.close()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))