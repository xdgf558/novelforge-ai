"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookCopy,
  BookOpenText,
  Bot,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileDown,
  GitBranch,
  Headphones,
  LayoutDashboard,
  Layers3,
  LibraryBig,
  MapPinned,
  NotebookTabs,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppShellProject } from "@/components/app-shell";
import {
  isShortStoryProject,
  projectToolPathsForWorkType,
} from "@/lib/projects/work-types";

type NavigationItem = {
  label: string;
  icon: LucideIcon;
  path: string;
  exact?: boolean;
};

const longNovelGroups: Array<{
  label: string;
  items: NavigationItem[];
}> = [
  {
    label: "准备",
    items: [
      { label: "设定库", icon: BookOpenText, path: "settings" },
      { label: "角色", icon: Users, path: "characters" },
      { label: "大纲", icon: Layers3, path: "outlines" },
      { label: "故事线", icon: GitBranch, path: "storylines" },
    ],
  },
  {
    label: "写作",
    items: [
      { label: "章节", icon: NotebookTabs, path: "chapters" },
      { label: "有声", icon: Headphones, path: "audiobook" },
    ],
  },
  {
    label: "审校",
    items: [
      { label: "待审核更新", icon: CheckCircle2, path: "pending-updates" },
      { label: "连续性检查", icon: ShieldCheck, path: "continuity" },
      { label: "结构化记忆", icon: LibraryBig, path: "memory" },
    ],
  },
];

const shortStoryGroups: Array<{
  label: string;
  items: NavigationItem[];
}> = [
  {
    label: "准备",
    items: [
      { label: "故事蓝图", icon: MapPinned, path: "blueprint" },
      { label: "设定库", icon: BookOpenText, path: "settings" },
      { label: "角色", icon: Users, path: "characters" },
    ],
  },
  {
    label: "写作",
    items: [{ label: "写作单元", icon: NotebookTabs, path: "chapters" }],
  },
  {
    label: "审校",
    items: [
      { label: "整篇审校", icon: ShieldCheck, path: "story-review" },
      { label: "结构化记忆", icon: LibraryBig, path: "memory" },
    ],
  },
  {
    label: "发布",
    items: [{ label: "成稿与排版", icon: FileDown, path: "manuscript" }],
  },
];

type AppShellNavigationProps = {
  activeProjectId: string | null;
  onNavigate?: () => void;
  projects: AppShellProject[];
};

export function AppShellNavigation({
  activeProjectId,
  onNavigate,
  projects,
}: AppShellNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const seriesWorkspace = pathname.startsWith("/series");
  const activeProject =
    projects.find((project) => project.id === activeProjectId) ??
    projects[0] ??
    null;
  const shortStoryProject = isShortStoryProject(activeProject?.workType);
  const visibleToolPaths = new Set(
    projectToolPathsForWorkType(activeProject?.workType),
  );
  const groups = shortStoryProject ? shortStoryGroups : longNovelGroups;
  const projectBase = activeProject ? `/projects/${activeProject.id}` : null;

  const changeProject = (projectId: string) => {
    if (!projectId) {
      return;
    }
    router.push(`/projects/${projectId}`);
    onNavigate?.();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-2.5 pb-2">
        <label className="nf-project-switcher">
          <span className="sr-only">当前项目</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-[var(--nf-text-secondary)]">
              {activeProject?.title ?? "尚未创建项目"}
            </span>
            <span className="mt-0.5 block truncate text-[10px] text-[var(--nf-text-faint)]">
              {activeProject
                ? `${shortStoryProject ? "短故事" : "长篇连载"} · ${activeProject.chapterCount} ${shortStoryProject ? "单元" : "章"}`
                : "从新建项目开始"}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-[var(--nf-text-faint)]"
          />
          <select
            aria-label="切换项目"
            onChange={(event) => changeProject(event.target.value)}
            value={activeProject?.id ?? ""}
          >
            {projects.length === 0 ? (
              <option value="">尚未创建项目</option>
            ) : (
              projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      <nav className="nf-sidebar-scroll" aria-label="主导航">
        <div className="space-y-0.5 px-2.5">
          <SidebarLink
            active={pathname === "/"}
            href="/"
            icon={LibraryBig}
            label="项目库"
            onNavigate={onNavigate}
          />
          <SidebarLink
            active={projectBase != null && pathname === projectBase}
            disabled={!projectBase}
            href={projectBase ?? "/"}
            icon={LayoutDashboard}
            label="创作台"
            onNavigate={onNavigate}
          />
          <SidebarLink
            active={pathname.startsWith("/series")}
            href="/series"
            icon={BookCopy}
            label="系列"
            onNavigate={onNavigate}
          />
        </div>

        {!seriesWorkspace && activeProject ? (
          <div className="mt-3 space-y-3">
            {groups.map((group) => {
              const items = group.items.filter(
                (item) =>
                  visibleToolPaths.has(
                    item.path as Parameters<typeof visibleToolPaths.has>[0],
                  ) ||
                  item.path === "pending-updates" ||
                  item.path === "continuity",
              );

              if (items.length === 0) {
                return null;
              }

              return (
                <div key={group.label}>
                  <p className="nf-nav-section-label">{group.label}</p>
                  <div className="space-y-0.5 px-2.5">
                    {items.map((item) => {
                      const href = `${projectBase}/${item.path}`;
                      const active = item.exact
                        ? pathname === href
                        : pathname.startsWith(href);

                      return (
                        <SidebarLink
                          active={active}
                          href={href}
                          icon={item.icon}
                          key={item.path}
                          label={item.label}
                          onNavigate={onNavigate}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </nav>

      <div className="mt-auto border-t border-[var(--nf-border)] px-2.5 py-2">
        <SidebarLink
          active={projectBase != null && pathname.startsWith(`${projectBase}/ai`)}
          disabled={!projectBase}
          href={projectBase ? `${projectBase}/ai` : "/"}
          icon={Bot}
          label="AI 任务记录"
          onNavigate={onNavigate}
        />
        <SidebarLink
          active={pathname === "/ai-settings"}
          href="/ai-settings"
          icon={Settings}
          label="设置"
          onNavigate={onNavigate}
        />
        <Link
          className="nf-sidebar-new-project"
          href="/projects/new"
          onClick={onNavigate}
        >
          <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          新建项目
        </Link>
      </div>
    </div>
  );
}

function SidebarLink({
  active,
  disabled = false,
  href,
  icon: Icon,
  label,
  onNavigate,
}: {
  active: boolean;
  disabled?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  onNavigate?: () => void;
}) {
  if (disabled) {
    return (
      <span aria-disabled="true" className="nf-nav-item nf-nav-item-muted">
        <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
    );
  }

  return (
    <Link
      className={active ? "nf-nav-item nf-nav-item-active" : "nf-nav-item"}
      href={href}
      onClick={onNavigate}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
