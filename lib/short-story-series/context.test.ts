import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatShortStorySeriesContext,
  loadShortStorySeriesContext,
} from "./context";

const mocks = vi.hoisted(() => ({
  prisma: {
    shortStorySeriesEntry: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

describe("short story series context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes prior progress and current character state without leaking future episodes", () => {
    const context = formatShortStorySeriesContext({
      id: "entry_2",
      project: {
        title: "灰塔来信",
      },
      continuityNote: "主角开始怀疑调查所内部有人删档。",
      series: {
        title: "雾城异闻录",
        premise: "每篇独立调查一宗异常案件。",
        sharedWorldview: "异常会留下灰痕。",
        continuityRules: "人物认知和关系必须跨篇累积。",
        recurringElements: "雾城调查所",
        longTermMysteries: "谁删除了主角三年的记忆。",
        futureDirection: "逐步逼近调查所内鬼。",
        entries: [
          {
            id: "entry_1",
            continuityNote: "主角确认灰痕来自同一组织。",
            project: { title: "借命人" },
          },
          {
            id: "entry_2",
            continuityNote: "主角开始怀疑调查所内部有人删档。",
            project: { title: "灰塔来信" },
          },
          {
            id: "entry_3",
            continuityNote: "未来才会揭示内鬼身份。",
            project: { title: "无声档案" },
          },
        ],
        characters: [
          {
            name: "林野",
            roleInSeries: "固定调查员",
            accumulatedState: "已失去两年寿命。",
            knownInformation: "知道灰痕属于同一组织。",
          },
        ],
      },
    });

    expect(context).toContain("当前篇目：第 2 篇《灰塔来信》");
    expect(context).toContain("第 1 篇《借命人》");
    expect(context).toContain("已失去两年寿命");
    expect(context).not.toContain("未来才会揭示内鬼身份");
    expect(context).not.toContain("无声档案");
  });

  it("loads only the latest twelve prior entries while preserving the real sequence", async () => {
    const createdAt = new Date("2026-07-13T02:00:00.000Z");
    mocks.prisma.shortStorySeriesEntry.findUnique.mockResolvedValue({
      id: "entry_20",
      seriesId: "series_1",
      projectId: "project_20",
      sortOrder: 200,
      continuityNote: "本篇将确认调查所有内鬼。",
      createdAt,
      updatedAt: createdAt,
      project: {
        title: "第二十封信",
      },
      series: {
        id: "series_1",
        title: "雾城异闻录",
        status: "active",
        premise: "每篇独立调查一宗异常案件。",
        sharedWorldview: "异常会留下灰痕。",
        continuityRules: "人物认知必须跨篇累积。",
        recurringElements: "雾城调查所",
        longTermMysteries: "谁删除了主角的记忆。",
        futureDirection: "揭开调查所内鬼。",
        createdAt,
        updatedAt: createdAt,
        characters: [],
      },
    });
    mocks.prisma.shortStorySeriesEntry.findMany.mockResolvedValue([
      {
        id: "entry_19",
        continuityNote: "主角找到第一份删档记录。",
        project: { title: "第十九封信" },
      },
      {
        id: "entry_18",
        continuityNote: "搭档开始怀疑调查所。",
        project: { title: "第十八封信" },
      },
    ]);
    mocks.prisma.shortStorySeriesEntry.count.mockResolvedValue(19);

    const context = await loadShortStorySeriesContext("project_20");

    expect(mocks.prisma.shortStorySeriesEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 12,
        orderBy: [
          { sortOrder: "desc" },
          { createdAt: "desc" },
          { id: "desc" },
        ],
      }),
    );
    expect(context).toContain("当前篇目：第 20 篇《第二十封信》");
    expect(context).toContain("第 18 篇《第十八封信》");
    expect(context).toContain("第 19 篇《第十九封信》");
  });
});
