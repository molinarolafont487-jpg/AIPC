"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Play,
  Send
} from "lucide-react";
import {
  confirmTask,
  createTask,
  parseCommand,
  startTask,
  type CommandProtocol
} from "@/lib/api-client";
import { agents, stats, timeline } from "@/lib/demo-data";

const defaultCommand =
  "帮我准备明天下午给华星科技的合作方案，让销售小张补充预算，销售助理生成话术，内容助理生成PPT大纲。";

const quickCommands = [
  "准备客户方案",
  "整理会议纪要",
  "生成PPT大纲",
  "拆解任务",
  "查询资料",
  "生成代码原型"
];

const statusLabels: Record<string, string> = {
  "待生成": "待生成",
  "待确认": "待确认",
  running: "执行中",
  waiting_human: "等待真人补充",
  waiting_approval: "等待老板确认",
  completed: "已完成",
  archived: "已归档"
};

function protocolRows(protocol: CommandProtocol) {
  return [
    ["任务名称", protocol.task_title],
    ["任务类型", protocol.task_type],
    ["主责数字员工", protocol.primary_agent],
    ["协作数字员工", protocol.collaborating_agents.join("、")],
    ["协作真人员工", protocol.human_collaborators.join("、") || "暂无"],
    ["需要调用资料", protocol.input_sources.join("、")],
    ["预计输出", protocol.expected_outputs.join("、")],
    ["通知渠道", protocol.notification_channel],
    ["老板确认", protocol.approval_required ? "需要" : "不需要"]
  ];
}

export function CommandCenter() {
  const [command, setCommand] = useState(defaultCommand);
  const [protocol, setProtocol] = useState<CommandProtocol | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState("待生成");
  const [message, setMessage] = useState("输入一句话后生成任务卡。");
  const [loading, setLoading] = useState(false);

  const rows = useMemo(() => (protocol ? protocolRows(protocol) : []), [protocol]);

  async function handleParse() {
    setLoading(true);
    setMessage("正在解析 Command Protocol...");
    try {
      const result = await parseCommand(command);
      setProtocol(result.command_protocol);
      setTaskId(null);
      setTaskStatus("待确认");
      setMessage("任务卡已生成，可以确认执行。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "解析失败。");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmAndStart() {
    if (!protocol) {
      await handleParse();
      return;
    }

    setLoading(true);
    setMessage("正在创建任务并启动数字员工...");
    try {
      const created = taskId
        ? { task_id: taskId, status: taskStatus }
        : await createTask(protocol);
      setTaskId(created.task_id);
      await confirmTask(created.task_id, "老板确认执行黄金Demo任务。");
      const started = await startTask(created.task_id);
      setTaskStatus(started.status);
      setMessage("任务已进入任务中心，并等待飞书真人补充。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "任务启动失败。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid flex-1 grid-cols-1 gap-5 p-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">自然语言指挥</h2>
              <p className="text-sm text-slate-500">
                告诉六个数字员工，你想完成什么。
              </p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              onClick={handleParse}
            >
              <Play size={16} />
              {loading ? "处理中" : "生成任务卡"}
            </button>
          </div>

          <textarea
            className="min-h-28 w-full resize-none rounded-md border border-line bg-[#fbfcfd] p-4 text-sm leading-6 text-slate-700 outline-none focus:border-accent"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {quickCommands.map((label) => (
              <button
                className="rounded-md border border-line px-3 py-1.5 text-xs text-slate-600 hover:border-accent hover:text-accent"
                key={label}
                onClick={() => setCommand(`${label}：${defaultCommand}`)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div className="rounded-lg border border-line bg-white p-4" key={stat.label}>
              <div className="mb-3 flex items-center justify-between text-slate-500">
                <span className="text-xs">{stat.label}</span>
                <stat.icon size={16} />
              </div>
              <div className="text-2xl font-semibold">{stat.value}</div>
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-line bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">六个数字员工</h2>
            <span className="text-xs text-slate-500">
              真执行优先：销售、知识库、老板助理
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <article className="rounded-md border border-line p-4" key={agent.name}>
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{agent.name}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {agent.task}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-1 text-[11px] ${
                      agent.status === "真执行"
                        ? "bg-[#e9f6f5] text-accent"
                        : "bg-mist text-slate-500"
                    }`}
                  >
                    {agent.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500">当前：{agent.progress}</div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-5">
        <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">任务卡</h2>
            <span className="rounded bg-[#fff6e8] px-2 py-1 text-xs text-amber">
              {statusLabels[taskStatus] || taskStatus}
            </span>
          </div>

          {protocol ? (
            <div className="space-y-3">
              {rows.map(([label, value]) => (
                <div className="grid grid-cols-[88px_1fr] gap-3 text-sm" key={label}>
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="leading-5 text-slate-700">{value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md bg-mist p-4 text-sm leading-6 text-slate-600">
              任务卡会在解析自然语言后出现。
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              onClick={handleConfirmAndStart}
            >
              确认执行
              <ArrowRight size={15} />
            </button>
            <Link
              className="rounded-md border border-line px-3 py-2 text-center text-sm text-slate-600"
              href="/tasks"
            >
              查看任务中心
            </Link>
          </div>

          <p className="mt-4 rounded-md bg-mist px-3 py-2 text-xs leading-5 text-slate-600">
            {message}
            {taskId ? ` 任务ID：${taskId}` : ""}
          </p>
        </section>

        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-4 text-base font-semibold">任务中心流转</h2>
          <div className="space-y-4">
            {timeline.map((item) => (
              <div className="flex gap-3" key={item.label}>
                <div
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    item.done ? "bg-[#e9f6f5] text-accent" : "bg-mist text-slate-400"
                  }`}
                >
                  {item.done ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}
                </div>
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs leading-5 text-slate-500">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <MessageCircle size={17} className="text-accent" />
            <h2 className="text-base font-semibold">飞书协同</h2>
          </div>
          <div className="rounded-md bg-mist p-3 text-sm leading-6 text-slate-700">
            <p>销售助理请求销售小张补充华星科技预算。</p>
            <p className="mt-2 text-xs text-slate-500">
              回复回流后，任务将从等待真人补充切回执行中。
            </p>
          </div>
          <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-slate-700">
            <Send size={15} />
            发送飞书请求
          </button>
        </section>
      </aside>
    </div>
  );
}
