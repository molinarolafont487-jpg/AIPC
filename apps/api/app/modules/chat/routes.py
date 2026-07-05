from __future__ import annotations

from typing import Any, Literal

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.agent_runtime import AGENT_PROMPT_CONFIGS
from app.core.command_protocol import parse_command
from app.core.config import settings
from app.core.demo_store import (
    ADMIN_USER_ID,
    WORKSPACE_ID,
    chat_conversations,
    chat_messages,
    model_usage_records,
    new_id,
    utc_now,
)
from app.core.schemas import CommandProtocol
from app.modules.commands.routes import attach_knowledge_refs, infer_dataset_filter
from app.modules.knowledge.routes import search_knowledge_refs
from app.modules.tasks.routes import persist_task

chat_router = APIRouter()
model_router = APIRouter()

ChatMode = Literal["general", "knowledge", "agent", "model"]


class CreateConversationRequest(BaseModel):
    title: str = "新对话"
    mode: ChatMode = "general"
    agent_name: str | None = None
    model_key: str | None = None
    dataset: str | None = None


class SendMessageRequest(BaseModel):
    content: str = Field(min_length=1)
    mode: ChatMode = "general"
    agent_name: str | None = None
    model_key: str | None = None
    dataset: str | None = None


class ConvertToTaskRequest(BaseModel):
    message_id: str | None = None
    instruction: str | None = None


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 2)


def has_real_model_config() -> bool:
    return bool(settings.model_base_url and settings.model_api_key and settings.model_api_key != "local-dev")


def get_model_catalog() -> dict[str, dict[str, Any]]:
    real_model_status = "online" if has_real_model_config() else "standby"
    real_model_name = (
        f"NewAPI云端模型 / {settings.model_chat_model}"
        if has_real_model_config()
        else "云端高质量模型"
    )
    return {
        "local-balanced": {
            "name": "本地均衡模型",
            "provider": "local",
            "quality": "balanced",
            "unit_cost": 0.0,
            "status": "online",
        },
        "local-private": {
            "name": "本地隐私优先模型",
            "provider": "local",
            "quality": "private",
            "unit_cost": 0.0,
            "status": "online",
        },
        "cloud-quality": {
            "name": real_model_name,
            "provider": "cloud",
            "quality": "high",
            "unit_cost": 0.006,
            "status": real_model_status,
        },
    }


def select_model(mode: str, requested_model: str | None, content: str) -> str:
    catalog = get_model_catalog()
    if has_real_model_config():
        return "cloud-quality"
    if requested_model in catalog:
        return requested_model
    if mode == "knowledge" or any(keyword in content for keyword in ["资料", "知识库", "案例", "合同"]):
        return "local-private"
    if mode == "model" or any(keyword in content for keyword in ["高质量", "润色", "重写", "正式"]):
        return "cloud-quality"
    return "local-balanced"


def create_message(
    conversation_id: str,
    role: str,
    content: str,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    message = {
        "id": new_id("msg"),
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
        "metadata": metadata or {},
        "created_at": utc_now(),
    }
    chat_messages.setdefault(conversation_id, []).append(message)
    return message


def summarize_refs(refs: list[dict[str, Any]]) -> str:
    if not refs:
        return "暂未命中企业知识库资料。"
    return "\n".join(
        f"- {ref['document_name']} p.{ref['page_start']}-{ref['page_end']}：{ref['excerpt'][:96]}"
        for ref in refs
    )


def build_agent_answer(agent_name: str, content: str, refs: list[dict[str, Any]]) -> str:
    config = AGENT_PROMPT_CONFIGS.get(agent_name)
    if not config:
        return f"我会先按通用企业助手处理：{content}\n\n建议下一步：如果要进入执行闭环，可以点击“转为任务”。"
    return "\n".join(
        [
            f"我是{agent_name}，我会按岗位边界处理这个问题。",
            f"岗位说明：{config['role_description']}",
            f"职责边界：{config['duty_boundary']}",
            "",
            "一、初步判断",
            f"你的输入是：{content}",
            "二、可参考资料",
            summarize_refs(refs),
            "三、建议动作",
            "如果这是正式交付物或需要真人协同，建议转为任务卡，交给对应数字员工继续执行并进入任务中心归档。",
        ]
    )


def generate_answer(
    content: str,
    mode: str,
    agent_name: str | None,
    dataset: str | None,
) -> tuple[str, list[dict[str, Any]], list[dict[str, str]]]:
    filters = {"dataset": dataset} if dataset else infer_dataset_filter(content)
    refs = search_knowledge_refs(content, top_k=4, filters=filters)
    actions = [
        {"key": "convert_task", "label": "转为任务"},
        {"key": "assign_agent", "label": "交给数字员工"},
        {"key": "save_knowledge", "label": "保存到知识库"},
    ]

    if mode == "knowledge":
        answer = "\n".join(
            [
                "我已按企业知识库模式检索相关资料。",
                "",
                "一、资料结论",
                "当前问题可以先基于以下企业资料回答，正式对外内容仍建议进入任务闭环确认。",
                "二、引用资料",
                summarize_refs(refs),
                "三、下一步建议",
                "如果要形成客户方案、会议纪要或执行动作，请点击“转为任务”。",
            ]
        )
        actions.extend(
            [
                {"key": "ppt_outline", "label": "生成PPT大纲"},
                {"key": "customer_email", "label": "生成客户邮件"},
            ]
        )
        return answer, refs, actions

    if mode == "agent":
        return build_agent_answer(agent_name or "销售助理", content, refs), refs, actions

    if mode == "model":
        answer = "\n".join(
            [
                "我已按高质量模型模式处理这次请求。",
                "",
                "一、重写/分析结果",
                f"{content}",
                "二、企业化建议",
                "建议补充业务背景、目标客户、使用场景、风险边界和老板确认事项，让结果能进入任务中心沉淀。",
                "三、后续动作",
                "可以继续追问，也可以转为任务交给数字员工生成正式交付物。",
            ]
        )
        return answer, refs, actions

    answer = "\n".join(
        [
            "这是 AI对话中心的通用大模型回答。",
            "",
            "一、理解",
            f"你想处理的是：{content}",
            "二、初步建议",
            "如果只是临时问答，可以继续在这里追问；如果需要正式执行、真人协同或归档，建议转为任务。",
            "三、可用动作",
            "可以转为任务、交给指定数字员工、保存到知识库，或继续让模型补充方案细节。",
        ]
    )
    return answer, refs, actions


def completion_url() -> str:
    base_url = settings.model_base_url.rstrip("/")
    if base_url.endswith("/v1"):
        return f"{base_url}/chat/completions"
    return f"{base_url}/v1/chat/completions"


def build_system_prompt(mode: str, agent_name: str | None, refs: list[dict[str, Any]]) -> str:
    ref_text = summarize_refs(refs)
    agent_config = AGENT_PROMPT_CONFIGS.get(agent_name or "")
    agent_text = (
        f"当前指定数字员工：{agent_name}。岗位：{agent_config['role_description']}。边界：{agent_config['duty_boundary']}。"
        if agent_config
        else "未指定数字员工时，以企业AI助手身份回答。"
    )
    return "\n".join(
        [
            "你是 Phantom AI Workstation 的企业AI对话中心。",
            "你要用简洁、专业的中文回答，优先服务企业内部问答、客户分析、内容创作和对话转任务。",
            "AI对话中心负责认知与创作，正式执行、真人协同、老板确认和归档应建议用户转入任务中心。",
            f"当前对话模式：{mode}。",
            agent_text,
            "如有企业知识库引用，必须基于引用回答并指出资料缺口，不要编造客户预算、合同条款或未提供事实。",
            "企业知识库引用：",
            ref_text,
        ]
    )


def call_chat_completion(
    content: str,
    mode: str,
    agent_name: str | None,
    refs: list[dict[str, Any]],
) -> tuple[str, dict[str, int]]:
    payload = {
        "model": settings.model_chat_model,
        "messages": [
            {"role": "system", "content": build_system_prompt(mode, agent_name, refs)},
            {"role": "user", "content": content},
        ],
        "temperature": 0.4,
    }
    response = httpx.post(
        completion_url(),
        headers={
            "Authorization": f"Bearer {settings.model_api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    answer = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    return answer, {
        "input_tokens": int(usage.get("prompt_tokens") or estimate_tokens(content)),
        "output_tokens": int(usage.get("completion_tokens") or estimate_tokens(answer)),
    }


def record_usage(
    conversation_id: str,
    model_key: str,
    mode: str,
    prompt: str,
    answer: str,
    actual_usage: dict[str, int] | None = None,
    status: str = "succeeded",
) -> dict[str, Any]:
    model = get_model_catalog()[model_key]
    input_tokens = actual_usage["input_tokens"] if actual_usage else estimate_tokens(prompt)
    output_tokens = actual_usage["output_tokens"] if actual_usage else estimate_tokens(answer)
    cost = round(((input_tokens + output_tokens) / 1000) * model["unit_cost"], 4)
    record = {
        "id": new_id("use"),
        "workspace_id": WORKSPACE_ID,
        "conversation_id": conversation_id,
        "model_key": model_key,
        "model_name": model["name"],
        "provider": model["provider"],
        "mode": mode,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "estimated_cost": cost,
        "status": status,
        "created_at": utc_now(),
    }
    model_usage_records.append(record)
    return record


@chat_router.post("/conversations")
def create_conversation(payload: CreateConversationRequest) -> dict:
    conversation_id = new_id("cnv")
    conversation = {
        "id": conversation_id,
        "workspace_id": WORKSPACE_ID,
        "creator_id": ADMIN_USER_ID,
        "title": payload.title,
        "mode": payload.mode,
        "agent_name": payload.agent_name,
        "model_key": payload.model_key or "local-balanced",
        "dataset": payload.dataset,
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    chat_conversations[conversation_id] = conversation
    chat_messages[conversation_id] = []
    return {"conversation": conversation, "messages": []}


@chat_router.get("/conversations")
def list_conversations() -> dict:
    items = sorted(
        chat_conversations.values(),
        key=lambda item: item["updated_at"],
        reverse=True,
    )
    return {"items": items, "total": len(items)}


@chat_router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str) -> dict:
    conversation = chat_conversations.get(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {
        "conversation": conversation,
        "messages": chat_messages.get(conversation_id, []),
    }


@chat_router.post("/conversations/{conversation_id}/messages")
def send_message(conversation_id: str, payload: SendMessageRequest) -> dict:
    conversation = chat_conversations.get(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    model_key = select_model(payload.mode, payload.model_key, payload.content)
    user_message = create_message(
        conversation_id,
        "user",
        payload.content,
        metadata={"mode": payload.mode, "agent_name": payload.agent_name, "dataset": payload.dataset},
    )
    answer, refs, actions = generate_answer(
        payload.content,
        payload.mode,
        payload.agent_name,
        payload.dataset,
    )
    generation_meta: dict[str, Any] = {"generation": "fallback"}
    actual_usage: dict[str, int] | None = None
    usage_status = "fallback"
    if has_real_model_config():
        try:
            answer, actual_usage = call_chat_completion(
                payload.content,
                payload.mode,
                payload.agent_name,
                refs,
            )
            generation_meta = {"generation": "real", "base_url": settings.model_base_url}
            usage_status = "succeeded"
        except httpx.HTTPError as error:
            generation_meta = {
                "generation": "fallback",
                "model_error": str(error),
                "base_url": settings.model_base_url,
            }
    usage = record_usage(
        conversation_id,
        model_key,
        payload.mode,
        payload.content,
        answer,
        actual_usage=actual_usage,
        status=usage_status,
    )
    catalog = get_model_catalog()
    assistant_message = create_message(
        conversation_id,
        "assistant",
        answer,
        metadata={
            "mode": payload.mode,
            "agent_name": payload.agent_name,
            "model_key": model_key,
            "model_name": catalog[model_key]["name"],
            "knowledge_refs": refs,
            "actions": actions,
            "usage_id": usage["id"],
            **generation_meta,
        },
    )
    conversation["mode"] = payload.mode
    conversation["agent_name"] = payload.agent_name
    conversation["model_key"] = model_key
    conversation["dataset"] = payload.dataset
    conversation["updated_at"] = utc_now()
    if conversation["title"] == "新对话":
        conversation["title"] = payload.content[:24]

    return {
        "conversation": conversation,
        "messages": chat_messages[conversation_id],
        "user_message": user_message,
        "assistant_message": assistant_message,
        "usage": usage,
    }


@chat_router.post("/conversations/{conversation_id}/convert-to-task")
def convert_to_task(conversation_id: str, payload: ConvertToTaskRequest | None = None) -> dict:
    conversation = chat_conversations.get(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = chat_messages.get(conversation_id, [])
    user_messages = [message for message in messages if message["role"] == "user"]
    if not user_messages:
        raise HTTPException(status_code=409, detail="Conversation has no user message")

    source_text = payload.instruction if payload and payload.instruction else user_messages[-1]["content"]
    protocol = attach_knowledge_refs(parse_command(source_text), source_text)
    task = persist_task(CommandProtocol(**protocol).as_task_payload())
    task["source"] = {
        "type": "chat",
        "conversation_id": conversation_id,
        "message_id": payload.message_id if payload else None,
    }
    conversation["last_task_id"] = task["id"]
    conversation["updated_at"] = utc_now()
    create_message(
        conversation_id,
        "system",
        f"已将对话转为任务卡：{task['title']}，可在任务中心继续确认执行。",
        metadata={"task_id": task["id"], "action": "convert_to_task"},
    )
    return {
        "task_id": task["id"],
        "status": task["status"],
        "task": task,
        "conversation": conversation,
        "messages": chat_messages[conversation_id],
    }


@model_router.get("/status")
def model_router_status() -> dict:
    total_calls = len(model_usage_records)
    total_cost = round(sum(item["estimated_cost"] for item in model_usage_records), 4)
    total_tokens = sum(item["input_tokens"] + item["output_tokens"] for item in model_usage_records)
    local_calls = len([item for item in model_usage_records if item["provider"] == "local"])
    cloud_calls = len([item for item in model_usage_records if item["provider"] == "cloud"])
    by_model = []
    for key, model in get_model_catalog().items():
        records = [item for item in model_usage_records if item["model_key"] == key]
        by_model.append(
            {
                "model_key": key,
                **model,
                "calls": len(records),
                "tokens": sum(item["input_tokens"] + item["output_tokens"] for item in records),
                "estimated_cost": round(sum(item["estimated_cost"] for item in records), 4),
            }
        )
    return {
        "summary": {
            "total_calls": total_calls,
            "total_tokens": total_tokens,
            "estimated_cost": total_cost,
            "local_ratio": round((local_calls / total_calls) * 100, 1) if total_calls else 0,
            "cloud_ratio": round((cloud_calls / total_calls) * 100, 1) if total_calls else 0,
        },
        "models": by_model,
        "recent_usage": list(reversed(model_usage_records[-12:])),
    }
