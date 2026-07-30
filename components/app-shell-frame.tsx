"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Bot,
  CheckCircle2,
  ChevronRight,
  Command,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  Settings,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AppShellData,
  AppShellProject,
  AppShellReviewCount,
  AppShellSeries,
} from "@/components/app-shell";
import { AppShellNavigation } from "@/components/app-shell-navigation";
import { AiRunConsole } from "@/components/ai/ai-run-console";
import { NovelForgeMark } from "@/components/story-illustrations";

type AppShellFrameProps = {
  appVersion: string;
  children: React.ReactNode;
  data: AppShellData;
};

const routeLabels: Record<string, string> = {
  "ai-settings": "设置",
  audiobook: "有声",
  blueprint: "故事蓝图",
  chapters: "章节",
  characters: "角色",
  continuity: "连续性检查",
  edit: "编辑",
  manuscript: "成稿与排版",
  memory: "结构化记忆",
  new: "新建",
  outlines: "大纲",
  "pending-updates": "待审核更新",
  projects: "项目",
  series: "系列",
  settings: "设定库",
  "story-review": "整篇审校",
  storylines: "故事线",
  ai: "任务记录",
};

export function AppShellFrame({
  appVersion,
  children,
  data,
}: AppShellFrameProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [aiConsoleOpen, setAiConsoleOpen] = useState(false);
  const [aiConsolePreferenceReady, setAiConsolePreferenceReady] =
    useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const desktopAiConsoleTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileAiConsoleTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileNavigationTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileNavigationCloseRef = useRef<HTMLButtonElement>(null);
  const activeProject = useMemo(
    () => findActiveProject(pathname, data.projects),
    [data.projects, pathname],
  );
  const activeSeries = useMemo(
    () => findActiveSeries(pathname, data.series),
    [data.series, pathname],
  );
  const activeProjectTasks = useMemo(
    () =>
      activeProject
        ? data.activeTasks.filter((task) => task.projectId === activeProject.id)
        : data.activeTasks,
    [activeProject, data.activeTasks],
  );
  const totalReviewCount = useMemo(
    () =>
      data.reviewCounts.reduce(
        (total, count) =>
          total + count.pendingUpdateCount + count.openContinuityCount,
        0,
      ),
    [data.reviewCounts],
  );
  const closeAiConsole = useCallback(() => {
    setAiConsoleOpen(false);
    window.requestAnimationFrame(() => {
      const desktopTrigger = desktopAiConsoleTriggerRef.current;
      const trigger =
        desktopTrigger?.offsetParent != null
          ? desktopTrigger
          : mobileAiConsoleTriggerRef.current;
      trigger?.focus();
    });
  }, []);
  const toggleAiConsole = useCallback(() => {
    if (aiConsoleOpen) {
      closeAiConsole();
      return;
    }
    setAiConsoleOpen(true);
  }, [aiConsoleOpen, closeAiConsole]);
  const openMobileNavigation = useCallback(() => {
    setMobileNavigationOpen(true);
    window.requestAnimationFrame(() => {
      mobileNavigationCloseRef.current?.focus();
    });
  }, []);
  const closeMobileNavigation = useCallback(() => {
    setMobileNavigationOpen(false);
    window.requestAnimationFrame(() => {
      mobileNavigationTriggerRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem("novelforge.aiConsoleOpen");
    const desktopViewport = window.matchMedia("(min-width: 1024px)").matches;
    setAiConsoleOpen(desktopViewport && stored !== "false");
    setAiConsolePreferenceReady(true);
  }, []);

  useEffect(() => {
    if (!aiConsolePreferenceReady) {
      return;
    }
    window.localStorage.setItem(
      "novelforge.aiConsoleOpen",
      String(aiConsoleOpen),
    );
  }, [aiConsoleOpen, aiConsolePreferenceReady]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
      if (event.key === "Escape") {
        setCommandPaletteOpen(false);
        setNotificationOpen(false);
        if (mobileNavigationOpen) {
          closeMobileNavigation();
        }
        if (aiConsoleOpen) {
          closeAiConsole();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    aiConsoleOpen,
    closeAiConsole,
    closeMobileNavigation,
    mobileNavigationOpen,
  ]);

  useEffect(() => {
    if (data.activeTasks.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      router.refresh();
    }, 8_000);

    return () => window.clearInterval(interval);
  }, [data.activeTasks.length, router]);

  return (
    <div
      className="nf-app-shell"
      data-ai-console-open={aiConsoleOpen ? "true" : "false"}
    >
      <aside
        className={
          mobileNavigationOpen
            ? "nf-sidebar nf-sidebar-mobile-open"
            : "nf-sidebar"
        }
      >
        <div className="nf-sidebar-brand">
          <Link
            className="flex min-w-0 items-center gap-2.5"
            href="/"
            onClick={() => setMobileNavigationOpen(false)}
          >
            <NovelForgeMark className="h-8 w-8 shrink-0 rounded-md" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[var(--nf-text-main)]">
                NovelForge AI
              </span>
              <span className="block truncate text-[10px] text-[var(--nf-text-faint)]">
                本地小说创作工作台
              </span>
            </span>
          </Link>
          <button
            aria-label="关闭导航"
            className="nf-icon-button lg:hidden"
            onClick={closeMobileNavigation}
            ref={mobileNavigationCloseRef}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <AppShellNavigation
          activeProjectId={activeProject?.id ?? null}
          onNavigate={() => setMobileNavigationOpen(false)}
          projects={data.projects}
        />
      </aside>

      {mobileNavigationOpen ? (
        <button
          aria-label="关闭导航遮罩"
          className="nf-shell-backdrop lg:hidden"
          onClick={closeMobileNavigation}
          type="button"
        />
      ) : null}

      <div className="nf-shell-main">
        <header className="nf-topbar">
          <div className="flex min-w-0 items-center gap-2">
            <button
              aria-label="打开导航"
              className="nf-icon-button lg:hidden"
              onClick={openMobileNavigation}
              ref={mobileNavigationTriggerRef}
              type="button"
            >
              <Menu aria-hidden="true" className="h-4 w-4" />
            </button>
            <Breadcrumbs
              activeProject={activeProject}
              activeSeries={activeSeries}
              pathname={pathname}
            />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              className="nf-command-trigger"
              onClick={() => setCommandPaletteOpen(true)}
              type="button"
            >
              <Search aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">搜索与命令</span>
              <kbd className="hidden sm:inline-flex">
                <Command aria-hidden="true" className="h-3 w-3" />K
              </kbd>
            </button>

            <div className="relative">
              <button
                aria-expanded={notificationOpen}
                aria-label="通知"
                className="nf-icon-button relative"
                onClick={() => setNotificationOpen((open) => !open)}
                type="button"
              >
                <Bell aria-hidden="true" className="h-4 w-4" />
                {totalReviewCount > 0 ? (
                  <span className="nf-notification-dot" />
                ) : null}
              </button>
              {notificationOpen ? (
                <NotificationPopover
                  activeProjectId={activeProject?.id ?? null}
                  reviewCounts={data.reviewCounts}
                />
              ) : null}
            </div>

            <div className="nf-ai-status-chip">
              <span
                className={
                  activeProjectTasks.length > 0
                    ? "nf-status-dot nf-status-dot-running"
                    : "nf-status-dot"
                }
              />
              <span className="hidden sm:inline">
                {activeProjectTasks.length > 0
                  ? `AI ${activeProjectTasks.length} 个任务`
                  : "AI 就绪"}
              </span>
            </div>

            <Link
              aria-label="设置"
              className="nf-icon-button"
              href="/ai-settings"
            >
              <Settings aria-hidden="true" className="h-4 w-4" />
            </Link>

            <button
              aria-label={aiConsoleOpen ? "收起 AI 运行台" : "展开 AI 运行台"}
              className="nf-icon-button hidden lg:inline-flex"
              onClick={toggleAiConsole}
              ref={desktopAiConsoleTriggerRef}
              type="button"
            >
              {aiConsoleOpen ? (
                <PanelRightClose aria-hidden="true" className="h-4 w-4" />
              ) : (
                <PanelRightOpen aria-hidden="true" className="h-4 w-4" />
              )}
            </button>
          </div>
        </header>

        <main className="nf-workspace">
          <div className="nf-legacy-surface">{children}</div>
        </main>
      </div>

      {aiConsoleOpen ? (
        <AiRunConsole
          activeProjectId={activeProject?.id ?? null}
          activeTasks={data.activeTasks}
          onClose={closeAiConsole}
          recentTasks={data.recentTasks}
        />
      ) : null}

      <button
        aria-label="打开 AI 运行台"
        className="nf-ai-console-fab lg:hidden"
        onClick={() => setAiConsoleOpen(true)}
        ref={mobileAiConsoleTriggerRef}
        type="button"
      >
        <Bot aria-hidden="true" className="h-4 w-4" />
        {data.activeTasks.length > 0 ? (
          <span>{data.activeTasks.length}</span>
        ) : null}
      </button>

      {commandPaletteOpen ? (
        <CommandPalette
          activeProject={activeProject}
          onClose={() => setCommandPaletteOpen(false)}
          projects={data.projects}
          series={data.series}
        />
      ) : null}

      <span className="sr-only">当前版本 v{appVersion}</span>
    </div>
  );
}

function Breadcrumbs({
  activeProject,
  activeSeries,
  pathname,
}: {
  activeProject: AppShellProject | null;
  activeSeries: AppShellSeries | null;
  pathname: string;
}) {
  const segments = pathname.split("/").filter(Boolean);
  const projectIndex = segments.indexOf("projects");
  const tail =
    projectIndex >= 0 && activeProject
      ? segments.slice(projectIndex + 2)
      : segments;
  const labels =
    projectIndex >= 0 && activeProject != null
      ? [
          activeProject.title,
          ...tail.map((segment, index) =>
            routeSegmentLabel(segment, tail[index - 1]),
          ),
        ]
      : activeSeries
        ? ["系列", activeSeries.title]
      : segments.length === 0
        ? ["项目库"]
        : segments.map((segment) => routeLabels[segment] ?? segment);

  return (
    <nav
      aria-label="当前位置"
      className="flex min-w-0 items-center text-xs text-[var(--nf-text-muted)]"
    >
      {labels.map((label, index) => (
        <span className="flex min-w-0 items-center" key={`${label}-${index}`}>
          {index > 0 ? (
            <ChevronRight
              aria-hidden="true"
              className="mx-1 h-3 w-3 shrink-0 text-[var(--nf-text-faint)]"
            />
          ) : null}
          <span
            className={
              index === labels.length - 1
                ? "max-w-48 truncate font-medium text-[var(--nf-text-secondary)]"
                : "max-w-36 truncate"
            }
          >
            {label}
          </span>
        </span>
      ))}
    </nav>
  );
}

function routeSegmentLabel(segment: string, previousSegment?: string) {
  const knownLabel = routeLabels[segment];
  if (knownLabel) {
    return knownLabel;
  }

  if (segment.length > 16 || segment.startsWith("cm")) {
    if (previousSegment === "chapters") {
      return "章节详情";
    }
    if (previousSegment === "characters") {
      return "角色详情";
    }
    if (previousSegment === "outlines") {
      return "大纲详情";
    }
    return "详情";
  }

  return segment;
}

function NotificationPopover({
  activeProjectId,
  reviewCounts,
}: {
  activeProjectId: string | null;
  reviewCounts: AppShellReviewCount[];
}) {
  const orderedCounts = [...reviewCounts].sort((left, right) => {
    if (left.projectId === activeProjectId) {
      return -1;
    }
    if (right.projectId === activeProjectId) {
      return 1;
    }
    return (
      right.pendingUpdateCount +
        right.openContinuityCount -
        (left.pendingUpdateCount + left.openContinuityCount) ||
      left.projectTitle.localeCompare(right.projectTitle, "zh-CN")
    );
  });
  const totalCount = orderedCounts.reduce(
    (total, count) =>
      total + count.pendingUpdateCount + count.openContinuityCount,
    0,
  );

  return (
    <div className="nf-popover nf-notification-popover">
      <div className="nf-popover-header">
        <span>需要处理</span>
        <span className="nf-badge">{totalCount}</span>
      </div>
      <div className="nf-notification-list">
        {orderedCounts.length > 0 ? (
          orderedCounts.map((count) => (
            <section className="nf-notification-project" key={count.projectId}>
              <div className="nf-notification-project-title">
                <span className="truncate">{count.projectTitle}</span>
                <span>
                  {count.pendingUpdateCount + count.openContinuityCount} 条
                </span>
              </div>
              {count.pendingUpdateCount > 0 ? (
                <Link
                  className="nf-notification-row"
                  href={`/projects/${count.projectId}/pending-updates`}
                >
                  <CheckCircle2
                    aria-hidden="true"
                    className="h-4 w-4 text-[var(--nf-amber)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-[var(--nf-text-secondary)]">
                      待审核更新
                    </span>
                    <span className="block text-[10px] text-[var(--nf-text-faint)]">
                      {count.pendingUpdateCount} 条建议等待作者确认
                    </span>
                  </span>
                </Link>
              ) : null}
              {count.openContinuityCount > 0 ? (
                <Link
                  className="nf-notification-row"
                  href={`/projects/${count.projectId}/continuity`}
                >
                  <TriangleAlert
                    aria-hidden="true"
                    className="h-4 w-4 text-[var(--nf-cyan)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-[var(--nf-text-secondary)]">
                      连续性问题
                    </span>
                    <span className="block text-[10px] text-[var(--nf-text-faint)]">
                      {count.openContinuityCount} 条报告尚未处理
                    </span>
                  </span>
                </Link>
              ) : null}
            </section>
          ))
        ) : (
          <p className="nf-notification-empty">当前没有待处理事项</p>
        )}
      </div>
    </div>
  );
}

function CommandPalette({
  activeProject,
  onClose,
  projects,
  series,
}: {
  activeProject: AppShellProject | null;
  onClose: () => void;
  projects: AppShellProject[];
  series: AppShellSeries[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const activeProjectBase = activeProject
    ? `/projects/${activeProject.id}`
    : null;
  const commands = [
    { label: "项目库", href: "/" },
    { label: "新建项目", href: "/projects/new" },
    { label: "系列", href: "/series" },
    { label: "本机设置", href: "/ai-settings" },
    ...(activeProjectBase
      ? [
          { label: `${activeProject?.title} · 创作台`, href: activeProjectBase },
          { label: `${activeProject?.title} · 章节`, href: `${activeProjectBase}/chapters` },
          { label: `${activeProject?.title} · 大纲`, href: `${activeProjectBase}/outlines` },
          { label: `${activeProject?.title} · 待审核更新`, href: `${activeProjectBase}/pending-updates` },
        ]
      : []),
    ...projects.map((project) => ({
      label: `打开项目 · ${project.title}`,
      href: `/projects/${project.id}`,
    })),
    ...series.map((item) => ({
      label: `打开系列 · ${item.title}`,
      href: `/series/${item.id}`,
    })),
  ];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredCommands = commands.filter((command) =>
    command.label.toLocaleLowerCase().includes(normalizedQuery),
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const navigate = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div
      aria-label="搜索与命令"
      aria-modal="true"
      className="nf-command-overlay"
      role="dialog"
    >
      <button
        aria-label="关闭命令面板"
        className="absolute inset-0"
        onClick={onClose}
        type="button"
      />
      <div className="nf-command-palette">
        <div className="flex items-center gap-2 border-b border-[var(--nf-border)] px-3">
          <Search
            aria-hidden="true"
            className="h-4 w-4 text-[var(--nf-cyan)]"
          />
          <input
            aria-label="搜索命令或项目"
            className="h-11 min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--nf-text-main)] outline-none"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索命令或项目"
            ref={inputRef}
            value={query}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="max-h-[min(28rem,65vh)] overflow-y-auto p-2">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((command) => (
              <button
                className="nf-command-row"
                key={`${command.href}-${command.label}`}
                onClick={() => navigate(command.href)}
                type="button"
              >
                {command.label === "新建项目" ? (
                  <Plus aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                )}
                <span className="truncate">{command.label}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-8 text-center text-xs text-[var(--nf-text-faint)]">
              没有匹配的命令
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function findActiveProject(pathname: string, projects: AppShellProject[]) {
  const match = /^\/projects\/([^/]+)/.exec(pathname);
  const projectId = match?.[1];

  if (!projectId || projectId === "new") {
    return projects[0] ?? null;
  }

  return projects.find((project) => project.id === projectId) ?? null;
}

function findActiveSeries(pathname: string, series: AppShellSeries[]) {
  const match = /^\/series\/([^/]+)/.exec(pathname);
  const seriesId = match?.[1];

  if (!seriesId || seriesId === "new" || seriesId === "import") {
    return null;
  }

  return series.find((item) => item.id === seriesId) ?? null;
}
