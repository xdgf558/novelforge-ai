"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  outlineLevelOptions,
  type OutlineLevel,
} from "@/lib/outline-fields";

type OutlineAiGenerateFormProps = {
  action: (formData: FormData) => Promise<void>;
  canGenerate: boolean;
  hasActiveTask: boolean;
};

export function OutlineAiGenerateForm({
  action,
  canGenerate,
  hasActiveTask,
}: OutlineAiGenerateFormProps) {
  const [targetLevel, setTargetLevel] = useState<OutlineLevel>("chapter");

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
        目标层级
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
          章节条目数
          <input
            className="min-h-10 w-28 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none"
            defaultValue={10}
            max={30}
            min={1}
            name="chapterCount"
            type="number"
          />
        </label>
      ) : null}
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
        {hasActiveTask ? "生成中" : "生成大纲草案"}
      </button>
    </form>
  );
}
