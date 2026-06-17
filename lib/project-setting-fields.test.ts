import { describe, expect, it } from "vitest";
import {
  emptyProjectSettingValues,
  projectSettingFieldNames,
  projectSettingFields,
  projectSettingSnapshot,
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
});
