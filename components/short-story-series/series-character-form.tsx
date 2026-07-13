import type { ShortStorySeriesCharacter } from "@prisma/client";
import Link from "next/link";
import { Save } from "lucide-react";
import { shortStorySeriesCharacterStatusOptions } from "@/lib/short-story-series/fields";

type SeriesCharacterFormProps = {
  action: (formData: FormData) => Promise<void>;
  cancelHref?: string;
  character?: ShortStorySeriesCharacter;
  compact?: boolean;
  submitLabel: string;
};

const inputClass =
  "min-h-11 rounded-md border border-ink-950/15 bg-white px-3 text-sm text-ink-950 shadow-panel outline-none transition placeholder:text-ink-700/45 focus:border-signal-500 focus:ring-4 focus:ring-signal-500/15";

const fields = [
  {
    name: "roleInSeries",
    label: "系列职责",
    placeholder: "主角 / 固定搭档 / 反复出现的委托人",
  },
  {
    name: "identity",
    label: "稳定身份",
    placeholder: "跨篇保持不变的身份和公开背景",
  },
  {
    name: "accumulatedState",
    label: "累计经历与当前状态",
    placeholder: "记录已经发生且后续必须承认的经历、伤病、能力和认知变化。",
  },
  {
    name: "relationshipState",
    label: "当前关系状态",
    placeholder: "记录与其他核心人物的信任、冲突、承诺和未解决张力。",
  },
  {
    name: "knownInformation",
    label: "已知信息边界",
    placeholder: "这个人物目前知道什么、不知道什么，避免后篇无依据地提前知情。",
  },
  {
    name: "recurringRules",
    label: "复现规则",
    placeholder: "再次登场时必须保持的说话方式、行为习惯、能力边界或禁区。",
  },
  {
    name: "notes",
    label: "备注",
    placeholder: "其他跨篇提醒",
  },
] as const;

export function SeriesCharacterForm({
  action,
  cancelHref,
  character,
  compact = false,
  submitLabel,
}: SeriesCharacterFormProps) {
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-800">人物姓名</span>
        <input
          className={inputClass}
          defaultValue={character?.name ?? ""}
          maxLength={120}
          name="name"
          placeholder="例如：林默"
          required
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-800">人物状态</span>
        <select
          className={inputClass}
          defaultValue={character?.status ?? "active"}
          name="status"
        >
          {shortStorySeriesCharacterStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {fields.map((field, index) => {
        if (compact && index > 1) {
          return null;
        }

        return (
          <label
            className={`flex flex-col gap-2 ${index > 1 ? "md:col-span-2" : ""}`}
            key={field.name}
          >
            <span className="text-sm font-medium text-ink-800">
              {field.label}
            </span>
            {index > 1 ? (
              <textarea
                className={`${inputClass} min-h-24 py-3 leading-6`}
                defaultValue={character?.[field.name] ?? ""}
                name={field.name}
                placeholder={field.placeholder}
              />
            ) : (
              <input
                className={inputClass}
                defaultValue={character?.[field.name] ?? ""}
                name={field.name}
                placeholder={field.placeholder}
              />
            )}
          </label>
        );
      })}

      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
          type="submit"
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          {submitLabel}
        </button>
        {cancelHref ? (
          <Link
            className="inline-flex min-h-11 items-center rounded-md border border-ink-950/15 bg-white px-4 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
            href={cancelHref}
          >
            取消
          </Link>
        ) : null}
      </div>
    </form>
  );
}
