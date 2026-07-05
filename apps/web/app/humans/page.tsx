import { AppShell } from "@/components/app-shell";
import { BusinessModulePanel } from "@/components/business-module-panel";

export default function HumansPage() {
  return (
    <AppShell title="真人员工" subtitle="维护真人员工与飞书用户的映射关系">
      <BusinessModulePanel kind="humans" />
    </AppShell>
  );
}
