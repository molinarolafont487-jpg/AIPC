from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.demo_store import agents, new_id, utc_now

router = APIRouter()


class AgentRunRequest(BaseModel):
    input: dict
    context: dict | None = None
    stream: bool = False


@router.get("")
def list_agents() -> dict:
    return {"items": agents, "total": len(agents)}


@router.get("/{agent_id}")
def get_agent(agent_id: str) -> dict:
    agent = next((item for item in agents if item["id"] == agent_id), None)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.post("/{agent_id}/run")
def run_agent(agent_id: str, payload: AgentRunRequest) -> dict:
    agent = next((item for item in agents if item["id"] == agent_id), None)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {
        "run_id": new_id("run"),
        "agent_id": agent_id,
        "status": "queued",
        "created_at": utc_now(),
        "input": payload.input,
    }

