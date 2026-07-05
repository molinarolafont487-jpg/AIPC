import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function CustomersPage() {
  return (
    <AppShell title="客户中心" subtitle="黄金Demo客户资料与销售跟进上下文">
      <PlaceholderPage
        title="客户资料卡"
        description="7天MVP保留轻量客户中心，用于支撑华星科技合作方案Demo，不做完整CRM。"
        metrics={[
          { label: "Demo客户", value: "3" },
          { label: "待跟进", value: "2" },
          { label: "方案任务", value: "1" },
          { label: "资料缺口", value: "1" }
        ]}
        items={[
          "华星科技：AI工作站试点客户，等待预算补充",
          "园区企业服务中心：用于园区AI赋能Demo",
          "幻影自用客户：用于产品介绍和销售话术Demo"
        ]}
      />
    </AppShell>
  );
}

