import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import {
  Bell,
  CheckCircle2,
  Database,
  PackageCheck,
  Settings,
} from "lucide-react";
import { AppShellNavigation } from "@/components/app-shell-navigation";
import { NovelForgeMark, SidebarNocturneArt } from "@/components/story-illustrations";
import { appVersion } from "@/lib/app-version";
import { prisma } from "@/lib/prisma";

type AppShellProps = {
  children: React.ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const fallbackProjectId = await getFallbackProjectId();

  return (
    <div className="nocturne-shell min-h-screen overflow-hidden lg:flex">
      <aside className="nf-sidebar max-h-screen overflow-y-auto border-b border-amber-200/10 lg:fixed lg:inset-y-0 lg:left-0 lg:w-80 lg:border-b-0 lg:border-r">
        <div className="flex min-h-full flex-col">
          <div className="flex items-center gap-3 px-6 py-7">
            <NovelForgeMark className="h-14 w-14 shrink-0 rounded-2xl shadow-[0_0_34px_rgba(241,168,76,0.12)]" />
            <div>
              <p className="text-lg font-semibold text-[#ffc274]">NovelForge AI</p>
              <p className="mt-1 text-sm text-[#a89577]">长篇连载创作工作台</p>
            </div>
          </div>

          <AppShellNavigation fallbackProjectId={fallbackProjectId} />

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
            <Link
              className="nf-local-pill hidden sm:inline-flex"
              href="/ai-settings#app-version"
            >
              <PackageCheck aria-hidden="true" className="h-4 w-4" />
              v{appVersion}
            </Link>
            <div className="hidden h-8 w-px bg-[#a87943]/20 sm:block" />
            <Link className="nf-icon-button" href="/ai-settings" aria-label="设置">
              <Settings aria-hidden="true" className="h-5 w-5" />
            </Link>
          </div>
          <div className="nf-workspace-panel nf-legacy-surface">{children}</div>
        </div>
      </main>
    </div>
  );
}

async function getFallbackProjectId() {
  noStore();

  try {
    const project = await prisma.project.findFirst({
      orderBy: [
        {
          updatedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      select: {
        id: true,
      },
    });

    return project?.id ?? null;
  } catch {
    return null;
  }
}
