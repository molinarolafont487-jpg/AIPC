"use client";

import { useEffect, useState } from "react";
import { Activity, Cpu, RefreshCcw, Server, WalletCards } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  getModelRouterStatus,
  type ModelRouterStatus
} from "@/lib/api-client";

export function ModelRouterPanel() {
  const [status, setStatus] = useState<ModelRouterStatus | null>(null);
  const [message, setMessage] = useState("正在读取模型调度数据...");

  async function loadStatus() {
    const result = await getModelRouterStatus();
    setStatus(result);
    setMessage(`已加载 ${result.summary.total_calls} 次模型调用记录。`);
  }

  useEffect(() => {
    void loadStatus().catch((error) =>
      setMessage(error instanceof Error ? error.message : "模型调度数据读取失败。")
    );
  }, []);

  const metrics: Array<[string, string | number, LucideIcon]> = [
    ["调用次数", status?.summary.total_calls ?? 0, Activity],
    ["Token消耗", status?.summary.total_tokens ?? 0, Server],
    ["预估成本", `¥${status?.summary.estimated_cost ?? 0}`, WalletCards],
    ["本地比例", `${status?.summary.local_ratio ?? 0}%`, Cpu],
    ["云端比例", `${status?.summary.cloud_ratio ?? 0}%`, Server]
  ];

  return (
    <div className="space-y-5 p-5">
      <section className="rounded-lg border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">模型调度后台</h2>
            <p className="mt-2 text-sm text-slate-500">{message}</p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-slate-700"
            onClick={() => void loadStatus()}
          >
            <RefreshCcw size={15} />
            刷新
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([label, value, Icon]) => (
          <div className="rounded-lg border border-line bg-white p-4" key={String(label)}>
            <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
              <span>{label}</span>
              <Icon size={16} />
            </div>
            <div className="text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="rounded-lg border border-line bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">模型池</h3>
            <span className="rounded bg-mist px-2 py-1 text-xs text-slate-500">
              本地优先 / 云端增强
            </span>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {(status?.models || []).map((model) => (
              <article className="rounded-md border border-line p-4" key={model.model_key}>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{model.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{model.model_key}</div>
                  </div>
                  <span
                    className={`rounded px-2 py-1 text-xs ${
                      model.provider === "local"
                        ? "bg-[#e9f6f5] text-accent"
                        : "bg-mist text-slate-600"
                    }`}
                  >
                    {model.provider === "local" ? "本地" : "云端"}
                  </span>
                </div>
                <div className="grid gap-2 text-xs text-slate-600">
                  <div>状态：{model.status}</div>
                  <div>质量：{model.quality}</div>
                  <div>调用：{model.calls}</div>
                  <div>Token：{model.tokens}</div>
                  <div>预估成本：¥{model.estimated_cost}</div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">最近调用</h3>
            <span className="rounded bg-mist px-2 py-1 text-xs text-slate-500">
              {status?.recent_usage.length ?? 0} 条
            </span>
          </div>
          {status?.recent_usage.length ? (
            <div className="space-y-3">
              {status.recent_usage.map((item) => (
                <article className="rounded-md bg-mist p-3" key={item.id}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium">{item.model_name}</div>
                    <span className="rounded bg-white px-2 py-1 text-xs text-slate-500">
                      {item.mode}
                    </span>
                  </div>
                  <div className="text-xs leading-5 text-slate-600">
                    <div>
                      输入 {item.input_tokens} / 输出 {item.output_tokens} / ¥
                      {item.estimated_cost}
                    </div>
                    <div>{item.created_at}</div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-md bg-mist p-4 text-sm leading-6 text-slate-600">
              暂无模型调用记录。进入 AI对话中心发送消息后，这里会显示调度记录。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
