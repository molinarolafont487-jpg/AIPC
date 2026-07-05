import { AppShell } from "@/components/app-shell";
import { BusinessModulePanel } from "@/components/business-module-panel";

export default function RulesPage() {
  return (
    <AppShell title="企业规则" subtitle="任务审批、权限边界和模型调用策略">
      <BusinessModulePanel kind="rules" />
    </AppShell>
  );
}
