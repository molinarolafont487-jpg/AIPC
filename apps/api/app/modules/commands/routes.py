from fastapi import APIRouter
from pydantic import BaseModel

from app.core.command_protocol import (
    TASK_ROUTING_RULES,
    apply_routing_rule,
    parse_command,
)
from app.core.schemas import CommandProtocol

router = APIRouter()


class ParseCommandRequest(BaseModel):
    input: str


class RouteCommandRequest(BaseModel):
    command_protocol: CommandProtocol


@router.post("/parse")
def parse(payload: ParseCommandRequest) -> dict:
    return {"command_protocol": parse_command(payload.input)}


@router.get("/routing-rules")
def routing_rules() -> dict:
    return {"items": TASK_ROUTING_RULES}


@router.post("/route")
def route(payload: RouteCommandRequest) -> dict:
    routed = apply_routing_rule(payload.command_protocol.as_task_payload())
    return {"command_protocol": CommandProtocol(**routed).as_task_payload()}
