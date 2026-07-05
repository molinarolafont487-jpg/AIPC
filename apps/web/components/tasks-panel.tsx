"use client";

import { useEffect, useState } from "react";
import {
  Archive,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock3,
  ListFilter,
  MessageCircle,
  Play,
  RefreshCcw,
  Rocket,
  Send
} from "lucide-react";
import {
  approveTask,
  archiveTask,
  dispatchTaskAgents,
  getTask,
  listTasks,
  runGoldenDemoLoop,
  sendFeishuMessage,
  simulateFeishuReply,
  type AgentRun,
  type Task,
  type TaskEvent
} from "@/lib/api-client";

const statusLabels: Record<string, string> = {
  pending_confirm: "待确认",
  running: "执行中",
  waiting_human: "等待真人员工补充",
  waiting_approval: "等待老板确认",
  completed: "已完成",
  archived: "已归档",
  failed: "失败",
  canceled: "已取消"
};

export function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("任务中心会显示AI指挥台创建的任务。");
  const [runningAgents, setRunningAgents] = useState(false);
  const [feishuLoading, setFeishuLoading] = useState(false);
  const [closingTask, setClosingTask] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [approvalComment, setApprovalComment] = useState(
    "老板确认：预算信息已补充，客户方案可以作为演示结果归档。"
  );
  const [replyContent, setReplyContent] = useState(
    "华星科技预算约8万元，采购周期预计30天，倾向本地部署，IT负责人重点关注数据不出域。"
  );

  async function loadTasks() {
    const result = await listTasks();
    setTasks(result.items);
    const visibleItems =
      statusFilter === "all"
        ? result.items
        : result.items.filter((task) => task.status === statusFilter);
    if (visibleItems[0]) {
      const detail = await getTask(visibleItems[0].id);
      setSelectedTask(detail.task);
      setEvents(detail.events);
      setAgentRuns(detail.agent_runs);
    } else {
      setSelectedTask(null);
      setEvents([]);
      setAgentRuns([]);
    }
    setMessage(`已加载 ${result.total} 个任务。`);
  }

  useEffect(() => {
    void loadTasks().catch((error) =>
      setMessage(error instanceof Error ? error.message : "任务读取失败。")
    );
  }, []);

  async function selectTask(taskId: string) {
    const detail = await getTask(taskId);
    setSelectedTask(detail.task);
    setEvents(detail.events);
    setAgentRuns(detail.agent_runs);
  }

  async function handleStatusFilterChange(nextStatus: string) {
    setStatusFilter(nextStatus);
    const visibleItems =
      nextStatus === "all" ? tasks : tasks.filter((task) => task.status === nextStatus);
    if (visibleItems[0]) {
      await selectTask(visibleItems[0].id);
    } else {
      setSelectedTask(null);
      setEvents([]);
      setAgentRuns([]);
    }
  }

  async function refreshSelectedTask(taskId: string) {
    const detail = await getTask(taskId);
    setSelectedTask(detail.task);
    setEvents(detail.events);
    setAgentRuns(detail.agent_runs);
  }

  async function refreshTaskList() {
    const result = await listTasks();
    setTasks(result.items);
  }

  async function runAgents(force = false) {
    if (!selectedTask) return;
    setRunningAgents(true);
    setMessage("正在执行数字员工 Prompt...");
    try {
      const result = await dispatchTaskAgents(selectedTask.id, force);
      await refreshSelectedTask(result.task_id);
      setMessage(`已生成 ${result.agent_runs.length} 个数字员工输出。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "数字员工执行失败。");
    } finally {
      setRunningAgents(false);
    }
  }

  async function handleSendFeishuRequest() {
    if (!selectedTask) return;
    const receiver = selectedTask.command_protocol.human_collaborators[0] || "销售小张";
    setFeishuLoading(true);
    setMessage(`正在向${receiver}发送飞书补充请求...`);
    try {
      const result = await sendFeishuMessage({
        task_id: selectedTask.id,
        receiver
      });
      await refreshSelectedTask(result.task_id);
      setMessage(`飞书请求已发送：${result.message.status}。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "飞书请求发送失败。");
    } finally {
      setFeishuLoading(false);
    }
  }

  async function handleSimulateReply() {
    if (!selectedTask) return;
    const sender = selectedTask.command_protocol.human_collaborators[0] || "销售小张";
    setFeishuLoading(true);
    setMessage("正在模拟飞书回复回流...");
    try {
      const result = await simulateFeishuReply({
        task_id: selectedTask.id,
        sender,
        content: replyContent
      });
      await refreshSelectedTask(result.task_id);
      setMessage("小张回复已回流，销售助理和老板助理已更新输出。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "飞书回复回流失败。");
    } finally {
      setFeishuLoading(false);
    }
  }

  async function handleApproveTask() {
    if (!selectedTask) return;
    setClosingTask(true);
    setMessage("正在提交老板确认...");
    try {
      const result = await approveTask(selectedTask.id, approvalComment);
      await refreshSelectedTask(result.task_id);
      await refreshTaskList();
      setMessage("老板已确认结果，任务状态已变为已完成。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "老板确认失败。");
    } finally {
      setClosingTask(false);
    }
  }

  async function handleArchiveTask() {
    if (!selectedTask) return;
    setClosingTask(true);
    setMessage("正在归档任务...");
    try {
      const result = await archiveTask(selectedTask.id);
      await refreshSelectedTask(result.task_id);
      await refreshTaskList();
      setMessage("任务已归档到任务中心，完整闭环演示完成。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "任务归档失败。");
    } finally {
      setClosingTask(false);
    }
  }

  async function handleRunGoldenDemo() {
    setDemoLoading(true);
    setMessage("正在跑完整黄金Demo闭环...");
    try {
      const result = await runGoldenDemoLoop({ auto_archive: true });
      setStatusFilter("all");
      setSelectedTask(result.task);
      setEvents(result.events);
      setAgentRuns(result.agent_runs);
      await refreshTaskList();
      setMessage(
        `黄金Demo已完成：${statusLabels[result.status] || result.status}，已生成完整任务时间线。`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "黄金Demo执行失败。");
    } finally {
      setDemoLoading(false);
    }
  }

  const canApprove =
    selectedTask !== null && selectedTask.status !== "completed" && selectedTask.status !== "archived";
  const canArchive = selectedTask?.status === "completed";
  const statusCounts = tasks.reduce<Record<string, number>>(
    (counts, task) => {
      counts[task.status] = (counts[task.status] || 0) + 1;
      return counts;
    },
    {}
  );
  const filteredTasks =
    statusFilter === "all" ? tasks : tasks.filter((task) => task.status === statusFilter);
  const activeTaskCount =
    (statusCounts.pending_confirm || 0) +
    (statusCounts.running || 0) +
    (statusCounts.waiting_human || 0) +
    (statusCounts.waiting_approval || 0);
  const closedLoopCount = statusCounts.archived || 0;
  const archiveRate = tasks.length ? Math.round((closedLoopCount / tasks.length) * 100) : 0;
  const statusFilters = [
    ["all", "全部", tasks.length],
    ["pending_confirm", "待确认", statusCounts.pending_confirm || 0],
    ["running", "执行中", statusCounts.running || 0],
    ["waiting_human", "等真人", statusCounts.waiting_human || 0],
    ["waiting_approval", "等老板", statusCounts.waiting_approval || 0],
    ["completed", "已完成", statusCounts.completed || 0],
    ["archived", "已归档", statusCounts.archived || 0]
  ];
  const closureSteps = [
    {
      label: "飞书回流",
      done: events.some((event) => event.event_type === "feishu.reply_received")
    },
    {
      label: "老板确认",
      done: selectedTask?.status === "completed" || selectedTask?.status === "archived"
    },
    {
      label: "任务归档",
      done: selectedTask?.status === "archived"
    }
  ];

  return (
    <div className="grid gap-5 p-5 xl:grid-cols-[420px_1fr]">
      <section className="rounded-lg border border-line bg-white p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">任务列表</h2>
            <p className="text-sm text-slate-500">{message}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={demoLoading}
              onClick={() => void handleRunGoldenDemo()}
            >
              <Rocket size={15} />
              {demoLoading ? "执行中" : "跑完整Demo"}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-slate-700"
              onClick={() => void loadTasks()}
            >
              <RefreshCcw size={15} />
              刷新
            </button>
          </div>
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          {[
            ["活跃任务", activeTaskCount],
            ["已归档", closedLoopCount],
            ["闭环率", `${archiveRate}%`]
          ].map(([label, value]) => (
            <div className="rounded-md border border-line bg-mist p-3" key={label}>
              <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
                <BarChart3 size={13} />
                {label}
              </div>
              <div className="text-lg font-semibold">{value}</div>
            </div>
          ))}
        </div>

        <div className="mb-4 rounded-md border border-line p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
            <ListFilter size={14} />
            状态筛选
          </div>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map(([status, label, count]) => (
              <button
                className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs ${
                  statusFilter === status
                    ? "bg-ink text-white"
                    : "bg-mist text-slate-600 hover:bg-[#e9f6f5] hover:text-accent"
                }`}
                key={status}
                onClick={() => void handleStatusFilterChange(String(status))}
              >
                <span>{label}</span>
                <span
                  className={`rounded px-1.5 py-0.5 ${
                    statusFilter === status ? "bg-white/15" : "bg-white"
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="rounded-md bg-mist p-4 text-sm leading-6 text-slate-600">
              暂无任务。请先回到 AI指挥台，点击“生成任务卡”并“确认执行”。
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="rounded-md bg-mist p-4 text-sm leading-6 text-slate-600">
              当前筛选下暂无任务。
            </div>
          ) : (
            filteredTasks.map((task) => (
              <button
                className={`w-full rounded-md border p-4 text-left ${
                  selectedTask?.id === task.id
                    ? "border-accent bg-[#e9f6f5]"
                    : "border-line bg-white hover:bg-mist"
                }`}
                key={task.id}
                onClick={() => void selectTask(task.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{task.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{task.goal}</div>
                  </div>
                  <span className="shrink-0 rounded bg-mist px-2 py-1 text-xs text-slate-600">
                    {statusLabels[task.status] || task.status}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-4 text-base font-semibold">任务详情与时间线</h2>
        {selectedTask ? (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["任务类型", selectedTask.type],
                ["状态", statusLabels[selectedTask.status] || selectedTask.status],
                ["主责Agent", selectedTask.command_protocol.primary_agent],
                ["协作真人", selectedTask.command_protocol.human_collaborators.join("、")]
              ].map(([label, value]) => (
                <div className="rounded-md bg-mist p-3" key={label}>
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="mt-1 text-sm font-medium">{value || "暂无"}</div>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-line p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">知识库引用</h3>
                <span className="rounded bg-mist px-2 py-1 text-xs text-slate-500">
                  {selectedTask.command_protocol.knowledge_refs?.length ?? 0} 条
                </span>
              </div>
              {selectedTask.command_protocol.knowledge_refs?.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {selectedTask.command_protocol.knowledge_refs.map((ref) => (
                    <article className="rounded-md bg-mist p-3" key={ref.chunk_id}>
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{ref.document_name}</span>
                        <span>{ref.dataset}</span>
                        <span>p.{ref.page_start}-{ref.page_end}</span>
                        <span>score {ref.score}</span>
                      </div>
                      <p className="max-h-24 overflow-hidden break-words text-xs leading-5 text-slate-600">
                        {ref.excerpt}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  该任务尚未关联知识库引用。
                </p>
              )}
            </div>

            <div className="rounded-md border border-line p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Bot size={17} className="text-accent" />
                  <h3 className="text-sm font-semibold">数字员工输出</h3>
                  <span className="rounded bg-mist px-2 py-1 text-xs text-slate-500">
                    {agentRuns.length} 个
                  </span>
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={runningAgents}
                  onClick={() => void runAgents(agentRuns.length > 0)}
                >
                  <Play size={15} />
                  {agentRuns.length > 0 ? "重新执行" : "执行数字员工"}
                </button>
              </div>

              {agentRuns.length ? (
                <div className="space-y-3">
                  {agentRuns.map((run) => (
                    <article className="rounded-md bg-mist p-4" key={run.id}>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold">{run.agent_name}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {run.execution_mode === "real" ? "真执行" : "半自动"} /{" "}
                            {run.status} / 引用 {run.input_summary.knowledge_ref_count} 条
                          </div>
                        </div>
                        <span className="rounded bg-white px-2 py-1 text-xs text-slate-600">
                          {run.artifacts.join("、")}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                        {run.output}
                      </p>
                      <div className="mt-3 rounded-md bg-white p-3 text-xs leading-5 text-slate-500">
                        <div>岗位：{run.prompt_config.role_description}</div>
                        <div>边界：{run.prompt_config.duty_boundary}</div>
                        <div>
                          人工确认：
                          {run.prompt_config.requires_human_confirmation ? "需要" : "不需要"}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-500">
                  点击“执行数字员工”后，将按任务卡分配主责与协作数字员工，并由老板助理生成确认版。
                </p>
              )}
            </div>

            <div className="rounded-md border border-line p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MessageCircle size={17} className="text-accent" />
                  <h3 className="text-sm font-semibold">飞书真人协同</h3>
                  <span className="rounded bg-mist px-2 py-1 text-xs text-slate-500">
                    {statusLabels[selectedTask.status] || selectedTask.status}
                  </span>
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={feishuLoading}
                  onClick={() => void handleSendFeishuRequest()}
                >
                  <Send size={15} />
                  发送补充请求
                </button>
              </div>

              <div className="rounded-md bg-mist p-3 text-sm leading-6 text-slate-700">
                销售助理会请求
                {selectedTask.command_protocol.human_collaborators[0] || "销售小张"}
                补充预算、采购周期、部署要求和关键关注点。未配置真实Webhook时使用本地模拟发送。
              </div>

              <textarea
                className="mt-3 min-h-20 w-full resize-none rounded-md border border-line px-3 py-2 text-sm leading-6 outline-none focus:border-accent"
                value={replyContent}
                onChange={(event) => setReplyContent(event.target.value)}
              />
              <button
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={feishuLoading}
                onClick={() => void handleSimulateReply()}
              >
                <MessageCircle size={15} />
                模拟小张回复并回流
              </button>
            </div>

            <div className="rounded-md border border-line p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={17} className="text-accent" />
                  <h3 className="text-sm font-semibold">老板确认与归档</h3>
                  <span className="rounded bg-mist px-2 py-1 text-xs text-slate-500">
                    {statusLabels[selectedTask.status] || selectedTask.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={closingTask || !canApprove}
                    onClick={() => void handleApproveTask()}
                  >
                    <CheckCircle2 size={15} />
                    老板确认结果
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={closingTask || !canArchive}
                    onClick={() => void handleArchiveTask()}
                  >
                    <Archive size={15} />
                    归档任务
                  </button>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
                <textarea
                  className="min-h-20 w-full resize-none rounded-md border border-line px-3 py-2 text-sm leading-6 outline-none focus:border-accent"
                  value={approvalComment}
                  onChange={(event) => setApprovalComment(event.target.value)}
                />
                <div className="rounded-md bg-mist p-3 text-xs leading-5 text-slate-600">
                  <div className="mb-2 font-medium text-slate-700">闭环进度</div>
                  <div className="space-y-2">
                    {closureSteps.map((step) => (
                      <div className="flex items-center gap-2" key={step.label}>
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            step.done
                              ? "border-accent bg-[#e9f6f5] text-accent"
                              : "border-line bg-white text-slate-300"
                          }`}
                        >
                          {step.done ? <CheckCircle2 size={12} /> : null}
                        </span>
                        <span>{step.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {events.map((event) => (
                <div className="flex gap-3 rounded-md border border-line p-3" key={event.id}>
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e9f6f5] text-accent">
                    <Clock3 size={15} />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{event.message}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {event.event_type} / {event.created_at}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-md bg-mist p-4 text-sm text-slate-600">
            选择一个任务后查看时间线。
          </div>
        )}
      </section>
    </div>
  );
}
