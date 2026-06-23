import type { ProjectSetting } from "@prisma/client";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  History,
  Save,
  Sparkles,
} from "lucide-react";
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
  projectSettingGroups,
  projectSettingValuesFromRecord,
  type ProjectSettingValues,
} from "@/lib/project-setting-fields";

type ProjectSettingFormProps = {
  action: (formData: FormData) => Promise<void>;
  adoptProjectSettingAction: (taskId: string) => Promise<void>;
  aiTasks: readonly ProjectSettingAiTask[];
  generateProjectSettingAction: () => Promise<void>;
  hasApiKey: boolean;
  project: {
    id: string;
    title: string;
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
  generateProjectSettingAction,
  hasApiKey,
  project,
  setting,
  versionCount,
}: ProjectSettingFormProps) {
  const values = valuesFromSetting(setting);

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
        generateAction={generateProjectSettingAction}
        hasApiKey={hasApiKey}
        projectTitle={project.title}
        tasks={aiTasks}
      />

      <form action={action} className="space-y-4">
        {projectSettingGroups.map((group) => (
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
                  <span className={labelClass}>{field.label}</span>
                  <textarea
                    className={`${inputClass} py-2 leading-5`}
                    defaultValue={values[field.name]}
                    name={field.name}
                    placeholder={field.placeholder}
                    rows={Math.min(field.rows, 3)}
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
  generateAction,
  hasApiKey,
  projectTitle,
  tasks,
}: {
  adoptAction: (taskId: string) => Promise<void>;
  generateAction: () => Promise<void>;
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

        <form action={generateAction}>
          <button
            className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
              canGenerate
                ? "bg-ink-950 text-white hover:bg-ink-800"
                : "cursor-not-allowed border border-ink-950/15 bg-paper-100 text-ink-700"
            }`}
            disabled={!canGenerate}
            type="submit"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            {hasActiveGeneration ? "生成中" : "生成总设定草案"}
          </button>
        </form>
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
              task.adoptionState !== "adopted" &&
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
