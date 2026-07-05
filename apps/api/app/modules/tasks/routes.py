from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.agent_runtime import dispatch_task_agents
from app.core.demo_store import (
    ADMIN_USER_ID,
    WORKSPACE_ID,
    add_task_event,
    agent_runs,
    agents,
    new_id,
    task_events,
    tasks,
    utc_now,
)
from app.core.schemas import CommandProtocol

router = APIRouter()


class CreateTaskRequest(BaseModel):
    command_protocol: CommandProtocol


class UpdateTaskProtocolRequest(BaseModel):
    command_protocol: CommandProtocol


class DecisionRequest(BaseModel):
    comment: str | None = None


class DispatchAgentsRequest(BaseModel):
    force: bool = False


def find_agent_id_by_name(name: str) -> str | None:
    agent = next((item for item in agents if item["name"] == name), None)
    return agent["id"] if agent else None


def summarize_knowledge_refs(refs: list[dict]) -> str:
    document_names = list(dict.fromkeys(ref["document_name"] for ref in refs))
    if not document_names:
        return "暂无可引用资料。"
    return "、".join(document_names[:3]) + (" 等" if len(document_names) > 3 else "")


@router.post("")
def create_task(payload: CreateTaskRequest) -> dict:
    protocol = payload.command_protocol.as_task_payload()
    task_id = new_id("tsk")
    task = {
        "id": task_id,
        "workspace_id": WORKSPACE_ID,
        "creator_id": ADMIN_USER_ID,
        "title": protocol["task_title"],
        "goal": protocol["task_goal"],
        "type": protocol["task_type"],
        "status": "pending_confirm",
        "command_protocol": protocol,
        "primary_agent_id": find_agent_id_by_name(protocol["primary_agent"]),
        "approval_required": protocol.get("approval_required", True),
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    tasks[task_id] = task
    add_task_event(task_id, "task.created", "任务卡已生成，等待老板确认。")
    knowledge_refs = protocol.get("knowledge_refs", [])
    if knowledge_refs:
        add_task_event(
            task_id,
            "knowledge.linked",
            f"任务卡已关联 {len(knowledge_refs)} 条知识库引用：{summarize_knowledge_refs(knowledge_refs)}。",
            metadata={"knowledge_refs": knowledge_refs},
        )
    return {"task_id": task_id, "status": task["status"], "task": task}


@router.get("")
def list_tasks() -> dict:
    items = sorted(tasks.values(), key=lambda item: item["created_at"], reverse=True)
    return {"items": items, "total": len(items)}


@router.get("/{task_id}")
def get_task(task_id: str) -> dict:
    task = tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        "task": task,
        "events": task_events.get(task_id, []),
        "agent_runs": agent_runs.get(task_id, []),
    }


@router.patch("/{task_id}/command-protocol")
def update_task_protocol(task_id: str, payload: UpdateTaskProtocolRequest) -> dict:
    task = tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if task["status"] not in {"pending_confirm", "running", "waiting_human"}:
        raise HTTPException(status_code=409, detail="Task can no longer be edited")

    protocol = payload.command_protocol.as_task_payload()
    task["title"] = protocol["task_title"]
    task["goal"] = protocol["task_goal"]
    task["type"] = protocol["task_type"]
    task["command_protocol"] = protocol
    task["primary_agent_id"] = find_agent_id_by_name(protocol["primary_agent"])
    task["approval_required"] = protocol["approval_required"]
    task["updated_at"] = utc_now()
    agent_runs.pop(task_id, None)
    add_task_event(task_id, "task.updated", "任务卡字段已修改。", actor_type="user")
    return {"task_id": task_id, "status": task["status"], "task": task}


@router.post("/{task_id}/confirm")
def confirm_task(task_id: str, payload: DecisionRequest | None = None) -> dict:
    task = tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    task["status"] = "running"
    task["updated_at"] = utc_now()
    add_task_event(
        task_id,
        "task.confirmed",
        payload.comment if payload and payload.comment else "老板已确认执行任务。",
        actor_type="user",
    )
    return {"task_id": task_id, "status": task["status"]}


@router.post("/{task_id}/start")
def start_task(task_id: str) -> dict:
    task = tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    task["status"] = (
        "waiting_human"
        if task["command_protocol"].get("human_collaborators")
        else "waiting_approval"
    )
    task["updated_at"] = utc_now()
    knowledge_refs = task["command_protocol"].get("knowledge_refs", [])
    existing_runs = agent_runs.get(task_id, [])
    runs = dispatch_task_agents(task, existing_runs=existing_runs)
    agent_runs[task_id] = runs
    agent_names = "、".join(run["agent_name"] for run in runs)
    add_task_event(task_id, "agent.started", f"已分配数字员工执行：{agent_names}。")
    add_task_event(
        task_id,
        "tool.called",
        (
            f"知识库助理已读取 {len(knowledge_refs)} 条引用资料：{summarize_knowledge_refs(knowledge_refs)}。"
            if knowledge_refs
            else "知识库助理检索客户资料和产品资料。"
        ),
        metadata={"knowledge_refs": knowledge_refs},
    )
    add_task_event(
        task_id,
        "agents.completed",
        f"{len(runs)} 个数字员工已输出阶段结果，老板助理已生成确认版。",
        metadata={"agent_run_ids": [run["id"] for run in runs]},
    )
    if task["status"] == "waiting_human":
        add_task_event(task_id, "feishu.pending", "等待销售小张在飞书补充预算。")
    else:
        add_task_event(task_id, "approval.pending", "等待老板确认数字员工汇总结果。")
    return {"task_id": task_id, "status": task["status"], "agent_runs": runs}


@router.post("/{task_id}/dispatch-agents")
def dispatch_agents(task_id: str, payload: DispatchAgentsRequest | None = None) -> dict:
    task = tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    force = payload.force if payload else False
    runs = dispatch_task_agents(
        task,
        existing_runs=agent_runs.get(task_id, []),
        force=force,
    )
    agent_runs[task_id] = runs
    task["updated_at"] = utc_now()
    add_task_event(
        task_id,
        "agents.dispatched",
        f"已{'重新' if force else ''}执行 {len(runs)} 个数字员工 Prompt。",
        metadata={"agent_run_ids": [run["id"] for run in runs]},
    )
    return {"task_id": task_id, "agent_runs": runs}


@router.get("/{task_id}/agent-runs")
def list_agent_runs(task_id: str) -> dict:
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    runs = agent_runs.get(task_id, [])
    return {"items": runs, "total": len(runs)}


@router.post("/{task_id}/approve")
def approve_task(task_id: str, payload: DecisionRequest | None = None) -> dict:
    task = tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    task["status"] = "completed"
    task["updated_at"] = utc_now()
    add_task_event(
        task_id,
        "approval.approved",
        payload.comment if payload and payload.comment else "老板确认结果可归档。",
        actor_type="user",
    )
    return {"task_id": task_id, "status": task["status"]}


@router.post("/{task_id}/archive")
def archive_task(task_id: str) -> dict:
    task = tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    task["status"] = "archived"
    task["updated_at"] = utc_now()
    add_task_event(task_id, "task.archived", "任务已归档到任务中心。")
    return {"task_id": task_id, "status": task["status"]}


@router.get("/{task_id}/timeline")
def timeline(task_id: str) -> dict:
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"events": task_events.get(task_id, [])}
