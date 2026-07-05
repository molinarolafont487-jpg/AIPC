from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from app.core.demo_store import WORKSPACE_ID, roles, users, workspace
from app.core.security import create_access_token, verify_password

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(payload: LoginRequest) -> dict:
    user = next((item for item in users.values() if item["email"] == payload.email), None)
    if user is None or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    role = roles[user["role_id"]]
    return {
        "access_token": create_access_token(user["id"], WORKSPACE_ID),
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": role,
        },
        "workspace": workspace,
    }


@router.post("/logout")
def logout() -> dict[str, bool]:
    return {"ok": True}
