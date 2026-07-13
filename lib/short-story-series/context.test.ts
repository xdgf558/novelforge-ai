import { describe, expect, it } from "vitest";
import { formatShortStorySeriesContext } from "./context";

describe("short story series context", () => {
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
});
