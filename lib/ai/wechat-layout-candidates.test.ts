import { describe, expect, it } from "vitest";
import {
  buildWechatLayoutCandidateContext,
  parseWechatLayoutCandidateOutput,
} from "./wechat-layout-candidates";

const baseInput = {
  project: {
    title: "离线未来",
    genre: "穿越创业",
    targetAudience: "20-40岁中青年",
    platform: "公众号",
    description: "程序员带着断网 AI 回到 1999 年。",
    wechatPositioning: "年代创业爽文。",
  },
  setting: {
    sellingPoint: "未来信息差 + 草根逆袭。",
    forbiddenItems: "不要写成纯技术说明书。",
  },
  chapter: {
    id: "chapter_3",
    chapterNumber: 3,
    title: "罗文斌的警告",
    goal: "完成第一笔公开装机订单，并让罗文斌首次施压。",
    draftText: "草稿正文",
    finalText: "定稿正文",
    polishedText: "# 第3章《罗文斌的警告》\n\n---\n\n精修正文第一段。\n\n精修正文第二段。",
    notes: "",
  },
};

describe("wechat layout candidate generation", () => {
  it("builds a candidate-only prompt from the preferred chapter source", () => {
    const context = buildWechatLayoutCandidateContext(baseInput);

    expect(context).not.toBeNull();
    expect(context?.inputContextSummary).toContain("来源 精修正文");
    expect(context?.inputJson.chapter).toMatchObject({
      id: "chapter_3",
      sourceKind: "polished",
      title: "罗文斌的警告",
    });
    expect(context?.inputText).toContain("默认模式是“只排版，不改文”");
    expect(context?.inputText).toContain("只生成标题、开头引导语和结尾追更钩子等候选");
    expect(context?.inputText).toContain("精修正文第一段。");
    expect(context?.inputText).not.toContain("# 第3章《罗文斌的警告》");
  });

  it("returns null when no chapter text is available", () => {
    expect(
      buildWechatLayoutCandidateContext({
        ...baseInput,
        chapter: {
          ...baseInput.chapter,
          draftText: "",
          finalText: "",
          polishedText: "",
        },
      }),
    ).toBeNull();
  });

  it("parses title, opening, and ending candidates from JSON output", () => {
    const suggestion = parseWechatLayoutCandidateOutput(`\`\`\`json
{
  "title_candidates": ["重生1999：陈远第一次正面破局"],
  "selected_title": "重生1999：陈远第一次正面破局",
  "opening_guide": "这一章，陈远终于正面撞上县城电脑圈的规矩。",
  "ending_follow_hook": "方老板的电话打来时，真正的选择才刚开始。",
  "interaction_question": "你觉得陈远该退一步吗？"
}
\`\`\``);

    expect(suggestion).toMatchObject({
      selectedTitle: "重生1999：陈远第一次正面破局",
      openingGuide: "这一章，陈远终于正面撞上县城电脑圈的规矩。",
      endingFollowHook: "方老板的电话打来时，真正的选择才刚开始。",
      titleCandidates: ["重生1999：陈远第一次正面破局"],
    });
  });
});
