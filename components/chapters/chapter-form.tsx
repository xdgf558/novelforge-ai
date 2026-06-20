import type { Chapter, Project } from "@prisma/client";
import Link from "next/link";
import { ArrowLeft, History, Save } from "lucide-react";
import {
  chapterFieldGroups,
  chapterTextFields,
  formatChapterWordCount,
  chapterStatusOptions,
  chapterValuesFromRecord,
  type ChapterValues,
} from "@/lib/chapter-fields";

type ChapterFormProps = {
  action: (formData: FormData) => Promise<void>;
  chapter?: Chapter;
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
  const canFinalizeFromPolished = Boolean(values.polishedText.trim());
  const canFinalizeFromDraft = Boolean(values.draftText.trim());
  const createHiddenTextFields = chapterTextFields.filter(
    (field) => field.name !== "goal",
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
            返回章节
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
            <input name="changeReason" type="hidden" value="初始章节壳子" />
            {createHiddenTextFields.map((field) => (
              <input
                key={field.name}
                name={field.name}
                type="hidden"
                value={values[field.name]}
              />
            ))}
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
            <span className={labelClass}>章节号</span>
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
            <span className={labelClass}>章节标题</span>
            <input
              className={inputClass}
              defaultValue={values.title}
              maxLength={160}
              name="title"
              placeholder="例如：第一份借命契约"
              required
            />
          </label>

          {isCreateForm ? null : (
            <>
              <label className="flex flex-col gap-2">
                <span className={labelClass}>章节状态</span>
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
                {group.title}
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                {group.description}
              </p>
            </div>

            <div className="mt-5 grid gap-4">
              {group.fields.map((field) => (
                <div className="flex flex-col gap-2" key={field.name}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label className={labelClass} htmlFor={field.name}>
                      {field.label}
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
                    placeholder={field.placeholder}
                    rows={field.rows}
                  />
                  {!isCreateForm && field.name === "finalText" ? (
                    <div className="space-y-1 text-xs leading-5 text-ink-700">
                      <p>
                        点击后会把当前精修稿或草稿正文写入定稿正文、把章节状态设为“已定稿”，并保存新的章节快照。
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
                placeholder="例如：初始章节草稿、补全节拍、整理定稿正文"
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
