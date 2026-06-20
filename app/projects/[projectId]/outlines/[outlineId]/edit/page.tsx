import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { updateOutline } from "@/app/projects/[projectId]/outlines/actions";
import {
  outlineLevelLabel,
  outlineNumberFields,
  outlineStatusOptions,
  outlineTextFields,
  outlineValidationErrorMessages,
  outlineValuesFromRecord,
  type OutlineValidationErrorCode,
} from "@/lib/outline-fields";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type EditOutlinePageProps = {
  params: Promise<{
    projectId: string;
    outlineId: string;
  }>;
  searchParams?: Promise<{
    outlineError?: string;
  }>;
};

const inputClass =
  "min-h-11 rounded-md border border-ink-950/15 bg-white px-3 text-sm text-ink-950 shadow-panel outline-none transition placeholder:text-ink-700/45 focus:border-signal-500 focus:ring-4 focus:ring-signal-500/15";

const labelClass = "text-sm font-medium text-ink-800";

export default async function EditOutlinePage({
  params,
  searchParams,
}: EditOutlinePageProps) {
  const { projectId, outlineId } = await params;
  const query = (await searchParams) ?? {};
  const [project, outline] = await Promise.all([
    prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
        title: true,
      },
    }),
    prisma.outline.findFirst({
      where: {
        id: outlineId,
        projectId,
      },
    }),
  ]);

  if (!project || !outline) {
    notFound();
  }

  const values = outlineValuesFromRecord(outline);
  const outlineErrorMessage =
    outlineValidationErrorMessages[
      query.outlineError as OutlineValidationErrorCode
    ];
  const visibleNumberFields = outlineNumberFields.filter((field) =>
    field.levels.includes(values.level),
  );
  const visibleTextFields = outlineTextFields.filter((field) =>
    field.levels.includes(values.level),
  );
  const hiddenNumberFields = outlineNumberFields.filter(
    (field) => !field.levels.includes(values.level),
  );
  const hiddenTextFields = outlineTextFields.filter(
    (field) => !field.levels.includes(values.level),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
          href={`/projects/${project.id}/outlines`}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          返回大纲
        </Link>
        <p className="text-sm font-semibold text-signal-600">{project.title}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
          编辑{outlineLevelLabel(values.level)}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
          大纲是正式创作记忆的一部分。AI 草案需要作者整理确认后，才会通过这里保存进正式大纲。
        </p>
      </div>

      {outlineErrorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {outlineErrorMessage}
        </div>
      ) : null}

      <form
        action={updateOutline.bind(null, project.id, outline.id)}
        className="space-y-5"
      >
        <input name="level" type="hidden" value={values.level} />
        {hiddenNumberFields.map((field) => (
          <input
            key={field.name}
            name={field.name}
            type="hidden"
            value={values[field.name] ?? ""}
          />
        ))}
        {hiddenTextFields.map((field) => (
          <input
            key={field.name}
            name={field.name}
            type="hidden"
            value={values[field.name] ?? ""}
          />
        ))}

        <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
          <div className="grid gap-4 md:grid-cols-[160px_1fr_180px]">
            <div className="flex flex-col gap-2">
              <span className={labelClass}>大纲层级</span>
              <div className="flex min-h-11 items-center rounded-md border border-ink-950/10 bg-paper-50 px-3 text-sm font-semibold text-ink-800">
                {outlineLevelLabel(values.level)}
              </div>
            </div>
            <label className="flex flex-col gap-2">
              <span className={labelClass}>标题</span>
              <input
                className={inputClass}
                defaultValue={values.title}
                maxLength={180}
                name="title"
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelClass}>状态</span>
              <select
                className={inputClass}
                defaultValue={values.status}
                name="status"
              >
                {outlineStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink-950">编号与范围</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {visibleNumberFields.map((field) => (
              <label className="flex flex-col gap-2" key={field.name}>
                <span className={labelClass}>{field.label}</span>
                <input
                  className={inputClass}
                  defaultValue={values[field.name] ?? ""}
                  min={field.min}
                  name={field.name}
                  type="number"
                />
              </label>
            ))}
            <label className="flex flex-col gap-2">
              <span className={labelClass}>排序值</span>
              <input
                className={inputClass}
                defaultValue={values.sortOrder ?? ""}
                min={0}
                name="sortOrder"
                type="number"
              />
            </label>
          </div>
        </section>

        <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink-950">大纲内容</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {visibleTextFields.map((field) => (
              <label className="flex flex-col gap-2" key={field.name}>
                <span className={labelClass}>{field.label}</span>
                <textarea
                  className={`${inputClass} py-3 leading-6`}
                  defaultValue={values[field.name]}
                  name={field.name}
                  placeholder={field.placeholder}
                  rows={field.rows}
                />
              </label>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
            type="submit"
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            保存大纲
          </button>
          <Link
            className="inline-flex min-h-11 items-center rounded-md border border-ink-950/15 bg-white px-4 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
            href={`/projects/${project.id}/outlines`}
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}
