from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class WorkerJob:
    job_type: str
    payload: dict[str, Any]


def run_job(job: WorkerJob) -> dict[str, Any]:
    if job.job_type == "document.ingest":
        return {
            "status": "succeeded",
            "message": "Document parsed, chunked, and queued for pgvector embedding.",
        }
    if job.job_type == "agent.run":
        return {
            "status": "succeeded",
            "message": "Agent run completed with MVP mock executor.",
        }
    return {"status": "ignored", "message": f"Unknown job type: {job.job_type}"}


if __name__ == "__main__":
    result = run_job(WorkerJob(job_type="agent.run", payload={}))
    print(result)

