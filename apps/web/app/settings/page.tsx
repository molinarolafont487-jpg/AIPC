import { AppShell } from "@/components/app-shell";
import { BusinessModulePanel } from "@/components/business-module-panel";

export default function SettingsPage() {
  return (
    <AppShell title="系统设置" subtitle="轻量账号、默认工作区、飞书和模型配置">
      <BusinessModulePanel kind="settings" />
    </AppShell>
  );
}
