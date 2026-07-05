import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function RulesPage() {
  return (
    <AppShell title="企业规则" subtitle="任务审批、权限边界和模型调用策略">
      <PlaceholderPage
        title="MVP企业规则"
        description="先把关键安全边界显示出来：任务结果必须老板确认，敏感资料本地优先，外部消息必须审计。"
        metrics={[
          { label: "审批规则", value: "3" },
          { label: "模型策略", value: "2" },
          { label: "外发限制", value: "1" },
          { label: "审计类型", value: "8" }
        ]}
        items={[
          "客户材料外发前必须经过老板确认",
          "涉及敏感资料的任务优先使用本地模型",
          "飞书消息发送、回复回流、Agent执行全部写入日志"
        ]}
      />
    </AppShell>
  );
}

