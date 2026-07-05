from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.modules.agents.routes import router as agents_router
from app.modules.auth.routes import router as auth_router
from app.modules.commands.routes import router as commands_router
from app.modules.integrations.feishu import router as feishu_router
from app.modules.knowledge.routes import router as knowledge_router
from app.modules.tasks.routes import router as tasks_router
from app.modules.workspaces.routes import router as workspaces_router

app = FastAPI(
    title="Phantom AI Workstation API",
    version="0.1.0",
    description="7-day MVP API for the enterprise digital employee workstation.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.app_base_url,
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "phantom-api"}


app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(workspaces_router, prefix="/api/v1", tags=["workspace"])
app.include_router(agents_router, prefix="/api/v1/agents", tags=["agents"])
app.include_router(commands_router, prefix="/api/v1/commands", tags=["commands"])
app.include_router(tasks_router, prefix="/api/v1/tasks", tags=["tasks"])
app.include_router(knowledge_router, prefix="/api/v1", tags=["knowledge"])
app.include_router(
    feishu_router, prefix="/api/v1/integrations/feishu", tags=["feishu"]
)
