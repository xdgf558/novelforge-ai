import { describe, expect, it } from "vitest";
import {
  buildChapterOutlinePrefill,
  selectChapterOutlineForPrefill,
} from "./chapter-outline-prefill";

describe("chapter outline prefill", () => {
  it("builds editable new-chapter defaults from a chapter outline", () => {
    const prefill = buildChapterOutlinePrefill({
      level: "chapter",
      status: "planned",
      title: "第3章《罗文斌的警告》",
      goal: "罗文斌首次正面试探陈远。",
      chapterConflict: "陈远必须既接住压力，又不能暴露未来信息。",
      chapterPleasurePoint: "第一笔公开装机订单证明主角能力。",
      foreshadow: "罗文斌背后的电脑城资源。",
      characters: "陈远、谢勇、罗文斌、李淑兰",
      location: "谢勇家、县城装机客户处",
      endingHook: "培训班正式合作的条件浮出水面。",
    });

    expect(prefill).toEqual({
      title: "罗文斌的警告",
      sourceOutlineTitle: "罗文斌的警告",
      goal: [
        "罗文斌首次正面试探陈远。",
        "章节冲突：陈远必须既接住压力，又不能暴露未来信息。",
        "章节爽点：第一笔公开装机订单证明主角能力。",
        "埋设伏笔：罗文斌背后的电脑城资源。",
        "出场角色：陈远、谢勇、罗文斌、李淑兰",
        "地点：谢勇家、县城装机客户处",
        "章末钩子：培训班正式合作的条件浮出水面。",
      ].join("\n"),
    });
  });

  it("ignores archived and non-chapter outlines", () => {
    expect(
      buildChapterOutlinePrefill({
        level: "chapter",
        status: "archived",
        title: "旧第三章",
        goal: "旧目标",
      }),
    ).toBeNull();
    expect(
      buildChapterOutlinePrefill({
        level: "unit",
        status: "planned",
        title: "第一单元",
        goal: "单元目标",
      }),
    ).toBeNull();
  });

  it("selects the best current chapter outline for prefill", () => {
    const selected = selectChapterOutlineForPrefill([
      {
        level: "chapter",
        status: "completed",
        title: "旧版第三章",
        chapterNumber: 3,
        updatedAt: new Date("2026-06-21T08:00:00Z"),
      },
      {
        level: "chapter",
        status: "active",
        title: "当前第三章",
        chapterNumber: 3,
        updatedAt: new Date("2026-06-21T07:00:00Z"),
      },
      {
        level: "volume",
        status: "active",
        title: "第一卷",
        updatedAt: new Date("2026-06-21T09:00:00Z"),
      },
    ]);

    expect(selected?.title).toBe("当前第三章");
  });
});
