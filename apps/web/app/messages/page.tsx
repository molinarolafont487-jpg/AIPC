import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function MessagesPage() {
  return (
    <AppShell title="协同消息" subtitle="飞书通知、真人回复和任务回流记录">
      <PlaceholderPage
        title="飞书协同消息"
        description="MVP采用飞书自建应用机器人。消息会携带任务编号，真人回复后写入任务时间线。"
        metrics={[
          { label: "发送队列", value: "1" },
          { label: "等待回复", value: "1" },
          { label: "已回流", value: "0" },
          { label: "失败重试", value: "0" }
        ]}
        items={[
          "[Phantom任务] 销售助理请求销售小张补充华星科技预算",
          "真人回复回流后，任务状态从等待真人员工补充切回执行中",
          "所有外部消息发送与回流都进入审计日志"
        ]}
      />
    </AppShell>
  );
}

