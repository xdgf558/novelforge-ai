import { describe, expect, it } from "vitest";
import {
  emptyProjectSettingValues,
  projectSettingFieldNames,
  projectSettingFields,
  projectSettingAiFieldsForWorkType,
  projectSettingFieldsForWorkType,
  projectSettingSnapshot,
  projectSettingValuesFromRecord,
} from "./project-setting-fields";

describe("project setting fields", () => {
  it("keeps field descriptors aligned with field names", () => {
    expect(projectSettingFields.map((field) => field.name)).toEqual(
      projectSettingFieldNames,
    );
  });

  it("creates an empty value object for every field", () => {
    const values = emptyProjectSettingValues();

    expect(Object.keys(values).sort()).toEqual([...projectSettingFieldNames].sort());
    expect(Object.values(values).every((value) => value === "")).toBe(true);
  });

  it("creates form values from a data-driven setting record", () => {
    const values = projectSettingValuesFromRecord({
      genre: "都市异能",
      mainConflict: "主角与契约组织对抗",
      sensitiveContentRules: null,
    });

    expect(values.genre).toBe("都市异能");
    expect(values.mainConflict).toBe("主角与契约组织对抗");
    expect(values.sensitiveContentRules).toBe("");
    expect(Object.keys(values).sort()).toEqual([...projectSettingFieldNames].sort());
  });

  it("trims snapshots while preserving every field", () => {
    const values = emptyProjectSettingValues();
    values.genre = " 都市异能 ";
    values.mainConflict = " 主角与契约组织对抗 ";

    expect(projectSettingSnapshot(values)).toMatchObject({
      genre: "都市异能",
      mainConflict: "主角与契约组织对抗",
    });
    expect(Object.keys(projectSettingSnapshot(values)).sort()).toEqual(
      [...projectSettingFieldNames].sort(),
    );
  });

  it("scopes narrative perspective to short stories and author control", () => {
    expect(
      projectSettingFieldsForWorkType("short_story").map((field) => field.name),
    ).toContain("narrativePerspective");
    expect(
      projectSettingFieldsForWorkType("serial_novel").map((field) => field.name),
    ).not.toContain("narrativePerspective");
    expect(
      projectSettingAiFieldsForWorkType("short_story").map((field) => field.name),
    ).not.toContain("narrativePerspective");
  });
});
