"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  Ban,
  Bot,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  FileCheck2,
  LoaderCircle,
  RotateCw,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import type { AppShellAiTask } from "@/components/app-shell";
import {
  aiTaskStatusLabel,
  aiTaskStatusTone,
  aiTaskTypeLabel,
} from "@/lib/ai/task-presentation";

type AiRunConsoleProps = {
  activeProjectId: string | null;
  activeTasks: AppShellAiTask[];
  onClose: () => void;
  recentTasks: AppShellAiTask[];
};

const executionStages = [
  "组装上下文",
  "检索结构化记忆",
  "请求模型",
  "接收生成结果",
  "连续性自检",
  "写入目标落点",
] as const;

export function AiRunConsole({
  activeProjectId,
  activeTasks,
  onClose,
  recentTasks,
}: AiRunConsoleProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const prioritizedTasks = activeProjectId
    ? [
        ...activeTasks.filter((task) => task.projectId === activeProjectId),
        ...activeTasks.filter((task) => task.projectId !== activeProjectId),
      ]
    : activeTasks;
  const currentTask = prioritizedTasks[0] ?? null;
  const queuedTasks = prioritizedTasks.slice(1);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <>
      <button
        aria-label="关闭 AI 运行台遮罩"
        className="nf-ai-console-backdrop lg:hidden"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-label="AI 运行台"
        className="nf-ai-console nf-ai-console-open"
      >
        <div className="nf-ai-console-header">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles
                aria-hidden="true"
                className="h-4 w-4 text-[var(--nf-cyan)]"
              />
              <h2 className="text-sm font-semibold text-[var(--nf-text-main)]">
                AI 运行台
              </h2>
            </div>
            <p className="mt-1 text-[10px] text-[var(--nf-text-faint)]">
              {currentTask
                ? `${currentTask.projectTitle} · ${aiTaskTypeLabel(currentTask.taskType)}`
                : "当前没有运行中的任务"}
            </p>
          </div>
          <button
            aria-label="收起 AI 运行台"
            className="nf-icon-button"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="nf-ai-console-scroll">
          {currentTask ? (
            <ActiveTaskPanel task={currentTask} />
          ) : (
            <IdlePanel />
          )}

          <section className="nf-ai-console-section">
            <div className="nf-ai-console-section-title">
              <span>排队任务</span>
              <span className="nf-badge">{queuedTasks.length}</span>
            </div>
            {queuedTasks.length > 0 ? (
              <div className="space-y-1.5">
                {queuedTasks.map((task, index) => (
                  <TaskRow
                    detail={`队列 ${index + 1} · ${task.model}`}
                    key={task.id}
                    task={task}
                  />
                ))}
              </div>
            ) : (
              <p className="nf-ai-console-empty">没有等待中的任务</p>
            )}
          </section>

          <section className="nf-ai-console-section">
            <div className="nf-ai-console-section-title">
              <span>最近任务</span>
              <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
            </div>
            {recentTasks.length > 0 ? (
              <div className="space-y-1.5">
                {recentTasks.map((task) => (
                  <TaskRow
                    detail={`${aiTaskStatusLabel(task.status)} · ${formatTaskTime(task)} · ${task.model}`}
                    key={task.id}
                    task={task}
                  />
                ))}
              </div>
            ) : (
              <p className="nf-ai-console-empty">还没有 AI 任务记录</p>
            )}
          </section>
        </div>
      </aside>
    </>
  );
}

function ActiveTaskPanel({ task }: { task: AppShellAiTask }) {
  const activeStage = task.status === "pending" ? 0 : 2;
  const progress = task.status === "pending" ? 12 : 48;

  return (
    <section className="nf-ai-active-task">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--nf-cyan-light)]">
            <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
            {task.status === "pending" ? "等待执行" : "正在生成"}
          </div>
          <h3 className="mt-1.5 line-clamp-2 text-xs font-semibold leading-5 text-[var(--nf-text-main)]">
            {aiTaskTypeLabel(task.taskType)}
          </h3>
          <p className="mt-1 truncate text-[10px] text-[var(--nf-text-faint)]">
            {task.model}
          </p>
        </div>
        <span className="nf-ai-progress-value">{progress}%</span>
      </div>

      <div className="nf-progress-track mt-3">
        <span style={{ width: `${progress}%` }} />
      </div>

      <ol className="mt-3 space-y-0.5">
        {executionStages.map((stage, index) => {
          const completed = index < activeStage;
          const active = index === activeStage;

          return (
            <li
              className={
                active
                  ? "nf-ai-stage nf-ai-stage-active"
                  : completed
                    ? "nf-ai-stage nf-ai-stage-complete"
                    : "nf-ai-stage"
              }
              key={stage}
            >
              <span className="nf-ai-stage-icon">
                {completed ? (
                  <Check aria-hidden="true" className="h-3 w-3" />
                ) : active ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-3 w-3 animate-spin"
                  />
                ) : (
                  <Circle aria-hidden="true" className="h-2.5 w-2.5" />
                )}
              </span>
              <span>{stage}</span>
            </li>
          );
        })}
      </ol>

      <dl className="nf-ai-task-metrics">
        <div>
          <dt>输入</dt>
          <dd>{formatTokenCount(task.tokenInput)}</dd>
        </div>
        <div>
          <dt>输出</dt>
          <dd>{formatTokenCount(task.tokenOutput)}</dd>
        </div>
        <div>
          <dt>落点</dt>
          <dd className="truncate">{taskLandingLabel(task)}</dd>
        </div>
      </dl>

      <Link className="nf-ai-task-link" href={taskLandingHref(task)}>
        查看任务落点
        <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

function IdlePanel() {
  return (
    <section className="nf-ai-idle-panel">
      <span className="nf-ai-idle-icon">
        <Bot aria-hidden="true" className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs font-medium text-[var(--nf-text-secondary)]">
          AI 已就绪
        </p>
        <p className="mt-1 text-[10px] leading-4 text-[var(--nf-text-faint)]">
          新任务开始后会在这里显示执行阶段、token 与结果落点。
        </p>
      </div>
    </section>
  );
}

function TaskRow({
  detail,
  task,
}: {
  detail: string;
  task: AppShellAiTask;
}) {
  const tone = aiTaskStatusTone(task.status);
  const Icon = tone === "failed"
    ? TriangleAlert
    : tone === "active"
      ? RotateCw
      : tone === "cancelled"
        ? Ban
        : FileCheck2;

  return (
    <Link className="nf-ai-task-row" href={taskLandingHref(task)}>
      <span
        className={
          tone === "failed"
            ? "nf-ai-task-row-icon nf-ai-task-row-icon-failed"
            : tone === "active"
              ? "nf-ai-task-row-icon nf-ai-task-row-icon-active"
              : tone === "cancelled"
                ? "nf-ai-task-row-icon nf-ai-task-row-icon-cancelled"
                : "nf-ai-task-row-icon"
        }
      >
        <Icon
          aria-hidden="true"
          className={
            tone === "active"
              ? "h-3.5 w-3.5 animate-spin"
              : "h-3.5 w-3.5"
          }
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-medium text-[var(--nf-text-secondary)]">
          {aiTaskTypeLabel(task.taskType)}
        </span>
        <span className="mt-0.5 block truncate text-[9px] text-[var(--nf-text-faint)]">
          {task.projectTitle} · {detail}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="h-3.5 w-3.5 shrink-0 text-[var(--nf-text-faint)]"
      />
    </Link>
  );
}

function taskLandingHref(task: AppShellAiTask) {
  if (task.chapterId) {
    return `/projects/${task.projectId}/chapters/${task.chapterId}`;
  }
  if (
    task.taskType.includes("outline") ||
    task.taskType === "ending_planning_generation"
  ) {
    return `/projects/${task.projectId}/outlines`;
  }
  if (task.taskType.includes("continuity")) {
    return `/projects/${task.projectId}/continuity`;
  }
  if (task.taskType.includes("pending_update")) {
    return `/projects/${task.projectId}/pending-updates`;
  }
  if (task.taskType.includes("storyline")) {
    return `/projects/${task.projectId}/storylines`;
  }
  if (task.taskType.includes("blueprint")) {
    return `/projects/${task.projectId}/blueprint`;
  }
  if (task.taskType.includes("whole_review")) {
    return `/projects/${task.projectId}/story-review`;
  }
  return `/projects/${task.projectId}/ai`;
}

function taskLandingLabel(task: AppShellAiTask) {
  if (task.chapterNumber != null) {
    return `第 ${task.chapterNumber} 章`;
  }
  if (
    task.taskType.includes("outline") ||
    task.taskType === "ending_planning_generation"
  ) {
    return "大纲";
  }
  if (task.taskType.includes("continuity")) {
    return "连续性";
  }
  return "任务记录";
}

function formatTokenCount(value: number | null) {
  if (value == null) {
    return "--";
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  }
  return String(value);
}

function formatTaskTime(task: AppShellAiTask) {
  const value = task.completedAt ?? task.createdAt;
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
