from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.agent_runtime import get_agent_config
from app.core.demo_store import agents, new_id, utc_now

router = APIRouter()


class AgentRunRequest(BaseModel):
    input: dict
    context: dict | None = None
    stream: bool = False


def with_prompt_config(agent: dict) -> dict:
    return {**agent, "prompt_config": get_agent_config(agent["name"])}


@router.get("")
def list_agents() -> dict:
    items = [with_prompt_config(agent) for agent in agents]
    return {"items": items, "total": len(items)}


@router.get("/{agent_id}")
def get_agent(agent_id: str) -> dict:
    agent = next((item for item in agents if item["id"] == agent_id), None)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return with_prompt_config(agent)


@router.post("/{agent_id}/run")
def run_agent(agent_id: str, payload: AgentRunRequest) -> dict:
    agent = next((item for item in agents if item["id"] == agent_id), None)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    prompt_config = get_agent_config(agent["name"])
    return {
        "run_id": new_id("run"),
        "agent_id": agent_id,
        "agent_name": agent["name"],
        "status": "succeeded",
        "created_at": utc_now(),
        "prompt_config": prompt_config,
        "output": f"{agent['name']}已按Prompt接收输入，任务级执行请使用 /api/v1/tasks/{{task_id}}/dispatch-agents。",
        "input": payload.input,
    }
