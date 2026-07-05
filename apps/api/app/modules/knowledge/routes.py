from fastapi import APIRouter
from pydantic import BaseModel

from app.core.demo_store import new_id, utc_now

router = APIRouter()

demo_documents = [
    {
        "id": "doc_huaxing_profile",
        "name": "华星科技客户资料.pdf",
        "file_type": "pdf",
        "parse_status": "ready",
        "chunk_count": 18,
        "created_at": utc_now(),
    },
    {
        "id": "doc_phantom_product",
        "name": "Phantom AI Workstation产品资料.docx",
        "file_type": "docx",
        "parse_status": "ready",
        "chunk_count": 24,
        "created_at": utc_now(),
    },
]


class CreateDocumentRequest(BaseModel):
    filename: str
    file_type: str = "pdf"


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    filters: dict | None = None


@router.post("/documents")
def create_document(payload: CreateDocumentRequest) -> dict:
    document = {
        "id": new_id("doc"),
        "name": payload.filename,
        "file_type": payload.file_type,
        "parse_status": "uploaded",
        "chunk_count": 0,
        "created_at": utc_now(),
    }
    demo_documents.append(document)
    return {"document": document}


@router.post("/documents/{document_id}/ingest")
def ingest_document(document_id: str) -> dict:
    for document in demo_documents:
        if document["id"] == document_id:
            document["parse_status"] = "ready"
            document["chunk_count"] = max(document["chunk_count"], 8)
            return {"job_id": new_id("job"), "status": "queued"}
    return {"job_id": new_id("job"), "status": "queued"}


@router.get("/documents")
def list_documents() -> dict:
    return {"items": demo_documents, "total": len(demo_documents)}


@router.post("/knowledge/search")
def search(payload: SearchRequest) -> dict:
    return {
        "answerable": True,
        "query": payload.query,
        "chunks": [
            {
                "chunk_id": "chk_huaxing_budget",
                "document_id": "doc_huaxing_profile",
                "document_name": "华星科技客户资料.pdf",
                "page_start": 3,
                "page_end": 4,
                "score": 0.88,
                "excerpt": "华星科技正在评估AI工作站试点，关注预算、采购周期和数据安全。",
            },
            {
                "chunk_id": "chk_product_value",
                "document_id": "doc_phantom_product",
                "document_name": "Phantom AI Workstation产品资料.docx",
                "page_start": 1,
                "page_end": 2,
                "score": 0.82,
                "excerpt": "Phantom AI Workstation让企业开机即拥有一支AI员工团队。",
            },
        ][: payload.top_k],
    }

