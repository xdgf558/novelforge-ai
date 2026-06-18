import Link from "next/link";
import {
  Bell,
  BookOpenText,
  CheckCircle2,
  ClipboardList,
  Database,
  LayoutDashboard,
  NotebookTabs,
  Plus,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { NovelForgeMark, SidebarNocturneArt } from "@/components/story-illustrations";

type AppShellProps = {
  children: React.ReactNode;
};

const navItems = [
  {
    href: "/",
    label: "项目",
    icon: LayoutDashboard,
    active: true,
  },
  {
    href: "/projects/new",
    label: "新建",
    icon: Plus,
  },
];

const toolItems = [
  {
    label: "设定库",
    icon: BookOpenText,
  },
  {
    label: "角色",
    icon: Users,
  },
  {
    label: "章节",
    icon: NotebookTabs,
  },
  {
    label: "任务记录",
    icon: ClipboardList,
  },
];

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="nocturne-shell min-h-screen overflow-hidden lg:flex">
      <aside className="nf-sidebar border-b border-amber-200/10 lg:fixed lg:inset-y-0 lg:left-0 lg:w-80 lg:border-b-0 lg:border-r">
        <div className="flex min-h-full flex-col">
          <div className="flex items-center gap-3 px-6 py-7">
            <NovelForgeMark className="h-14 w-14 shrink-0 rounded-2xl shadow-[0_0_34px_rgba(241,168,76,0.12)]" />
            <div>
              <p className="text-lg font-semibold text-[#ffc274]">NovelForge AI</p>
              <p className="mt-1 text-sm text-[#a89577]">长篇连载创作工作台</p>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto px-5 pb-5 lg:flex-col lg:overflow-visible">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  className={
                    item.active
                      ? "nf-nav-item nf-nav-item-active"
                      : "nf-nav-item"
                  }
                  href={item.href}
                  key={item.href}
                >
                  <Icon aria-hidden="true" className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden px-6 lg:block">
            <div className="mb-4 h-px bg-gradient-to-r from-transparent via-[#a87943]/25 to-transparent" />
            <p className="mb-3 flex items-center gap-2 text-xs font-medium text-[#8b765b]">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
              创作工具
            </p>
            <div className="space-y-1.5">
              {toolItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    aria-disabled="true"
                    className="nf-nav-item nf-nav-item-muted"
                    key={item.label}
                  >
                    <Icon aria-hidden="true" className="h-5 w-5" />
                    {item.label}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-auto hidden p-6 lg:block">
            <SidebarNocturneArt className="mb-5 h-auto w-full rounded-2xl opacity-90 shadow-[0_18px_55px_rgba(0,0,0,0.32)]" />
            <div className="nf-pinned-note">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#f5d49d]">
                <Database aria-hidden="true" className="h-4 w-4 text-[#58d7c7]" />
                本地 SQLite 持久化
              </div>
              <p className="text-sm leading-6 text-[#c7b090]">
                设定库、角色库、章节编辑器、AI 任务记录、待审更新、连续性报告、发布包装与导出都已接入。
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-[#c7b090]">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-[#58d7c7]" />
                本地已连接
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="relative min-h-screen flex-1 lg:pl-80">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_18%,rgba(241,168,76,0.12),transparent_26%),radial-gradient(circle_at_28%_72%,rgba(88,215,199,0.10),transparent_30%)]" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-center justify-end gap-4">
            <button className="nf-icon-button" type="button" aria-label="通知">
              <Bell aria-hidden="true" className="h-5 w-5" />
            </button>
            <div className="nf-local-pill">
              <span className="h-2.5 w-2.5 rounded-full bg-[#58d7c7] shadow-[0_0_16px_rgba(88,215,199,0.85)]" />
              本地模式
            </div>
            <div className="hidden h-8 w-px bg-[#a87943]/20 sm:block" />
            <button className="nf-icon-button" type="button" aria-label="设置">
              <Settings aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
          <div className="nf-workspace-panel nf-legacy-surface">{children}</div>
        </div>
      </main>
    </div>
  );
}
