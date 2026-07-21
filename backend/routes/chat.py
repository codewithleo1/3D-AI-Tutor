from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agents.roadmap_agent import generate_roadmap

router = APIRouter()


class RoadmapRequest(BaseModel):
    goal: str
    level: str
    hours_per_week: int
    objective: str


@router.post("/roadmap")
def create_roadmap(request: RoadmapRequest):
    try:
        roadmap = generate_roadmap(
            goal=request.goal,
            level=request.level,
            hours_per_week=request.hours_per_week,
            objective=request.objective,
        )
        return {"success": True, "roadmap": roadmap}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))