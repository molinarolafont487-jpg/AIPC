from typing import Literal

from pydantic import BaseModel, Field, field_validator

TaskType = Literal[
    "经营汇总",
    "任务拆解",
    "客户跟进",
    "资料检索",
    "内容生成",
    "代码原型",
    "会议纪要",
    "多员工协同",
]

RiskLevel = Literal["low", "medium", "high"]


class KnowledgeReference(BaseModel):
    chunk_id: str
    document_id: str
    document_name: str
    dataset: str = "custom"
    page_start: int = 1
    page_end: int = 1
    score: float = 0
    excerpt: str


class CommandProtocol(BaseModel):
    task_title: str = Field(min_length=1)
    task_goal: str = Field(min_length=1)
    task_type: TaskType
    primary_agent: str = Field(min_length=1)
    collaborating_agents: list[str] = Field(default_factory=list)
    human_collaborators: list[str] = Field(default_factory=list)
    input_sources: list[str] = Field(default_factory=list)
    expected_outputs: list[str] = Field(default_factory=list)
    deadline: str = "待确认"
    approval_required: bool = True
    risk_level: RiskLevel = "low"
    notification_channel: Literal["飞书"] = "飞书"
    archive_location: str = "任务中心"
    knowledge_refs: list[KnowledgeReference] = Field(default_factory=list)

    @field_validator(
        "collaborating_agents",
        "human_collaborators",
        "input_sources",
        "expected_outputs",
        mode="before",
    )
    @classmethod
    def normalize_string_list(cls, value: object) -> list[str]:
        if value is None:
            return []
        if isinstance(value, str):
            return [item.strip() for item in value.split("、") if item.strip()]
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        return []

    def as_task_payload(self) -> dict:
        return self.model_dump()
