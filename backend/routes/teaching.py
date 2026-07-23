from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agents.quiz_agent import generate_quiz, evaluate_quiz
from agents.prerequisites_agent import generate_prerequisites
from agents.teaching_agent import teach_topic, generate_practice

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
class PracticeRequest(BaseModel):
    topic_title: str
    topic_description: str
    module_title: str
    course_title: str
    level: str = "beginner"


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