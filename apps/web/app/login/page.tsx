"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { login } from "@/lib/api-client";

const demoEmail = "admin@phantom.local";
const demoPassword = "phantom123";

export default function LoginPage() {
  const [email, setEmail] = useState(demoEmail);
  const [password, setPassword] = useState(demoPassword);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("默认工作区账号已预填。");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("正在连接轻量账号体系...");

    try {
      const result = await login(email, password);
      window.localStorage.setItem("phantom.access_token", result.access_token);
      window.localStorage.setItem("phantom.user", JSON.stringify(result.user));
      window.localStorage.setItem(
        "phantom.workspace",
        JSON.stringify(result.workspace)
      );
      setStatus("done");
      setMessage(`已登录 ${result.workspace.name}，角色 ${result.user.role.name}。`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "登录失败。");
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fa] text-ink">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-[1fr_420px] lg:items-center">
        <section className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-ink text-white">
              <Sparkles size={21} />
            </div>
            <div>
              <div className="text-base font-semibold">Phantom AI Workstation</div>
              <div className="text-sm text-slate-500">7天MVP轻量账号入口</div>
            </div>
          </div>

          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold leading-tight">
              登录默认工作区，进入企业数字员工指挥台。
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Day 1 先用轻量内置账号验证工作区、角色、权限和六个数字员工
              seed。后续企业交付版再升级 Keycloak / SSO。
            </p>
          </div>

          <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ["工作区", "Phantom Demo"],
              ["角色", "Owner"],
              ["协同平台", "飞书"]
            ].map(([label, value]) => (
              <div className="rounded-lg border border-line bg-white p-4" key={label}>
                <div className="text-xs text-slate-500">{label}</div>
                <div className="mt-2 text-sm font-semibold">{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-6 shadow-panel">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">演示账号登录</h2>
              <p className="mt-1 text-sm text-slate-500">
                使用默认 seed 用户进入工作台。
              </p>
            </div>
            <div className="rounded-md bg-[#e9f6f5] p-2 text-accent">
              <ShieldCheck size={19} />
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-medium">邮箱</span>
              <input
                className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">密码</span>
              <input
                className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={status === "loading"}
              type="submit"
            >
              <KeyRound size={16} />
              {status === "loading" ? "登录中" : "登录默认工作区"}
            </button>
          </form>

          <div
            className={`mt-4 rounded-md px-3 py-2 text-sm ${
              status === "error"
                ? "bg-red-50 text-red-700"
                : status === "done"
                  ? "bg-[#e9f6f5] text-accent"
                  : "bg-mist text-slate-600"
            }`}
          >
            {message}
          </div>

          <Link
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent"
            href="/"
          >
            进入AI指挥台
            <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    </main>
  );
}

