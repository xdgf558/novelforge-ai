import { describe, expect, it } from "vitest";
import {
  DEFAULT_AI_PROMPT_TEMPLATES,
  promptTemplateFingerprint,
  taskTypesFromDefaultTemplates,
} from "./prompt-templates";

describe("default AI prompt templates", () => {
  it("keeps each default prompt template key and version unique", () => {
    const fingerprints = DEFAULT_AI_PROMPT_TEMPLATES.map(promptTemplateFingerprint);

    expect(new Set(fingerprints).size).toBe(fingerprints.length);
  });

  it("covers the planned MVP AI task types", () => {
    expect(taskTypesFromDefaultTemplates()).toEqual(
      expect.arrayContaining([
        "project_setting_generation",
        "chapter_beat_generation",
        "chapter_draft_generation",
        "chapter_summary_extraction",
        "pending_update_extraction",
        "continuity_check",
        "wechat_publish_packaging",
      ]),
    );
  });

  it("stores schema metadata only for JSON output templates", () => {
    expect(
      DEFAULT_AI_PROMPT_TEMPLATES.every(
        (template) => !template.responseSchema || template.outputFormat === "json",
      ),
    ).toBe(true);
  });
});
