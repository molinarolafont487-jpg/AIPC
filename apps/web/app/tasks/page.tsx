import { AppShell } from "@/components/app-shell";
import { TasksPanel } from "@/components/tasks-panel";

export default function TasksPage() {
  return (
    <AppShell title="任务中心" subtitle="查看任务状态、Agent执行时间线和真人协同回流">
      <TasksPanel />
    </AppShell>
  );
}

