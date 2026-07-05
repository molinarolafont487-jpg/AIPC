import { AppShell } from "@/components/app-shell";
import { BusinessModulePanel } from "@/components/business-module-panel";

export default function ConnectorsPage() {
  return (
    <AppShell title="连接器中心" subtitle="飞书优先，后续扩展钉钉、企微、文档、CRM和代码仓库">
      <BusinessModulePanel kind="connectors" />
    </AppShell>
  );
}
