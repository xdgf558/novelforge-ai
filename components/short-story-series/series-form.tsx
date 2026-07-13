import type { ShortStorySeries } from "@prisma/client";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { shortStorySeriesStatusOptions } from "@/lib/short-story-series/fields";

type SeriesFormProps = {
  action: (formData: FormData) => Promise<void>;
  series?: ShortStorySeries;
  submitLabel: string;
  title: string;
  subtitle: string;
};

const inputClass =
  "min-h-11 rounded-md border border-ink-950/15 bg-white px-3 text-sm text-ink-950 shadow-panel outline-none transition placeholder:text-ink-700/45 focus:border-signal-500 focus:ring-4 focus:ring-signal-500/15";

const textFields = [
  {
    name: "premise",
    label: "系列定位",
    description: "说明这些独立故事为什么属于同一个系列，以及读者持续追看的核心承诺。",
    placeholder: "例如：一名失忆调查员在不同城市处理独立异常案件，并逐步逼近自己的失忆真相。",
  },
  {
    name: "sharedWorldview",
    label: "共享世界观",
    description: "记录每篇都必须成立的时代、组织、科技、能力和社会规则。",
    placeholder: "写下跨篇共用的世界基础与不可冲突事实。",
  },
  {
    name: "continuityRules",
    label: "跨篇连续性规则",
    description: "明确人物经历、关系、伤病、权限和已知信息如何从前篇累积到后篇。",
    placeholder: "例如：主角不会忘记已确认的案件事实；公开决裂的关系必须在后篇保留影响。",
  },
  {
    name: "recurringElements",
    label: "复现人物 / 组织 / 技术",
    description: "记录可以再次出现的稳定元素，以及它们复现时必须保持的身份边界。",
    placeholder: "列出常驻配角、组织、地点、科技、道具或案件机制。",
  },
  {
    name: "longTermMysteries",
    label: "长期谜团",
    description: "只记录跨篇推进的问题，不替代每一篇必须独立闭合的起因、调查、真相和结局。",
    placeholder: "列出尚未揭晓的系列级谜团、已公开线索和暂不可揭示的答案边界。",
  },
  {
    name: "futureDirection",
    label: "后续推进方向",
    description: "记录下一阶段可以累积的人物变化和系列线推进，不直接创建下一篇故事。",
    placeholder: "例如：下一篇让搭档第一次质疑主角的判断，同时只推进一小步幕后组织线。",
  },
] as const;

export function SeriesForm({
  action,
  series,
  submitLabel,
  title,
  subtitle,
}: SeriesFormProps) {
  return (
    <div className="space-y-6">
      <header>
        <Link
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
          href={series ? `/series/${series.id}` : "/series"}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          返回
        </Link>
        <h1 className="text-2xl font-semibold tracking-normal text-ink-950">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
          {subtitle}
        </p>
      </header>

      <form action={action} className="space-y-5">
        <section className="grid gap-4 rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink-800">系列名称</span>
            <input
              className={inputClass}
              defaultValue={series?.title ?? ""}
              maxLength={120}
              name="title"
              placeholder="例如：雾城异闻录"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink-800">系列状态</span>
            <select
              className={inputClass}
              defaultValue={series?.status ?? "active"}
              name="status"
            >
              {shortStorySeriesStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {textFields.map((field) => (
            <label
              className="flex flex-col gap-2 md:col-span-2"
              key={field.name}
            >
              <span className="text-sm font-medium text-ink-800">
                {field.label}
              </span>
              <span className="text-xs leading-5 text-ink-700">
                {field.description}
              </span>
              <textarea
                className={`${inputClass} min-h-28 py-3 leading-6`}
                defaultValue={series?.[field.name] ?? ""}
                name={field.name}
                placeholder={field.placeholder}
              />
            </label>
          ))}
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
            href={series ? `/series/${series.id}` : "/series"}
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}
