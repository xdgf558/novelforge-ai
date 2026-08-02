"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { OutlineDraftCopySuggestion } from "@/lib/outline-draft-copy";
import { consumeOutlineDraftCopySuggestion } from "@/lib/outline-draft-copy-handoff";
import { outlineLevelLabel } from "@/lib/outline-fields";

export function OutlineDraftCopyTarget() {
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const suggestion = consumeOutlineDraftCopySuggestion(
      window.sessionStorage,
      window.location.pathname,
    );

    if (!suggestion) {
      return;
    }

    const form = document.querySelector<HTMLFormElement>(
      `form[data-outline-level="${suggestion.level}"]`,
    );

    if (!form) {
      setFeedback("没有找到对应的大纲表单，请返回 AI 规划重新复制。");
      return;
    }

    form.reset();
    fillOutlineForm(form, suggestion);
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    form.querySelector<HTMLInputElement>('[name="title"]')?.focus();
    setFeedback(
      `已填入${outlineLevelLabel(suggestion.level)}表单，请确认后保存。`,
    );
  }, []);

  if (!feedback) {
    return null;
  }

  return (
    <div
      className="mt-4 flex items-start gap-2 rounded-md border border-signal-600/25 bg-signal-600/10 px-3 py-2 text-xs leading-5 text-ink-800"
      role="status"
    >
      <CheckCircle2
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0 text-signal-600"
      />
      <span>{feedback}</span>
    </div>
  );
}

function fillOutlineForm(
  form: HTMLFormElement,
  suggestion: OutlineDraftCopySuggestion,
) {
  setFieldValue(form, "title", suggestion.title);
  setFieldValue(form, "goal", suggestion.goal);
  setFieldValue(form, "startChapter", suggestion.startChapter);
  setFieldValue(form, "endChapter", suggestion.endChapter);
  setFieldValue(form, "chapterNumber", suggestion.chapterNumber);
  setFieldValue(form, "expectedWords", suggestion.expectedWords);
  setFieldValue(form, "volumeNumber", suggestion.volumeNumber);
  setFieldValue(form, "unitNumber", suggestion.unitNumber);
}

function setFieldValue(
  form: HTMLFormElement,
  name: string,
  value?: string | number,
) {
  if (value == null || value === "") {
    return;
  }

  const field = form.elements.namedItem(name);

  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLTextAreaElement
  ) {
    field.value = String(value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
}
