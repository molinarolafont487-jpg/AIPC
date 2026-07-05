import { AppShell } from "@/components/app-shell";
import { MessagesPanel } from "@/components/messages-panel";

export default function MessagesPage() {
  return (
    <AppShell title="协同消息" subtitle="飞书通知、真人回复和任务回流记录">
      <MessagesPanel />
    </AppShell>
  );
}
