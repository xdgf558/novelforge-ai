import { describe, expect, it } from "vitest";
import {
  selectRelevantCharacters,
  selectRelevantForeshadows,
  selectRelevantWorldRules,
} from "./context-priority";

describe("AI context priority", () => {
  it("keeps explicitly mentioned and core characters ahead of name order", () => {
    const characters = [
      { name: "阿甲", roleInStory: "配角" },
      { name: "陈远", roleInStory: "主角" },
      { name: "罗文斌", roleInStory: "反派" },
    ];

    expect(
      selectRelevantCharacters(characters, "罗文斌正在盯梢培训班", 2).map(
        (item) => item.name,
      ),
    ).toEqual(["罗文斌", "陈远"]);
  });

  it("sorts world-rule risks explicitly instead of lexicographically", () => {
    const rules = [
      { title: "低风险", content: "low", riskLevel: "low" },
      { title: "高风险", content: "high", riskLevel: "high" },
      { title: "中风险", content: "medium", riskLevel: "medium" },
    ];

    expect(
      selectRelevantWorldRules(rules, "", 3).map((item) => item.riskLevel),
    ).toEqual(["high", "medium", "low"]);
  });

  it("prioritizes overdue high-importance foreshadows", () => {
    const foreshadows = [
      {
        content: "尚未指定回收章",
        status: "needs_attention",
        importance: "high",
        expectedResolveChapter: null,
      },
      {
        content: "严重逾期",
        status: "needs_attention",
        importance: "high",
        expectedResolveChapter: 3,
      },
      {
        content: "本章到期",
        status: "planted",
        importance: "medium",
        expectedResolveChapter: 10,
      },
    ];

    expect(
      selectRelevantForeshadows(foreshadows, "", 10, 3).map(
        (item) => item.content,
      ),
    ).toEqual(["严重逾期", "尚未指定回收章", "本章到期"]);
  });
});
