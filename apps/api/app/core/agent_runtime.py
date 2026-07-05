from __future__ import annotations

from typing import Any

from app.core.demo_store import agents, new_id, utc_now

AGENT_PROMPT_CONFIGS: dict[str, dict[str, Any]] = {
    "老板助理": {
        "agent_key": "boss",
        "role_description": "站在老板视角汇总阶段结果，生成一页确认版。",
        "duty_boundary": "只做汇总、风险提醒和确认事项，不替老板审批或外发材料。",
        "available_sources": ["任务卡", "数字员工输出", "知识库引用", "真人补充记录"],
        "output_format": ["一、结论", "二、关键依据", "三、风险提醒", "四、需要老板确认", "五、建议下一步动作"],
        "forbidden": ["不得跳过老板确认", "不得隐藏资料缺口", "不得声称已经外发客户材料"],
        "requires_human_confirmation": True,
    },
    "运营助理": {
        "agent_key": "ops",
        "role_description": "把任务卡拆成可跟进的执行步骤和责任分配。",
        "duty_boundary": "负责拆解和提醒，不替真人员工补资料，不替老板归档。",
        "available_sources": ["任务卡", "企业规则", "任务中心状态"],
        "output_format": ["一、执行步骤", "二、责任分配", "三、时间节点", "四、风险提示"],
        "forbidden": ["不得隐藏延期风险", "不得把待确认事项标记为已完成"],
        "requires_human_confirmation": False,
    },
    "销售助理": {
        "agent_key": "sales",
        "role_description": "输出客户判断、沟通话术、跟进方案和邮件草稿。",
        "duty_boundary": "不承诺价格、合同条款或交付日期，预算缺口必须请求真人补充。",
        "available_sources": ["客户资料", "产品资料", "历史沟通记录", "知识库引用"],
        "output_format": ["一、客户判断", "二、需求与预算线索", "三、推荐沟通话术", "四、合作方案要点", "五、邮件草稿", "六、需要真人补充的信息"],
        "forbidden": ["不得编造客户预算", "不得绕过飞书协同请求", "不得直接承诺合同条款"],
        "requires_human_confirmation": True,
    },
    "知识库助理": {
        "agent_key": "knowledge",
        "role_description": "检索并总结企业知识库，输出可追溯引用证据。",
        "duty_boundary": "只基于可引用资料输出结论，资料不足时明确标记缺口。",
        "available_sources": ["企业知识库", "客户资料", "产品资料", "历史方案", "会议纪要"],
        "output_format": ["一、检索结论", "二、引用证据", "三、资料缺口", "四、建议补充材料"],
        "forbidden": ["不得输出无来源事实", "不得把低相关资料当确定证据", "不得泄露越权资料"],
        "requires_human_confirmation": False,
    },
    "内容助理": {
        "agent_key": "content",
        "role_description": "把任务目标和引用证据转成PPT大纲、文案或脚本。",
        "duty_boundary": "只输出内容草案，不作为最终外发版。",
        "available_sources": ["品牌资料", "产品资料", "客户背景", "知识库引用"],
        "output_format": ["一、PPT结构", "二、每页标题", "三、每页关键内容", "四、需要补充的素材"],
        "forbidden": ["不得编造客户案例", "不得夸大产品能力", "不得直接输出最终外发版"],
        "requires_human_confirmation": True,
    },
    "代码助理": {
        "agent_key": "code",
        "role_description": "输出小工具需求、页面结构、接口草案和自动化脚本建议。",
        "duty_boundary": "只生成原型和开发建议，不直接改生产系统。",
        "available_sources": ["需求描述", "系统规则", "企业知识库引用"],
        "output_format": ["一、需求目标", "二、用户流程", "三、页面结构", "四、数据字段", "五、接口草案", "六、开发任务清单"],
        "forbidden": ["不得写入真实密钥", "不得绕过权限审计", "不得承诺代码已上线"],
        "requires_human_confirmation": True,
    },
}


def get_agent_config(agent_name: str) -> dict[str, Any]:
    return AGENT_PROMPT_CONFIGS.get(
        agent_name,
        {
            "agent_key": "custom",
            "role_description": "根据任务卡输出阶段结果。",
            "duty_boundary": "仅输出建议，等待人工确认。",
            "available_sources": ["任务卡"],
            "output_format": ["一、阶段结果", "二、下一步"],
            "forbidden": ["不得跳过人工确认"],
            "requires_human_confirmation": True,
        },
    )


def get_execution_mode(agent_name: str) -> str:
    agent_key = get_agent_config(agent_name)["agent_key"]
    agent = next((item for item in agents if item["key"] == agent_key), None)
    return agent["execution_mode"] if agent else "semi_auto"


def build_agent_sequence(protocol: dict[str, Any]) -> list[str]:
    names = [
        protocol.get("primary_agent", ""),
        *protocol.get("collaborating_agents", []),
    ]
    if "老板助理" not in names:
        names.append("老板助理")
    return [name for name in dict.fromkeys(names) if name in AGENT_PROMPT_CONFIGS]


def summarize_refs(refs: list[dict[str, Any]], limit: int = 3) -> str:
    if not refs:
        return "暂无引用资料"
    names = list(dict.fromkeys(ref["document_name"] for ref in refs))
    return "、".join(names[:limit]) + (" 等" if len(names) > limit else "")


def summarize_previous_runs(previous_runs: list[dict[str, Any]]) -> str:
    if not previous_runs:
        return "暂无前置输出"
    return "；".join(
        f"{run['agent_name']}已输出{len(run['artifacts'])}项"
        for run in previous_runs
    )


def output_for_agent(
    agent_name: str,
    task: dict[str, Any],
    previous_runs: list[dict[str, Any]],
) -> tuple[str, list[str]]:
    protocol = task["command_protocol"]
    refs = protocol.get("knowledge_refs", [])
    human_collaborators = protocol.get("human_collaborators", [])
    ref_summary = summarize_refs(refs)
    title = protocol["task_title"]
    deadline = protocol.get("deadline", "待确认")
    expected_outputs = "、".join(protocol.get("expected_outputs", [])) or "任务结果"
    source_summary = "、".join(protocol.get("input_sources", [])) or "任务卡"
    human_feedback = task.get("human_feedback", [])
    feedback_summary = "；".join(
        f"{item['sender']}：{item['content']}" for item in human_feedback[-2:]
    )

    if agent_name == "知识库助理":
        evidence_lines = "\n".join(
            f"- {ref['document_name']}：{ref['excerpt'][:72]}"
            for ref in refs[:4]
        ) or "- 暂无可追溯引用，需要补充资料。"
        return (
            "\n".join(
                [
                    "一、检索结论",
                    f"围绕「{title}」已匹配 {len(refs)} 条资料，主要来自 {ref_summary}。",
                    "二、引用证据",
                    evidence_lines,
                    "三、资料缺口",
                    "预算上限、竞争对手信息和最终报价边界仍需真人补充确认。",
                    "四、建议补充材料",
                    "请补充客户预算、关键联系人偏好、是否要求本地部署和预计采购时间。",
                ]
            ),
            ["引用证据清单", "资料缺口清单"],
        )

    if agent_name == "销售助理":
        human_text = "、".join(human_collaborators) if human_collaborators else "真人销售"
        budget_line = (
            f"已收到真人补充：{feedback_summary}。可据此更新方案预算段，但正式报价仍需老板确认。"
            if feedback_summary
            else f"预算信息不能编造，需要 {human_text} 补充。"
        )
        supplement_line = (
            "预算信息已回流，下一步建议确认报价边界、付款周期和试点范围。"
            if feedback_summary
            else f"请 {human_text} 在飞书补充预算上限、付款周期、竞品情况和关键联系人偏好。"
        )
        return (
            "\n".join(
                [
                    "一、客户判断",
                    f"{title}属于客户跟进型任务，当前资料显示客户关注预算、数据安全和落地周期。",
                    "二、需求与预算线索",
                    f"可用资料：{ref_summary}；{budget_line}",
                    "三、推荐沟通话术",
                    "建议从“先跑一条真实协同闭环”切入，强调自然语言指挥、知识库引用、飞书真人协同和老板确认。",
                    "四、合作方案要点",
                    f"方案应包含客户现状、试点目标、数字员工分工、{expected_outputs}、风险与确认事项。",
                    "五、邮件草稿",
                    "建议邮件主题：华星科技AI工作站试点方案初稿确认。正文先同步试点范围，再列出待补充预算和部署要求。",
                    "六、需要真人补充的信息",
                    supplement_line,
                ]
            ),
            ["客户分析", "销售话术", "邮件草稿", "真人补充请求"],
        )

    if agent_name == "内容助理":
        return (
            "\n".join(
                [
                    "一、PPT结构",
                    "建议使用7页结构：客户现状、核心痛点、AI工作站方案、数字员工分工、试点流程、报价边界、确认事项。",
                    "二、每页标题",
                    "1 客户背景与目标；2 当前痛点；3 Phantom解决方案；4 六个数字员工协同；5 试点执行路径；6 风险与预算；7 下一步确认。",
                    "三、每页关键内容",
                    f"引用 {ref_summary}，重点表达“老板一句话 -> 任务卡 -> 数字员工 -> 真人补充 -> 老板确认”。",
                    "四、需要补充的素材",
                    "客户Logo、现场照片、最终报价、试点周期和联系人名单。",
                ]
            ),
            ["PPT大纲", "素材缺口"],
        )

    if agent_name == "运营助理":
        return (
            "\n".join(
                [
                    "一、执行步骤",
                    f"1 确认任务卡；2 调用知识库；3 分配数字员工；4 通知真人补充；5 汇总输出；6 老板确认；7 归档任务中心。",
                    "二、责任分配",
                    f"主责：{protocol['primary_agent']}；协作：{'、'.join(protocol.get('collaborating_agents', [])) or '暂无'}。",
                    "三、时间节点",
                    f"截止时间：{deadline}。真人补充应优先完成，避免阻塞最终方案。",
                    "四、风险提示",
                    "资料缺口和老板确认是当前关键路径，建议保持任务状态为等待真人补充。",
                ]
            ),
            ["执行步骤", "责任分配", "风险提示"],
        )

    if agent_name == "代码助理":
        return (
            "\n".join(
                [
                    "一、需求目标",
                    f"围绕「{title}」生成可演示的小工具或页面原型需求。",
                    "二、用户流程",
                    "输入业务目标 -> 解析任务卡 -> 检索知识库 -> 生成结果 -> 人工确认。",
                    "三、页面结构",
                    "左侧任务输入，中间任务结果，右侧引用证据和执行日志。",
                    "四、数据字段",
                    "task_title、task_goal、agent_outputs、knowledge_refs、approval_required。",
                    "五、接口草案",
                    "POST /commands/parse；POST /tasks；POST /tasks/{id}/dispatch-agents。",
                    "六、开发任务清单",
                    "补齐类型、接口联调、空状态、错误状态和任务归档。",
                ]
            ),
            ["需求说明", "接口草案", "开发任务清单"],
        )

    if agent_name == "老板助理":
        feedback_line = (
            f"真人补充：{feedback_summary}。"
            if feedback_summary
            else "真人预算信息尚未回流。"
        )
        return (
            "\n".join(
                [
                    "一、结论",
                    f"任务「{title}」已完成数字员工阶段输出，当前可进入老板确认前检查。",
                    "二、关键依据",
                    f"知识库依据：{ref_summary}；{feedback_line} 数字员工状态：{summarize_previous_runs(previous_runs)}。",
                    "三、风险提醒",
                    "报价边界、付款周期和外发材料仍需人工确认；不可直接承诺合同条款。",
                    "四、需要老板确认",
                    f"确认输出范围是否覆盖：{expected_outputs}；确认是否等待真人补充后再归档。",
                    "五、建议下一步动作",
                    "先等待飞书补充预算，再由销售助理更新方案，最后老板确认并归档。",
                ]
            ),
            ["老板确认版", "风险提醒", "下一步动作"],
        )

    return (
        "\n".join(
            [
                "一、阶段结果",
                f"已基于 {source_summary} 完成「{title}」的初步处理。",
                "二、下一步",
                "等待主责数字员工和老板确认。",
            ]
        ),
        ["阶段结果"],
    )


def generate_agent_run(
    task: dict[str, Any],
    agent_name: str,
    previous_runs: list[dict[str, Any]],
) -> dict[str, Any]:
    config = get_agent_config(agent_name)
    output, artifacts = output_for_agent(agent_name, task, previous_runs)
    return {
        "id": new_id("run"),
        "task_id": task["id"],
        "agent_name": agent_name,
        "agent_key": config["agent_key"],
        "execution_mode": get_execution_mode(agent_name),
        "status": "succeeded",
        "prompt_config": config,
        "input_summary": {
            "task_title": task["title"],
            "task_type": task["type"],
            "knowledge_ref_count": len(task["command_protocol"].get("knowledge_refs", [])),
        },
        "output": output,
        "artifacts": artifacts,
        "created_at": utc_now(),
    }


def dispatch_task_agents(
    task: dict[str, Any],
    existing_runs: list[dict[str, Any]] | None = None,
    force: bool = False,
) -> list[dict[str, Any]]:
    if existing_runs and not force:
        return existing_runs

    runs: list[dict[str, Any]] = []
    for agent_name in build_agent_sequence(task["command_protocol"]):
        runs.append(generate_agent_run(task, agent_name, runs))
    return runs
