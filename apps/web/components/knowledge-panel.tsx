"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  ClipboardCheck,
  Database,
  FilePlus2,
  RefreshCcw,
  Search
} from "lucide-react";
import {
  createDocument,
  createTaskFromKnowledgeSearch,
  listDocumentChunks,
  listDocuments,
  seedDemoDocuments,
  searchKnowledge,
  type DocumentChunk,
  type DocumentItem
} from "@/lib/api-client";

type SearchChunk = Awaited<ReturnType<typeof searchKnowledge>>["chunks"][number];
const DATASET_OPTIONS = ["全部数据集", "制造企业", "园区", "幻影自用", "对话沉淀", "任务归档", "custom"];

export function KnowledgePanel() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [documentChunks, setDocumentChunks] = useState<DocumentChunk[]>([]);
  const [query, setQuery] = useState("华星科技预算和AI工作站试点关注点");
  const [searchDataset, setSearchDataset] = useState("全部数据集");
  const [filename, setFilename] = useState("客户补充资料.md");
  const [dataset, setDataset] = useState("制造企业");
  const [content, setContent] = useState(
    "客户补充：华星科技预算约8万元，采购周期预计30天，IT负责人关注本地部署和数据不出域。"
  );
  const [taskCommand, setTaskCommand] = useState(
    "基于华星科技客户资料和报价表，准备明天下午客户合作方案，让销售小张补充预算，销售助理生成话术，内容助理生成PPT大纲。"
  );
  const [chunks, setChunks] = useState<SearchChunk[]>([]);
  const [autoStartTask, setAutoStartTask] = useState(true);
  const [creatingTask, setCreatingTask] = useState(false);
  const [message, setMessage] = useState("知识库助理用于检索资料并生成引用。");

  async function loadDocuments(preferredDocumentId?: string | null) {
    const result = await listDocuments();
    setDocuments(result.items);
    const target = preferredDocumentId
      ? result.items.find((document) => document.id === preferredDocumentId)
      : result.items[0];
    if (target) {
      await selectDocument(target);
      if (preferredDocumentId) {
        setMessage(`已定位知识库文档：${target.name}`);
      }
    } else {
      setSelectedDocument(null);
      setDocumentChunks([]);
      if (preferredDocumentId) {
        setMessage("没有找到指定的知识库文档，已显示最新文档列表。");
      }
    }
  }

  useEffect(() => {
    const linkedDocumentId = new URLSearchParams(window.location.search).get("doc");
    void loadDocuments(linkedDocumentId).catch(() => setMessage("文档列表读取失败。"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectDocument(document: DocumentItem) {
    setSelectedDocument(document);
    const result = await listDocumentChunks(document.id);
    setDocumentChunks(result.items);
  }

  async function handleSeedDemo() {
    setMessage("正在重置并初始化三套Demo数据...");
    try {
      const result = await seedDemoDocuments(true);
      await loadDocuments();
      setMessage(
        `已初始化 ${result.document_count} 份Demo文档，生成 ${result.chunk_count} 个chunks。`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Demo数据初始化失败。");
    }
  }

  async function handleCreateDocument() {
    setMessage("正在写入文档并自动解析...");
    try {
      const result = await createDocument({
        filename,
        file_type: filename.split(".").pop() || "md",
        dataset,
        content,
        auto_ingest: true
      });
      await loadDocuments();
      await selectDocument(result.document);
      setMessage(`文档已入库：${result.document.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "文档入库失败。");
    }
  }

  async function handleSearch() {
    setMessage("正在检索知识库...");
    try {
      const filters =
        searchDataset === "全部数据集" ? undefined : { dataset: searchDataset };
      const result = await searchKnowledge(query, 5, filters);
      setChunks(result.chunks);
      setMessage(`找到 ${result.chunks.length} 条可引用片段。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "检索失败。");
    }
  }

  async function handleCreateTaskFromKnowledge() {
    setCreatingTask(true);
    setMessage("正在生成带知识库引用的任务卡...");
    try {
      const result = await createTaskFromKnowledgeSearch({
        command: taskCommand,
        knowledge_query: query,
        dataset: searchDataset === "全部数据集" ? undefined : searchDataset,
        top_k: 5,
        auto_confirm: autoStartTask,
        auto_start: autoStartTask
      });
      setMessage(`任务卡已生成：${result.task.title}`);
      window.location.assign(`/tasks?task=${result.task_id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "知识库引用任务创建失败。");
    } finally {
      setCreatingTask(false);
    }
  }

  return (
    <div className="grid gap-5 p-5 xl:grid-cols-[430px_1fr]">
      <div className="space-y-5">
        <section className="rounded-lg border border-line bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-accent" />
              <div>
                <h2 className="text-base font-semibold">文档列表</h2>
                <p className="text-sm text-slate-500">
                  文本资料会自动切分为chunks并进入MVP检索。
                </p>
              </div>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-slate-700"
              onClick={handleSeedDemo}
            >
              <RefreshCcw size={15} />
              重置Demo
            </button>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2 text-center text-xs text-slate-500 md:grid-cols-4">
            <div className="rounded-md bg-mist px-2 py-2">
              <div className="text-sm font-semibold text-ink">{documents.length}</div>
              <div>文档</div>
            </div>
            <div className="rounded-md bg-mist px-2 py-2">
              <div className="text-sm font-semibold text-ink">
                {documents.reduce((total, document) => total + document.chunk_count, 0)}
              </div>
              <div>chunks</div>
            </div>
            <div className="rounded-md bg-mist px-2 py-2">
              <div className="text-sm font-semibold text-ink">
                {new Set(documents.map((document) => document.dataset)).size}
              </div>
              <div>资料包</div>
            </div>
            <div className="rounded-md bg-mist px-2 py-2">
              <div className="text-sm font-semibold text-ink">
                {documents.filter((document) => document.dataset === "对话沉淀").length}
              </div>
              <div>对话沉淀</div>
            </div>
          </div>

          <div className="space-y-3">
            {documents.map((document) => (
              <button
                className={`w-full rounded-md border p-4 text-left ${
                  selectedDocument?.id === document.id
                    ? "border-accent bg-[#e9f6f5]"
                    : "border-line bg-white hover:bg-mist"
                }`}
                key={document.id}
                onClick={() => void selectDocument(document)}
              >
                <div className="break-words text-sm font-semibold">{document.name}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>{document.dataset || "custom"}</span>
                  <span>{document.file_type}</span>
                  <span>{document.parse_status}</span>
                  <span>{document.chunk_count} chunks</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <FilePlus2 size={18} className="text-accent" />
            <h2 className="text-base font-semibold">新增文本资料</h2>
          </div>
          <div className="space-y-3">
            <input
              className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent"
              value={filename}
              onChange={(event) => setFilename(event.target.value)}
            />
            <select
              className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent"
              value={dataset}
              onChange={(event) => setDataset(event.target.value)}
            >
              {DATASET_OPTIONS.filter((option) => option !== "全部数据集").map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <textarea
              className="min-h-28 w-full resize-none rounded-md border border-line px-3 py-2 text-sm leading-6 outline-none focus:border-accent"
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
            <button
              className="w-full rounded-md bg-ink px-4 py-2 text-sm text-white"
              onClick={handleCreateDocument}
            >
              入库并解析
            </button>
          </div>
        </section>
      </div>

      <div className="space-y-5">
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-4 text-base font-semibold">文档分片</h2>
          {selectedDocument ? (
            <div className="space-y-3">
              <div className="rounded-md bg-mist p-3 text-sm text-slate-700">
                当前文档：{selectedDocument.name}
              </div>
              {documentChunks.map((chunk) => (
                <article className="rounded-md border border-line p-4" key={chunk.id}>
                  <div className="mb-2 text-xs text-slate-500">
                    chunk {chunk.chunk_index} / tokens {chunk.token_count}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                    {chunk.content}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-md bg-mist p-4 text-sm text-slate-600">
              选择左侧文档查看 chunks。
            </div>
          )}
        </section>

        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-4 text-base font-semibold">知识库检索</h2>
          <div className="flex flex-col gap-3 md:flex-row">
            <select
              className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent md:w-36"
              value={searchDataset}
              onChange={(event) => setSearchDataset(event.target.value)}
            >
              {DATASET_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              className="min-w-0 flex-1 rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm text-white"
              onClick={handleSearch}
            >
              <Search size={15} />
              检索
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-500">{message}</p>

          <div className="mt-4 rounded-md border border-line p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck size={17} className="text-accent" />
                <h3 className="text-sm font-semibold">引用任务卡</h3>
              </div>
              <span className="rounded bg-mist px-2 py-1 text-xs text-slate-500">
                {chunks.length} 条当前引用
              </span>
            </div>
            <textarea
              className="min-h-24 w-full resize-none rounded-md border border-line px-3 py-2 text-sm leading-6 outline-none focus:border-accent"
              value={taskCommand}
              onChange={(event) => setTaskCommand(event.target.value)}
            />
            <label className="mt-3 flex items-start gap-2 rounded-md bg-mist p-3 text-xs leading-5 text-slate-600">
              <input
                checked={autoStartTask}
                className="mt-1"
                type="checkbox"
                onChange={(event) => setAutoStartTask(event.target.checked)}
              />
              <span>
                生成后自动确认并启动数字员工，任务中心会直接进入等待真人或老板确认状态。
              </span>
            </label>
            <button
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={creatingTask || !taskCommand.trim()}
              onClick={() => void handleCreateTaskFromKnowledge()}
            >
              <ArrowRight size={15} />
              {creatingTask
                ? "生成中"
                : autoStartTask
                  ? "生成并启动引用任务"
                  : "生成引用任务卡"}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {chunks.map((chunk) => (
              <article className="rounded-md border border-line p-4" key={chunk.chunk_id}>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{chunk.document_name}</span>
                  <span>p.{chunk.page_start}-{chunk.page_end}</span>
                  <span>score {chunk.score}</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                  {chunk.excerpt}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
