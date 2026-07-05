# Phantom AI Workstation

Phantom AI Workstation 是企业数字员工工作站。7 天 MVP 只验证一条主线：

```text
老板一句话 -> 系统生成任务卡 -> 分配六个数字员工 -> 飞书通知真人员工
-> 真人回复回流 -> AI继续执行 -> 老板助理汇总 -> 老板确认 -> 任务归档
```

## 已确认的 MVP 决策

| 决策项 | 选择 |
| --- | --- |
| 外部协同 | 飞书 |
| 认证基座 | 轻量内置账号体系 |
| 真执行数字员工 | 销售助理、知识库助理、老板助理 |
| 向量能力 | PostgreSQL + pgvector |
| 后续升级 | Keycloak / Qdrant / 钉钉 / 企业微信 |

## 工程结构

```text
apps/web       Next.js Phantom Workbench
apps/api       FastAPI API
apps/worker    文档解析、Embedding、Agent执行 worker
packages       共享契约、Prompt、配置
infra          Docker Compose 与初始化脚本
docs           产品规格、技术计划、任务拆解
```

## 本地启动

```bash
cp .env.example .env
pnpm install
python3 -m venv .venv
.venv/bin/python -m pip install -U pip
.venv/bin/python -m pip install -e apps/api
make infra-up
pnpm dev:web
pnpm dev:api
```

默认端口：

```text
Web: http://localhost:3000
API: http://localhost:8000
API Docs: http://localhost:8000/docs
```

## 飞书协同 Demo

Day 7 默认使用本地模拟发送与回流。若要尝试真实飞书自定义机器人通知，可在 `.env` 中配置：

```bash
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/your-webhook-token
```

未配置时，任务中心的“发送补充请求”和“模拟小张回复并回流”仍可完整演示任务状态、消息审计和 Agent 继续执行。

任务中心提供“跑完整Demo”入口，可一键执行黄金链路：

```text
生成任务卡 -> 关联知识库 -> 启动数字员工 -> 飞书模拟发送
-> 小张回复回流 -> 老板确认 -> 任务归档
```

## 7天MVP文档

- [7天MVP规格说明](docs/phantom-ai-workstation/01-spec-7day-mvp.md)
- [7天MVP技术计划](docs/phantom-ai-workstation/02-technical-plan-7day-mvp.md)
- [7天MVP任务拆解](docs/phantom-ai-workstation/03-implementation-tasks-7day-mvp.md)
