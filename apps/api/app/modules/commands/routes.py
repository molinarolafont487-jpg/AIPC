from fastapi import APIRouter
from pydantic import BaseModel

from app.core.command_protocol import (
    TASK_ROUTING_RULES,
    apply_routing_rule,
    parse_command,
)
from app.core.schemas import CommandProtocol
from app.modules.knowledge.routes import search_knowledge_refs

router = APIRouter()


class ParseCommandRequest(BaseModel):
    input: str


class RouteCommandRequest(BaseModel):
    command_protocol: CommandProtocol


def infer_dataset_filter(text: str) -> dict | None:
    if "园区" in text or "政策" in text or "招商" in text:
        return {"dataset": "园区"}
    if "幻影" in text or "Phantom" in text or "产品介绍" in text:
        return {"dataset": "幻影自用"}
    if "华星" in text or "制造" in text or "客户" in text or "合作方案" in text:
        return {"dataset": "制造企业"}
    return None


def build_knowledge_query(protocol: dict, original_input: str = "") -> str:
    query_parts = [
        original_input,
        protocol.get("task_title", ""),
        protocol.get("task_goal", ""),
        protocol.get("task_type", ""),
        *protocol.get("input_sources", []),
        *protocol.get("expected_outputs", []),
        *protocol.get("human_collaborators", []),
    ]
    return " ".join(part for part in query_parts if part)


def attach_knowledge_refs(protocol: dict, original_input: str = "") -> dict:
    query = build_knowledge_query(protocol, original_input)
    filters = infer_dataset_filter(query)
    refs = search_knowledge_refs(query, top_k=4, filters=filters)
    return {**protocol, "knowledge_refs": refs}


@router.post("/parse")
def parse(payload: ParseCommandRequest) -> dict:
    protocol = attach_knowledge_refs(parse_command(payload.input), payload.input)
    return {"command_protocol": CommandProtocol(**protocol).as_task_payload()}


@router.get("/routing-rules")
def routing_rules() -> dict:
    return {"items": TASK_ROUTING_RULES}


@router.post("/route")
def route(payload: RouteCommandRequest) -> dict:
    routed = apply_routing_rule(payload.command_protocol.as_task_payload())
    routed = attach_knowledge_refs(routed)
    return {"command_protocol": CommandProtocol(**routed).as_task_payload()}
