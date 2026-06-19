"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  ClipboardList,
  LayoutDashboard,
  NotebookTabs,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";

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
    path: "settings",
    label: "设定库",
    icon: BookOpenText,
  },
  {
    path: "characters",
    label: "角色",
    icon: Users,
  },
  {
    path: "chapters",
    label: "章节",
    icon: NotebookTabs,
  },
  {
    path: "ai",
    label: "任务记录",
    icon: ClipboardList,
  },
];

type AppShellNavigationProps = {
  fallbackProjectId?: string | null;
};

export function AppShellNavigation({
  fallbackProjectId,
}: AppShellNavigationProps) {
  const pathname = usePathname();
  const routeProjectId = currentProjectId(pathname);
  const projectId = routeProjectId ?? fallbackProjectId ?? null;
  const projectLandingPath = routeProjectId ? `/projects/${routeProjectId}` : null;

  return (
    <>
      <nav className="flex gap-2 overflow-x-auto px-5 pb-5 lg:flex-col lg:overflow-visible">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/" || pathname === projectLandingPath
              : pathname === item.href;

          return (
            <Link
              className={isActive ? "nf-nav-item nf-nav-item-active" : "nf-nav-item"}
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
          {projectToolItems.map((item) => {
            const Icon = item.icon;
            const href = projectId ? `/projects/${projectId}/${item.path}` : null;
            const isActive = href ? pathname.startsWith(href) : false;

            if (!href) {
              return (
                <div
                  aria-disabled="true"
                  className="nf-nav-item nf-nav-item-muted"
                  key={item.path}
                >
                  <Icon aria-hidden="true" className="h-5 w-5" />
                  {item.label}
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
                <Icon aria-hidden="true" className="h-5 w-5" />
                {item.label}
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
