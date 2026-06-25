import { describe, expect, it } from "vitest";
import {
  buildEndingPlanningContext,
  calculateEndingReadiness,
} from "./ending-planning";

const baseInput = {
  project: {
    title: "离线未来",
    genre: "穿越创业",
    targetAudience: "20-40岁读者",
    totalWordTarget: 100000,
    chapterWordMin: 5000,
    chapterWordMax: 8000,
    description: "程序员带着断网 AI 回到 1999 年。",
  },
  setting: {
    mainConflict: "主角试图改变命运，但历史有强惯性。",
    protagonistDesire: "掌控人生，让父母过上好日子。",
    villainLogic: "反派追查主角的信息源。",
    longTermForeshadowing: "AI 资料不完整，穿越原因存在疑点。",
    endingDirection: "主角不再把 AI 当成万能外挂。",
    forbiddenItems: "不要写成纯技术说明书。",
  },
  chapters: [
    {
      chapterNumber: 1,
      title: "开局",
      status: "published",
      wordCount: 30000,
      goal: "确认重生。",
    },
    {
      chapterNumber: 2,
      title: "破局",
      status: "final",
      wordCount: 30000,
      goal: "拿到第一桶金。",
    },
    {
      chapterNumber: 3,
      title: "反击",
      status: "draft",
      wordCount: 25000,
      goal: "反派开始施压。",
    },
  ],
  outlines: [
    {
      level: "volume",
      status: "active",
      title: "第一卷 县城起势",
      startChapter: 1,
      endChapter: 20,
      goal: "完成第一桶金。",
      climax: "击退本地渠道垄断。",
    },
  ],
  foreshadows: [
    {
      content: "谢勇怀疑陈远的信息源。",
      status: "planted",
      importance: "high",
      expectedResolveChapter: 18,
      plantedChapter: {
        chapterNumber: 2,
        title: "破局",
      },
    },
    {
      content: "培训班记录本后续被利用。",
      status: "resolved",
      importance: "medium",
      resolvedChapter: {
        chapterNumber: 12,
        title: "账本",
      },
    },
  ],
  characters: [
    {
      name: "陈远",
      roleInStory: "主角",
      characterArc: "从依赖 AI 到主动承担选择代价。",
      status: "active",
    },
  ],
  timelineEvents: [
    {
      title: "1999年6月，陈远确认重生。",
      storyTime: "1999-06",
      chapter: {
        chapterNumber: 1,
        title: "开局",
      },
    },
  ],
};

describe("ending planning context", () => {
  it("calculates readiness from words, chapters and unresolved foreshadows", () => {
    const readiness = calculateEndingReadiness(baseInput);

    expect(readiness.currentWords).toBe(85000);
    expect(readiness.progressPercent).toBe(85);
    expect(readiness.unresolvedForeshadowCount).toBe(1);
    expect(readiness.highImportanceUnresolvedForeshadowCount).toBe(1);
    expect(readiness.stage).toBe("tighten_threads");
  });

  it("builds an auditable ending-planning prompt without author-control violations", () => {
    const context = buildEndingPlanningContext(baseInput);

    expect(context.inputContextSummary).toBe(
      "《离线未来》终局规划；目标进度 85%；章节 3 个；未回收伏笔 1 条；阶段：线索收紧",
    );
    expect(context.inputText).toContain("生成一份终局规划 / 收尾检查草案");
    expect(context.inputText).toContain("不得自动把任何伏笔标记为已回收或废弃");
    expect(context.inputText).toContain("谢勇怀疑陈远的信息源");
    expect(context.inputText).toContain("主角不再把 AI 当成万能外挂");
    expect(context.inputJson.readiness).toMatchObject({
      currentWords: 85000,
      progressPercent: 85,
      stage: "tighten_threads",
    });
  });

  it("does not say the book is ready to finish when high importance foreshadows remain", () => {
    const context = buildEndingPlanningContext({
      ...baseInput,
      chapters: [
        {
          chapterNumber: 1,
          title: "终局前",
          status: "final",
          wordCount: 98000,
        },
      ],
    });

    expect(context.readiness.stage).toBe("enter_endgame");
  });
});
