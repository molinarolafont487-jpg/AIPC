from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.core.security import hash_password

WORKSPACE_ID = "wks_demo"
ADMIN_USER_ID = "usr_admin"

users: dict[str, dict[str, Any]] = {
    ADMIN_USER_ID: {
        "id": ADMIN_USER_ID,
        "email": "admin@phantom.local",
        "name": "Phantom Admin",
        "password_hash": hash_password("phantom123"),
        "workspace_id": WORKSPACE_ID,
        "role": "owner",
        "feishu_user_id": "ou_demo_xiaozhang",
    }
}

workspace = {
    "id": WORKSPACE_ID,
    "name": "Phantom Demo Workspace",
    "slug": "phantom-demo",
    "plan": "local-mvp",
}

agents = [
    {
        "id": "agt_boss",
        "key": "boss",
        "name": "老板助理",
        "execution_mode": "real",
        "description": "结果汇总、风险提醒、老板确认版。",
        "tools": ["task.summarize", "risk.check", "approval.prepare"],
        "status": "active",
    },
    {
        "id": "agt_sales",
        "key": "sales",
        "name": "销售助理",
        "execution_mode": "real",
        "description": "客户分析、跟进话术、方案生成、邮件草稿。",
        "tools": ["knowledge.search", "feishu.request_human", "artifact.write"],
        "status": "active",
    },
    {
        "id": "agt_knowledge",
        "key": "knowledge",
        "name": "知识库助理",
        "execution_mode": "real",
        "description": "资料检索、文档总结、证据引用、知识沉淀。",
        "tools": ["document.search", "document.summarize", "citation.write"],
        "status": "active",
    },
    {
        "id": "agt_ops",
        "key": "ops",
        "name": "运营助理",
        "execution_mode": "semi_auto",
        "description": "任务拆解、进度跟踪、执行闭环。",
        "tools": ["template.execution_steps"],
        "status": "active",
    },
    {
        "id": "agt_content",
        "key": "content",
        "name": "内容助理",
        "execution_mode": "semi_auto",
        "description": "PPT大纲、文案、短视频脚本。",
        "tools": ["template.ppt_outline"],
        "status": "active",
    },
    {
        "id": "agt_code",
        "key": "code",
        "name": "代码助理",
        "execution_mode": "semi_auto",
        "description": "小工具需求、代码原型、自动化脚本。",
        "tools": ["template.requirement_outline"],
        "status": "active",
    },
]

tasks: dict[str, dict[str, Any]] = {}
task_events: dict[str, list[dict[str, Any]]] = {}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


def add_task_event(
    task_id: str,
    event_type: str,
    message: str,
    actor_type: str = "system",
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    event = {
        "id": new_id("evt"),
        "task_id": task_id,
        "event_type": event_type,
        "actor_type": actor_type,
        "message": message,
        "metadata": metadata or {},
        "created_at": utc_now(),
    }
    task_events.setdefault(task_id, []).append(event)
    return event

