"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  MessageCircle,
  Plug,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  getFeishuStatus,
  getModelRouterStatus,
  getSeedStatus,
  listAgents,
  listDocuments,
  listTasks,
  listWorkspaceMembers,
  type Agent,
  type DocumentItem,
  type FeishuStatus,
  type ModelRouterStatus,
  type Task,
  type WorkspaceMember
} from "@/lib/api-client";

type ModuleKind = "humans" | "customers" | "projects" | "rules" | "connectors" | "settings";

type ModuleData = {
  tasks: Task[];
  documents: DocumentItem[];
  agents: Agent[];
  members: WorkspaceMember[];
  feishu: FeishuStatus | null;
  model: ModelRouterStatus | null;
  seed: Awaited<ReturnType<typeof getSeedStatus>> | null;
};

const statusLabels: Record<string, string> = {
  pending_confirm: "待确认",
  running: "执行中",
  waiting_human: "等待真人",
  waiting_approval: "等待老板",
  completed: "已完成",
  archived: "已归档"
};

const moduleMeta: Record<ModuleKind, { title: string; icon: LucideIcon }> = {
  humans: { title: "真人员工协同池", icon: Users },
  customers: { title: "客户中心", icon: BriefcaseBusiness },
  projects: { title: "项目中心", icon: FileText },
  rules: { title: "企业规则", icon: ShieldCheck },
  connectors: { title: "连接器中心", icon: Plug },
  settings: { title: "系统设置", icon: Settings }
};

function countTasks(tasks: Task[], status: string) {
  return tasks.filter((task) => task.status === status).length;
}

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function customerCards(data: ModuleData) {
  const customerDefs = [
    {
      name: "华星科技",
      segment: "制造企业",
      keywords: ["华星", "制造", "工业"],
      owner: "销售小张"
    },
    {
      name: "园区企业服务中心",
      segment: "园区",
      keywords: ["园区", "招商", "政策"],
      owner: "服务专员"
    },
    {
      name: "Phantom 自用演示",
      segment: "幻影自用",
      keywords: ["幻影", "Phantom", "产品"],
      owner: "老板助理"
    }
  ];
  return customerDefs.map((customer) => {
    const taskMatches = data.tasks.filter((task) =>
      includesAny(`${task.title}${task.goal}${task.type}`, customer.keywords)
    );
    const docMatches = data.documents.filter((document) =>
      document.dataset === customer.segment ||
      includesAny(`${document.name}${String(document.metadata?.source_type || "")}`, customer.keywords)
    );
    const activeTask = taskMatches.find((task) =>
      ["pending_confirm", "running", "waiting_human", "waiting_approval"].includes(task.status)
    );
    return {
      ...customer,
      task_count: taskMatches.length,
      document_count: docMatches.length,
      status: activeTask ? statusLabels[activeTask.status] || activeTask.status : "资料可用",
      latest_task_id: taskMatches[0]?.id
    };
  });
}

function projectCards(data: ModuleData) {
  const archivedDocs = data.documents.filter(
    (document) => document.dataset === "任务归档" || document.metadata?.source_type === "task_archive"
  );
  return [
    {
      name: "客户方案协同",
      owner: "销售助理",
      tasks: data.tasks.filter((task) => task.type === "客户跟进"),
      documents: data.documents.filter((document) => document.dataset === "制造企业")
    },
    {
      name: "会议纪要到任务",
      owner: "运营助理",
      tasks: data.tasks.filter((task) => task.type === "会议纪要" || task.type === "任务拆解"),
      documents: data.documents.filter((document) => includesAny(document.name, ["会议", "纪要"]))
    },
    {
      name: "需求到代码原型",
      owner: "代码助理",
      tasks: data.tasks.filter((task) => task.type === "代码原型"),
      documents: data.documents.filter((document) => includesAny(document.name, ["代码", "原型", "需求"]))
    },
    {
      name: "任务归档沉淀",
      owner: "知识库助理",
      tasks: data.tasks.filter((task) => task.status === "archived"),
      documents: archivedDocs
    }
  ];
}

function ruleCards(data: ModuleData) {
  const approvalTasks = data.tasks.filter((task) => task.approval_required);
  const highRiskTasks = data.tasks.filter((task) => task.command_protocol.risk_level === "high");
  const cloudCalls = data.model?.summary.cloud_ratio ?? 0;
  return [
    {
      name: "对外内容老板确认",
      status: approvalTasks.length ? "已生效" : "待任务触发",
      evidence: `${approvalTasks.length} 个任务要求确认`
    },
    {
      name: "知识库引用可追溯",
      status: data.documents.length ? "已生效" : "待资料入库",
      evidence: `${data.documents.reduce((total, item) => total + item.chunk_count, 0)} 个 chunks`
    },
    {
      name: "敏感任务风险提醒",
      status: highRiskTasks.length ? "有高风险" : "正常",
      evidence: `${highRiskTasks.length} 个高风险任务`
    },
    {
      name: "本地优先云端增强",
      status: cloudCalls > 0 ? "云端已调用" : "本地优先",
      evidence: `云端比例 ${cloudCalls}%`
    },
    {
      name: "外部协同审计",
      status: data.feishu?.counts.sent || data.feishu?.counts.received ? "已记录" : "待消息",
      evidence: `发送 ${data.feishu?.counts.sent ?? 0} / 回流 ${data.feishu?.counts.received ?? 0}`
    }
  ];
}

function connectorCards(data: ModuleData) {
  return [
    {
      name: "飞书消息",
      status: data.feishu?.configured ? "真实Webhook" : "本地模拟",
      detail: data.feishu?.message || "读取中",
      active: true
    },
    {
      name: "企业知识库",
      status: "已接入",
      detail: `${data.documents.length} 份文档，${data.documents.reduce((sum, item) => sum + item.chunk_count, 0)} chunks`,
      active: true
    },
    {
      name: "模型Router",
      status: "已接入",
      detail: `${data.model?.summary.total_calls ?? 0} 次调用`,
      active: true
    },
    {
      name: "钉钉 / 企业微信",
      status: "排队",
      detail: "飞书闭环稳定后扩展同构消息连接器",
      active: false
    },
    {
      name: "CRM / 邮箱 / 代码仓库",
      status: "排队",
      detail: "阶段三接入业务系统",
      active: false
    }
  ];
}

function metricCards(kind: ModuleKind, data: ModuleData) {
  if (kind === "humans") {
    return [
      ["真人员工", data.members.length, Users],
      ["飞书映射", data.members.filter((member) => member.feishu_user_id).length, MessageCircle],
      ["等待补充", countTasks(data.tasks, "waiting_human"), ClipboardList],
      ["回流消息", data.feishu?.counts.received ?? 0, CheckCircle2]
    ] as Array<[string, string | number, LucideIcon]>;
  }
  if (kind === "customers") {
    const customers = customerCards(data);
    return [
      ["客户卡", customers.length, BriefcaseBusiness],
      ["关联任务", customers.reduce((sum, item) => sum + item.task_count, 0), ClipboardList],
      ["关联文档", customers.reduce((sum, item) => sum + item.document_count, 0), Database],
      ["待跟进", data.tasks.filter((task) => task.status === "waiting_human").length, MessageCircle]
    ] as Array<[string, string | number, LucideIcon]>;
  }
  if (kind === "projects") {
    return [
      ["试点项目", projectCards(data).length, FileText],
      ["任务总数", data.tasks.length, ClipboardList],
      ["已归档", countTasks(data.tasks, "archived"), CheckCircle2],
      ["归档文档", data.documents.filter((doc) => doc.dataset === "任务归档").length, Database]
    ] as Array<[string, string | number, LucideIcon]>;
  }
  if (kind === "rules") {
    return [
      ["规则项", ruleCards(data).length, ShieldCheck],
      ["需确认任务", data.tasks.filter((task) => task.approval_required).length, ClipboardList],
      ["风险任务", data.tasks.filter((task) => task.command_protocol.risk_level !== "low").length, ShieldCheck],
      ["审计消息", (data.feishu?.counts.sent ?? 0) + (data.feishu?.counts.received ?? 0), MessageCircle]
    ] as Array<[string, string | number, LucideIcon]>;
  }
  if (kind === "connectors") {
    return [
      ["已接入", connectorCards(data).filter((item) => item.active).length, Plug],
      ["飞书发送", data.feishu?.counts.sent ?? 0, MessageCircle],
      ["飞书回流", data.feishu?.counts.received ?? 0, CheckCircle2],
      ["模型调用", data.model?.summary.total_calls ?? 0, Bot]
    ] as Array<[string, string | number, LucideIcon]>;
  }
  return [
    ["工作区", data.seed?.counts ? 1 : 0, Settings],
    ["角色", data.seed?.counts.roles ?? 0, ShieldCheck],
    ["权限", data.seed?.counts.permissions ?? 0, CheckCircle2],
    ["Agent", data.agents.length, Bot]
  ] as Array<[string, string | number, LucideIcon]>;
}

function statusBadgeClass(status: string) {
  return status.includes("已") || status.includes("正常") || status.includes("真实")
    ? "bg-[#e9f6f5] text-accent"
    : "bg-mist text-slate-600";
}

export function BusinessModulePanel({ kind }: { kind: ModuleKind }) {
  const [data, setData] = useState<ModuleData>({
    tasks: [],
    documents: [],
    agents: [],
    members: [],
    feishu: null,
    model: null,
    seed: null
  });
  const [notice, setNotice] = useState("正在读取系统数据...");

  async function loadData() {
    const [
      tasksResult,
      documentsResult,
      agentsResult,
      membersResult,
      feishuResult,
      modelResult,
      seedResult
    ] = await Promise.all([
      listTasks(),
      listDocuments(),
      listAgents(),
      listWorkspaceMembers(),
      getFeishuStatus(),
      getModelRouterStatus(),
      getSeedStatus()
    ]);
    setData({
      tasks: tasksResult.items,
      documents: documentsResult.items,
      agents: agentsResult.items,
      members: membersResult.items,
      feishu: feishuResult,
      model: modelResult,
      seed: seedResult
    });
    setNotice(`已加载 ${tasksResult.total} 个任务、${documentsResult.total} 份文档。`);
  }

  useEffect(() => {
    void loadData().catch((error) =>
      setNotice(error instanceof Error ? error.message : "系统数据读取失败。")
    );
  }, []);

  const meta = moduleMeta[kind];
  const Icon = meta.icon;
  const metrics = metricCards(kind, data);
  const recentTasks = useMemo(() => data.tasks.slice(0, 6), [data.tasks]);

  return (
    <div className="space-y-5 p-5">
      <section className="rounded-lg border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#e9f6f5] text-accent">
              <Icon size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold">{meta.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{notice}</p>
            </div>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-slate-700"
            onClick={() => void loadData()}
          >
            <RefreshCcw size={15} />
            刷新
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, MetricIcon]) => (
          <div className="rounded-lg border border-line bg-white p-4" key={label}>
            <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
              <span>{label}</span>
              <MetricIcon size={16} />
            </div>
            <div className="text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </section>

      {kind === "humans" ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <div className="rounded-lg border border-line bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold">员工与角色</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {data.members.map((member) => (
                <article className="rounded-md bg-mist p-4" key={member.id}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{member.display_name}</div>
                    <span className="rounded bg-white px-2 py-1 text-xs text-slate-500">
                      {member.role.name}
                    </span>
                  </div>
                  <div className="text-xs leading-5 text-slate-600">{member.user.email}</div>
                  <div className="mt-2 text-xs leading-5 text-slate-600">
                    飞书：{member.feishu_user_id || "未映射"}
                  </div>
                </article>
              ))}
            </div>
          </div>
          <TaskList title="待真人处理" tasks={data.tasks.filter((task) => task.status === "waiting_human")} />
        </section>
      ) : null}

      {kind === "customers" ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <div className="rounded-lg border border-line bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold">客户资料卡</h3>
            <div className="grid gap-3 lg:grid-cols-3">
              {customerCards(data).map((customer) => (
                <article className="rounded-md border border-line p-4" key={customer.name}>
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{customer.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{customer.segment}</div>
                    </div>
                    <span className={`rounded px-2 py-1 text-xs ${statusBadgeClass(customer.status)}`}>
                      {customer.status}
                    </span>
                  </div>
                  <div className="grid gap-2 text-xs text-slate-600">
                    <div>负责人：{customer.owner}</div>
                    <div>任务：{customer.task_count}</div>
                    <div>资料：{customer.document_count}</div>
                  </div>
                  {customer.latest_task_id ? (
                    <Link
                      className="mt-3 inline-flex items-center gap-2 rounded-md border border-line px-2 py-1.5 text-xs text-slate-600 hover:border-accent hover:text-accent"
                      href={`/tasks?task=${customer.latest_task_id}`}
                    >
                      查看任务
                      <ArrowRight size={12} />
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
          <TaskList title="客户相关任务" tasks={data.tasks.filter((task) => task.type === "客户跟进").slice(0, 6)} />
        </section>
      ) : null}

      {kind === "projects" ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <div className="rounded-lg border border-line bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold">项目试点</h3>
            <div className="grid gap-3 lg:grid-cols-2">
              {projectCards(data).map((project) => (
                <article className="rounded-md border border-line p-4" key={project.name}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{project.name}</div>
                    <span className="rounded bg-mist px-2 py-1 text-xs text-slate-500">
                      {project.owner}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded bg-mist p-2">
                      <div className="font-semibold text-ink">{project.tasks.length}</div>
                      <div className="text-slate-500">任务</div>
                    </div>
                    <div className="rounded bg-mist p-2">
                      <div className="font-semibold text-ink">
                        {project.tasks.filter((task) => task.status === "archived").length}
                      </div>
                      <div className="text-slate-500">归档</div>
                    </div>
                    <div className="rounded bg-mist p-2">
                      <div className="font-semibold text-ink">{project.documents.length}</div>
                      <div className="text-slate-500">资料</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <TaskList title="最近任务" tasks={recentTasks} />
        </section>
      ) : null}

      {kind === "rules" ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <div className="rounded-lg border border-line bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold">规则执行状态</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {ruleCards(data).map((rule) => (
                <article className="rounded-md border border-line p-4" key={rule.name}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{rule.name}</div>
                    <span className={`rounded px-2 py-1 text-xs ${statusBadgeClass(rule.status)}`}>
                      {rule.status}
                    </span>
                  </div>
                  <div className="text-xs leading-5 text-slate-600">{rule.evidence}</div>
                </article>
              ))}
            </div>
          </div>
          <TaskList title="需老板确认" tasks={data.tasks.filter((task) => task.approval_required).slice(0, 6)} />
        </section>
      ) : null}

      {kind === "connectors" ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <div className="rounded-lg border border-line bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold">连接器状态</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {connectorCards(data).map((connector) => (
                <article className="rounded-md border border-line p-4" key={connector.name}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{connector.name}</div>
                    <span className={`rounded px-2 py-1 text-xs ${statusBadgeClass(connector.status)}`}>
                      {connector.status}
                    </span>
                  </div>
                  <div className="text-xs leading-5 text-slate-600">{connector.detail}</div>
                </article>
              ))}
            </div>
          </div>
          <TaskList title="等待外部协同" tasks={data.tasks.filter((task) => task.status === "waiting_human")} />
        </section>
      ) : null}

      {kind === "settings" ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <div className="rounded-lg border border-line bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold">系统基座</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["认证模式", "轻量内置账号"],
                ["默认工作区", data.seed?.workspace.name || "Phantom Demo Workspace"],
                ["向量方案", "PostgreSQL + pgvector"],
                ["协同平台", "飞书"],
                ["模型策略", "本地优先 / 云端增强"],
                ["Demo账号", data.seed?.demo_login.email || "admin@phantom.local"]
              ].map(([label, value]) => (
                <div className="rounded-md bg-mist p-3" key={label}>
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="mt-1 text-sm font-semibold">{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-line bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold">Seed状态</h3>
            <div className="grid gap-2">
              {Object.entries(data.seed?.counts || {}).map(([key, value]) => (
                <div className="flex items-center justify-between rounded-md bg-mist px-3 py-2 text-sm" key={key}>
                  <span className="text-slate-600">{key}</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function TaskList({ title, tasks }: { title: string; tasks: Task[] }) {
  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="rounded bg-mist px-2 py-1 text-xs text-slate-500">
          {tasks.length} 个
        </span>
      </div>
      {tasks.length ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Link
              className="block rounded-md border border-line p-3 hover:border-accent hover:bg-[#e9f6f5]"
              href={`/tasks?task=${task.id}`}
              key={task.id}
            >
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div className="text-sm font-semibold">{task.title}</div>
                <span className="rounded bg-mist px-2 py-1 text-xs text-slate-500">
                  {statusLabels[task.status] || task.status}
                </span>
              </div>
              <div className="line-clamp-2 text-xs leading-5 text-slate-600">
                {task.goal}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-md bg-mist p-4 text-sm leading-6 text-slate-600">
          暂无数据。
        </div>
      )}
    </div>
  );
}
