from __future__ import annotations

import json
import re
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.agent_runtime import dispatch_task_agents
from app.core.config import settings
from app.core.demo_store import (
    add_task_event,
    agent_runs,
    feishu_messages,
    new_id,
    tasks,
    utc_now,
)

router = APIRouter()


class SendFeishuMessageRequest(BaseModel):
    task_id: str
    receiver: str = "销售小张"
    content: str | None = None


class SimulateFeishuReplyRequest(BaseModel):
    task_id: str
    sender: str = "销售小张"
    content: str = "华星科技预算约8万元，采购周期预计30天，倾向本地部署，IT负责人重点关注数据不出域。"


class FeishuEventRequest(BaseModel):
    type: str | None = None
    token: str | None = None
    challenge: str | None = None
    event: dict[str, Any] | None = None


def default_request_content(task: dict[str, Any], receiver: str) -> str:
    protocol = task["command_protocol"]
    return (
        f"[Phantom任务] {protocol['primary_agent']}请求{receiver}补充资料\n"
        f"任务：{task['title']}\n"
        f"任务ID：{task['id']}\n"
        "请回复：预算上限、采购周期、是否要求本地部署、关键联系人关注点。"
    )


def persist_message(
    task_id: str,
    direction: str,
    sender: str,
    receiver: str,
    content: str,
    status: str,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    message = {
        "id": new_id("fsm"),
        "task_id": task_id,
        "channel": "feishu",
        "direction": direction,
        "sender": sender,
        "receiver": receiver,
        "content": content,
        "status": status,
        "metadata": metadata or {},
        "created_at": utc_now(),
    }
    feishu_messages[message["id"]] = message
    return message


def send_webhook_text(content: str) -> tuple[str, dict[str, Any]]:
    if not settings.feishu_webhook_url:
        return "mock_sent", {"mode": "mock", "reason": "FEISHU_WEBHOOK_URL not configured"}

    try:
        response = httpx.post(
            settings.feishu_webhook_url,
            json={"msg_type": "text", "content": {"text": content}},
            timeout=8,
        )
        response.raise_for_status()
        return "webhook_sent", {
            "mode": "webhook",
            "status_code": response.status_code,
            "response": response.text[:500],
        }
    except httpx.HTTPError as error:
        return "webhook_failed", {"mode": "webhook", "error": str(error)}


def extract_text_from_event(event: dict[str, Any]) -> str:
    message = event.get("message", {})
    content = message.get("content", "")
    if isinstance(content, dict):
        return str(content.get("text") or content)
    if isinstance(content, str):
        try:
            parsed = json.loads(content)
            if isinstance(parsed, dict):
                return str(parsed.get("text") or parsed)
        except json.JSONDecodeError:
            return content
    return str(content)


def extract_task_id(event: dict[str, Any], text: str) -> str | None:
    message = event.get("message", {})
    explicit_task_id = event.get("task_id") or message.get("task_id")
    if explicit_task_id:
        return str(explicit_task_id)
    match = re.search(r"tsk_[a-zA-Z0-9]+", text)
    return match.group(0) if match else None


def apply_human_reply(
    task_id: str,
    sender: str,
    content: str,
    raw_event: dict[str, Any] | None = None,
) -> dict[str, Any]:
    task = tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    feedback = {
        "id": new_id("hfb"),
        "sender": sender,
        "content": content,
        "channel": "feishu",
        "created_at": utc_now(),
    }
    task.setdefault("human_feedback", []).append(feedback)
    task["status"] = "waiting_approval"
    task["updated_at"] = utc_now()

    reply_message = persist_message(
        task_id=task_id,
        direction="inbound",
        sender=sender,
        receiver="Phantom",
        content=content,
        status="received",
        metadata={"raw_event": raw_event or {}},
    )
    add_task_event(
        task_id,
        "feishu.reply_received",
        f"{sender}已通过飞书补充资料：{content}",
        actor_type="human",
        metadata={"message_id": reply_message["id"], "feedback": feedback},
    )

    runs = dispatch_task_agents(task, existing_runs=agent_runs.get(task_id), force=True)
    agent_runs[task_id] = runs
    add_task_event(
        task_id,
        "agents.resumed",
        "真人反馈已回流，销售助理和老板助理已基于补充信息更新输出。",
        metadata={"agent_run_ids": [run["id"] for run in runs]},
    )
    add_task_event(task_id, "approval.pending", "等待老板确认更新后的客户方案。")
    return {"task": task, "reply_message": reply_message, "agent_runs": runs}


@router.get("/status")
def status() -> dict:
    sent = [item for item in feishu_messages.values() if item["direction"] == "outbound"]
    received = [item for item in feishu_messages.values() if item["direction"] == "inbound"]
    waiting = [
        task for task in tasks.values() if task.get("status") == "waiting_human"
    ]
    return {
        "channel": "feishu",
        "mode": "webhook" if settings.feishu_webhook_url else "mock",
        "configured": bool(settings.feishu_webhook_url),
        "message": (
            "已配置FEISHU_WEBHOOK_URL，发送请求会尝试投递到飞书自定义机器人。"
            if settings.feishu_webhook_url
            else "未配置FEISHU_WEBHOOK_URL，当前使用本地模拟发送与回流。"
        ),
        "counts": {
            "sent": len(sent),
            "received": len(received),
            "waiting_reply": len(waiting),
            "failed": len(
                [item for item in feishu_messages.values() if item["status"].endswith("failed")]
            ),
        },
    }


@router.get("/messages")
def list_messages() -> dict:
    items = sorted(
        feishu_messages.values(),
        key=lambda item: item["created_at"],
        reverse=True,
    )
    return {"items": items, "total": len(items)}


@router.post("/send-message")
def send_message(payload: SendFeishuMessageRequest) -> dict:
    task = tasks.get(payload.task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    content = payload.content or default_request_content(task, payload.receiver)
    delivery_status, delivery_meta = send_webhook_text(content)
    message = persist_message(
        task_id=payload.task_id,
        direction="outbound",
        sender="销售助理",
        receiver=payload.receiver,
        content=content,
        status=delivery_status,
        metadata=delivery_meta,
    )
    task["status"] = "waiting_human"
    task["updated_at"] = utc_now()
    add_task_event(
        payload.task_id,
        "feishu.message_sent",
        f"已向{payload.receiver}发送飞书补充请求。",
        metadata={"message_id": message["id"], "content": content, **delivery_meta},
    )
    add_task_event(
        payload.task_id,
        "feishu.pending",
        f"等待{payload.receiver}在飞书补充预算和采购信息。",
    )
    return {
        "ok": delivery_status != "webhook_failed",
        "task_id": payload.task_id,
        "message": message,
    }


@router.post("/simulate-reply")
def simulate_reply(payload: SimulateFeishuReplyRequest) -> dict:
    result = apply_human_reply(
        payload.task_id,
        sender=payload.sender,
        content=payload.content,
        raw_event={"mode": "simulated"},
    )
    return {
        "ok": True,
        "task_id": payload.task_id,
        "message": result["reply_message"],
        "agent_runs": result["agent_runs"],
        "status": result["task"]["status"],
    }


@router.post("/events")
def receive_event(payload: FeishuEventRequest) -> dict:
    if payload.challenge:
        return {"challenge": payload.challenge}

    if settings.feishu_verification_token and payload.token:
        if payload.token != settings.feishu_verification_token:
            raise HTTPException(status_code=403, detail="Invalid Feishu token")

    event = payload.event or {}
    text = extract_text_from_event(event)
    task_id = extract_task_id(event, text)
    if task_id and task_id in tasks:
        sender = str(
            event.get("sender", {}).get("sender_id", {}).get("user_id")
            or event.get("sender", {}).get("sender_id", {}).get("open_id")
            or event.get("sender", {}).get("name")
            or "飞书用户"
        )
        result = apply_human_reply(
            task_id,
            sender=sender,
            content=text,
            raw_event=event,
        )
        return {
            "ok": True,
            "matched_task_id": task_id,
            "message_id": result["reply_message"]["id"],
        }

    return {"ok": True, "matched_task_id": None}
