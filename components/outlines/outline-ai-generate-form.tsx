"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  outlineLevelOptions,
  type OutlineLevel,
} from "@/lib/outline-fields";
import { PreserveScrollForm } from "@/components/preserve-scroll-form";

type OutlineAiGenerateFormProps = {
  action: (formData: FormData) => Promise<void>;
  canGenerate: boolean;
  defaultTargetChapterNumber: number;
  hasActiveTask: boolean;
  initialTargetLevel: OutlineLevel;
};

export function OutlineAiGenerateForm({
  action,
  canGenerate,
  defaultTargetChapterNumber,
  hasActiveTask,
  initialTargetLevel,
}: OutlineAiGenerateFormProps) {
  const [targetLevel, setTargetLevel] = useState<OutlineLevel>(initialTargetLevel);

  return (
    <PreserveScrollForm
      action={action}
      className="flex flex-wrap items-start gap-2"
      preserveKey="outline-generation"
      statusText="已开始生成大纲草案，页面会留在当前位置并自动刷新结果。"
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
        <span className="min-h-4">目标层级</span>
        <select
          className="min-h-10 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none"
          name="targetLevel"
          onChange={(event) => setTargetLevel(event.target.value as OutlineLevel)}
          value={targetLevel}
        >
          {outlineLevelOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {targetLevel === "chapter" ? (
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
          <span className="min-h-4">目标章节号</span>
          <input
            className="min-h-10 w-28 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none"
            defaultValue={defaultTargetChapterNumber}
            min={1}
            name="targetChapterNumber"
            required
            type="number"
          />
          <span className="text-[11px] font-normal text-ink-600">
            一次只生成这一章
          </span>
        </label>
      ) : null}
      <label className="mt-5 flex min-h-10 items-center gap-2 text-xs font-medium text-ink-700">
        <input
          className="h-4 w-4 rounded border-ink-950/20 text-signal-600"
          name="skipEndingPlan"
          type="checkbox"
        />
        本次不引用终局规划
      </label>
      <button
        className={`mt-5 inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
          canGenerate
            ? "bg-ink-950 text-white hover:bg-ink-800"
            : "cursor-not-allowed border border-ink-950/15 bg-paper-100 text-ink-700"
        }`}
        disabled={!canGenerate}
        type="submit"
      >
        <Sparkles aria-hidden="true" className="h-4 w-4" />
        {hasActiveTask ? "生成中" : "生成大纲草案"}
      </button>
    </PreserveScrollForm>
  );
}
