"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Brain,
  BriefcaseBusiness,
  ClipboardList,
  Cpu,
  Database,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  Plug,
  Settings,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { WorkspaceStatus } from "@/components/workspace-status";

const navItems = [
  { label: "AI指挥台", href: "/", icon: LayoutDashboard },
  { label: "AI对话中心", href: "/chat", icon: Brain },
  { label: "任务中心", href: "/tasks", icon: ClipboardList },
  { label: "六个数字员工", href: "/agents", icon: Bot },
  { label: "真人员工", href: "/humans", icon: Users },
  { label: "协同消息", href: "/messages", icon: MessageSquareText },
  { label: "企业知识库", href: "/knowledge", icon: Database },
  { label: "客户中心", href: "/customers", icon: BriefcaseBusiness },
  { label: "项目中心", href: "/projects", icon: FileText },
  { label: "企业规则", href: "/rules", icon: ShieldCheck },
  { label: "连接器中心", href: "/connectors", icon: Plug },
  { label: "模型调度", href: "/model-router", icon: Cpu },
  { label: "系统设置", href: "/settings", icon: Settings }
];

type AppShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-[#f6f8fa] text-ink">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[252px_1fr]">
        <aside className="border-b border-line bg-white px-4 py-5 lg:border-b-0 lg:border-r">
          <div className="mb-7 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-white">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="text-sm font-semibold">Phantom</div>
              <div className="text-xs text-slate-500">AI Workstation</div>
            </div>
          </div>

          <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:block lg:space-y-1">
            {navItems.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
                    active
                      ? "bg-ink text-white"
                      : "text-slate-600 hover:bg-mist hover:text-ink"
                  }`}
                  href={item.href}
                  key={item.label}
                >
                  <item.icon size={17} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-6 py-3">
            <div>
              <h1 className="text-lg font-semibold">{title}</h1>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
              <WorkspaceStatus />
              <div className="flex items-center gap-3">
                <span className="rounded-md border border-line px-3 py-1 text-slate-600">
                  飞书已选
                </span>
                <span className="rounded-md bg-[#e9f6f5] px-3 py-1 text-accent">
                  3个真执行Agent
                </span>
              </div>
            </div>
          </header>

          {children}
        </section>
      </div>
    </main>
  );
}
