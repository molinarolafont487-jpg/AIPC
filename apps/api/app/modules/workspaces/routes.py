from fastapi import APIRouter

from app.core.demo_store import (
    ADMIN_USER_ID,
    agents,
    permissions,
    roles,
    users,
    workspace,
    workspace_members,
)

router = APIRouter()


@router.get("/me")
def me() -> dict:
    user = users[ADMIN_USER_ID]
    role = roles[user["role_id"]]
    member = next(
        item for item in workspace_members.values() if item["user_id"] == user["id"]
    )
    return {
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": role,
            "membership": member,
        },
        "workspace": workspace,
        "permissions": role["permissions"],
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


@router.get("/workspaces/current/members")
def current_workspace_members() -> dict:
    return {
        "items": [
            {
                **member,
                "user": {
                    "id": users[member["user_id"]]["id"],
                    "email": users[member["user_id"]]["email"],
                    "name": users[member["user_id"]]["name"],
                },
                "role": roles[member["role_id"]],
            }
            for member in workspace_members.values()
        ],
        "total": len(workspace_members),
    }


@router.get("/workspaces/current/seed")
def current_workspace_seed() -> dict:
    return {
        "workspace": workspace,
        "seeded": True,
        "counts": {
            "users": len(users),
            "members": len(workspace_members),
            "roles": len(roles),
            "permissions": len(permissions),
            "agents": len(agents),
        },
        "demo_login": {
            "email": "admin@phantom.local",
            "password": "phantom123",
        },
    }
