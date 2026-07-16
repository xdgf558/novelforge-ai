"use client";

import type { ProjectSetting } from "@prisma/client";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Eye,
  History,
  Save,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import {
  aiTaskAdoptionLabel,
  aiTaskStatusLabel,
  isActiveAiTaskStatus,
} from "@/lib/ai/status";
import { formatDate } from "@/lib/format";
import {
  hasProjectSettingDraftValues,
  parseProjectSettingGenerationOutput,
} from "@/lib/ai/project-settings";
import {
  projectSettingGroupsForWorkType,
  projectSettingValuesFromRecord,
  type ProjectSettingValues,
} from "@/lib/project-setting-fields";
import { PreserveScrollForm } from "@/components/preserve-scroll-form";
import { isShortStoryProject } from "@/lib/projects/work-types";
import {
  appliedShortStoryWritingStylePresetId,
  applyShortStoryWritingStylePreset,
  shortStoryWritingStylePresetById,
  shortStoryWritingStylePresets,
  type ShortStoryWritingStylePresetId,
} from "@/lib/short-stories/writing-style-presets";
import {
  appliedNarrativePerspectiveId,
  applyNarrativePerspective,
  narrativePerspectiveById,
  narrativePerspectives,
  type NarrativePerspectiveId,
} from "@/lib/narrative-perspectives";

type ProjectSettingFormProps = {
  action: (formData: FormData) => Promise<void>;
  adoptProjectSettingAction: (taskId: string) => Promise<void>;
  aiTasks: readonly ProjectSettingAiTask[];
  generateProjectSettingCompletionAction: () => Promise<void>;
  generateProjectSettingAction: () => Promise<void>;
  generateProjectSettingOptimizationAction: () => Promise<void>;
  hasApiKey: boolean;
  project: {
    id: string;
    title: string;
    workType: string;
  };
  setting?: ProjectSetting | null;
  versionCount: number;
};

type ProjectSettingAiTask = {
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

const inputClass =
  "min-h-9 rounded-md border border-ink-950/15 bg-white px-3 text-sm text-ink-950 shadow-panel outline-none transition placeholder:text-ink-700/45 focus:border-signal-500 focus:ring-4 focus:ring-signal-500/15";

const labelClass = "text-xs font-semibold text-ink-700";

function valuesFromSetting(setting?: ProjectSetting | null): ProjectSettingValues {
  return projectSettingValuesFromRecord(setting);
}

export function ProjectSettingForm({
  action,
  adoptProjectSettingAction,
  aiTasks,
  generateProjectSettingCompletionAction,
  generateProjectSettingAction,
  generateProjectSettingOptimizationAction,
  hasApiKey,
  project,
  setting,
  versionCount,
}: ProjectSettingFormProps) {
  const [values, setValues] = useState<ProjectSettingValues>(() =>
    valuesFromSetting(setting),
  );
  const isShortStory = isShortStoryProject(project.workType);
  const [selectedStylePresetId, setSelectedStylePresetId] = useState<
    ShortStoryWritingStylePresetId | ""
  >(() => appliedShortStoryWritingStylePresetId(values.styleSample) ?? "");
  const selectedStylePreset = shortStoryWritingStylePresetById(
    selectedStylePresetId,
  );
  const appliedStylePresetId = appliedShortStoryWritingStylePresetId(
    values.styleSample,
  );
  const [selectedNarrativePerspectiveId, setSelectedNarrativePerspectiveId] =
    useState<NarrativePerspectiveId | "">(
      () => appliedNarrativePerspectiveId(values.narrativePerspective) ?? "",
    );
  const selectedNarrativePerspective = narrativePerspectiveById(
    selectedNarrativePerspectiveId,
  );
  const currentNarrativePerspectiveId =
    appliedNarrativePerspectiveId(values.narrativePerspective);
  const settingGroups = projectSettingGroupsForWorkType(project.workType);

  function applySelectedStylePreset() {
    if (!selectedStylePresetId) {
      return;
    }

    setValues((current) => {
      const applied = applyShortStoryWritingStylePreset(
        current.styleSample,
        selectedStylePresetId,
      );

      return applied
        ? {
            ...current,
            ...applied,
          }
        : current;
    });
  }

  function applySelectedNarrativePerspective() {
    if (!selectedNarrativePerspectiveId) {
      return;
    }

    setValues((current) => {
      const narrativePerspective = applyNarrativePerspective(
        current.narrativePerspective,
        selectedNarrativePerspectiveId,
      );

      return narrativePerspective === null
        ? current
        : {
            ...current,
            narrativePerspective,
          };
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
            href={`/projects/${project.id}`}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            返回项目
          </Link>
          <p className="text-sm font-semibold text-signal-600">
            {project.title}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
            总设定档
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
            这里保存全书长期记忆的基础版本。每次保存都会生成一条历史快照，方便后续追踪和回溯。
          </p>
        </div>

        <Link
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
          href={`/projects/${project.id}/settings/history`}
        >
          <History aria-hidden="true" className="h-4 w-4" />
          历史版本 {versionCount}
        </Link>
      </div>

      <ProjectSettingAiPanel
        adoptAction={adoptProjectSettingAction}
        generateCompletionAction={generateProjectSettingCompletionAction}
        generateAction={generateProjectSettingAction}
        generateOptimizationAction={generateProjectSettingOptimizationAction}
        hasApiKey={hasApiKey}
        projectTitle={project.title}
        tasks={aiTasks}
      />

      <form action={action} className="space-y-4">
        {isShortStory ? (
          <section className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-signal-500/10 text-signal-600">
                <Sparkles aria-hidden="true" className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-ink-950">
                  短故事写作风格
                </h2>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-ink-700">
                  选择后会把节奏、科学解释、悬疑组织和结局倾向填入下方文风与情绪字段。叙事视角由独立选项控制；作者姓名只用于说明灵感方向，不会写入模型上下文。
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className={labelClass}>风格方向</span>
                <select
                  className={`${inputClass} min-h-10 w-full min-w-0 py-2`}
                  onChange={(event) =>
                    setSelectedStylePresetId(
                      event.target.value as ShortStoryWritingStylePresetId | "",
                    )
                  }
                  value={selectedStylePresetId}
                >
                  <option value="">选择一个写作风格</option>
                  {shortStoryWritingStylePresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label} · {preset.referenceLabel.replace("灵感参考：", "")}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!selectedStylePreset}
                onClick={applySelectedStylePreset}
                type="button"
              >
                <Sparkles aria-hidden="true" className="h-4 w-4" />
                应用到文风字段
              </button>
            </div>

            {selectedStylePreset ? (
              <div className="mt-4 border-t border-ink-950/10 pt-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink-950">
                      {selectedStylePreset.label}
                    </p>
                    <p className="mt-1 text-xs text-ink-700">
                      {selectedStylePreset.referenceLabel}
                    </p>
                  </div>
                  {appliedStylePresetId === selectedStylePreset.id ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-signal-700">
                      <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                      已填入，保存后生效
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-700">
                  {selectedStylePreset.summary}
                </p>
                <dl className="mt-3 grid gap-x-5 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
                  {selectedStylePreset.dimensions.map((dimension) => (
                    <div key={dimension.label}>
                      <dt className="text-xs font-semibold text-ink-700">
                        {dimension.label}
                      </dt>
                      <dd className="mt-0.5 text-xs leading-5 text-ink-900">
                        {dimension.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs leading-5 text-ink-700">
                  应用时会替换旧预设，并把原有自定义文风保留为“作者补充”。下方内容仍可继续修改；只有点击“保存并记录版本”后才进入正式设定。
                </p>
              </div>
            ) : (
              <p className="mt-3 text-xs leading-5 text-ink-700">
                也可以不选预设，直接在下方填写自己的文风规则与样例。
              </p>
            )}
          </section>
        ) : null}

        <section className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-signal-500/10 text-signal-600">
              <Eye aria-hidden="true" className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                叙事视角
              </h2>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-ink-700">
                作为作品的默认规则，单独决定读者跟随谁、能知道什么，以及何时允许切换认知中心。它可以和任意写作风格组合，不会覆盖文风规则。
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={labelClass}>叙事镜头</span>
              <select
                className={`${inputClass} min-h-10 w-full min-w-0 py-2`}
                onChange={(event) =>
                  setSelectedNarrativePerspectiveId(
                    event.target.value as NarrativePerspectiveId | "",
                  )
                }
                value={selectedNarrativePerspectiveId}
              >
                <option value="">选择一种叙事视角</option>
                {narrativePerspectives.map((perspective) => (
                  <option key={perspective.id} value={perspective.id}>
                    {perspective.label}
                    {perspective.recommended ? "（推荐）" : ""}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!selectedNarrativePerspective}
              onClick={applySelectedNarrativePerspective}
              type="button"
            >
              <Eye aria-hidden="true" className="h-4 w-4" />
              应用到视角字段
            </button>
          </div>

          {selectedNarrativePerspective ? (
            <div className="mt-4 border-t border-ink-950/10 pt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink-950">
                    {selectedNarrativePerspective.label}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-ink-700">
                    {selectedNarrativePerspective.summary}
                  </p>
                </div>
                {currentNarrativePerspectiveId ===
                selectedNarrativePerspective.id ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-signal-700">
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                    已填入，保存后生效
                  </span>
                ) : null}
              </div>
              <dl className="mt-3 grid gap-x-5 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
                {selectedNarrativePerspective.dimensions.map((dimension) => (
                  <div key={dimension.label}>
                    <dt className="text-xs font-semibold text-ink-700">
                      {dimension.label}
                    </dt>
                    <dd className="mt-0.5 text-xs leading-5 text-ink-900">
                      {dimension.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs leading-5 text-ink-700">
                应用时会替换旧视角预设，并保留手工补充。下方规则仍可编辑；只有点击“保存并记录版本”后才进入正式设定。
              </p>
            </div>
          ) : (
            <p className="mt-3 text-xs leading-5 text-ink-700">
              推荐网文和强代入作品使用“沉浸式第三人称限制”；多主角长篇可选择“多人物限制视角”。也可以直接在下方填写自定义视角规则。
            </p>
          )}
        </section>

        {settingGroups.map((group) => (
          <section
            className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel"
            key={group.title}
          >
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                {group.title}
              </h2>
              <p className="mt-1 text-xs leading-5 text-ink-700">
                {group.description}
              </p>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {group.fields.map((field) => (
                <label className="flex flex-col gap-1.5" key={field.name}>
                  <span className={labelClass}>
                    {isShortStory && field.name === "styleSample"
                      ? "文风规则与样例"
                      : field.label}
                  </span>
                  <textarea
                    className={`${inputClass} py-2 leading-5`}
                    name={field.name}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [field.name]: event.target.value,
                      }))
                    }
                    placeholder={
                      isShortStory && field.name === "styleSample"
                        ? "可选择上方预设，也可填写句式节奏、解释密度、悬疑方式和结局倾向。叙事视角请使用独立字段。"
                        : field.placeholder
                    }
                    rows={Math.min(field.rows, 3)}
                    value={values[field.name]}
                  />
                </label>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>修改原因</span>
            <textarea
              className={`${inputClass} min-h-20 py-2 leading-5`}
              name="changeReason"
              placeholder="例如：初版设定、补全主线矛盾、调整公众号定位"
            />
          </label>
        </section>

        <div className="flex flex-wrap items-center gap-3">
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
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}

function ProjectSettingAiPanel({
  adoptAction,
  generateCompletionAction,
  generateAction,
  generateOptimizationAction,
  hasApiKey,
  projectTitle,
  tasks,
}: {
  adoptAction: (taskId: string) => Promise<void>;
  generateCompletionAction: () => Promise<void>;
  generateAction: () => Promise<void>;
  generateOptimizationAction: () => Promise<void>;
  hasApiKey: boolean;
  projectTitle: string;
  tasks: readonly ProjectSettingAiTask[];
}) {
  const hasActiveGeneration = tasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const canGenerate = hasApiKey && !hasActiveGeneration;

  return (
    <section className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <Bot aria-hidden="true" className="h-4 w-4" />
            AI 总设定草案
          </div>
          <h2 className="mt-1.5 text-base font-semibold text-ink-950">
            根据项目基础信息生成总设定草案
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-ink-700">
            AI 只生成可审阅草案并写入任务记录。点击采用后，草案才会写入正式总设定档并生成历史版本。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ProjectSettingAiButton
            action={generateAction}
            canGenerate={canGenerate}
            disabledLabel={hasActiveGeneration ? "生成中" : "生成草案"}
            label="生成草案"
            preserveKey={`project-setting-generation-${projectTitle}`}
            statusText="已开始生成总设定草案，页面会留在当前位置并自动刷新结果。"
            variant="dark"
          />
          <ProjectSettingAiButton
            action={generateCompletionAction}
            canGenerate={canGenerate}
            disabledLabel={hasActiveGeneration ? "生成中" : "补全缺失"}
            label="补全缺失"
            preserveKey={`project-setting-completion-${projectTitle}`}
            statusText="已开始补全总设定缺失字段，页面会留在当前位置并自动刷新结果。"
          />
          <ProjectSettingAiButton
            action={generateOptimizationAction}
            canGenerate={canGenerate}
            disabledLabel={hasActiveGeneration ? "生成中" : "优化建议"}
            label="优化建议"
            preserveKey={`project-setting-optimization-${projectTitle}`}
            statusText="已开始生成总设定优化建议，页面会留在当前位置并自动刷新结果。"
          />
        </div>
      </div>

      {!hasApiKey ? (
        <p className="mt-3 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          未配置 API Key，暂不能调用模型；已有总设定草案任务仍可查看。
        </p>
      ) : null}

      {hasActiveGeneration ? (
        <p className="mt-3 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          当前项目已有总设定生成任务在后台运行，页面会自动刷新显示结果，完成前不会重复发起新的模型调用。
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-ink-950/20 bg-paper-50 p-4 text-sm text-ink-700">
          <p className="font-semibold text-ink-950">还没有总设定草案任务</p>
          <p className="mt-2 leading-6">
            生成后会在这里显示最近任务，包含模型、模板版本、状态和输出。验收看板也会据此确认
            project_setting_generation 审计记录。
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {tasks.map((task) => {
            const parsedDraft = parseProjectSettingGenerationOutput(
              task.outputText,
            );
            const canAdopt =
              task.status === "completed" &&
              task.adoptionState === "not_reviewed" &&
              hasProjectSettingDraftValues(parsedDraft);

            return (
              <article
                className="rounded-lg border border-ink-950/10 bg-paper-50 p-3"
                key={task.id}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
                      <span className="rounded-md bg-white px-2.5 py-1">
                        {aiTaskStatusLabel(task.status)}
                      </span>
                      <span className="rounded-md bg-white px-2.5 py-1">
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
                    <p className="mt-1 text-xs text-ink-700">
                      {task.inputContextSummary || `${projectTitle} 总设定生成`}
                    </p>
                  </div>

                  {canAdopt ? (
                    <form action={adoptAction.bind(null, task.id)}>
                      <button
                        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
                        type="submit"
                      >
                        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                        采用到总设定档
                      </button>
                    </form>
                  ) : null}
                </div>

                <div className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-white p-3 font-mono text-xs leading-5 text-ink-700">
                  {task.outputText || task.errorMessage || "任务尚未产生输出。"}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ProjectSettingAiButton({
  action,
  canGenerate,
  disabledLabel,
  label,
  preserveKey,
  statusText,
  variant = "outline",
}: {
  action: () => Promise<void>;
  canGenerate: boolean;
  disabledLabel: string;
  label: string;
  preserveKey: string;
  statusText: string;
  variant?: "dark" | "outline";
}) {
  return (
    <PreserveScrollForm
      action={action}
      preserveKey={preserveKey}
      statusText={statusText}
    >
      <button
        className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
          variant === "dark"
            ? canGenerate
              ? "bg-ink-950 text-white hover:bg-ink-800"
              : "cursor-not-allowed bg-ink-800 text-white opacity-60"
            : canGenerate
              ? "border border-ink-950/15 bg-white text-ink-800 hover:bg-paper-100"
              : "cursor-not-allowed border border-ink-950/15 bg-paper-100 text-ink-700"
        }`}
        disabled={!canGenerate}
        type="submit"
      >
        <Sparkles aria-hidden="true" className="h-4 w-4" />
        {canGenerate ? label : disabledLabel}
      </button>
    </PreserveScrollForm>
  );
}
