import { describe, expect, it } from "vitest";
import { buildProjectJsonExport, buildProjectMarkdownExport } from "./project-export";

const exportData = {
  project: {
    title: "借命人",
    workType: "short_story",
    genre: "都市悬疑",
    targetAudience: "公众号男性读者",
    platform: "微信公众号",
    status: "active",
    description: "寿命交易背后的地下契约网络。",
  },
  setting: {
    sellingPoint: "寿命交易带来高压反转。",
    forbiddenItems: "不能自动发布。",
  },
  shortStoryBlueprint: {
    premise: "林野收到死者发来的借命短信。",
    openingHook: "短信准确预告下一名死者。",
    coreConflict: "林野必须在失去寿命前找出契约源头。",
    ending: "林野公开契约真相并承担最后一次借命代价。",
    requiredPayoffs: "解释死者为何能发短信。",
  },
  characters: [
    {
      name: "林野",
      roleInStory: "主角",
      identity: "借命契约调查者",
      status: "active",
    },
  ],
  characterRelationships: [
    {
      sourceCharacterName: "林野",
      targetCharacterName: "许知夏",
      relationshipType: "ally",
      direction: "two_way",
      status: "active",
      summary: "两人共同追查借命契约。",
    },
  ],
  outlines: [
    {
      level: "chapter",
      title: "第一章大纲",
      chapterNumber: 1,
      goal: "建立借命契约钩子。",
      endingHook: "死者短信再次出现。",
    },
  ],
  storylines: [
    {
      name: "地下契约线",
      type: "mystery_thread",
      status: "active",
      startChapter: 1,
      coreGoal: "追踪寿命交易网络的主线推进。",
      relatedCharacters: "林野",
      relatedForeshadows: "死者短信再次出现",
      relatedChapters: "第 1 章《第一封短信》",
      relatedOutlines: "chapter:第一章大纲",
      relatedCharacterItems: [
        {
          id: "character_1",
          name: "林野",
        },
      ],
      relatedForeshadowItems: [
        {
          id: "foreshadow_1",
          content: "死者短信再次出现",
        },
      ],
      relatedChapterItems: [
        {
          id: "chapter_1",
          chapterNumber: 1,
          title: "第一封短信",
        },
      ],
      relatedOutlineItems: [
        {
          id: "outline_1",
          level: "chapter",
          title: "第一章大纲",
        },
      ],
    },
  ],
  chapters: [
    {
      chapterNumber: 1,
      title: "第一封短信",
      status: "final",
      finalText: "短信来自一个死人。",
      wordCount: 1200,
    },
  ],
  publishPackages: [
    {
      selectedTitle: "死人给他发来短信",
      status: "draft",
      chapterId: "chapter_1",
      openingGuide: "这条短信不该存在。",
    },
  ],
  aiTasks: [
    {
      taskType: "wechat_publish_packaging",
      status: "completed",
      adoptionState: "not_reviewed",
      model: "gpt-test",
      inputContextSummary: "第 1 章发布包装",
    },
  ],
};

describe("project export builders", () => {
  it("builds JSON export with format metadata", () => {
    const parsed = JSON.parse(buildProjectJsonExport(exportData));

    expect(parsed.format).toBe("novelforge-ai-project-export");
    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toEqual(expect.any(String));
    expect(parsed.project.title).toBe("借命人");
    expect(parsed.storylines[0].relatedCharacterItems).toEqual([
      {
        id: "character_1",
        name: "林野",
      },
    ]);
    expect(parsed.storylines[0].relatedChapterItems[0]).toEqual({
      id: "chapter_1",
      chapterNumber: 1,
      title: "第一封短信",
    });
    expect(parsed.publishPackages[0].selectedTitle).toBe("死人给他发来短信");
  });

  it("builds Markdown export with story memory sections", () => {
    const markdown = buildProjectMarkdownExport(exportData);

    expect(markdown).toContain("# 借命人");
    expect(markdown).toContain("作品类型: 短故事");
    expect(markdown).toContain("## 项目设定");
    expect(markdown).toContain("寿命交易带来高压反转");
    expect(markdown).toContain("## 短故事蓝图");
    expect(markdown).toContain("林野收到死者发来的借命短信");
    expect(markdown).toContain("## 角色库");
    expect(markdown).toContain("林野");
    expect(markdown).toContain("## 人物关系网络");
    expect(markdown).toContain("两人共同追查借命契约");
    expect(markdown).toContain("## 大纲");
    expect(markdown).toContain("第一章大纲");
    expect(markdown).toContain("## 多故事线");
    expect(markdown).toContain("地下契约线");
    expect(markdown).toContain("关联人物: 林野");
    expect(markdown).toContain("## 写作单元");
    expect(markdown).toContain("### 单元 1 第一封短信");
    expect(markdown).toContain("短信来自一个死人");
    expect(markdown).toContain("## 历史发布包装");
    expect(markdown).toContain("死人给他发来短信");
    expect(markdown).toContain("## AI 任务记录");
  });
});
