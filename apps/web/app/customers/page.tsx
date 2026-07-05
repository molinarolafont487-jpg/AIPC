import { AppShell } from "@/components/app-shell";
import { BusinessModulePanel } from "@/components/business-module-panel";

export default function CustomersPage() {
  return (
    <AppShell title="客户中心" subtitle="黄金Demo客户资料与销售跟进上下文">
      <BusinessModulePanel kind="customers" />
    </AppShell>
  );
}
