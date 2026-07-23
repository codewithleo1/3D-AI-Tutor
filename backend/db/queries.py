import json
from db.neon import get_connection


def create_session(goal: str, level: str) -> str:
    """Create a new learner session and return the generated UUID."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO sessions (goal, level)
                VALUES (%s, %s)
                RETURNING id
            """, (goal, level))
            result = cur.fetchone()
            conn.commit()
            return str(result["id"])


def save_course(session_id: str, roadmap: dict) -> str:
    """Save a finalized roadmap and return the generated course UUID."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO courses (session_id, roadmap)
                VALUES (%s, %s)
                RETURNING id
            """, (session_id, json.dumps(roadmap)))
            result = cur.fetchone()
            conn.commit()
            return str(result["id"])


def save_progress(session_id: str, course_id: str,
                  completed_topics: list, current_module: int, current_topic: int):
    """Save or update learning progress."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO progress (session_id, course_id, completed_topics,
                                      current_module, current_topic, updated_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                ON CONFLICT (session_id, course_id)
                DO UPDATE SET
                    completed_topics = EXCLUDED.completed_topics,
                    current_module = EXCLUDED.current_module,
                    current_topic = EXCLUDED.current_topic,
                    updated_at = NOW()
            """, (session_id, course_id, completed_topics,
                  current_module, current_topic))
            conn.commit()


def load_progress(session_id: str, course_id: str):
    """Load progress for a session and course."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT p.completed_topics, p.current_module, p.current_topic,
                       c.roadmap
                FROM progress p
                JOIN courses c ON c.id = p.course_id
                WHERE p.session_id = %s AND p.course_id = %s
            """, (session_id, course_id))
            return cur.fetchone()


def load_latest_progress(session_id: str):
    """Load the most recent course progress for a session."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT p.completed_topics, p.current_module, p.current_topic,
                       c.roadmap, c.id as course_id
                FROM progress p
                JOIN courses c ON c.id = p.course_id
                WHERE p.session_id = %s
                ORDER BY p.updated_at DESC
                LIMIT 1
            """, (session_id,))
            return cur.fetchone()