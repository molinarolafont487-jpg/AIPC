"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  Brain,
  Database,
  FilePlus2,
  MessageSquareText,
  RefreshCcw,
  Send,
  Sparkles
} from "lucide-react";
import {
  convertChatToTask,
  createChatConversation,
  getChatConversation,
  listChatConversations,
  sendChatMessage,
  type ChatConversation,
  type ChatMessage,
  type ChatMode
} from "@/lib/api-client";

const modeOptions: Array<{
  key: ChatMode;
  label: string;
  description: string;
}> = [
  { key: "general", label: "通用对话", description: "普通问答、写作、分析" },
  { key: "knowledge", label: "知识库问答", description: "基于企业资料回答" },
  { key: "agent", label: "数字员工", description: "指定岗位助手对话" },
  { key: "model", label: "高质量模式", description: "云端增强生成" }
];

const agentOptions = ["老板助理", "运营助理", "销售助理", "知识库助理", "内容助理", "代码助理"];
const datasetOptions = ["自动判断", "制造企业", "园区", "幻影自用"];

const defaultPrompt = "帮我分析一下华星科技这个客户有没有成交机会，并看看知识库里有没有类似案例。";

function modeLabel(mode: ChatMode) {
  return modeOptions.find((item) => item.key === mode)?.label || mode;
}

export function ChatCenter() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<ChatMode>("knowledge");
  const [agentName, setAgentName] = useState("销售助理");
  const [dataset, setDataset] = useState("自动判断");
  const [input, setInput] = useState(defaultPrompt);
  const [notice, setNotice] = useState("AI对话中心可以直接问模型，也可以一键转为任务。");
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [lastTaskId, setLastTaskId] = useState<string | null>(null);

  async function loadConversations(preferredId?: string) {
    const result = await listChatConversations();
    setConversations(result.items);
    const target = preferredId
      ? result.items.find((item) => item.id === preferredId)
      : result.items[0];
    if (target) {
      await selectConversation(target.id);
    }
  }

  useEffect(() => {
    void loadConversations().catch((error) =>
      setNotice(error instanceof Error ? error.message : "对话历史读取失败。")
    );
  }, []);

  async function selectConversation(conversationId: string) {
    const result = await getChatConversation(conversationId);
    setSelectedConversation(result.conversation);
    setMessages(result.messages);
    setMode(result.conversation.mode);
    setAgentName(result.conversation.agent_name || "销售助理");
    setDataset(result.conversation.dataset || "自动判断");
    setLastTaskId(result.conversation.last_task_id || null);
  }

  async function handleNewConversation() {
    setLoading(true);
    setNotice("正在创建新对话...");
    try {
      const result = await createChatConversation({
        title: "新对话",
        mode,
        agent_name: mode === "agent" ? agentName : null,
        dataset: dataset === "自动判断" ? null : dataset
      });
      setSelectedConversation(result.conversation);
      setMessages(result.messages);
      setLastTaskId(null);
      await loadConversations(result.conversation.id);
      setNotice("新对话已创建。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "新对话创建失败。");
    } finally {
      setLoading(false);
    }
  }

  async function ensureConversation() {
    if (selectedConversation) return selectedConversation;
    const result = await createChatConversation({
      title: "新对话",
      mode,
      agent_name: mode === "agent" ? agentName : null,
      dataset: dataset === "自动判断" ? null : dataset
    });
    setSelectedConversation(result.conversation);
    setMessages(result.messages);
    setConversations((current) => [result.conversation, ...current]);
    return result.conversation;
  }

  async function handleSend() {
    if (!input.trim()) return;
    setLoading(true);
    setNotice("正在生成AI回复...");
    try {
      const conversation = await ensureConversation();
      const result = await sendChatMessage(conversation.id, {
        content: input,
        mode,
        agent_name: mode === "agent" ? agentName : null,
        model_key: mode === "model" ? "cloud-quality" : null,
        dataset: dataset === "自动判断" ? null : dataset
      });
      setSelectedConversation(result.conversation);
      setMessages(result.messages);
      setInput("");
      await loadConversations(result.conversation.id);
      setNotice(`已使用${modeLabel(mode)}生成回复，可继续追问或转为任务。`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "AI回复生成失败。");
    } finally {
      setLoading(false);
    }
  }

  async function handleConvertToTask(messageId?: string) {
    if (!selectedConversation) return;
    setConverting(true);
    setNotice("正在把对话转为任务卡...");
    try {
      const result = await convertChatToTask(selectedConversation.id, { message_id: messageId });
      setMessages(result.messages);
      setSelectedConversation(result.conversation);
      setLastTaskId(result.task_id);
      await loadConversations(result.conversation.id);
      setNotice(`已生成任务卡：${result.task.title}，可进入任务中心确认执行。`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "对话转任务失败。");
    } finally {
      setConverting(false);
    }
  }

  const latestAssistant = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant"),
    [messages]
  );
  const knowledgeRefs = latestAssistant?.metadata.knowledge_refs || [];

  return (
    <div className="grid min-h-[calc(100vh-64px)] gap-5 p-5 xl:grid-cols-[300px_1fr_340px]">
      <section className="rounded-lg border border-line bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">对话历史</h2>
            <p className="mt-1 text-xs text-slate-500">聊天、问资料、找数字员工</p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-xs text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={() => void handleNewConversation()}
          >
            <FilePlus2 size={14} />
            新建
          </button>
        </div>

        <div className="mb-4 space-y-2">
          {modeOptions.map((item) => (
            <button
              className={`w-full rounded-md border p-3 text-left ${
                mode === item.key
                  ? "border-accent bg-[#e9f6f5]"
                  : "border-line bg-white hover:bg-mist"
              }`}
              key={item.key}
              onClick={() => setMode(item.key)}
            >
              <div className="text-sm font-medium">{item.label}</div>
              <div className="mt-1 text-xs text-slate-500">{item.description}</div>
            </button>
          ))}
        </div>

        <div className="mb-4 grid gap-3">
          <label className="grid gap-1 text-xs text-slate-500">
            知识库
            <select
              className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              value={dataset}
              onChange={(event) => setDataset(event.target.value)}
            >
              {datasetOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-slate-500">
            数字员工
            <select
              className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              value={agentName}
              onChange={(event) => setAgentName(event.target.value)}
            >
              {agentOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-2">
          {conversations.length ? (
            conversations.map((conversation) => (
              <button
                className={`w-full rounded-md border p-3 text-left ${
                  selectedConversation?.id === conversation.id
                    ? "border-accent bg-[#e9f6f5]"
                    : "border-line hover:bg-mist"
                }`}
                key={conversation.id}
                onClick={() => void selectConversation(conversation.id)}
              >
                <div className="line-clamp-1 text-sm font-medium">{conversation.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {modeLabel(conversation.mode)} / {conversation.model_key}
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-md bg-mist p-3 text-sm leading-6 text-slate-600">
              暂无对话。可以直接在中间输入问题开始。
            </div>
          )}
        </div>
      </section>

      <section className="flex min-h-[640px] flex-col rounded-lg border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div>
            <h2 className="text-base font-semibold">
              {selectedConversation?.title || "AI对话中心"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{notice}</p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-slate-700"
            onClick={() => void loadConversations(selectedConversation?.id)}
          >
            <RefreshCcw size={15} />
            刷新
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-auto p-4">
          {messages.length ? (
            messages.map((message) => (
              <article
                className={`rounded-md border p-4 ${
                  message.role === "user"
                    ? "ml-auto max-w-[86%] border-accent bg-[#e9f6f5]"
                    : message.role === "assistant"
                      ? "max-w-[92%] border-line bg-white"
                      : "mx-auto max-w-[86%] border-line bg-mist"
                }`}
                key={message.id}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    {message.role === "assistant" ? <Sparkles size={13} /> : null}
                    {message.role === "user" ? "我" : message.role === "assistant" ? "AI" : "系统"}
                  </span>
                  <span>{message.metadata.model_name || message.metadata.mode || message.created_at}</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                  {message.content}
                </p>
                {message.role === "assistant" && message.metadata.actions?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.metadata.actions.map((action) => (
                      <button
                        className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs text-slate-600 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={converting}
                        key={action.key}
                        onClick={() =>
                          action.key === "convert_task"
                            ? void handleConvertToTask(message.id)
                            : setNotice(`${action.label} 已记录为下一步动作，后续会接入正式执行。`)
                        }
                      >
                        {action.key === "convert_task" ? <FilePlus2 size={13} /> : <ArrowRight size={13} />}
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="grid h-full place-items-center rounded-md bg-mist p-8 text-center">
              <div>
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-white text-accent">
                  <MessageSquareText size={22} />
                </div>
                <div className="text-sm font-semibold">直接问AI，或把结果转成任务</div>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  这里是认知与创作入口；AI指挥台是组织与执行入口。正式交付物建议从这里转入任务中心闭环。
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-line p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 rounded bg-mist px-2 py-1">
              <Brain size={13} />
              {modeLabel(mode)}
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-mist px-2 py-1">
              <Bot size={13} />
              {mode === "agent" ? agentName : "自动"}
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-mist px-2 py-1">
              <Database size={13} />
              {dataset}
            </span>
          </div>
          <div className="flex gap-2">
            <textarea
              className="min-h-20 flex-1 resize-none rounded-md border border-line px-3 py-2 text-sm leading-6 outline-none focus:border-accent"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button
              className="inline-flex w-24 shrink-0 items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading || !input.trim()}
              onClick={() => void handleSend()}
            >
              <Send size={15} />
              发送
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-line bg-white p-4">
        <div>
          <h2 className="text-base font-semibold">动作与上下文</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            对话结果可以继续沉淀为任务、知识、文档和数字员工执行指令。
          </p>
        </div>

        <div className="rounded-md border border-line p-3">
          <div className="mb-2 text-xs font-medium text-slate-500">当前链路</div>
          <div className="space-y-2 text-sm text-slate-700">
            <div>AI对话 → 初步分析</div>
            <div>转为任务 → Command Protocol</div>
            <div>任务中心 → 数字员工执行</div>
            <div>真人协同 → 老板确认归档</div>
          </div>
        </div>

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!selectedConversation || converting}
          onClick={() => void handleConvertToTask(latestAssistant?.id)}
        >
          <FilePlus2 size={15} />
          转为任务
        </button>

        {lastTaskId ? (
          <Link
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-slate-700 hover:border-accent hover:text-accent"
            href={`/tasks?task=${lastTaskId}`}
          >
            查看生成的任务
            <ArrowRight size={15} />
          </Link>
        ) : null}

        <div className="rounded-md bg-mist p-3">
          <div className="mb-2 text-xs font-medium text-slate-500">可调用资料</div>
          {knowledgeRefs.length ? (
            <div className="space-y-2">
              {knowledgeRefs.map((ref) => (
                <article className="rounded-md bg-white p-2" key={ref.chunk_id}>
                  <div className="text-xs font-medium text-slate-700">{ref.document_name}</div>
                  <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-500">
                    {ref.excerpt}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-500">
              选择知识库问答或输入客户/资料相关问题后，这里会显示引用证据。
            </p>
          )}
        </div>

        <div className="rounded-md bg-[#e9f6f5] p-3 text-xs leading-5 text-slate-700">
          AI对话中心不替代AI指挥台：这里负责问答、分析和创作；需要正式执行时转入任务中心。
        </div>
      </section>
    </div>
  );
}
