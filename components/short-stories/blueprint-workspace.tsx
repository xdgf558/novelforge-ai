import type { ShortStoryBlueprint } from "@prisma/client";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  History,
  Save,
  Sparkles,
  XCircle,
} from "lucide-react";
import { PreserveScrollForm } from "@/components/preserve-scroll-form";
import { ShortStoryBlueprintSnapshot } from "./blueprint-snapshot";
import {
  aiTaskAdoptionLabel,
  aiTaskStatusLabel,
  isActiveAiTaskStatus,
} from "@/lib/ai/status";
import {
  isReviewableShortStoryBlueprintDraft,
  parseShortStoryBlueprintGenerationOutput,
} from "@/lib/ai/short-story-blueprints";
import { formatDate } from "@/lib/format";
import {
  shortStoryBlueprintCompletedFieldCount,
  shortStoryBlueprintGroups,
  shortStoryBlueprintValuesFromRecord,
} from "@/lib/short-stories/blueprint-fields";

type BlueprintAiTask = {
  id: string;
  status: string;
  adoptionState: string;
  createdAt: Date;
  model: string;
  inputContextSummary: string;
  outputText: string | null;
  errorMessage: string | null;
  promptTemplate?: {
    name: string;
    version: number;
  } | null;
};

type ShortStoryBlueprintWorkspaceProps = {
  adoptAction: (taskId: string) => Promise<void>;
  blueprint?: ShortStoryBlueprint | null;
  errorMessage?: string | null;
  generateAction: () => Promise<void>;
  hasApiKey: boolean;
  project: {
    id: string;
    title: string;
  };
  rejectAction: (taskId: string) => Promise<void>;
  saveAction: (formData: FormData) => Promise<void>;
  tasks: readonly BlueprintAiTask[];
  versionCount: number;
};

const inputClass =
  "min-h-24 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm leading-6 text-ink-950 shadow-panel outline-none transition placeholder:text-ink-700/45 focus:border-signal-500 focus:ring-4 focus:ring-signal-500/15";

export function ShortStoryBlueprintWorkspace({
  adoptAction,
  blueprint,
  errorMessage,
  generateAction,
  hasApiKey,
  project,
  rejectAction,
  saveAction,
  tasks,
  versionCount,
}: ShortStoryBlueprintWorkspaceProps) {
  const values = shortStoryBlueprintValuesFromRecord(blueprint);
  const completedFields = shortStoryBlueprintCompletedFieldCount(values);
  const hasActiveGeneration = tasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const canGenerate = hasApiKey && !hasActiveGeneration;

  return (
    <div className="space-y-7">
      <header className="border-b border-ink-950/10 pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
              href={`/projects/${project.id}`}
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              返回短故事创作台
            </Link>
            <p className="text-sm font-semibold text-signal-600">
              {project.title}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
              短故事蓝图
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
              先锁定开篇承诺、压力、反转和结局兑现，再进入写作单元规划。AI
              结果必须由你采用后才会成为正式蓝图。
            </p>
          </div>

          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
            href={`/projects/${project.id}/blueprint/history`}
          >
            <History aria-hidden="true" className="h-4 w-4" />
            历史版本 {versionCount}
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-ink-700">
          <span className="rounded-md border border-ink-950/10 bg-white px-2.5 py-1">
            正式蓝图 {completedFields}/10 项
          </span>
          <span className="rounded-md border border-ink-950/10 bg-white px-2.5 py-1">
            {blueprint ? "已建立" : "待建立"}
          </span>
        </div>
      </header>

      {errorMessage ? (
        <p className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {errorMessage}
        </p>
      ) : null}

      <section className="border-b border-ink-950/10 pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              AI 蓝图草案
            </div>
            <h2 className="mt-1.5 text-base font-semibold text-ink-950">
              生成可审阅的单篇闭环方案
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-ink-700">
              生成会读取项目基础、正式设定、已确认角色和当前蓝图。不会写入正文、角色或正式记忆。
            </p>
          </div>

          <PreserveScrollForm
            action={generateAction}
            preserveKey={`short-story-blueprint-${project.id}`}
            statusText="已开始生成短故事蓝图，页面会留在当前位置并自动刷新结果。"
          >
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!canGenerate}
              type="submit"
            >
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              {hasActiveGeneration ? "生成中" : "生成蓝图草案"}
            </button>
          </PreserveScrollForm>
        </div>

        {!hasApiKey ? (
          <p className="mt-3 text-sm text-ink-700">
            未配置 API Key，暂不能调用模型；已有草案和正式蓝图仍可查看、编辑。
          </p>
        ) : null}

        {hasActiveGeneration ? (
          <p className="mt-3 text-sm text-ink-700">
            当前已有蓝图任务运行中，完成前不会重复发起调用。
          </p>
        ) : null}

        {tasks.length === 0 ? (
          <p className="mt-4 text-sm text-ink-700">
            还没有蓝图生成任务。你也可以直接在下方手动填写正式蓝图。
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {tasks.map((task) => {
              const draft = parseShortStoryBlueprintGenerationOutput(
                task.outputText,
              );
              const canReview =
                task.status === "completed" &&
                task.adoptionState === "not_reviewed";
              const canAdopt =
                canReview && isReviewableShortStoryBlueprintDraft(draft);

              return (
                <article
                  className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel"
                  key={task.id}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
                        <span className="rounded-md bg-paper-50 px-2.5 py-1">
                          {aiTaskStatusLabel(task.status)}
                        </span>
                        <span className="rounded-md bg-paper-50 px-2.5 py-1">
                          {aiTaskAdoptionLabel(task.adoptionState)}
                        </span>
                        <span>{formatDate(task.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-ink-950">
                        {task.model}
                        {task.promptTemplate
                          ? ` / ${task.promptTemplate.name} v${task.promptTemplate.version}`
                          : ""}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-ink-700">
                        {task.inputContextSummary}
                      </p>
                    </div>

                    {canReview ? (
                      <div className="flex flex-wrap gap-2">
                        <form action={adoptAction.bind(null, task.id)}>
                          <button
                            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-45"
                            disabled={!canAdopt}
                            type="submit"
                          >
                            <CheckCircle2
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
                            采用为正式蓝图
                          </button>
                        </form>
                        <form action={rejectAction.bind(null, task.id)}>
                          <button
                            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
                            type="submit"
                          >
                            <XCircle aria-hidden="true" className="h-4 w-4" />
                            拒绝草案
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </div>

                  {task.status === "completed" ? (
                    <div className="mt-4">
                      <ShortStoryBlueprintSnapshot
                        emptyText="本次草案未提供"
                        values={draft}
                      />
                      <details className="mt-4 border-t border-ink-950/10 pt-3">
                        <summary className="cursor-pointer text-xs font-semibold text-ink-700">
                          查看模型原始输出
                        </summary>
                        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5 text-ink-700">
                          {task.outputText || "任务没有返回文本。"}
                        </pre>
                      </details>
                    </div>
                  ) : (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-700">
                      {task.errorMessage || "任务尚未产生输出。"}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <form action={saveAction} className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-ink-950">正式蓝图</h2>
          <p className="mt-1 text-sm leading-6 text-ink-700">
            可以手动创建或继续修改。每次保存都会生成版本快照，后续写作单元只读取这里确认过的内容。
          </p>
        </div>

        {shortStoryBlueprintGroups.map((group) => (
          <section className="border-t border-ink-950/10 pt-4" key={group.title}>
            <h3 className="text-base font-semibold text-ink-950">
              {group.title}
            </h3>
            <p className="mt-1 text-xs leading-5 text-ink-700">
              {group.description}
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {group.fields.map((field) => (
                <label className="flex flex-col gap-1.5" key={field.name}>
                  <span className="text-xs font-semibold text-ink-700">
                    {field.label}
                  </span>
                  <textarea
                    className={inputClass}
                    defaultValue={values[field.name]}
                    name={field.name}
                    placeholder={field.placeholder}
                    rows={Math.min(field.rows, 5)}
                  />
                </label>
              ))}
            </div>
          </section>
        ))}

        <section className="border-t border-ink-950/10 pt-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-700">修改原因</span>
            <textarea
              className={inputClass}
              name="changeReason"
              placeholder="例如：建立初版蓝图、调整第二次反转、明确结局兑现"
              rows={3}
            />
          </label>
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
            type="submit"
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            保存并记录版本
          </button>
          <Link
            className="inline-flex min-h-11 items-center rounded-md border border-ink-950/15 bg-white px-4 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
            href={`/projects/${project.id}`}
          >
            返回创作台
          </Link>
        </div>
      </form>
    </div>
  );
}
