from fastapi import APIRouter

from app.core.demo_store import ADMIN_USER_ID, users, workspace

router = APIRouter()


@router.get("/me")
def me() -> dict:
    user = users[ADMIN_USER_ID]
    return {
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
        },
        "workspace": workspace,
        "permissions": [
            "workspace:read",
            "agents:run",
            "tasks:write",
            "tasks:approve",
            "documents:read",
            "documents:write",
            "integrations:write",
        ],
    }


@router.get("/workspaces/current")
def current_workspace() -> dict:
    return {
        **workspace,
        "settings": {
            "auth_mode": "lightweight",
            "notification_channel": "feishu",
            "vector_store": "pgvector",
            "real_agents": ["销售助理", "知识库助理", "老板助理"],
        },
    }

