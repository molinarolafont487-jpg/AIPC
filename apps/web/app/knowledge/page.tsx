import { AppShell } from "@/components/app-shell";
import { KnowledgePanel } from "@/components/knowledge-panel";

export default function KnowledgePage() {
  return (
    <AppShell title="企业知识库" subtitle="文档解析、pgvector检索和引用证据的MVP入口">
      <KnowledgePanel />
    </AppShell>
  );
}

