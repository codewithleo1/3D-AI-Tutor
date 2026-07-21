from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agents.teaching_agent import teach_topic
from agents.quiz_agent import generate_quiz, evaluate_quiz

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