import { describe, expect, it } from "vitest";
import {
  buildContinuityFixPatchContext,
  readContinuityFixPatchReportId,
  selectContinuityFixPatchSource,
} from "./continuity-fix-patches";

const baseInput = {
  project: {
    title: "离线未来",
    genre: "穿越创业",
    targetAudience: "20-40岁读者",
    platform: "个人网站",
  },
  report: {
    id: "report_1",
    severity: "high",
    category: "timeline",
    title: "时间线重复一天",
    description:
      "第6章结尾写 1999年6月29日早上七点零四分，但上一段已经进入6月29日深夜。",
    evidence: "1999年6月29日。早上七点零四分。",
    conflictingMemory: "时间线连贯性",
    suggestedFix: "将章节结尾日期从1999年6月29日修正为1999年6月30日。",
  },
  chapter: {
    id: "chapter_6",
    chapterNumber: 6,
    title: "查分方案",
    status: "final",
    goal: "兑现查分服务。",
    beats: "晚上复盘后，第二天一早出现新线索。",
    finalText:
      "晚上十点，陈远还在复盘。\n\n1999年6月29日。早上七点零四分。\n\n电话响了。",
    polishedText: "精修备用文本",
    draftText: "草稿备用文本",
    notes: "注意时间线。",
  },
};

describe("continuity fix patch context", () => {
  it("builds an auditable patch prompt from a continuity report and chapter text", () => {
    const context = buildContinuityFixPatchContext(baseInput);

    expect(context.source).toMatchObject({
      fieldName: "finalText",
      label: "定稿正文",
    });
    expect(context.inputContextSummary).toContain(
      "第 6 章《查分方案》连续性修复候选",
    );
    expect(context.inputText).toContain("修复候选补丁");
    expect(context.inputText).toContain("不要说“已修复”");
    expect(context.inputText).toContain("1999年6月29日。早上七点零四分。");
    expect(context.inputJson.report).toMatchObject({
      id: "report_1",
      severity: "high",
      category: "timeline",
    });
    expect(context.inputJson.chapter).toMatchObject({
      id: "chapter_6",
      sourceField: "finalText",
      sourceLabel: "定稿正文",
    });
  });

  it("falls back to polished or draft text only when final text is missing", () => {
    expect(
      selectContinuityFixPatchSource({
        ...baseInput.chapter,
        finalText: "",
        polishedText: "可修复的精修正文",
      }),
    ).toMatchObject({
      fieldName: "polishedText",
      text: "可修复的精修正文",
    });

    expect(
      selectContinuityFixPatchSource({
        ...baseInput.chapter,
        finalText: "",
        polishedText: "",
        draftText: "可修复的草稿正文",
      }),
    ).toMatchObject({
      fieldName: "draftText",
      text: "可修复的草稿正文",
    });
  });

  it("reads the report id back from AI task input JSON", () => {
    const context = buildContinuityFixPatchContext(baseInput);

    expect(readContinuityFixPatchReportId(JSON.stringify(context.inputJson))).toBe(
      "report_1",
    );
    expect(readContinuityFixPatchReportId("{broken")).toBeNull();
  });
});
