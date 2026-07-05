import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function ProjectsPage() {
  return (
    <AppShell title="项目中心" subtitle="试点项目、任务归档和交付状态">
      <PlaceholderPage
        title="项目试点看板"
        description="项目中心用于承接任务归档和试点交付，不在7天MVP中做复杂项目管理。"
        metrics={[
          { label: "试点项目", value: "1" },
          { label: "执行任务", value: "1" },
          { label: "待确认", value: "1" },
          { label: "已归档", value: "0" }
        ]}
        items={[
          "华星科技AI工作站合作方案",
          "制造企业Demo数据准备",
          "飞书协同消息回流验证"
        ]}
      />
    </AppShell>
  );
}

