from __future__ import annotations

from typing import Any

TASK_ROUTING = {
    "经营汇总": "老板助理",
    "任务拆解": "运营助理",
    "客户跟进": "销售助理",
    "资料检索": "知识库助理",
    "内容生成": "内容助理",
    "代码原型": "代码助理",
    "会议纪要": "运营助理",
    "多员工协同": "老板助理",
}


def parse_command(input_text: str) -> dict[str, Any]:
    """MVP parser.

    The 7-day MVP keeps a deterministic path for the golden demo while leaving
    a clear seam for replacing this with an LLM-backed parser.
    """

    normalized = input_text.strip()
    if "华星科技" in normalized or "合作方案" in normalized:
        return {
            "task_title": "华星科技合作方案准备",
            "task_goal": "准备合作方案、沟通话术和PPT大纲",
            "task_type": "客户跟进",
            "primary_agent": "销售助理",
            "collaborating_agents": ["知识库助理", "内容助理", "老板助理"],
            "human_collaborators": ["销售小张"],
            "input_sources": ["客户资料", "产品资料", "历史方案"],
            "expected_outputs": ["客户分析", "沟通话术", "PPT大纲", "邮件草稿"],
            "deadline": "明天下午",
            "approval_required": True,
            "risk_level": "medium",
            "notification_channel": "飞书",
            "archive_location": "任务中心",
        }

    task_type = "多员工协同"
    if "会议" in normalized:
        task_type = "会议纪要"
    elif "代码" in normalized or "小工具" in normalized:
        task_type = "代码原型"
    elif "资料" in normalized or "查询" in normalized:
        task_type = "资料检索"
    elif "文案" in normalized or "PPT" in normalized:
        task_type = "内容生成"

    return {
        "task_title": normalized[:32] or "未命名任务",
        "task_goal": normalized,
        "task_type": task_type,
        "primary_agent": TASK_ROUTING[task_type],
        "collaborating_agents": ["知识库助理", "老板助理"],
        "human_collaborators": [],
        "input_sources": ["企业知识库"],
        "expected_outputs": ["任务结果", "老板确认版"],
        "deadline": "待确认",
        "approval_required": True,
        "risk_level": "low",
        "notification_channel": "飞书",
        "archive_location": "任务中心",
    }

