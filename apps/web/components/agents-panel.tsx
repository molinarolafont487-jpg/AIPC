"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  ClipboardList,
  FileText,
  Play,
  RefreshCcw,
  ShieldCheck,
  UserRound,
  WalletCards
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  listAgents,
  runAgent,
  type Agent,
  type DirectAgentRun
} from "@/lib/api-client";

const modeLabels: Record<Agent["execution_mode"], string> = {
  real: "真执行",
  semi_auto: "半自动"
};

function modeClass(mode: Agent["execution_mode"]) {
  return mode === "real"
    ? "bg-[#e9f6f5] text-accent"
    : "bg-mist text-slate-500";
}

function defaultRunInput(agent?: Agent | null) {
  if (!agent) return "";
  const template = agent.profile?.task_templates[0];
  return template
    ? `${template.title}：${template.trigger}`
    : `${agent.name}，基于当前任务卡输出阶段结果。`;
}

export function AgentsPanel() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [message, setMessage] = useState("正在读取六个数字员工...");
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [runInput, setRunInput] = useState("");
  const [runResult, setRunResult] = useState<DirectAgentRun | null>(null);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) || agents[0] || null,
    [agents, selectedAgentId]
  );

  async function loadAgents(preferredAgentId?: string | null) {
    setLoading(true);
    try {
      const result = await listAgents();
      setAgents(result.items);
      const nextAgent =
        result.items.find((agent) => agent.id === preferredAgentId) || result.items[0];
      setSelectedAgentId(nextAgent?.id || null);
      setRunInput((current) => current || defaultRunInput(nextAgent));
      setMessage(`已加载 ${result.total} 个数字员工。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "读取失败。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAgents();
  }, []);

  function handleSelectAgent(agent: Agent) {
    setSelectedAgentId(agent.id);
    setRunInput(defaultRunInput(agent));
    setRunResult(null);
  }

  async function handleRunAgent() {
    if (!selectedAgent || !runInput.trim()) return;
    setRunning(true);
    setMessage(`正在试运行${selectedAgent.name}...`);
    try {
      const result = await runAgent(selectedAgent.id, {
        input: {
          title: runInput.slice(0, 36),
          content: runInput,
          source: "agents_panel"
        }
      });
      setRunResult(result);
      await loadAgents(selectedAgent.id);
      setMessage(`${selectedAgent.name}试运行完成。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "数字员工试运行失败。");
    } finally {
      setRunning(false);
    }
  }

  const realAgentCount = agents.filter((agent) => agent.execution_mode === "real").length;
  const activeTaskCount = agents.reduce(
    (total, agent) => total + (agent.profile?.usage.active_tasks || 0),
    0
  );
  const runCount = agents.reduce(
    (total, agent) =>
      total +
      (agent.profile?.usage.task_runs || 0) +
      (agent.profile?.usage.direct_runs || 0),
    0
  );
  const waitingHumanCount = agents.reduce(
    (total, agent) => total + (agent.profile?.usage.waiting_human || 0),
    0
  );
  const matrixMetrics: Array<[string, number, LucideIcon]> = [
    ["真执行", realAgentCount, Bot],
    ["活跃任务", activeTaskCount, ClipboardList],
    ["等待真人", waitingHumanCount, UserRound],
    ["运行记录", runCount, Activity]
  ];
  const selectedMetrics: Array<[string, number, LucideIcon]> = selectedAgent
    ? [
        ["任务运行", selectedAgent.profile?.usage.task_runs || 0, Activity],
        ["直接试运行", selectedAgent.profile?.usage.direct_runs || 0, Play],
        ["活跃任务", selectedAgent.profile?.usage.active_tasks || 0, ClipboardList],
        ["剩余额度", selectedAgent.profile?.usage.remaining_today || 0, WalletCards]
      ]
    : [];

  return (
    <div className="grid gap-5 p-5 xl:grid-cols-[420px_1fr]">
      <section className="rounded-lg border border-line bg-white p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">数字员工矩阵</h2>
            <p className="mt-1 text-sm text-slate-500">{message}</p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={() => void loadAgents(selectedAgent?.id)}
          >
            <RefreshCcw size={15} />
            刷新
          </button>
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-4 xl:grid-cols-2">
          {matrixMetrics.map(([label, value, Icon]) => (
            <div className="rounded-md border border-line bg-mist p-3" key={String(label)}>
              <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                <span>{label}</span>
                <Icon size={14} />
              </div>
              <div className="text-lg font-semibold">{value}</div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {agents.map((agent) => (
            <button
              className={`w-full rounded-md border p-4 text-left ${
                selectedAgent?.id === agent.id
                  ? "border-accent bg-[#e9f6f5]"
                  : "border-line bg-white hover:bg-mist"
              }`}
              key={agent.id}
              onClick={() => handleSelectAgent(agent)}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{agent.name}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    {agent.description}
                  </div>
                </div>
                <span className={`shrink-0 rounded px-2 py-1 text-[11px] ${modeClass(agent.execution_mode)}`}>
                  {modeLabels[agent.execution_mode]}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded bg-mist px-2 py-2">
                  <div className="font-semibold text-ink">
                    {agent.profile?.usage.active_tasks || 0}
                  </div>
                  <div className="text-slate-500">任务</div>
                </div>
                <div className="rounded bg-mist px-2 py-2">
                  <div className="font-semibold text-ink">
                    {agent.profile?.routing_types.length || 0}
                  </div>
                  <div className="text-slate-500">路由</div>
                </div>
                <div className="rounded bg-mist px-2 py-2">
                  <div className="font-semibold text-ink">
                    {agent.profile?.usage.remaining_today ?? 0}
                  </div>
                  <div className="text-slate-500">余量</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        {selectedAgent ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold">{selectedAgent.name}</h2>
                  <span className={`rounded px-2 py-1 text-xs ${modeClass(selectedAgent.execution_mode)}`}>
                    {modeLabels[selectedAgent.execution_mode]}
                  </span>
                  <span className="rounded bg-mist px-2 py-1 text-xs text-slate-500">
                    {selectedAgent.status}
                  </span>
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  {selectedAgent.prompt_config?.role_description || selectedAgent.description}
                </p>
              </div>
              <div className="rounded-md border border-line px-3 py-2 text-right">
                <div className="text-xs text-slate-500">今日额度</div>
                <div className="mt-1 text-sm font-semibold">
                  {selectedAgent.profile?.usage.used_today || 0}/
                  {selectedAgent.profile?.quota.daily_limit || 0}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              {selectedMetrics.map(([label, value, Icon]) => (
                <div className="rounded-md bg-mist p-3" key={String(label)}>
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span>{label}</span>
                    <Icon size={14} />
                  </div>
                  <div className="text-lg font-semibold">{value}</div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-md border border-line p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck size={17} className="text-accent" />
                  <h3 className="text-sm font-semibold">权限与边界</h3>
                </div>
                <div className="mb-3 rounded-md bg-mist p-3 text-xs leading-5 text-slate-600">
                  {selectedAgent.prompt_config?.duty_boundary}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(selectedAgent.profile?.permissions || []).map((permission) => (
                    <span className="rounded bg-mist px-2 py-1 text-xs text-slate-600" key={permission}>
                      {permission}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-line p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FileText size={17} className="text-accent" />
                  <h3 className="text-sm font-semibold">输出格式</h3>
                </div>
                <div className="grid gap-2">
                  {(selectedAgent.prompt_config?.output_format || []).map((item) => (
                    <div className="rounded-md bg-mist px-3 py-2 text-xs text-slate-600" key={item}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
              <div className="rounded-md border border-line p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">任务模板</h3>
                  <span className="rounded bg-mist px-2 py-1 text-xs text-slate-500">
                    {(selectedAgent.profile?.routing_types || []).join("、") || "暂无路由"}
                  </span>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {(selectedAgent.profile?.task_templates || []).map((template) => (
                    <article className="rounded-md bg-mist p-3" key={template.title}>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold">{template.title}</div>
                        <span className="rounded bg-white px-2 py-1 text-xs text-slate-500">
                          {template.task_type}
                        </span>
                      </div>
                      <p className="text-xs leading-5 text-slate-600">{template.trigger}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {template.expected_outputs.map((output) => (
                          <span className="rounded bg-white px-2 py-1 text-[11px] text-slate-500" key={output}>
                            {output}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-line p-4">
                <div className="mb-3 flex items-center gap-2">
                  <UserRound size={17} className="text-accent" />
                  <h3 className="text-sm font-semibold">协作真人</h3>
                </div>
                <div className="space-y-2">
                  {(selectedAgent.profile?.human_collaborators || []).map((person) => (
                    <div className="rounded-md bg-mist px-3 py-2 text-sm text-slate-700" key={person}>
                      {person}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedAgent.tools.map((tool) => (
                    <span className="rounded bg-[#e9f6f5] px-2 py-1 text-[11px] text-accent" key={tool}>
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
              <div className="rounded-md border border-line p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">运行记录</h3>
                  <span className="rounded bg-mist px-2 py-1 text-xs text-slate-500">
                    {selectedAgent.profile?.recent_runs.length || 0} 条
                  </span>
                </div>
                {selectedAgent.profile?.recent_runs.length ? (
                  <div className="space-y-3">
                    {selectedAgent.profile.recent_runs.map((run) => (
                      <article className="rounded-md bg-mist p-3" key={run.id}>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-medium">{run.title}</div>
                          <span className="rounded bg-white px-2 py-1 text-xs text-slate-500">
                            {run.source === "task" ? "任务" : "试运行"} / {run.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">{run.created_at}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {run.artifacts.map((artifact) => (
                            <span className="rounded bg-white px-2 py-1 text-[11px] text-slate-500" key={artifact}>
                              {artifact}
                            </span>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md bg-mist p-4 text-sm leading-6 text-slate-600">
                    暂无运行记录。
                  </div>
                )}
              </div>

              <div className="rounded-md border border-line p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Play size={17} className="text-accent" />
                  <h3 className="text-sm font-semibold">Prompt试运行</h3>
                </div>
                <textarea
                  className="min-h-28 w-full resize-none rounded-md border border-line px-3 py-2 text-sm leading-6 outline-none focus:border-accent"
                  value={runInput}
                  onChange={(event) => setRunInput(event.target.value)}
                />
                <button
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={running || !runInput.trim()}
                  onClick={() => void handleRunAgent()}
                >
                  <Play size={15} />
                  {running ? "运行中" : "运行"}
                </button>
                {runResult ? (
                  <div className="mt-3 rounded-md bg-mist p-3">
                    <div className="mb-2 text-xs text-slate-500">
                      {runResult.agent_name} / {runResult.status}
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                      {runResult.output}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-md border border-line p-4">
              <div className="mb-3 text-sm font-semibold">禁止事项</div>
              <div className="grid gap-2 md:grid-cols-3">
                {(selectedAgent.prompt_config?.forbidden || []).map((item) => (
                  <div className="rounded-md bg-mist px-3 py-2 text-xs leading-5 text-slate-600" key={item}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-md bg-mist p-4 text-sm text-slate-600">
            暂无数字员工。
          </div>
        )}
      </section>
    </div>
  );
}
