import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function ConnectorsPage() {
  return (
    <AppShell title="连接器中心" subtitle="飞书优先，后续扩展钉钉、企微、文档、CRM和代码仓库">
      <PlaceholderPage
        title="连接器基础版"
        description="V1.0阶段先把飞书通知与回流作为默认连接器，后续再扩展组织架构同步、会议同步和业务系统集成。"
        metrics={[
          { label: "已接入", value: "1" },
          { label: "模拟模式", value: "1" },
          { label: "待接入", value: "6" },
          { label: "回流链路", value: "已通" }
        ]}
        items={[
          "飞书消息：已支持AI请求真人员工和模拟回复回流",
          "钉钉消息：待接入机器人通知",
          "企业微信：待接入应用消息",
          "文档同步：待接入企业知识库",
          "CRM / 邮箱 / 代码仓库：阶段三以后扩展"
        ]}
      />
    </AppShell>
  );
}
