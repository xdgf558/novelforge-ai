import type { Chapter, Project } from "@prisma/client";
import Link from "next/link";
import { ArrowLeft, History, Save } from "lucide-react";
import {
  chapterFieldGroups,
  chapterTextFields,
  formatChapterWordCount,
  chapterStatusOptions,
  chapterValuesFromRecord,
  shortStoryUnitPlanFields,
  type ChapterValues,
} from "@/lib/chapter-fields";
import { isShortStoryProject } from "@/lib/projects/work-types";
import { ChapterEditLocator } from "./chapter-edit-locator";

type ChapterFormProps = {
  action: (formData: FormData) => Promise<void>;
  chapter?: Chapter;
  editLocator?: {
    fieldName?: string | null;
    findText?: string | null;
  };
  formMessage?: string;
  initialValues?: Partial<ChapterValues>;
  project: Project;
  submitLabel: string;
  subtitle: string;
  title: string;
  versionCount?: number;
};

const inputClass =
  "min-h-11 rounded-md border border-ink-950/15 bg-white px-3 text-sm text-ink-950 shadow-panel outline-none transition placeholder:text-ink-700/45 focus:border-signal-500 focus:ring-4 focus:ring-signal-500/15";

const labelClass = "text-sm font-medium text-ink-800";

export function ChapterForm({
  action,
  chapter,
  editLocator,
  formMessage,
  initialValues,
  project,
  submitLabel,
  subtitle,
  title,
  versionCount,
}: ChapterFormProps) {
  const values = chapterValuesFromRecord(chapter ?? initialValues);
  const isCreateForm = !chapter;
  const shortStoryProject = isShortStoryProject(project.workType);
  const canFinalizeFromPolished = Boolean(values.polishedText.trim());
  const canFinalizeFromDraft = Boolean(values.draftText.trim());
  const shortStoryUnitPlanFieldNames = new Set(
    shortStoryUnitPlanFields.map((field) => field.name),
  );
  const createHiddenTextFields = chapterTextFields.filter(
    (field) =>
      field.name !== "goal" &&
      !(shortStoryProject && shortStoryUnitPlanFieldNames.has(field.name)),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
            href={
              chapter
                ? `/projects/${project.id}/chapters/${chapter.id}`
                : `/projects/${project.id}/chapters`
            }
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            返回{shortStoryProject ? "写作单元" : "章节"}
          </Link>
          <p className="text-sm font-semibold text-signal-600">
            {project.title}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
            {subtitle}
          </p>
        </div>

        {chapter ? (
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
            href={`/projects/${project.id}/chapters/${chapter.id}/history`}
          >
            <History aria-hidden="true" className="h-4 w-4" />
            历史版本 {versionCount ?? 0}
          </Link>
        ) : null}
      </div>

      <form action={action} className="space-y-5">
        {editLocator ? (
          <ChapterEditLocator
            fieldName={editLocator.fieldName}
            findText={editLocator.findText}
          />
        ) : null}

        {formMessage ? (
          <div
            className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
            role="status"
          >
            {formMessage}
          </div>
        ) : null}

        {isCreateForm ? (
          <>
            <input
              name="status"
              type="hidden"
              value={values.status || "draft"}
            />
            <input
              name="changeReason"
              type="hidden"
              value={shortStoryProject ? "初始写作单元" : "初始章节壳子"}
            />
            {createHiddenTextFields.map((field) => (
              <input
                key={field.name}
                name={field.name}
                type="hidden"
                value={values[field.name]}
              />
            ))}
            {shortStoryProject ? null : (
              <input name="unitWordTarget" type="hidden" value="0" />
            )}
          </>
        ) : null}

        {!isCreateForm && !shortStoryProject ? (
          <>
            {shortStoryUnitPlanFields.map((field) => (
              <input
                key={field.name}
                name={field.name}
                type="hidden"
                value={values[field.name]}
              />
            ))}
            <input name="unitWordTarget" type="hidden" value="0" />
          </>
        ) : null}

        <section
          className={`grid gap-4 rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel ${
            isCreateForm
              ? "md:grid-cols-[160px_1fr]"
              : "md:grid-cols-[160px_1fr_180px]"
          }`}
        >
          <label className="flex flex-col gap-2">
            <span className={labelClass}>
              {shortStoryProject ? "单元序号" : "章节号"}
            </span>
            <input
              className={inputClass}
              defaultValue={values.chapterNumber}
              min={1}
              name="chapterNumber"
              required
              type="number"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className={labelClass}>
              {shortStoryProject ? "单元标题" : "章节标题"}
            </span>
            <input
              className={inputClass}
              defaultValue={values.title}
              maxLength={160}
              name="title"
              placeholder={
                shortStoryProject ? "例如：病历上的签名" : "例如：第一份借命契约"
              }
              required
            />
          </label>

          {isCreateForm ? null : (
            <>
              <label className="flex flex-col gap-2">
                <span className={labelClass}>
                  {shortStoryProject ? "单元状态" : "章节状态"}
                </span>
                <select
                  className={inputClass}
                  defaultValue={values.status || "draft"}
                  name="status"
                >
                  {chapterStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-md bg-paper-50 p-4 md:col-span-3">
                <p className="text-sm text-ink-700">当前字数</p>
                <p className="mt-1 text-lg font-semibold text-ink-950">
                  {formatChapterWordCount(values.wordCount)}
                </p>
              </div>
            </>
          )}
        </section>

        {shortStoryProject ? (
          <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                单元规划
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                把这个内部单元的场景功能、冲突、转折和蓝图兑现写清楚。AI
                节拍会优先遵守这些确认内容。
              </p>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <label className="flex flex-col gap-2 lg:col-span-2 lg:max-w-xs">
                <span className={labelClass}>目标字数</span>
                <input
                  className={inputClass}
                  defaultValue={values.unitWordTarget || ""}
                  min={0}
                  name="unitWordTarget"
                  placeholder="例如：5000"
                  step={100}
                  type="number"
                />
              </label>

              {shortStoryUnitPlanFields.map((field) => (
                <label className="flex flex-col gap-2" key={field.name}>
                  <span className={labelClass}>{field.label}</span>
                  <textarea
                    className={`${inputClass} min-h-28 py-3 leading-6`}
                    defaultValue={values[field.name]}
                    name={field.name}
                    placeholder={field.placeholder}
                    rows={field.rows}
                  />
                </label>
              ))}
            </div>
          </section>
        ) : null}

        {(isCreateForm
          ? [
              {
                ...chapterFieldGroups[0],
                fields: chapterFieldGroups[0].fields.filter(
                  (field) => field.name === "goal",
                ),
              },
            ]
          : chapterFieldGroups
        ).map((group) => (
          <section
            className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
            key={group.title}
          >
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                {shortStoryProject && group.title === "章节目标"
                  ? "单元目标与节拍"
                  : group.title}
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                {shortStoryProject && group.title === "章节目标"
                  ? "记录这个内部写作单元要完成的剧情功能；AI 会结合正式蓝图和单元规划生成细化节拍。"
                  : shortStoryProject && group.title === "作者备注"
                    ? "保存这个写作单元的临时提醒、修订计划和后续兑现注意事项。"
                    : group.description}
              </p>
            </div>

            <div className="mt-5 grid gap-4">
              {group.fields.map((field) => (
                <div className="flex flex-col gap-2" key={field.name}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label className={labelClass} htmlFor={field.name}>
                      {shortStoryProject && field.name === "goal"
                        ? "单元目标"
                        : shortStoryProject && field.name === "beats"
                          ? "单元节拍"
                          : field.label}
                    </label>
                    {!isCreateForm && field.name === "finalText" ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={`inline-flex min-h-10 items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold transition ${
                            canFinalizeFromPolished
                              ? "border-signal-500/40 bg-signal-500/10 text-signal-700 hover:bg-signal-500/15"
                              : "cursor-not-allowed border-ink-950/10 bg-paper-50 text-ink-700/50"
                          }`}
                          disabled={!canFinalizeFromPolished}
                          name="submitIntent"
                          title={
                            canFinalizeFromPolished
                              ? "将精修正文写入定稿正文"
                              : "精修正文为空，先保存精修正文后再定稿"
                          }
                          type="submit"
                          value="finalizeFromPolished"
                        >
                          用精修稿一键定稿
                        </button>
                        <button
                          className={`inline-flex min-h-10 items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold transition ${
                            canFinalizeFromDraft
                              ? "border-ink-950/15 bg-white text-ink-800 hover:bg-paper-100"
                              : "cursor-not-allowed border-ink-950/10 bg-paper-50 text-ink-700/50"
                          }`}
                          disabled={!canFinalizeFromDraft}
                          name="submitIntent"
                          title={
                            canFinalizeFromDraft
                              ? "将草稿正文写入定稿正文"
                              : "草稿正文为空，先保存草稿正文后再定稿"
                          }
                          type="submit"
                          value="finalizeFromDraft"
                        >
                          用草稿一键定稿
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <textarea
                    className={`${inputClass} scroll-mt-24 py-3 leading-6`}
                    defaultValue={values[field.name]}
                    id={field.name}
                    name={field.name}
                    placeholder={
                      shortStoryProject
                        ? shortStoryFieldPlaceholder(field.name, field.placeholder)
                        : field.placeholder
                    }
                    rows={field.rows}
                  />
                  {!isCreateForm && field.name === "finalText" ? (
                    <div className="space-y-1 text-xs leading-5 text-ink-700">
                      <p>
                        点击后会把当前精修稿或草稿正文写入定稿正文、把
                        {shortStoryProject ? "单元" : "章节"}
                        状态设为“已定稿”，并保存新的
                        {shortStoryProject ? "单元" : "章节"}快照。
                      </p>
                      {!canFinalizeFromPolished ? (
                        <p>精修正文为空时，“用精修稿一键定稿”会保持禁用。</p>
                      ) : null}
                      {!canFinalizeFromDraft ? (
                        <p>草稿正文为空时，“用草稿一键定稿”会保持禁用。</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ))}

        {isCreateForm ? null : (
          <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
            <label className="flex flex-col gap-2">
              <span className={labelClass}>修改原因</span>
              <textarea
                className={`${inputClass} min-h-24 py-3 leading-6`}
                name="changeReason"
                placeholder={
                  shortStoryProject
                    ? "例如：补全单元规划、调整转折、整理定稿正文"
                    : "例如：初始章节草稿、补全节拍、整理定稿正文"
                }
              />
            </label>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
            type="submit"
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            {submitLabel}
          </button>
          <Link
            className="inline-flex min-h-11 items-center rounded-md border border-ink-950/15 bg-white px-4 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
            href={
              chapter
                ? `/projects/${project.id}/chapters/${chapter.id}`
                : `/projects/${project.id}/chapters`
            }
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}

function shortStoryFieldPlaceholder(
  fieldName: (typeof chapterTextFields)[number]["name"],
  fallback: string,
) {
  const placeholders: Partial<Record<typeof fieldName, string>> = {
    goal: "例如：迫使主角接受契约，并把调查推进到医院旧档案室。",
    beats:
      "按顺序列出本单元的场景动作、压力变化、关键转折和蓝图兑现作用。",
    draftText:
      "这里保存写作单元草稿；它是完整短故事正文的一段，不需要内部标题。",
    polishedText: "这里保存精修后的连续正文候选，确认后可写入定稿正文。",
    finalText:
      "确认后的单元定稿。后续摘要、更新提取和连续性检查会以此为准。",
    notes:
      "例如：直接承接上一单元结尾，不重复人物介绍；结尾停在证据反转之后。",
  };

  return placeholders[fieldName] ?? fallback;
}
