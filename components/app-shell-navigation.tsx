"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  ClipboardList,
  GitBranch,
  Headphones,
  LayoutDashboard,
  Layers3,
  MapPinned,
  NotebookTabs,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import {
  isShortStoryProject,
  normalizeProjectWorkType,
  projectToolPathsForWorkType,
} from "@/lib/projects/work-types";

const mainNavItems = [
  {
    href: "/",
    label: "项目",
    icon: LayoutDashboard,
  },
  {
    href: "/projects/new",
    label: "新建",
    icon: Plus,
  },
];

const projectToolItems = [
  {
    path: "" as const,
    label: "创作台",
    icon: LayoutDashboard,
  },
  {
    path: "blueprint" as const,
    label: "蓝图",
    icon: MapPinned,
  },
  {
    path: "settings" as const,
    label: "设定库",
    icon: BookOpenText,
  },
  {
    path: "characters" as const,
    label: "角色",
    icon: Users,
  },
  {
    path: "outlines" as const,
    label: "大纲",
    icon: Layers3,
  },
  {
    path: "storylines" as const,
    label: "故事线",
    icon: GitBranch,
  },
  {
    path: "chapters" as const,
    label: "章节",
    icon: NotebookTabs,
  },
  {
    path: "story-review" as const,
    label: "整篇审校",
    icon: ShieldCheck,
  },
  {
    path: "audiobook" as const,
    label: "有声",
    icon: Headphones,
  },
  {
    path: "memory" as const,
    label: "记忆",
    icon: ShieldCheck,
  },
  {
    path: "ai" as const,
    label: "任务记录",
    icon: ClipboardList,
  },
];

type AppShellNavigationProps = {
  fallbackProjectId?: string | null;
  projects?: ReadonlyArray<{
    id: string;
    workType: string;
  }>;
};

export function AppShellNavigation({
  fallbackProjectId,
  projects = [],
}: AppShellNavigationProps) {
  const pathname = usePathname();
  const routeProjectId = currentProjectId(pathname);
  const projectId = routeProjectId ?? fallbackProjectId ?? null;
  const projectLandingPath = routeProjectId ? `/projects/${routeProjectId}` : null;
  const projectWorkType = normalizeProjectWorkType(
    projects.find((project) => project.id === projectId)?.workType,
  );
  const shortStoryProject = isShortStoryProject(projectWorkType);
  const visibleToolPaths = new Set(
    projectToolPathsForWorkType(projectWorkType),
  );

  return (
    <>
      <nav className="grid grid-flow-col auto-cols-max gap-2 overflow-x-auto px-4 pb-4 lg:grid-flow-row lg:grid-cols-2 lg:overflow-visible">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/" ||
                (!shortStoryProject && pathname === projectLandingPath)
              : pathname === item.href;

          return (
            <Link
              className={isActive ? "nf-nav-item nf-nav-item-active" : "nf-nav-item"}
              href={item.href}
              key={item.href}
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden px-4 lg:block">
        <div className="mb-3 h-px bg-gradient-to-r from-transparent via-[#a87943]/25 to-transparent" />
        <p className="mb-2 flex items-center gap-2 px-1 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-[#8b765b]">
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
          {shortStoryProject ? "短故事工具" : "创作工具"}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {projectToolItems
            .filter((item) => visibleToolPaths.has(item.path))
            .map((item) => {
              const Icon = item.icon;
              const label =
                shortStoryProject && item.path === "chapters"
                  ? "写作单元"
                  : item.label;
              const href = projectId
                ? item.path
                  ? `/projects/${projectId}/${item.path}`
                  : `/projects/${projectId}`
                : null;
              const isActive = href
                ? item.path
                  ? pathname.startsWith(href)
                  : pathname === href
                : false;

              if (!href) {
                return (
                  <div
                    aria-disabled="true"
                    className="nf-nav-item nf-nav-item-muted"
                    key={item.path}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    {label}
                  </div>
                );
              }

              return (
                <Link
                  className={
                    isActive ? "nf-nav-item nf-nav-item-active" : "nf-nav-item"
                  }
                  href={href}
                  key={item.path}
                >
                  <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
        </div>
      </div>
    </>
  );
}

function currentProjectId(pathname: string) {
  const match = /^\/projects\/([^/]+)/.exec(pathname);
  const projectId = match?.[1];

  if (!projectId || projectId === "new") {
    return null;
  }

  return projectId;
}
