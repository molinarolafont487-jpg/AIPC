"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ClipboardList, MessageCircle, RefreshCcw } from "lucide-react";
import {
  getFeishuStatus,
  listFeishuMessages,
  type FeishuMessage,
  type FeishuStatus
} from "@/lib/api-client";

type MessageThread = {
  taskId: string;
  messages: FeishuMessage[];
  latestMessage: FeishuMessage;
  outboundCount: number;
  inboundCount: number;
  waitingCount: number;
  failedCount: number;
};

export function MessagesPanel() {
  const [status, setStatus] = useState<FeishuStatus | null>(null);
  const [messages, setMessages] = useState<FeishuMessage[]>([]);
  const [notice, setNotice] = useState("正在读取飞书协同消息...");

  async function loadMessages() {
    const [statusResult, messagesResult] = await Promise.all([
      getFeishuStatus(),
      listFeishuMessages()
    ]);
    setStatus(statusResult);
    setMessages(messagesResult.items);
    setNotice(`已加载 ${messagesResult.total} 条飞书消息。`);
  }

  useEffect(() => {
    void loadMessages().catch((error) =>
      setNotice(error instanceof Error ? error.message : "飞书消息读取失败。")
    );
  }, []);

  const threads = Object.values(
    messages.reduce<Record<string, FeishuMessage[]>>((groups, message) => {
      groups[message.task_id] = [...(groups[message.task_id] || []), message];
      return groups;
    }, {})
  )
    .map<MessageThread>((items) => {
      const sorted = [...items].sort(
        (left, right) =>
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      );
      return {
        taskId: sorted[0].task_id,
        messages: sorted,
        latestMessage: sorted[0],
        outboundCount: sorted.filter((message) => message.direction === "outbound").length,
        inboundCount: sorted.filter((message) => message.direction === "inbound").length,
        waitingCount: sorted.filter((message) => message.status === "waiting_reply").length,
        failedCount: sorted.filter((message) => message.status.endsWith("failed")).length
      };
    })
    .sort(
      (left, right) =>
        new Date(right.latestMessage.created_at).getTime() -
        new Date(left.latestMessage.created_at).getTime()
    );

  return (
    <div className="space-y-5 p-5">
      <section className="rounded-lg border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">飞书协同消息</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {status?.message || notice}
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-slate-700"
            onClick={() => void loadMessages()}
          >
            <RefreshCcw size={15} />
            刷新
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["发送", status?.counts.sent ?? 0],
          ["回流", status?.counts.received ?? 0],
          ["等待回复", status?.counts.waiting_reply ?? 0],
          ["失败", status?.counts.failed ?? 0]
        ].map(([label, value]) => (
          <div className="rounded-lg border border-line bg-white p-4" key={label}>
            <div className="text-xs text-slate-500">{label}</div>
            <div className="mt-2 text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-accent" />
            <h3 className="text-sm font-semibold">任务会话</h3>
          </div>
          <span className="rounded bg-mist px-2 py-1 text-xs text-slate-500">
            {threads.length} 个任务
          </span>
        </div>

        {threads.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {threads.map((thread) => (
              <article className="rounded-md border border-line p-4" key={thread.taskId}>
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{thread.taskId}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      发送 {thread.outboundCount} / 回流 {thread.inboundCount} / 等待{" "}
                      {thread.waitingCount} / 失败 {thread.failedCount}
                    </div>
                  </div>
                  <Link
                    className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-xs text-white"
                    href={`/tasks?task=${thread.taskId}`}
                  >
                    查看任务
                    <ArrowRight size={13} />
                  </Link>
                </div>
                <p className="line-clamp-3 break-words text-sm leading-6 text-slate-700">
                  {thread.latestMessage.content}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>
                    {thread.latestMessage.sender} {"->"} {thread.latestMessage.receiver}
                  </span>
                  <span>{thread.latestMessage.status}</span>
                  <span>{thread.latestMessage.created_at}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-md bg-mist p-4 text-sm text-slate-600">
            暂无任务会话。跑完整Demo后，这里会按任务聚合飞书发送与回流消息。
          </div>
        )}
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <MessageCircle size={18} className="text-accent" />
          <h3 className="text-sm font-semibold">消息记录</h3>
        </div>

        {messages.length ? (
          <div className="space-y-3">
            {messages.map((message) => (
              <article className="rounded-md border border-line p-4" key={message.id}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{message.direction === "outbound" ? "发送" : "回流"}</span>
                    <span>{message.status}</span>
                    <span>
                      {message.sender} {"->"} {message.receiver}
                    </span>
                    <span>{message.task_id}</span>
                  </div>
                  <Link
                    className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-slate-600 hover:border-accent hover:text-accent"
                    href={`/tasks?task=${message.task_id}`}
                  >
                    查看任务
                    <ArrowRight size={12} />
                  </Link>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                  {message.content}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-md bg-mist p-4 text-sm text-slate-600">
            暂无飞书消息。请到任务中心发送补充请求，并模拟小张回复。
          </div>
        )}
      </section>
    </div>
  );
}
