from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.demo_store import add_task_event, tasks

router = APIRouter()


class SendFeishuMessageRequest(BaseModel):
    task_id: str
    receiver: str
    content: str


class FeishuEventRequest(BaseModel):
    type: str | None = None
    token: str | None = None
    challenge: str | None = None
    event: dict | None = None


@router.get("/status")
def status() -> dict:
    return {
        "channel": "feishu",
        "mode": "app_bot",
        "configured": False,
        "message": "填写FEISHU_APP_ID和FEISHU_APP_SECRET后启用。",
    }


@router.post("/send-message")
def send_message(payload: SendFeishuMessageRequest) -> dict:
    if payload.task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    add_task_event(
        payload.task_id,
        "feishu.message_sent",
        f"已向{payload.receiver}发送飞书补充请求。",
        metadata={"content": payload.content},
    )
    return {
        "ok": True,
        "task_id": payload.task_id,
        "receiver": payload.receiver,
        "delivery_status": "mock_sent",
    }


@router.post("/events")
def receive_event(payload: FeishuEventRequest) -> dict:
    if payload.challenge:
        return {"challenge": payload.challenge}

    event = payload.event or {}
    text = str(event.get("message", {}).get("content", ""))
    task_id = event.get("task_id") or event.get("message", {}).get("task_id")
    if task_id and task_id in tasks:
        tasks[task_id]["status"] = "running"
        add_task_event(
            task_id,
            "feishu.reply_received",
            "真人员工飞书回复已回流任务中心。",
            actor_type="human",
            metadata={"raw_text": text},
        )
        return {"ok": True, "matched_task_id": task_id}

    return {"ok": True, "matched_task_id": None}

