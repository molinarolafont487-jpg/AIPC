from __future__ import annotations

from typing import Any

TASK_ROUTING_RULES: dict[str, dict[str, Any]] = {
    "经营汇总": {
        "primary_agent": "老板助理",
        "collaborating_agents": ["知识库助理"],
        "input_sources": ["经营数据", "任务中心"],
        "expected_outputs": ["经营摘要", "风险提醒", "待确认事项"],
        "risk_level": "medium",
        "keywords": ["经营", "汇总", "今日重点", "老板简报", "结果汇报"],
    },
    "任务拆解": {
        "primary_agent": "运营助理",
        "collaborating_agents": ["老板助理"],
        "input_sources": ["任务目标", "企业规则"],
        "expected_outputs": ["执行步骤", "责任分配", "进度节点"],
        "risk_level": "low",
        "keywords": ["拆解", "安排", "进度", "执行", "任务"],
    },
    "客户跟进": {
        "primary_agent": "销售助理",
        "collaborating_agents": ["知识库助理", "内容助理", "老板助理"],
        "input_sources": ["客户资料", "产品资料", "历史方案"],
        "expected_outputs": ["客户分析", "沟通话术", "PPT大纲", "邮件草稿"],
        "risk_level": "medium",
        "keywords": ["客户", "销售", "跟进", "方案", "预算", "合作", "话术"],
    },
    "资料检索": {
        "primary_agent": "知识库助理",
        "collaborating_agents": ["老板助理"],
        "input_sources": ["企业知识库"],
        "expected_outputs": ["资料摘要", "引用证据", "资料缺口"],
        "risk_level": "low",
        "keywords": ["资料", "查询", "检索", "文档", "证据", "知识库"],
    },
    "内容生成": {
        "primary_agent": "内容助理",
        "collaborating_agents": ["知识库助理", "老板助理"],
        "input_sources": ["品牌资料", "产品资料", "客户资料"],
        "expected_outputs": ["PPT大纲", "宣传文案", "视频脚本"],
        "risk_level": "low",
        "keywords": ["内容", "文案", "PPT", "脚本", "海报", "品牌"],
    },
    "代码原型": {
        "primary_agent": "代码助理",
        "collaborating_agents": ["知识库助理", "老板助理"],
        "input_sources": ["需求描述", "系统规则"],
        "expected_outputs": ["需求说明", "页面结构", "接口草案"],
        "risk_level": "medium",
        "keywords": ["代码", "小工具", "原型", "页面", "接口", "自动化"],
    },
    "会议纪要": {
        "primary_agent": "运营助理",
        "collaborating_agents": ["知识库助理", "老板助理"],
        "input_sources": ["会议纪要", "会议录音", "任务中心"],
        "expected_outputs": ["会议摘要", "行动项", "责任分配"],
        "risk_level": "low",
        "keywords": ["会议", "纪要", "录音", "行动项", "会后"],
    },
    "多员工协同": {
        "primary_agent": "老板助理",
        "collaborating_agents": ["运营助理", "知识库助理"],
        "input_sources": ["任务目标", "企业知识库"],
        "expected_outputs": ["协同计划", "任务结果", "老板确认版"],
        "risk_level": "medium",
        "keywords": ["协同", "一起", "多个", "综合", "帮我"],
    },
}

TASK_TYPES = list(TASK_ROUTING_RULES.keys())


def split_people(input_text: str) -> list[str]:
    people = []
    for candidate in ["销售小张", "小张", "销售小李", "财务小王", "运营小陈"]:
        if candidate in input_text:
            people.append("销售小张" if candidate == "小张" else candidate)
    return list(dict.fromkeys(people))


def score_task_type(input_text: str) -> str:
    normalized = input_text.strip()
    best_type = "多员工协同"
    best_score = 0
    for task_type, rule in TASK_ROUTING_RULES.items():
        score = sum(1 for keyword in rule["keywords"] if keyword in normalized)
        if score > best_score:
            best_type = task_type
            best_score = score
    return best_type


def apply_routing_rule(protocol: dict[str, Any]) -> dict[str, Any]:
    task_type = protocol.get("task_type") or "多员工协同"
    if task_type not in TASK_ROUTING_RULES:
        task_type = "多员工协同"

    rule = TASK_ROUTING_RULES[task_type]
    routed = {
        **protocol,
        "task_type": task_type,
        "primary_agent": rule["primary_agent"],
        "risk_level": protocol.get("risk_level") or rule["risk_level"],
    }
    if not routed.get("collaborating_agents"):
        routed["collaborating_agents"] = rule["collaborating_agents"]
    if not routed.get("input_sources"):
        routed["input_sources"] = rule["input_sources"]
    if not routed.get("expected_outputs"):
        routed["expected_outputs"] = rule["expected_outputs"]
    return routed


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

    task_type = score_task_type(normalized)
    rule = TASK_ROUTING_RULES[task_type]
    human_collaborators = split_people(normalized)

    return {
        "task_title": normalized[:32] or "未命名任务",
        "task_goal": normalized,
        "task_type": task_type,
        "primary_agent": rule["primary_agent"],
        "collaborating_agents": rule["collaborating_agents"],
        "human_collaborators": human_collaborators,
        "input_sources": rule["input_sources"],
        "expected_outputs": rule["expected_outputs"],
        "deadline": "待确认",
        "approval_required": True,
        "risk_level": rule["risk_level"],
        "notification_channel": "飞书",
        "archive_location": "任务中心",
    }
