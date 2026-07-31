import { describe, expect, it } from "vitest";
import {
  consumeOutlineDraftCopySuggestion,
  storeOutlineDraftCopySuggestion,
} from "./outline-draft-copy-handoff";

function createSessionStorage() {
  const values = new Map<string, string>();

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe("outline draft copy handoff", () => {
  it("moves one suggestion to the matching outline page", () => {
    const storage = createSessionStorage();
    const suggestion = {
      chapterNumber: 37,
      goal: "完成终局铁证合验。",
      level: "chapter" as const,
      title: "寒舟照夜",
    };

    storeOutlineDraftCopySuggestion(
      storage,
      "/projects/project_1/outlines",
      suggestion,
    );

    expect(
      consumeOutlineDraftCopySuggestion(
        storage,
        "/projects/project_1/outlines",
      ),
    ).toEqual(suggestion);
    expect(
      consumeOutlineDraftCopySuggestion(
        storage,
        "/projects/project_1/outlines",
      ),
    ).toBeNull();
  });

  it("does not leak a suggestion into another project", () => {
    const storage = createSessionStorage();

    storeOutlineDraftCopySuggestion(
      storage,
      "/projects/project_1/outlines",
      {
        goal: "推进第一卷。",
        level: "volume",
        title: "第一卷",
      },
    );

    expect(
      consumeOutlineDraftCopySuggestion(
        storage,
        "/projects/project_2/outlines",
      ),
    ).toBeNull();
    expect(
      consumeOutlineDraftCopySuggestion(
        storage,
        "/projects/project_1/outlines",
      ),
    ).toMatchObject({ level: "volume", title: "第一卷" });
  });

  it("discards malformed stored data", () => {
    const storage = createSessionStorage();
    storage.setItem(
      "novelforge:outline-draft-copy:/projects/project_1/outlines",
      JSON.stringify({ level: "chapter", title: "缺少目标" }),
    );

    expect(
      consumeOutlineDraftCopySuggestion(
        storage,
        "/projects/project_1/outlines",
      ),
    ).toBeNull();
  });
});
