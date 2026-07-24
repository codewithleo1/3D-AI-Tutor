from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agents.quiz_agent import generate_quiz, evaluate_quiz, repair_concepts
from agents.prerequisites_agent import generate_prerequisites
from agents.teaching_agent import teach_topic, generate_practice, evaluate_practice
from db.queries import save_course, save_progress, load_latest_progress, create_session

router = APIRouter()

class TeachRequest(BaseModel):
    topic_title: str
    topic_description: str
    module_title: str
    course_title: str
    conversation_history: list = []

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


@router.post("/teach")
def teach(request: TeachRequest):
    try:
        result = teach_topic(
            topic_title=request.topic_title,
            topic_description=request.topic_description,
            module_title=request.module_title,
            course_title=request.course_title,
            conversation_history=request.conversation_history,
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


class SaveCourseRequest(BaseModel):
    goal: str
    level: str
    roadmap: dict


class SaveProgressRequest(BaseModel):
    session_id: str
    course_id: str
    completed_topics: list
    current_module: int
    current_topic: int


class LoadProgressRequest(BaseModel):
    session_id: str


@router.post("/progress/save-course")
def save_course_route(request: SaveCourseRequest):
    try:
        session_id = create_session(request.goal, request.level)
        course_id = save_course(session_id, request.roadmap)
        return {"success": True, "session_id": session_id, "course_id": course_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/progress/save")
def save_progress_route(request: SaveProgressRequest):
    try:
        save_progress(
            request.session_id, request.course_id,
            request.completed_topics, request.current_module, request.current_topic
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
                "roadmap": result["roadmap"],
                "completed_topics": result["completed_topics"],
                "current_module": result["current_module"],
                "current_topic": result["current_topic"],
                "course_id": result["course_id"],
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PracticeEvaluateRequest(BaseModel):
    topic_title: str
    exercise: str
    expected_output: str
    student_answer: str


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