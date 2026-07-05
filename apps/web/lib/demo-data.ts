import {
  Bell,
  Bot,
  BriefcaseBusiness,
  ClipboardList,
  Code2,
  Database,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  ShieldCheck,
  Users
} from "lucide-react";

export const navItems = [
  { label: "AI指挥台", icon: LayoutDashboard, active: true },
  { label: "任务中心", icon: ClipboardList },
  { label: "六个数字员工", icon: Bot },
  { label: "真人员工", icon: Users },
  { label: "协同消息", icon: MessageSquareText },
  { label: "企业知识库", icon: Database },
  { label: "客户中心", icon: BriefcaseBusiness },
  { label: "项目中心", icon: FileText },
  { label: "企业规则", icon: ShieldCheck },
  { label: "系统设置", icon: Settings }
];

export const agents = [
  {
    name: "老板助理",
    status: "真执行",
    tone: "accent",
    task: "汇总结果、风险提醒、老板确认版",
    progress: "等待汇总"
  },
  {
    name: "销售助理",
    status: "真执行",
    tone: "amber",
    task: "客户分析、话术、邮件草稿",
    progress: "主责执行"
  },
  {
    name: "知识库助理",
    status: "真执行",
    tone: "plum",
    task: "资料检索、文档总结、证据引用",
    progress: "检索资料"
  },
  {
    name: "运营助理",
    status: "半自动",
    tone: "slate",
    task: "任务拆解、进度跟踪",
    progress: "模板输出"
  },
  {
    name: "内容助理",
    status: "半自动",
    tone: "slate",
    task: "PPT大纲、文案、脚本",
    progress: "模板输出"
  },
  {
    name: "代码助理",
    status: "半自动",
    tone: "slate",
    task: "小工具需求、页面结构",
    progress: "模板输出"
  }
];

export const taskFields = [
  ["任务名称", "华星科技合作方案准备"],
  ["任务类型", "客户跟进"],
  ["主责数字员工", "销售助理"],
  ["协作数字员工", "知识库助理、内容助理、老板助理"],
  ["协作真人员工", "销售小张"],
  ["需要调用资料", "客户资料、产品资料、历史方案"],
  ["预计输出", "客户分析、沟通话术、PPT大纲、邮件草稿"],
  ["通知渠道", "飞书"],
  ["老板确认", "需要"]
];

export const timeline = [
  { label: "待确认", detail: "Command Protocol 已生成", done: true },
  { label: "执行中", detail: "销售助理准备客户方案", done: true },
  { label: "等待真人补充", detail: "飞书通知销售小张补充预算", done: true },
  { label: "等待老板确认", detail: "老板助理汇总一页确认版", done: false },
  { label: "已归档", detail: "结果进入任务中心与知识库", done: false }
];

export const stats = [
  { label: "今日任务", value: "12", icon: ClipboardList },
  { label: "AI请求补充", value: "3", icon: Bell },
  { label: "待老板确认", value: "5", icon: ShieldCheck },
  { label: "知识库文档", value: "30", icon: Database }
];

