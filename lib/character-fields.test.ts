import { describe, expect, it } from "vitest";
import {
  characterFieldNames,
  characterSnapshot,
  characterTextFields,
  characterValuesFromRecord,
  emptyCharacterValues,
} from "./character-fields";

describe("character fields", () => {
  it("keeps text fields inside the full character field list", () => {
    const fullFieldNameSet = new Set(characterFieldNames);

    expect(
      characterTextFields.every((field) => fullFieldNameSet.has(field.name)),
    ).toBe(true);
  });

  it("creates an empty value object for every character field", () => {
    const values = emptyCharacterValues();

    expect(Object.keys(values).sort()).toEqual([...characterFieldNames].sort());
    expect(Object.values(values).every((value) => value === "")).toBe(true);
  });

  it("creates form values from a data-driven character record", () => {
    const values = characterValuesFromRecord({
      name: "沈照",
      status: "active",
      desire: "摆脱借命契约",
      hiddenInfo: null,
    });

    expect(values.name).toBe("沈照");
    expect(values.status).toBe("active");
    expect(values.desire).toBe("摆脱借命契约");
    expect(values.hiddenInfo).toBe("");
    expect(Object.keys(values).sort()).toEqual([...characterFieldNames].sort());
  });

  it("trims snapshots while preserving every character field", () => {
    const values = emptyCharacterValues();
    values.name = " 沈照 ";
    values.status = " active ";
    values.speakingStyle = " 短句，压着情绪说话 ";

    expect(characterSnapshot(values)).toMatchObject({
      name: "沈照",
      status: "active",
      speakingStyle: "短句，压着情绪说话",
    });
    expect(Object.keys(characterSnapshot(values)).sort()).toEqual(
      [...characterFieldNames].sort(),
    );
  });
});
