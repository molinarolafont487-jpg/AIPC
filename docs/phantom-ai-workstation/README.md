# Phantom AI Workstation 工程落地包

版本：V1.0 工程执行稿  
来源：基于《Phantom AI Workstation 技术全案（V1.0）》继续细化  
目标：让研发团队、外包团队、CTO 可以直接评审、报价、排期、开仓开发

## 交付文件

### 7天MVP启动包

1. [01-spec-7day-mvp.md](/Users/yanlyubo/Desktop/未命名文件夹/docs/phantom-ai-workstation/01-spec-7day-mvp.md)
   - 7天MVP产品规格
   - 黄金Demo闭环
   - 六个数字员工、MVP菜单、Command Protocol
   - 飞书、轻量认证、3个真执行Agent、pgvector等已确认决策

2. [02-technical-plan-7day-mvp.md](/Users/yanlyubo/Desktop/未命名文件夹/docs/phantom-ai-workstation/02-technical-plan-7day-mvp.md)
   - 7天MVP前后端技术栈
   - 企业级基座、数据库、API、Agent执行、飞书集成
   - 版本演进与安全审计

3. [03-implementation-tasks-7day-mvp.md](/Users/yanlyubo/Desktop/未命名文件夹/docs/phantom-ai-workstation/03-implementation-tasks-7day-mvp.md)
   - Day 1 到 Day 7 任务拆解
   - 每日验收标准
   - API和演示脚本最小测试清单

### 30天工程落地包

1. [01-工程级目录结构.md](/Users/yanlyubo/Desktop/未命名文件夹/docs/phantom-ai-workstation/01-工程级目录结构.md)
   - Monorepo 结构
   - 前端、后端、Worker、Infra、Prompt、测试目录
   - Docker Compose MVP 运行拓扑
   - 代码规范与环境变量约定

2. [02-API设计-Agent-Knowledge-Task.md](/Users/yanlyubo/Desktop/未命名文件夹/docs/phantom-ai-workstation/02-API设计-Agent-Knowledge-Task.md)
   - REST API 合约
   - WebSocket/SSE 实时事件
   - 核心数据模型
   - Agent / Knowledge / Task / Bid / Code Factory 接口
   - 错误码、权限、审计与异步任务状态机

3. [03-MVP开发任务拆解-30天.md](/Users/yanlyubo/Desktop/未命名文件夹/docs/phantom-ai-workstation/03-MVP开发任务拆解-30天.md)
   - 30 天开发计划
   - 按模块、人天、角色、验收标准拆解
   - 每周里程碑、Demo 脚本、风险与缓冲

## MVP 技术判断

MVP 不建议一开始做完全微服务。推荐采用：

```text
Next.js 前端
FastAPI 模块化单体
Celery/RQ Worker
PostgreSQL + pgvector
Redis
MinIO
Ollama
Docker Compose
```

原因：

- 30 天样机的核心风险不是高并发，而是文件解析、RAG 可追溯、Agent 执行链路能否闭环。
- 模块化单体可以保留清晰服务边界，后续按 `auth / file / rag / agent / task / audit` 拆服务。
- FastAPI 更适合快速接入 Python 生态的文档解析、Embedding、向量检索和 Agent 工具链。
- 7 天 MVP 已确认先用飞书、轻量内置账号、3 个真执行 Agent、PostgreSQL + pgvector；后续再升级 Keycloak、Qdrant 和多协同平台连接器。

## MVP 成功定义

30 天样机必须现场完成以下闭环：

```text
上传企业资料
-> 自动解析与入库
-> 用户创建业务任务
-> Agent 检索知识库
-> 生成带引用证据的结果
-> 任务状态实时更新
-> 输出 PPT/文档/标书框架/代码草案中的至少两类 artifact
-> 审计日志可回看
```

## 非 MVP 范围

- 完整企业 SSO / LDAP / AD 集成
- 高可用集群部署
- 复杂图数据库推理
- 多租户 SaaS 计费
- 全自动无人工审批的外发邮件或外部系统写入
- 精细化行业模板市场
