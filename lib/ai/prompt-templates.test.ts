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
        "project_setting_completion",
        "project_setting_optimization",
        "short_story_blueprint_generation",
        "outline_generation",
        "character_relationship_generation",
        "chapter_beat_generation",
        "chapter_draft_generation",
        "chapter_polish_generation",
        "chapter_summary_extraction",
        "pending_update_extraction",
        "foreshadow_recovery_audit",
        "continuity_check",
        "continuity_fix_patch_generation",
        "storyline_generation",
        "cover_image_generation",
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

  it("requires every formal short-story blueprint field in its schema", () => {
    const template = DEFAULT_AI_PROMPT_TEMPLATES.find(
      (item) => item.key === "short_story_blueprint_generation",
    );
    const schema = JSON.parse(template?.responseSchema ?? "{}");

    expect(template?.outputFormat).toBe("json");
    expect(schema.properties.blueprint.required).toEqual(
      expect.arrayContaining([
        "premise",
        "openingHook",
        "protagonistPressure",
        "coreConflict",
        "reversalChain",
        "emotionalArc",
        "climax",
        "ending",
        "requiredPayoffs",
        "forbiddenDeviations",
      ]),
    );
  });

  it("keeps prose generation templates guarded against repetitive AI phrasing", () => {
    const proseTemplates = DEFAULT_AI_PROMPT_TEMPLATES.filter((template) =>
      [
        "chapter_beat_generation",
        "chapter_draft_generation",
        "chapter_polish_generation",
      ].includes(template.key),
    );

    expect(proseTemplates).toHaveLength(3);
    expect(
      proseTemplates.every((template) =>
        template.systemPrompt.includes("不是……而是……"),
      ),
    ).toBe(true);
    expect(
      proseTemplates.every((template) =>
        template.systemPrompt.includes("硬性限制"),
      ),
    ).toBe(true);
    expect(
      proseTemplates.every((template) =>
        template.systemPrompt.includes("反流水账"),
      ),
    ).toBe(true);
  });

  it("ships newer default versions for long-form prose prompts", () => {
    const beatTemplate = DEFAULT_AI_PROMPT_TEMPLATES.find(
      (template) => template.key === "chapter_beat_generation",
    );
    const draftTemplate = DEFAULT_AI_PROMPT_TEMPLATES.find(
      (template) => template.key === "chapter_draft_generation",
    );
    const polishTemplate = DEFAULT_AI_PROMPT_TEMPLATES.find(
      (template) => template.key === "chapter_polish_generation",
    );

    expect(beatTemplate?.version).toBeGreaterThanOrEqual(2);
    expect(draftTemplate?.version).toBeGreaterThanOrEqual(3);
    expect(polishTemplate?.version).toBeGreaterThanOrEqual(3);
  });

  it("keeps foreshadow recovery ids in summary and pending-update schemas", () => {
    const summaryTemplate = DEFAULT_AI_PROMPT_TEMPLATES.find(
      (template) => template.key === "chapter_summary_extraction",
    );
    const pendingTemplate = DEFAULT_AI_PROMPT_TEMPLATES.find(
      (template) => template.key === "pending_update_extraction",
    );
    const auditTemplate = DEFAULT_AI_PROMPT_TEMPLATES.find(
      (template) => template.key === "foreshadow_recovery_audit",
    );
    const summarySchema = JSON.parse(summaryTemplate?.responseSchema ?? "{}");
    const pendingSchema = JSON.parse(pendingTemplate?.responseSchema ?? "{}");
    const auditSchema = JSON.parse(auditTemplate?.responseSchema ?? "{}");

    expect(summaryTemplate?.version).toBeGreaterThanOrEqual(2);
    expect(summarySchema.required).toContain("foreshadowUpdates");
    expect(
      summarySchema.properties.foreshadowUpdates.items.required,
    ).toContain("targetId");
    expect(pendingTemplate?.version).toBeGreaterThanOrEqual(2);
    expect(pendingSchema.properties.updates.items.required).toContain("targetId");
    expect(auditSchema.properties.updates.items.required).toEqual(
      expect.arrayContaining(["targetId", "resolvedChapterId", "evidence"]),
    );
  });
});
