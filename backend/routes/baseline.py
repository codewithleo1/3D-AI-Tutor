from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agents.baseline_agent import generate_baseline_questions, evaluate_baseline

router = APIRouter()


class BaselineGenerateRequest(BaseModel):
    goal: str
    level: str


class BaselineEvaluateRequest(BaseModel):
    goal: str
    questions: list
    answers: dict


@router.post("/baseline/generate")
def baseline_generate(request: BaselineGenerateRequest):
    try:
        result = generate_baseline_questions(
            goal=request.goal,
            level=request.level,
        )
        return {"success": True, "assessment": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/baseline/evaluate")
def baseline_evaluate(request: BaselineEvaluateRequest):
    try:
        result = evaluate_baseline(
            questions=request.questions,
            answers=request.answers,
        )
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))