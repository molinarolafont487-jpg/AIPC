import { AppShell } from "@/components/app-shell";
import { ChatCenter } from "@/components/chat-center";

export default function ChatPage() {
  return (
    <AppShell
      title="AI对话中心"
      subtitle="直接与大模型、企业知识库和指定数字员工对话，并一键转为任务"
    >
      <ChatCenter />
    </AppShell>
  );
}
