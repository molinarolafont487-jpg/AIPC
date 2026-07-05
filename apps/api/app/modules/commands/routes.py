from fastapi import APIRouter
from pydantic import BaseModel

from app.core.command_protocol import parse_command

router = APIRouter()


class ParseCommandRequest(BaseModel):
    input: str


@router.post("/parse")
def parse(payload: ParseCommandRequest) -> dict:
    return {"command_protocol": parse_command(payload.input)}

