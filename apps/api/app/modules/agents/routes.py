from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.command_protocol import TASK_ROUTING_RULES
from app.core.agent_runtime import get_agent_config
from app.core.demo_store import (
    agent_direct_runs,
    agent_runs,
    agents,
    new_id,
    tasks,
    utc_now,
)

router = APIRouter()


class AgentRunRequest(BaseModel):
    input: dict
    context: dict | None = None
    stream: bool = False


AGENT_PROFILES = {
    "老板助理": {
        "permissions": ["读取任务卡", "读取数字员工输出", "读取真人反馈", "生成老板确认版"],
        "human_collaborators": ["老板", "部门负责人"],
        "task_templates": [
            {
                "title": "经营结果一页纸",
                "trigger": "汇总多个数字员工输出，形成老板可确认版本。",
                "task_type": "经营汇总",
                "expected_outputs": ["老板简报", "风险提醒", "确认事项"],
            },
            {
                "title": "任务闭环复盘",
                "trigger": "任务完成后归档前，提炼结论、风险和下一步。",
                "task_type": "多员工协同",
                "expected_outputs": ["归档摘要", "复盘建议"],
            },
        ],
        "quota": {"daily_limit": 30, "unit": "次确认版"},
    },
    "运营助理": {
        "permissions": ["读取任务卡", "拆解执行步骤", "更新进度提示", "生成延期风险"],
        "human_collaborators": ["项目负责人", "执行同事"],
        "task_templates": [
            {
                "title": "会议纪要转任务",
                "trigger": "会议文本上传后拆解责任人、动作和截止时间。",
                "task_type": "会议纪要",
                "expected_outputs": ["任务清单", "责任分配", "风险节点"],
            },
            {
                "title": "项目执行路径",
                "trigger": "把老板一句话拆成可跟进步骤。",
                "task_type": "任务拆解",
                "expected_outputs": ["执行步骤", "里程碑", "待确认事项"],
            },
        ],
        "quota": {"daily_limit": 40, "unit": "次拆解"},
    },
    "销售助理": {
        "permissions": ["读取客户资料", "读取产品资料", "生成跟进话术", "请求真人补充"],
        "human_collaborators": ["销售小张", "销售负责人"],
        "task_templates": [
            {
                "title": "客户合作方案准备",
                "trigger": "客户资料、报价表和历史沟通记录进入知识库后生成方案。",
                "task_type": "客户跟进",
                "expected_outputs": ["客户分析", "销售话术", "邮件草稿"],
            },
            {
                "title": "预算补充请求",
                "trigger": "客户预算或采购周期缺失时，通过飞书请求真人补充。",
                "task_type": "客户跟进",
                "expected_outputs": ["补充请求", "跟进建议"],
            },
        ],
        "quota": {"daily_limit": 50, "unit": "次客户跟进"},
    },
    "知识库助理": {
        "permissions": ["检索企业知识库", "引用原文片段", "总结文档", "沉淀知识"],
        "human_collaborators": ["资料管理员", "业务负责人"],
        "task_templates": [
            {
                "title": "资料证据检索",
                "trigger": "任务卡需要客户资料、产品资料或历史案例时自动调用。",
                "task_type": "资料检索",
                "expected_outputs": ["引用证据", "资料缺口", "补充建议"],
            },
            {
                "title": "对话结果入库",
                "trigger": "AI对话中心产生可复用内容后保存为知识库文档。",
                "task_type": "资料检索",
                "expected_outputs": ["知识条目", "引用来源"],
            },
        ],
        "quota": {"daily_limit": 80, "unit": "次检索"},
    },
    "内容助理": {
        "permissions": ["读取品牌资料", "读取客户背景", "生成内容草案", "生成PPT大纲"],
        "human_collaborators": ["市场同事", "销售负责人"],
        "task_templates": [
            {
                "title": "售前PPT大纲",
                "trigger": "客户方案任务需要对外展示材料时生成PPT结构。",
                "task_type": "内容生成",
                "expected_outputs": ["PPT大纲", "每页标题", "素材缺口"],
            },
            {
                "title": "短视频脚本",
                "trigger": "需要把产品卖点转成短视频或海报内容。",
                "task_type": "内容生成",
                "expected_outputs": ["脚本结构", "口播文案", "画面建议"],
            },
        ],
        "quota": {"daily_limit": 35, "unit": "次内容草案"},
    },
    "代码助理": {
        "permissions": ["读取需求描述", "生成接口草案", "生成页面结构", "输出原型建议"],
        "human_collaborators": ["技术负责人", "产品经理"],
        "task_templates": [
            {
                "title": "需求到原型",
                "trigger": "用户描述小工具或页面需求后生成开发任务清单。",
                "task_type": "代码原型",
                "expected_outputs": ["页面结构", "数据字段", "接口草案"],
            },
            {
                "title": "自动化脚本说明",
                "trigger": "需要把重复流程转成脚本或低代码工具。",
                "task_type": "代码原型",
                "expected_outputs": ["脚本目标", "输入输出", "安全边界"],
            },
        ],
        "quota": {"daily_limit": 20, "unit": "次原型"},
    },
}


def get_routing_types(agent_name: str) -> list[str]:
    return [
        task_type
        for task_type, rule in TASK_ROUTING_RULES.items()
        if rule["primary_agent"] == agent_name
        or agent_name in rule.get("collaborating_agents", [])
    ]


def get_task_runs(agent_name: str) -> list[dict]:
    runs = []
    for items in agent_runs.values():
        runs.extend(run for run in items if run["agent_name"] == agent_name)
    return runs


def get_recent_runs(agent_name: str) -> list[dict]:
    task_runs = [
        {
            "id": run["id"],
            "source": "task",
            "status": run["status"],
            "title": run["input_summary"]["task_title"],
            "artifacts": run["artifacts"],
            "created_at": run["created_at"],
        }
        for run in get_task_runs(agent_name)
    ]
    direct_runs = [
        {
            "id": run["run_id"],
            "source": "direct",
            "status": run["status"],
            "title": run["input"].get("title") or run["input"].get("content") or "直接试运行",
            "artifacts": run["artifacts"],
            "created_at": run["created_at"],
        }
        for run in agent_direct_runs
        if run["agent_name"] == agent_name
    ]
    return sorted(
        [*task_runs, *direct_runs],
        key=lambda item: item["created_at"],
        reverse=True,
    )[:6]


def build_usage(agent: dict) -> dict:
    agent_name = agent["name"]
    profile = AGENT_PROFILES[agent_name]
    task_run_count = len(get_task_runs(agent_name))
    direct_run_count = len(
        [run for run in agent_direct_runs if run["agent_name"] == agent_name]
    )
    used_today = task_run_count + direct_run_count
    active_statuses = {"pending_confirm", "running", "waiting_human", "waiting_approval"}
    active_tasks = [
        task
        for task in tasks.values()
        if task["status"] in active_statuses
        and (
            task["command_protocol"].get("primary_agent") == agent_name
            or agent_name in task["command_protocol"].get("collaborating_agents", [])
        )
    ]
    waiting_human = len(
        [task for task in active_tasks if task["status"] == "waiting_human"]
    )
    daily_limit = profile["quota"]["daily_limit"]
    return {
        "task_runs": task_run_count,
        "direct_runs": direct_run_count,
        "active_tasks": len(active_tasks),
        "waiting_human": waiting_human,
        "used_today": used_today,
        "remaining_today": max(daily_limit - used_today, 0),
    }


def with_prompt_config(agent: dict) -> dict:
    agent_name = agent["name"]
    profile = AGENT_PROFILES[agent_name]
    return {
        **agent,
        "prompt_config": get_agent_config(agent_name),
        "profile": {
            **profile,
            "routing_types": get_routing_types(agent_name),
            "usage": build_usage(agent),
            "recent_runs": get_recent_runs(agent_name),
        },
    }


@router.get("")
def list_agents() -> dict:
    items = [with_prompt_config(agent) for agent in agents]
    return {"items": items, "total": len(items)}


@router.get("/{agent_id}")
def get_agent(agent_id: str) -> dict:
    agent = next((item for item in agents if item["id"] == agent_id), None)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return with_prompt_config(agent)


@router.post("/{agent_id}/run")
def run_agent(agent_id: str, payload: AgentRunRequest) -> dict:
    agent = next((item for item in agents if item["id"] == agent_id), None)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    prompt_config = get_agent_config(agent["name"])
    input_title = payload.input.get("title") or payload.input.get("content") or "直接试运行"
    output_format = "、".join(prompt_config["output_format"][:3])
    run = {
        "run_id": new_id("run"),
        "agent_id": agent_id,
        "agent_name": agent["name"],
        "status": "succeeded",
        "created_at": utc_now(),
        "prompt_config": prompt_config,
        "output": (
            f"{agent['name']}已按岗位Prompt接收「{input_title}」。"
            f"建议输出结构：{output_format}。正式执行请转入任务中心以保留审批、协同和归档记录。"
        ),
        "artifacts": prompt_config["output_format"][:3],
        "input": payload.input,
    }
    agent_direct_runs.append(run)
    return run
