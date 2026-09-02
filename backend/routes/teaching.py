from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from agents.quiz_agent import generate_quiz, evaluate_quiz, repair_concepts
from agents.prerequisites_agent import generate_prerequisites
from agents.teaching_agent import teach_topic, generate_practice, evaluate_practice, client1
from db.queries import save_course, save_progress, load_latest_progress, create_session
from db.neon import get_connection

router = APIRouter()

class TeachRequest(BaseModel):
    topic_title: str
    topic_description: str
    module_title: str
    course_title: str
    conversation_history: list = []
    current_subtopic: str = ""
    subtopic_index: int = 0
    total_subtopics: int = 1
    roadmap_outline: list = []
    all_subtopics: list = []

class QuizGenerateRequest(BaseModel):
    topic_title: str
    topic_description: str

class QuizEvaluateRequest(BaseModel):
    topic_title: str
    questions: list
    answers: list

class PrerequisitesRequest(BaseModel):
    goal: str
    level: str

class PracticeRequest(BaseModel):
    topic_title: str
    topic_description: str
    module_title: str
    course_title: str
    level: str = "beginner"

class RepairRequest(BaseModel):
    topic_title: str
    failed_concepts: list

class SaveCourseRequest(BaseModel):
    user_id: str = ""
    goal: str
    level: str
    roadmap: dict

class SaveProgressRequest(BaseModel):
    session_id: str
    course_id: str
    completed_topics: list
    current_module: int
    current_topic: int
    current_subtopic: int = 0

class LoadProgressRequest(BaseModel):
    session_id: str

class PracticeEvaluateRequest(BaseModel):
    topic_title: str
    exercise: str
    expected_output: str
    student_answer: str


@router.post("/teach")
def teach(request: TeachRequest):
    try:
        result = teach_topic(
            topic_title=request.topic_title,
            topic_description=request.topic_description,
            module_title=request.module_title,
            course_title=request.course_title,
            conversation_history=request.conversation_history,
            current_subtopic=request.current_subtopic,
            subtopic_index=request.subtopic_index,
            total_subtopics=request.total_subtopics,
            roadmap_outline=request.roadmap_outline,
            all_subtopics=request.all_subtopics,
        )
        return {"success": True, "response": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quiz/generate")
def quiz_generate(request: QuizGenerateRequest):
    try:
        result = generate_quiz(
            topic_title=request.topic_title,
            topic_description=request.topic_description,
        )
        return {"success": True, "quiz": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quiz/evaluate")
def quiz_evaluate(request: QuizEvaluateRequest):
    try:
        result = evaluate_quiz(
            topic_title=request.topic_title,
            questions=request.questions,
            answers=request.answers,
        )
        return {"success": True, "results": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/prerequisites")
def prerequisites(request: PrerequisitesRequest):
    try:
        result = generate_prerequisites(
            goal=request.goal,
            level=request.level,
        )
        return {"success": True, "prerequisites": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/practice")
def practice(request: PracticeRequest):
    try:
        result = generate_practice(
            topic_title=request.topic_title,
            topic_description=request.topic_description,
            module_title=request.module_title,
            course_title=request.course_title,
            level=request.level,
        )
        return {"success": True, "practice": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/repair")
def repair(request: RepairRequest):
    try:
        result = repair_concepts(
            topic_title=request.topic_title,
            failed_concepts=request.failed_concepts,
        )
        return {"success": True, "repair": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/progress/save-course")
def save_course_route(request: SaveCourseRequest):
    try:
        session_id = create_session(request.goal, request.level)
        course_id = save_course(session_id, request.roadmap)
        # Save user_id, title, goal, level to courses table
        if request.user_id:
            conn = get_connection()
            cur = conn.cursor()
            title = request.roadmap.get("title", request.goal)
            cur.execute("""
                UPDATE courses SET
                    user_id = %s,
                    title = %s,
                    goal = %s,
                    level = %s,
                    last_accessed = NOW()
                WHERE id = %s
            """, (request.user_id, title, request.goal, request.level, course_id))
            conn.commit()
            cur.close()
            conn.close()
        return {"success": True, "session_id": session_id, "course_id": course_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/progress/save")
def save_progress_route(request: SaveProgressRequest):
    try:
        save_progress(
            request.session_id, request.course_id,
            request.completed_topics, request.current_module, request.current_topic,
            request.current_subtopic
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/progress/load")
def load_progress_route(request: LoadProgressRequest):
    try:
        result = load_latest_progress(request.session_id)
        if not result:
            return {"success": True, "progress": None}
        return {
            "success": True,
            "progress": {
                "roadmap": p.roadmap,
                "completed_topics": p.completed_topics,
                "current_module": p.current_module,
                "current_topic": p.current_topic,
                "current_subtopic": p.get("current_subtopic", 0),
                "course_id": p.course_id,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/practice/evaluate")
def practice_evaluate(request: PracticeEvaluateRequest):
    try:
        result = evaluate_practice(
            topic_title=request.topic_title,
            exercise=request.exercise,
            expected_output=request.expected_output,
            student_answer=request.student_answer,
        )
        return {"success": True, "evaluation": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    try:
        audio_bytes = await audio.read()
        transcription = client1.audio.transcriptions.create(
            file=(audio.filename or "audio.webm", audio_bytes, audio.content_type or "audio/webm"),
            model="whisper-large-v3-turbo",
        )
        return {"success": True, "transcript": transcription.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
