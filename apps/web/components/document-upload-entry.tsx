"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, CheckCircle2, FileUp, UploadCloud } from "lucide-react";
import {
  uploadDocumentFile,
  type DocumentItem
} from "@/lib/api-client";

const DATASET_OPTIONS = ["制造企业", "园区", "幻影自用", "对话沉淀", "任务归档", "custom"];
const ACCEPTED_TYPES = ".txt,.md,.csv,.json,.html,.docx,.pptx,.xlsx,.pdf";

type DocumentUploadEntryProps = {
  defaultDataset?: string;
  sourceEntry: "command_center" | "chat_center";
  compact?: boolean;
  onUploaded?: (document: DocumentItem) => void;
};

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentUploadEntry({
  defaultDataset = "制造企业",
  sourceEntry,
  compact = false,
  onUploaded
}: DocumentUploadEntryProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dataset, setDataset] = useState(defaultDataset);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedDocument, setUploadedDocument] = useState<DocumentItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("选择文件后入库。");

  async function handleUpload() {
    if (!selectedFile) {
      setMessage("请先选择一个文档。");
      return;
    }
    setUploading(true);
    setMessage("正在上传并解析全文...");
    try {
      const contentBase64 = arrayBufferToBase64(await selectedFile.arrayBuffer());
      const result = await uploadDocumentFile({
        filename: selectedFile.name,
        dataset,
        content_base64: contentBase64,
        metadata: {
          source_entry: sourceEntry,
          uploaded_size: selectedFile.size,
          mime_type: selectedFile.type || "unknown"
        },
        auto_ingest: true
      });
      setUploadedDocument(result.document);
      setMessage(
        `已入库 ${result.document.chunk_count} 个片段，抽取 ${result.extracted_chars} 字。`
      );
      onUploaded?.(result.document);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "完整文档上传失败。");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className={`rounded-lg border border-line bg-white ${compact ? "p-4" : "p-5"}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileUp size={18} className="text-accent" />
          <div>
            <h2 className="text-base font-semibold">上传完整文档</h2>
            <p className="mt-1 text-xs text-slate-500">{message}</p>
          </div>
        </div>
        {uploadedDocument ? (
          <CheckCircle2 size={18} className="text-accent" />
        ) : null}
      </div>

      <input
        accept={ACCEPTED_TYPES}
        className="hidden"
        ref={inputRef}
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          setSelectedFile(file);
          setUploadedDocument(null);
          setMessage(file ? `${file.name} / ${formatFileSize(file.size)}` : "选择文件后入库。");
        }}
      />

      <div className="grid gap-3">
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-slate-700 hover:border-accent hover:text-accent"
          onClick={() => inputRef.current?.click()}
        >
          <FileUp size={15} />
          {selectedFile ? selectedFile.name : "选择文档"}
        </button>

        <select
          className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
          value={dataset}
          onChange={(event) => setDataset(event.target.value)}
        >
          {DATASET_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={uploading || !selectedFile}
          onClick={() => void handleUpload()}
        >
          <UploadCloud size={15} />
          {uploading ? "上传中" : "入库并解析"}
        </button>

        {uploadedDocument ? (
          <Link
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-slate-700 hover:border-accent hover:text-accent"
            href={`/knowledge?doc=${uploadedDocument.id}`}
          >
            查看知识库文档
            <ArrowRight size={15} />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
