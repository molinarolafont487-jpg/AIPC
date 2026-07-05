import { AppShell } from "@/components/app-shell";
import { AgentsPanel } from "@/components/agents-panel";

export default function AgentsPage() {
  return (
    <AppShell title="六个数字员工" subtitle="3个真执行Agent，3个半自动Agent">
      <AgentsPanel />
    </AppShell>
  );
}

