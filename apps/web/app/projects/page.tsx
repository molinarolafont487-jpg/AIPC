import { AppShell } from "@/components/app-shell";
import { BusinessModulePanel } from "@/components/business-module-panel";

export default function ProjectsPage() {
  return (
    <AppShell title="项目中心" subtitle="试点项目、任务归档和交付状态">
      <BusinessModulePanel kind="projects" />
    </AppShell>
  );
}
