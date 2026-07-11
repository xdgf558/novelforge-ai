import { describe, expect, it } from "vitest";
import {
  automaticForeshadowRecoverySource,
  buildAutomaticForeshadowRecoveryPayload,
  buildForeshadowRecoveryAuditContext,
  compactChapterSummaryForRecovery,
  parseAutomaticForeshadowRecoveryPayload,
  parseForeshadowRecoverySignals,
  selectForeshadowsForChapterRecoveryAudit,
  type ForeshadowRecoverySignal,
} from "./recovery-audit";

describe("foreshadow recovery audit", () => {
  it("prioritizes foreshadows explicitly mentioned by the final text", () => {
    const selected = selectForeshadowsForChapterRecoveryAudit({
      chapterNumber: 15,
      finalText: "沈照夜从横梁夹层取出裴仲明留下的平面图。",
      limit: 2,
      foreshadows: [
        {
          id: "unrelated-high",
          content: "皇帝当年的密诏仍然下落不明。",
          status: "planted",
          importance: "high",
        },
        {
          id: "mentioned-medium",
          content: "裴仲明在横梁夹层留下平面图。",
          status: "planted",
          importance: "medium",
        },
        {
          id: "attention",
          content: "另一条需要处理的伏笔。",
          status: "needs_attention",
          importance: "high",
        },
      ],
    });

    expect(selected.map((item) => item.id)).toEqual([
      "mentioned-medium",
      "attention",
    ]);
  });

  it("parses chapter-summary recovery signals and uses the current chapter fallback", () => {
    const signals = parseForeshadowRecoverySignals(
      JSON.stringify({
        foreshadowUpdates: [
          {
            targetId: "foreshadow_1",
            action: "resolve",
            summary: "身份已经揭晓。",
            evidence: "正文明确写出此人姓名。",
            confidence: "high",
          },
          {
            targetId: "foreshadow_2",
            action: "advance",
            summary: "新增一条物证。",
            evidence: "发现同源墨迹。",
            confidence: "medium",
          },
        ],
      }),
      "chapter_15",
    );

    expect(signals).toEqual([
      {
        targetId: "foreshadow_1",
        action: "resolve",
        resolvedChapterId: "chapter_15",
        summary: "身份已经揭晓。",
        evidence: "正文明确写出此人姓名。",
        confidence: "high",
      },
      {
        targetId: "foreshadow_2",
        action: "advance",
        resolvedChapterId: "chapter_15",
        summary: "新增一条物证。",
        evidence: "发现同源墨迹。",
        confidence: "medium",
      },
    ]);
  });

  it("drops incomplete signals instead of guessing target or evidence", () => {
    expect(
      parseForeshadowRecoverySignals(
        JSON.stringify({
          updates: [
            {
              action: "resolve",
              resolvedChapterId: "chapter_2",
              summary: "缺少目标。",
              evidence: "证据。",
              confidence: "high",
            },
            {
              targetId: "foreshadow_1",
              action: "resolve",
              resolvedChapterId: "chapter_2",
              summary: "缺少证据。",
              confidence: "high",
            },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it("keeps one conservative signal when the model contradicts itself", () => {
    expect(
      parseForeshadowRecoverySignals(
        JSON.stringify({
          updates: [
            {
              targetId: "foreshadow_1",
              action: "resolve",
              resolvedChapterId: "chapter_8",
              summary: "已经回收。",
              evidence: "证据一。",
              confidence: "high",
            },
            {
              targetId: "foreshadow_1",
              action: "advance",
              resolvedChapterId: "chapter_8",
              summary: "只是推进。",
              evidence: "证据二。",
              confidence: "high",
            },
          ],
        }),
      ),
    ).toEqual([
      expect.objectContaining({
        targetId: "foreshadow_1",
        action: "advance",
      }),
    ]);
  });

  it("builds a bounded historical audit prompt with stable record ids", () => {
    const context = buildForeshadowRecoveryAuditContext({
      projectTitle: "照夜寒舟录",
      foreshadows: [
        {
          id: "foreshadow_1",
          content: "旧印来源不明。",
          status: "planted",
          importance: "high",
          plantedChapterNumber: 1,
        },
      ],
      chapters: [
        {
          id: "chapter_8",
          chapterNumber: 8,
          title: "密折夜渡",
          summary: "正文确认旧印来自内库。",
        },
      ],
    });

    expect(context.inputText).toContain("[foreshadow_1]");
    expect(context.inputText).toContain("[chapter_8]");
    expect(context.inputText).toContain("重复展示物证");
    expect(context.inputJson).toMatchObject({
      projectTitle: "照夜寒舟录",
      foreshadows: [{ id: "foreshadow_1" }],
      chapters: [{ id: "chapter_8" }],
    });
  });

  it("compacts durable chapter summary JSON for historical evidence", () => {
    const compact = compactChapterSummaryForRecovery(
      JSON.stringify({
        shortSummary: "沈照夜进入内库。",
        mainEvents: ["找到旧印登记册。", "确认旧印来源。"],
        characterChanges: ["沈照夜改变判断。"],
      }),
    );

    expect(compact).toContain("确认旧印来源");
    expect(compact).toContain("沈照夜改变判断");
  });

  it("round-trips the automatic recovery audit marker", () => {
    const signal: ForeshadowRecoverySignal = {
      targetId: "foreshadow_1",
      action: "resolve",
      resolvedChapterId: "chapter_8",
      summary: "旧印来源已确认。",
      evidence: "内库登记册。",
      confidence: "high",
    };
    const payload = buildAutomaticForeshadowRecoveryPayload(signal);

    expect(parseAutomaticForeshadowRecoveryPayload(payload)).toEqual({
      source: automaticForeshadowRecoverySource,
      action: "resolve",
      confidence: "high",
      resolvedChapterId: "chapter_8",
    });
    expect(parseAutomaticForeshadowRecoveryPayload('{"source":"manual"}')).toBeNull();
  });
});
