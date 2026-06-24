import type { Project } from "@prisma/client";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

type ProjectFormProps = {
  action: (formData: FormData) => Promise<void>;
  project?: Project;
  submitLabel: string;
  title: string;
  subtitle: string;
};

const inputClass =
  "min-h-11 rounded-md border border-ink-950/15 bg-white px-3 text-sm text-ink-950 shadow-panel outline-none transition placeholder:text-ink-700/45 focus:border-signal-500 focus:ring-4 focus:ring-signal-500/15";

const labelClass = "text-sm font-medium text-ink-800";

export function ProjectForm({
  action,
  project,
  submitLabel,
  title,
  subtitle,
}: ProjectFormProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
            href={project ? `/projects/${project.id}` : "/"}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            返回
          </Link>
          <h1 className="text-2xl font-semibold tracking-normal text-ink-950">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">
            {subtitle}
          </p>
        </div>
      </div>

      <form action={action} className="space-y-5">
        <section className="grid gap-4 rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel md:grid-cols-2">
          <label className="flex flex-col gap-2 md:col-span-2">
            <span className={labelClass}>小说标题</span>
            <input
              className={inputClass}
              defaultValue={project?.title ?? ""}
              maxLength={120}
              name="title"
              placeholder="例如：雾城借命人"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className={labelClass}>题材类型</span>
            <input
              className={inputClass}
              defaultValue={project?.genre ?? ""}
              name="genre"
              placeholder="都市异能 / 玄幻 / 悬疑"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className={labelClass}>目标读者</span>
            <input
              className={inputClass}
              defaultValue={project?.targetAudience ?? ""}
              name="targetAudience"
              placeholder="微信公众号男性读者"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className={labelClass}>连载平台</span>
            <input
              className={inputClass}
              defaultValue={project?.platform ?? ""}
              name="platform"
              placeholder="微信公众号"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className={labelClass}>更新频率</span>
            <input
              className={inputClass}
              defaultValue={project?.updateFrequency ?? ""}
              name="updateFrequency"
              placeholder="每日一更"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className={labelClass}>总字数目标</span>
            <input
              className={inputClass}
              defaultValue={project?.totalWordTarget ?? ""}
              min={1}
              name="totalWordTarget"
              placeholder="1000000"
              type="number"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className={labelClass}>单章最小字数</span>
              <input
                className={inputClass}
                defaultValue={project?.chapterWordMin ?? ""}
                min={1}
                name="chapterWordMin"
                placeholder="1800"
                type="number"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className={labelClass}>单章最大字数</span>
              <input
                className={inputClass}
                defaultValue={project?.chapterWordMax ?? ""}
                min={1}
                name="chapterWordMax"
                placeholder="2800"
                type="number"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className={labelClass}>AI 每日 token 提醒</span>
            <input
              className={inputClass}
              defaultValue={project?.aiDailyTokenBudget ?? ""}
              min={1}
              name="aiDailyTokenBudget"
              placeholder="例如：200000"
              type="number"
            />
            <span className="text-xs leading-5 text-ink-700">
              只做提醒，不会阻止生成；留空表示不提醒。
            </span>
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className={labelClass}>故事简介</span>
            <textarea
              className={`${inputClass} min-h-32 py-3 leading-6`}
              defaultValue={project?.description ?? ""}
              name="description"
              placeholder="一句话简介、主线卖点或开篇灵感"
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className={labelClass}>公众号定位</span>
            <textarea
              className={`${inputClass} min-h-24 py-3 leading-6`}
              defaultValue={project?.wechatPositioning ?? ""}
              name="wechatPositioning"
              placeholder="读者期待、标题风格、发布语气"
            />
          </label>
        </section>

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
            href={project ? `/projects/${project.id}` : "/"}
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}
