import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";

export default function HumansPage() {
  return (
    <AppShell title="真人员工" subtitle="维护真人员工与飞书用户的映射关系">
      <PlaceholderPage
        title="真人员工协同池"
        description="7天MVP先使用默认成员销售小张，验证AI员工可以通过飞书请求真人补充资料。后续再扩展组织架构同步。"
        metrics={[
          { label: "默认成员", value: "1" },
          { label: "飞书映射", value: "1" },
          { label: "待处理请求", value: "3" },
          { label: "回流消息", value: "0" }
        ]}
        items={[
          "销售小张：补充华星科技预算、采购周期和关键联系人",
          "老板：确认任务结果是否可归档",
          "系统管理员：配置飞书App和成员映射"
        ]}
      />
    </AppShell>
  );
}

