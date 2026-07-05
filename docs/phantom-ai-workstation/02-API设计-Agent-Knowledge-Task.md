# Phantom AI Workstation API 设计

## 1. API 基础约定

Base URL：

```text
/api/v1
```

认证：

```http
Authorization: Bearer <access_token>
X-Workspace-Id: <workspace_id>
X-Request-Id: <uuid>
```

统一错误响应：

```json
{
  "error": {
    "code": "DOCUMENT_PARSE_FAILED",
    "message": "文档解析失败，请检查文件格式或重新上传。",
    "details": {
      "document_id": "doc_123",
      "stage": "ocr"
    }
  },
  "request_id": "req_123"
}
```

异步任务统一状态：

```text
queued -> running -> waiting_approval -> succeeded
queued -> running -> failed
queued -> canceled
```

业务任务状态：

```text
created -> running -> waiting_approval -> done -> archived
created -> running -> failed
```

## 2. 核心数据模型

### 2.1 Workspace / User / Role

```sql
workspaces (
  id uuid primary key,
  name text not null,
  plan text default 'local',
  settings jsonb default '{}',
  created_at timestamptz,
  updated_at timestamptz
);

users (
  id uuid primary key,
  workspace_id uuid references workspaces(id),
  email text unique,
  name text,
  password_hash text,
  status text default 'active',
  created_at timestamptz,
  updated_at timestamptz
);

roles (
  id uuid primary key,
  workspace_id uuid references workspaces(id),
  name text,
  permissions jsonb default '[]',
  created_at timestamptz
);
```

### 2.2 Document / Chunk / Embedding / Citation

```sql
documents (
  id uuid primary key,
  workspace_id uuid references workspaces(id),
  uploader_id uuid references users(id),
  name text not null,
  file_type text,
  file_size bigint,
  object_key text,
  parse_status text default 'uploaded',
  parse_error text,
  metadata jsonb default '{}',
  created_at timestamptz,
  updated_at timestamptz
);

document_chunks (
  id uuid primary key,
  workspace_id uuid references workspaces(id),
  document_id uuid references documents(id),
  chunk_index int,
  content text,
  page_start int,
  page_end int,
  token_count int,
  metadata jsonb default '{}',
  created_at timestamptz
);

knowledge_objects (
  id uuid primary key,
  workspace_id uuid references workspaces(id),
  type text,
  name text,
  source_document_id uuid references documents(id),
  attributes jsonb default '{}',
  created_at timestamptz,
  updated_at timestamptz
);
```

向量可以放在 Qdrant，也可以 MVP 阶段放在 PostgreSQL + pgvector。若使用 Qdrant，`document_chunks.id` 作为 point id，payload 存 `workspace_id/document_id/page_start/page_end`。

### 2.3 Agent / Tool / Task

```sql
agents (
  id uuid primary key,
  workspace_id uuid references workspaces(id),
  key text,
  name text,
  role text,
  description text,
  skills jsonb default '[]',
  tools jsonb default '[]',
  prompt_template text,
  model_policy jsonb default '{}',
  permissions jsonb default '[]',
  memory_enabled boolean default true,
  status text default 'active',
  created_at timestamptz,
  updated_at timestamptz
);

tasks (
  id uuid primary key,
  workspace_id uuid references workspaces(id),
  creator_id uuid references users(id),
  title text,
  type text,
  priority text default 'normal',
  status text default 'created',
  assigned_agent_id uuid references agents(id),
  input jsonb default '{}',
  output jsonb default '{}',
  due_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);

task_runs (
  id uuid primary key,
  workspace_id uuid references workspaces(id),
  task_id uuid references tasks(id),
  agent_id uuid references agents(id),
  status text,
  model_name text,
  prompt_tokens int default 0,
  completion_tokens int default 0,
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  trace jsonb default '{}'
);

tool_calls (
  id uuid primary key,
  workspace_id uuid references workspaces(id),
  task_run_id uuid references task_runs(id),
  tool_name text,
  input jsonb,
  output jsonb,
  status text,
  started_at timestamptz,
  finished_at timestamptz
);
```

### 2.4 Artifact / Audit

```sql
artifacts (
  id uuid primary key,
  workspace_id uuid references workspaces(id),
  task_id uuid references tasks(id),
  type text,
  name text,
  object_key text,
  mime_type text,
  metadata jsonb default '{}',
  created_by uuid references users(id),
  created_at timestamptz
);

audit_logs (
  id uuid primary key,
  workspace_id uuid references workspaces(id),
  actor_type text,
  actor_id uuid,
  action text,
  resource_type text,
  resource_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz
);
```

## 3. Auth / Workspace API

### POST /auth/login

```json
{
  "email": "admin@phantom.local",
  "password": "password"
}
```

Response:

```json
{
  "access_token": "jwt",
  "refresh_token": "jwt",
  "user": {
    "id": "usr_123",
    "name": "Admin",
    "email": "admin@phantom.local"
  },
  "workspace": {
    "id": "wks_123",
    "name": "Phantom Demo"
  }
}
```

### GET /me

返回当前用户、角色、权限、工作区配置。

### GET /workspaces/current

返回当前工作区的模型、存储、Agent 默认配置。

## 4. Knowledge API

### POST /documents/upload-url

创建上传凭证。

Request:

```json
{
  "filename": "company-profile.pdf",
  "content_type": "application/pdf",
  "size": 10485760
}
```

Response:

```json
{
  "document_id": "doc_123",
  "upload_url": "http://minio:9000/documents/...",
  "object_key": "wks_123/doc_123/company-profile.pdf",
  "expires_in": 900
}
```

### POST /documents/{document_id}/ingest

触发解析、切片、向量化。

Request:

```json
{
  "parser": "auto",
  "chunk_strategy": "semantic",
  "extract_objects": true
}
```

Response:

```json
{
  "job_id": "job_123",
  "status": "queued"
}
```

### GET /documents

Query:

```text
?status=ready&file_type=pdf&page=1&page_size=20
```

Response:

```json
{
  "items": [
    {
      "id": "doc_123",
      "name": "company-profile.pdf",
      "file_type": "pdf",
      "parse_status": "ready",
      "chunk_count": 128,
      "created_at": "2026-07-05T10:00:00Z"
    }
  ],
  "total": 1
}
```

### GET /documents/{document_id}

返回文档元数据、解析状态、对象识别结果、最近引用记录。

### GET /documents/{document_id}/chunks

按页码、关键词查看分片。

### POST /knowledge/search

Request:

```json
{
  "query": "公司有哪些政采项目案例？",
  "top_k": 8,
  "filters": {
    "document_ids": ["doc_123"],
    "object_types": ["project", "contract"]
  }
}
```

Response:

```json
{
  "answerable": true,
  "chunks": [
    {
      "chunk_id": "chk_123",
      "document_id": "doc_123",
      "document_name": "company-profile.pdf",
      "page_start": 12,
      "page_end": 13,
      "score": 0.86,
      "excerpt": "..."
    }
  ]
}
```

## 5. Agent API

### GET /agents

返回 Agent 矩阵。

### POST /agents

创建自定义 Agent。MVP 默认初始化 6 个：

```text
CEO / COO / Sales / Bid / GEO / Code
```

Request:

```json
{
  "key": "sales",
  "name": "Sales Agent",
  "role": "销售顾问",
  "skills": ["客户分析", "方案生成", "邮件生成"],
  "tools": ["knowledge.search", "artifact.docx", "artifact.pptx"],
  "model_policy": {
    "sensitive": "local",
    "complex": "cloud_optional",
    "default": "local"
  },
  "permissions": ["documents:read", "artifacts:write"]
}
```

### GET /agents/{agent_id}

返回 Agent 配置、最近运行、可用工具、权限。

### PATCH /agents/{agent_id}

更新 Agent 技能、工具、模型策略、状态。

### POST /agents/{agent_id}/run

直接运行 Agent。适合 AI员工页面的测试执行。

Request:

```json
{
  "input": {
    "goal": "基于知识库生成客户拜访方案",
    "customer_name": "某园区客户"
  },
  "context": {
    "document_ids": ["doc_123"],
    "task_id": "tsk_123"
  },
  "stream": true
}
```

Response:

```json
{
  "task_id": "tsk_123",
  "run_id": "run_123",
  "status": "queued"
}
```

## 6. Task API

### POST /tasks

Request:

```json
{
  "title": "生成园区客户解决方案",
  "type": "proposal",
  "priority": "high",
  "assigned_agent_key": "sales",
  "input": {
    "customer": "某高新区园区",
    "goal": "生成 10 页方案大纲和销售邮件",
    "required_artifacts": ["docx", "pptx"]
  },
  "knowledge_scope": {
    "document_ids": ["doc_123"],
    "object_types": ["product", "case", "contract"]
  }
}
```

Response:

```json
{
  "task_id": "tsk_123",
  "status": "created"
}
```

### POST /tasks/{task_id}/start

触发 Agent 执行。

Response:

```json
{
  "task_id": "tsk_123",
  "run_id": "run_123",
  "status": "running"
}
```

### GET /tasks

Query：

```text
?status=running&type=proposal&agent=sales&page=1&page_size=20
```

### GET /tasks/{task_id}

返回任务详情、状态、输出、引用、artifact、审批状态。

### POST /tasks/{task_id}/approve

人工确认。

Request:

```json
{
  "decision": "approved",
  "comment": "方案可进入客户沟通。"
}
```

### POST /tasks/{task_id}/cancel

取消任务。

### GET /tasks/{task_id}/timeline

Response:

```json
{
  "events": [
    {
      "type": "task.started",
      "time": "2026-07-05T10:00:00Z",
      "message": "Sales Agent 开始执行任务"
    },
    {
      "type": "tool.called",
      "time": "2026-07-05T10:00:02Z",
      "message": "调用 knowledge.search",
      "metadata": {
        "top_k": 8
      }
    }
  ]
}
```

## 7. Real-time Events

MVP 推荐 SSE，后续可升级 WebSocket。

### GET /events/tasks/{task_id}

事件类型：

```text
task.status_changed
agent.thought
agent.plan_created
tool.started
tool.finished
model.started
model.finished
artifact.created
approval.required
task.failed
task.done
```

事件示例：

```json
{
  "event": "tool.finished",
  "task_id": "tsk_123",
  "run_id": "run_123",
  "payload": {
    "tool": "knowledge.search",
    "duration_ms": 812,
    "result_count": 8
  }
}
```

## 8. Model Router API

### GET /models

返回本地模型、云端模型、Embedding 模型、健康状态。

### POST /models/health-check

触发模型健康检查。

### PUT /model-routing-policy

Request:

```json
{
  "rules": [
    {
      "name": "sensitive_data_local",
      "condition": {
        "data_sensitivity": "high"
      },
      "target": "local:qwen2.5:14b"
    },
    {
      "name": "code_task",
      "condition": {
        "task_type": "code"
      },
      "target": "local:deepseek-coder"
    }
  ]
}
```

## 9. Artifact API

### GET /artifacts

按任务、类型、创建时间查询输出物。

### GET /artifacts/{artifact_id}/download-url

返回临时下载地址。

### POST /artifacts

Agent 或工具写入生成物。

Request:

```json
{
  "task_id": "tsk_123",
  "type": "docx",
  "name": "园区客户解决方案.docx",
  "object_key": "wks_123/artifacts/art_123.docx",
  "metadata": {
    "pages": 12,
    "source": "sales-agent"
  }
}
```

## 10. Meeting API

### POST /meetings

上传会议音频或纪要。

### POST /meetings/{meeting_id}/summarize

生成摘要、行动项、风险、任务。

### POST /meetings/{meeting_id}/create-tasks

将行动项写入任务中心。

## 11. Bid Center API

### POST /bids

创建招投标项目。

Request:

```json
{
  "name": "某政采项目投标",
  "tender_document_id": "doc_123",
  "deadline": "2026-08-01T18:00:00+08:00"
}
```

### POST /bids/{bid_id}/analyze

解析评分标准、资质要求、风险点。

Response:

```json
{
  "task_id": "tsk_456",
  "status": "queued"
}
```

### GET /bids/{bid_id}/requirements

返回评分点、响应要求、证据匹配状态。

### POST /bids/{bid_id}/generate-response-table

生成响应表 artifact。

### POST /bids/{bid_id}/generate-outline

生成标书大纲 artifact。

## 12. Code Factory API

### POST /code-projects

创建代码项目。

### POST /code-projects/{project_id}/generate-prd

根据需求生成 PRD。

### POST /code-projects/{project_id}/breakdown

生成技术拆解与任务清单。

### POST /code-projects/{project_id}/generate-code

生成代码草案，MVP 不直接写入生产仓库，只生成 artifact 或 patch。

Request:

```json
{
  "requirement": "做一个客户报价系统",
  "stack": "nextjs-fastapi",
  "output_mode": "patch"
}
```

## 13. Audit API

### GET /audit-logs

Query：

```text
?actor_id=usr_123&resource_type=document&from=2026-07-01&to=2026-07-05
```

必须记录：

- 用户登录
- 文档上传、读取、删除
- Agent 执行
- 工具调用
- 模型调用
- Artifact 生成与下载
- 外部 API 调用
- 权限变更

## 14. 权限清单

```text
workspace:read
workspace:update
users:read
users:write
documents:read
documents:write
documents:delete
knowledge:search
agents:read
agents:write
agents:run
tasks:read
tasks:write
tasks:approve
artifacts:read
artifacts:write
models:read
models:write
audit:read
settings:update
```

## 15. MVP 必须打通的三条接口链路

### 链路 A：知识入库

```text
POST /documents/upload-url
-> 上传 MinIO
-> POST /documents/{id}/ingest
-> Worker parse/chunk/embed
-> GET /documents/{id}
-> POST /knowledge/search
```

验收：上传 PDF 后 3 分钟内可检索，并返回页码引用。

### 链路 B：Agent 任务

```text
POST /tasks
-> POST /tasks/{id}/start
-> GET /events/tasks/{id}
-> Agent 调用 knowledge.search
-> Agent 生成结果
-> POST /artifacts
-> GET /tasks/{id}
```

验收：任务中心能看到执行过程、最终输出和证据链。

### 链路 C：招投标 Demo

```text
POST /bids
-> POST /bids/{id}/analyze
-> GET /bids/{id}/requirements
-> POST /bids/{id}/generate-response-table
```

验收：能从招标文件中提取评分点，并匹配企业资料生成响应表。

