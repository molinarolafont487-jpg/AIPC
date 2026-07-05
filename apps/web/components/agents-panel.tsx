"use client";

import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { listAgents, type Agent } from "@/lib/api-client";

export function AgentsPanel() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [message, setMessage] = useState("正在读取六个数字员工...");

  useEffect(() => {
    void listAgents()
      .then((result) => {
        setAgents(result.items);
        setMessage(`已加载 ${result.total} 个数字员工。`);
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : "读取失败。")
      );
  }, []);

  return (
    <div className="p-5">
      <section className="rounded-lg border border-line bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">六个数字员工矩阵</h2>
            <p className="text-sm text-slate-500">{message}</p>
          </div>
          <Bot size={20} className="text-accent" />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <article className="rounded-md border border-line p-4" key={agent.id}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">{agent.name}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {agent.description}
                  </p>
                </div>
                <span
                  className={`rounded px-2 py-1 text-[11px] ${
                    agent.execution_mode === "real"
                      ? "bg-[#e9f6f5] text-accent"
                      : "bg-mist text-slate-500"
                  }`}
                >
                  {agent.execution_mode === "real" ? "真执行" : "半自动"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {agent.tools.map((tool) => (
                  <span className="rounded bg-mist px-2 py-1 text-[11px] text-slate-600" key={tool}>
                    {tool}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

