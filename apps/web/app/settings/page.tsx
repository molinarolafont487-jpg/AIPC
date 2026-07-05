import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function SettingsPage() {
  return (
    <AppShell title="系统设置" subtitle="轻量账号、默认工作区、飞书和模型配置">
      <PlaceholderPage
        title="Day 1 基座配置"
        description="默认工作区、Owner角色、权限清单和六个数字员工已通过seed接口初始化。"
        metrics={[
          { label: "工作区", value: "1" },
          { label: "角色", value: "3" },
          { label: "权限", value: "17" },
          { label: "Agent", value: "6" }
        ]}
        items={[
          "认证模式：轻量内置账号体系",
          "默认账号：admin@phantom.local / phantom123",
          "向量方案：PostgreSQL + pgvector",
          "协同平台：飞书"
        ]}
      />
    </AppShell>
  );
}

