"use client";

import { useEffect, useState } from "react";
import { Database, Search } from "lucide-react";
import {
  listDocuments,
  searchKnowledge,
  type DocumentItem
} from "@/lib/api-client";

type SearchChunk = Awaited<ReturnType<typeof searchKnowledge>>["chunks"][number];

export function KnowledgePanel() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [query, setQuery] = useState("华星科技预算和AI工作站试点关注点");
  const [chunks, setChunks] = useState<SearchChunk[]>([]);
  const [message, setMessage] = useState("知识库助理用于检索资料并生成引用。");

  useEffect(() => {
    void listDocuments()
      .then((result) => setDocuments(result.items))
      .catch(() => setMessage("文档列表读取失败。"));
  }, []);

  async function handleSearch() {
    setMessage("正在检索知识库...");
    try {
      const result = await searchKnowledge(query);
      setChunks(result.chunks);
      setMessage(`找到 ${result.chunks.length} 条可引用片段。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "检索失败。");
    }
  }

  return (
    <div className="grid gap-5 p-5 xl:grid-cols-[420px_1fr]">
      <section className="rounded-lg border border-line bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Database size={18} className="text-accent" />
          <div>
            <h2 className="text-base font-semibold">文档列表</h2>
            <p className="text-sm text-slate-500">MVP Demo 文档先以内存数据展示。</p>
          </div>
        </div>

        <div className="space-y-3">
          {documents.map((document) => (
            <div className="rounded-md border border-line p-4" key={document.id}>
              <div className="text-sm font-semibold">{document.name}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>{document.file_type}</span>
                <span>{document.parse_status}</span>
                <span>{document.chunk_count} chunks</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-4 text-base font-semibold">知识库检索</h2>
        <div className="flex flex-col gap-3 md:flex-row">
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

        <div className="mt-5 space-y-3">
          {chunks.map((chunk) => (
            <article className="rounded-md border border-line p-4" key={chunk.chunk_id}>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{chunk.document_name}</span>
                <span>p.{chunk.page_start}-{chunk.page_end}</span>
                <span>score {chunk.score}</span>
              </div>
              <p className="text-sm leading-6 text-slate-700">{chunk.excerpt}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

