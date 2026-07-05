from __future__ import annotations

import math
import re
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.demo_store import WORKSPACE_ID, new_id, utc_now

router = APIRouter()

demo_documents: list[dict[str, Any]] = []
demo_chunks: list[dict[str, Any]] = []


class CreateDocumentRequest(BaseModel):
    filename: str = Field(min_length=1)
    file_type: str = "md"
    dataset: str = "custom"
    content: str = Field(default="", description="MVP text extracted from the source file.")
    metadata: dict[str, Any] = Field(default_factory=dict)
    auto_ingest: bool = True


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    filters: dict | None = None


class SeedRequest(BaseModel):
    reset: bool = False


def normalize_terms(text: str) -> list[str]:
    lowered = text.lower()
    english = re.findall(r"[a-zA-Z0-9]+", lowered)
    chinese = re.findall(r"[\u4e00-\u9fff]{2,}", lowered)
    phrase_terms: list[str] = []
    for phrase in chinese:
        phrase_terms.append(phrase)
        phrase_terms.extend(phrase[i : i + 2] for i in range(max(len(phrase) - 1, 0)))
    return list(dict.fromkeys([*english, *phrase_terms]))


def split_chunks(content: str, target_size: int = 280) -> list[str]:
    normalized = "\n".join(line.strip() for line in content.splitlines() if line.strip())
    if not normalized:
        return []

    paragraphs = re.split(r"\n+|(?<=[。！？])", normalized)
    chunks: list[str] = []
    current = ""
    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        if len(paragraph) > target_size:
            if current:
                chunks.append(current)
                current = ""
            chunks.extend(
                paragraph[index : index + target_size]
                for index in range(0, len(paragraph), target_size)
            )
        elif len(current) + len(paragraph) <= target_size:
            current = f"{current}{paragraph}" if not current else f"{current}\n{paragraph}"
        else:
            if current:
                chunks.append(current)
            current = paragraph
    if current:
        chunks.append(current)
    return chunks


def create_chunks(document: dict[str, Any], content: str) -> list[dict[str, Any]]:
    chunks = []
    for index, chunk_text in enumerate(split_chunks(content), start=1):
        chunk = {
            "id": new_id("chk"),
            "workspace_id": WORKSPACE_ID,
            "document_id": document["id"],
            "document_name": document["name"],
            "chunk_index": index,
            "content": chunk_text,
            "page_start": index,
            "page_end": index,
            "token_count": max(1, math.ceil(len(chunk_text) / 2)),
            "terms": normalize_terms(chunk_text),
            "metadata": document.get("metadata", {}),
            "created_at": utc_now(),
        }
        chunks.append(chunk)
    return chunks


def upsert_document(payload: CreateDocumentRequest) -> dict[str, Any]:
    document = {
        "id": new_id("doc"),
        "workspace_id": WORKSPACE_ID,
        "name": payload.filename,
        "file_type": payload.file_type,
        "dataset": payload.dataset,
        "parse_status": "uploaded",
        "chunk_count": 0,
        "metadata": {**payload.metadata, "dataset": payload.dataset},
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    demo_documents.append(document)
    if payload.auto_ingest:
        ingest_content(document, payload.content)
    return document


def ingest_content(document: dict[str, Any], content: str) -> None:
    demo_chunks[:] = [chunk for chunk in demo_chunks if chunk["document_id"] != document["id"]]
    chunks = create_chunks(document, content)
    demo_chunks.extend(chunks)
    document["parse_status"] = "ready" if chunks else "empty"
    document["chunk_count"] = len(chunks)
    document["updated_at"] = utc_now()


def score_chunk(query_terms: list[str], chunk: dict[str, Any]) -> float:
    if not query_terms:
        return 0
    content = chunk["content"].lower()
    terms = set(chunk["terms"])
    score = 0.0
    for term in query_terms:
        if term in terms:
            score += 2.0
        if term and term in content:
            score += 1.0
    if any(term in chunk["document_name"].lower() for term in query_terms):
        score += 0.5
    return score


DEMO_DATASETS = [
    {
        "filename": "华星科技客户资料.md",
        "file_type": "md",
        "dataset": "制造企业",
        "content": """
华星科技是一家制造企业，正在评估AI工作站试点。
客户关注预算、采购周期、数据安全和本地部署能力。
当前预算需要销售小张补充，预计先采购一台企业经营版样机。
关键联系人包括总经理、销售负责人和IT负责人。
""",
    },
    {
        "filename": "制造企业介绍.docx",
        "file_type": "docx",
        "dataset": "制造企业",
        "content": """
华星科技主营工业传感器、设备联网网关和产线数据采集终端。
企业正在从传统设备销售转向设备数据服务，管理层希望降低销售跟进和方案撰写成本。
当前内部文档分散在销售、产品、售后多个团队，知识库建设是AI工作站试点的前置条件。
""",
    },
    {
        "filename": "工业网关产品手册.pdf",
        "file_type": "pdf",
        "dataset": "制造企业",
        "content": """
工业网关支持Modbus、OPC UA和MQTT协议，可接入PLC、传感器和MES系统。
标准版本支持边缘缓存、断点续传和设备状态监控。
客户方案中需要重点说明数据安全、现场部署周期、售后响应和与既有系统的集成方式。
""",
    },
    {
        "filename": "华星科技报价表.xlsx",
        "file_type": "xlsx",
        "dataset": "制造企业",
        "content": """
AI工作站试点版建议报价为8万元，包含一台工作站、六个数字员工基础包和三个月试点服务。
正式版按坐席、知识库容量和外部协同连接数报价。
销售小张需要补充客户预算上限、付款周期和是否要求本地部署。
""",
    },
    {
        "filename": "华星历史沟通记录.md",
        "file_type": "md",
        "dataset": "制造企业",
        "content": """
第一次沟通中，客户表示希望把销售方案、客户问答和内部产品资料问答先跑通。
第二次沟通中，IT负责人强调数据不出域、权限隔离和可审计日志。
第三次沟通中，销售负责人希望AI能生成跟进话术、邮件草稿和PPT大纲。
""",
    },
    {
        "filename": "客户需求访谈纪要.docx",
        "file_type": "docx",
        "dataset": "制造企业",
        "content": """
客户希望老板可以一句话安排客户方案准备任务。
销售助理负责客户分析和跟进话术，知识库助理负责引用产品资料，内容助理负责PPT大纲。
真人销售需要补充预算、竞争对手信息和关键联系人偏好。
""",
    },
    {
        "filename": "制造行业案例资料.pdf",
        "file_type": "pdf",
        "dataset": "制造企业",
        "content": """
某制造客户使用AI工作站后，将销售方案准备时间从两天压缩到半天。
知识库助理负责引用产品手册和历史案例，销售助理负责输出客户异议处理话术。
老板助理最终汇总风险、预算缺口和下一步确认事项。
""",
    },
    {
        "filename": "售前方案模板.pptx",
        "file_type": "pptx",
        "dataset": "制造企业",
        "content": """
制造企业售前方案建议结构：客户现状、核心痛点、AI工作站解决方案、试点范围、预算报价、实施计划、风险与确认事项。
PPT大纲需要体现数字员工与真人销售协同，而不是单纯展示AI能力。
""",
    },
    {
        "filename": "会议纪要-华星试点.md",
        "file_type": "md",
        "dataset": "制造企业",
        "content": """
会议决定先做销售方案生成和产品资料问答两个场景。
待办包括销售小张补充预算，产品经理补充工业网关资料，老板确认试点报价。
截止时间为明天下午三点前完成客户方案初稿。
""",
    },
    {
        "filename": "风险清单-制造试点.xlsx",
        "file_type": "xlsx",
        "dataset": "制造企业",
        "content": """
主要风险包括客户预算不明确、IT安全审查周期长、历史资料不完整和部署环境不确定。
建议在任务卡中标记中风险，要求老板确认报价边界，并让真人销售补充预算信息。
""",
    },
    {
        "filename": "Phantom AI Workstation产品资料.md",
        "file_type": "md",
        "dataset": "幻影自用",
        "content": """
Phantom AI Workstation 是企业数字员工工作站。
企业开机即可拥有老板助理、销售助理、知识库助理、运营助理、内容助理和代码助理。
系统支持自然语言指挥、任务中心、企业知识库、飞书协同和老板确认。
MVP优先验证老板一句话让数字员工与真人员工协同完成客户方案。
""",
    },
    {
        "filename": "幻影集团介绍.docx",
        "file_type": "docx",
        "dataset": "幻影自用",
        "content": """
幻影集团聚焦企业AI工作站、数字员工和行业智能体解决方案。
公司第一阶段目标是通过AIPC形态帮助企业把AI能力放进日常工作流。
Phantom AI Workstation 的定位是企业数字员工工作站，而不是通用聊天机器人。
""",
    },
    {
        "filename": "六个数字员工介绍.pptx",
        "file_type": "pptx",
        "dataset": "幻影自用",
        "content": """
老板助理负责经营汇总、结果汇报和确认事项。
运营助理负责任务拆解、进度跟踪和执行闭环。
销售助理负责客户分析、跟进话术和方案生成。
知识库助理负责资料检索、文档总结和知识沉淀。
内容助理负责PPT大纲、文案和短视频脚本。
代码助理负责小工具、代码原型和自动化脚本。
""",
    },
    {
        "filename": "商业模式说明.pdf",
        "file_type": "pdf",
        "dataset": "幻影自用",
        "content": """
商业模式包括硬件工作站、数字员工订阅、企业知识库容量、外部协同连接器和行业实施服务。
MVP阶段优先验证客户愿意为可演示的企业协同闭环买单。
试点报价需要简单清晰，避免第一周引入复杂CRM、审批和多租户深水区。
""",
    },
    {
        "filename": "试点报价单.xlsx",
        "file_type": "xlsx",
        "dataset": "幻影自用",
        "content": """
7天MVP试点建议包含一台AI工作站、三个真执行数字员工、飞书消息通知和三套Demo数据。
报价维度包括基础试点费、企业知识库容量、飞书机器人配置和定制化场景梳理。
后续版本可升级到完整权限、审计、多租户、pgvector和Qdrant迁移方案。
""",
    },
    {
        "filename": "合作方案模板.docx",
        "file_type": "docx",
        "dataset": "幻影自用",
        "content": """
合作方案应包括客户背景、试点目标、场景范围、数字员工分工、真人协同方式、交付计划、报价和风险控制。
对外表达要强调老板自然语言指挥、六个数字员工和真人员工协同。
""",
    },
    {
        "filename": "产品介绍海报文案.md",
        "file_type": "md",
        "dataset": "幻影自用",
        "content": """
海报主标题：老板一句话，六个数字员工开始工作。
副标题：Phantom AI Workstation 连接企业知识库、任务中心和飞书真人协同。
核心卖点：自然语言指挥、结构化任务卡、数字员工分工、老板确认、任务归档。
""",
    },
    {
        "filename": "短视频脚本-老板一句话.md",
        "file_type": "md",
        "dataset": "幻影自用",
        "content": """
开场展示老板输入一句话：准备明天下午给华星科技的合作方案。
中段展示系统生成任务卡，销售助理、知识库助理和内容助理分别执行。
结尾展示飞书通知真人销售补充预算，老板助理汇总确认版。
""",
    },
    {
        "filename": "销售话术库.xlsx",
        "file_type": "xlsx",
        "dataset": "幻影自用",
        "content": """
当客户担心AI只是聊天工具时，强调任务卡、员工分工、外部协同和归档闭环。
当客户担心落地复杂时，强调7天MVP只跑一条真实任务链路。
当客户关注数据安全时，强调轻量账号体系、权限、企业知识库和后续本地化方案。
""",
    },
    {
        "filename": "产品FAQ.pdf",
        "file_type": "pdf",
        "dataset": "幻影自用",
        "content": """
问：第一版是否做完整CRM？答：不做，第一版只验证任务协同闭环。
问：为什么先接飞书？答：飞书机器人Demo链路清晰，适合展示真人员工协同。
问：向量库怎么选？答：MVP优先pgvector，减少服务数量，后续可切Qdrant。
""",
    },
    {
        "filename": "园区AI赋能方案.md",
        "file_type": "md",
        "dataset": "园区",
        "content": """
园区企业服务中心希望为入驻企业提供AI赋能服务。
重点场景包括政策问答、企业诊断、招商资料整理、客户跟进和AI员工订阅。
Phantom AI Workstation 可以作为园区企业AI服务的统一工作台。
""",
    },
    {
        "filename": "园区介绍.docx",
        "file_type": "docx",
        "dataset": "园区",
        "content": """
星湾数字园区聚焦智能制造、跨境电商和企业服务类入驻企业。
园区希望打造AI赋能服务中心，帮助企业低成本试用数字员工能力。
园区运营团队需要用统一工作台管理企业需求、政策问答和服务任务分配。
""",
    },
    {
        "filename": "入驻企业清单.xlsx",
        "file_type": "xlsx",
        "dataset": "园区",
        "content": """
入驻企业包括华星科技、远航电商、蓝图设计、科迈软件和安普仪器。
企业普遍关注销售增长、政策申报、内容生产、知识库问答和内部流程自动化。
园区可以按企业需求分配不同数字员工生成诊断结果。
""",
    },
    {
        "filename": "政策资料汇编.pdf",
        "file_type": "pdf",
        "dataset": "园区",
        "content": """
园区政策包括高新技术企业补贴、数字化改造补贴、首台套设备支持和研发费用加计扣除。
知识库助理需要在回答政策问题时引用政策来源，并提示企业确认申报条件和截止时间。
""",
    },
    {
        "filename": "招商资料.pptx",
        "file_type": "pptx",
        "dataset": "园区",
        "content": """
园区招商资料重点展示区位、产业生态、政策服务、AI赋能平台和企业增长案例。
内容助理可基于招商资料生成路演PPT大纲、客户邀约文案和短视频脚本。
""",
    },
    {
        "filename": "企业服务内容.docx",
        "file_type": "docx",
        "dataset": "园区",
        "content": """
企业服务包括政策咨询、数字化诊断、品牌内容、销售线索跟进、融资对接和培训活动。
运营助理负责把企业需求拆解为任务，知识库助理检索政策，老板助理汇总服务结果。
""",
    },
    {
        "filename": "园区客户诊断模板.xlsx",
        "file_type": "xlsx",
        "dataset": "园区",
        "content": """
诊断维度包括企业规模、主营业务、当前系统、数据资料、销售痛点、内容需求和AI接受度。
任务卡需要记录协作真人员工、输入资料、预计输出和老板确认事项。
""",
    },
    {
        "filename": "园区AI服务SOP.md",
        "file_type": "md",
        "dataset": "园区",
        "content": """
第一步收集企业诉求，第二步生成诊断任务卡，第三步分配数字员工，第四步通知企业服务专员补充资料。
第五步AI生成诊断报告，第六步老板确认，第七步归档到任务中心。
""",
    },
    {
        "filename": "园区会议纪要.docx",
        "file_type": "docx",
        "dataset": "园区",
        "content": """
园区会议决定先选三家企业做AI工作站试点。
服务专员负责补充企业资料，知识库助理负责政策问答，运营助理负责服务任务拆解。
试点结果需要形成可复用的园区企业AI服务模板。
""",
    },
    {
        "filename": "园区AI赋能报价.pdf",
        "file_type": "pdf",
        "dataset": "园区",
        "content": """
园区版报价按入驻企业数量、数字员工数量、知识库容量和服务专员账号数量计算。
首期建议做10家企业试点，重点展示政策问答、企业诊断和客户方案生成。
""",
    },
]


@router.post("/documents")
def create_document(payload: CreateDocumentRequest) -> dict:
    document = upsert_document(payload)
    return {"document": document}


@router.post("/documents/seed-demo")
def seed_demo_documents(payload: SeedRequest) -> dict:
    if payload.reset:
        demo_documents.clear()
        demo_chunks.clear()
    created = [upsert_document(CreateDocumentRequest(**item)) for item in DEMO_DATASETS]
    return {
        "created": created,
        "document_count": len(demo_documents),
        "chunk_count": len(demo_chunks),
    }


@router.post("/documents/{document_id}/ingest")
def ingest_document(document_id: str) -> dict:
    document = next((item for item in demo_documents if item["id"] == document_id), None)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    document["parse_status"] = "ready"
    document["updated_at"] = utc_now()
    return {"job_id": new_id("job"), "status": "succeeded", "document": document}


@router.get("/documents")
def list_documents() -> dict:
    return {"items": demo_documents, "total": len(demo_documents)}


@router.get("/documents/{document_id}/chunks")
def list_document_chunks(document_id: str) -> dict:
    chunks = [chunk for chunk in demo_chunks if chunk["document_id"] == document_id]
    return {"items": chunks, "total": len(chunks)}


@router.post("/knowledge/search")
def search(payload: SearchRequest) -> dict:
    query_terms = normalize_terms(payload.query)
    dataset_filter = (payload.filters or {}).get("dataset") if payload.filters else None
    scored = []
    for chunk in demo_chunks:
        if dataset_filter and chunk["metadata"].get("dataset") != dataset_filter:
            continue
        score = score_chunk(query_terms, chunk)
        if score > 0:
            scored.append((score, chunk))

    scored.sort(key=lambda item: item[0], reverse=True)
    chunks = [
        {
            "chunk_id": chunk["id"],
            "document_id": chunk["document_id"],
            "document_name": chunk["document_name"],
            "page_start": chunk["page_start"],
            "page_end": chunk["page_end"],
            "score": round(min(score / 10, 0.99), 2),
            "excerpt": chunk["content"],
        }
        for score, chunk in scored[: payload.top_k]
    ]
    return {"answerable": bool(chunks), "query": payload.query, "chunks": chunks}


seed_demo_documents(SeedRequest(reset=True))
