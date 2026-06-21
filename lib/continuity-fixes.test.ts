import { describe, expect, it } from "vitest";
import {
  applyContinuityReplacement,
  describeContinuityReplacementFix,
  parseContinuityReplacementFix,
} from "./continuity-fixes";

describe("continuity one-click fixes", () => {
  it("parses an explicit Chinese replacement suggestion", () => {
    expect(
      parseContinuityReplacementFix(
        "将“前世的底子”改为“以前的底子”“原来的底子”或“在省城摸过的那些机器经验”，抹去异常用词。",
      ),
    ).toEqual({
      from: "前世的底子",
      to: "以前的底子",
    });
  });

  it("applies exact replacements and reports the changed count", () => {
    const result = applyContinuityReplacement(
      "前世的底子加上看的那些书，前世的底子不能再说。",
      {
        from: "前世的底子",
        to: "以前的底子",
      },
    );

    expect(result).toEqual({
      count: 2,
      text: "以前的底子加上看的那些书，以前的底子不能再说。",
    });
  });

  it("infers a safe date-time replacement from evidence", () => {
    const fix = parseContinuityReplacementFix(
      "建议将方老板最后通牒的时间修正为6月25日凌晨一点五十分，或调整第2章林巧电话时间为6月22日深夜。",
      {
        evidence:
          "正文最后一句：‘现在是1999年6月24日。’并标注‘1999年6月24日凌晨一点五十分’，而前文明确写了‘第二天一早’。",
      },
    );

    expect(fix).toEqual({
      from: "1999年6月24日凌晨一点五十分",
      to: "1999年6月25日凌晨一点五十分",
      replacements: [
        {
          from: "1999年6月24日凌晨一点五十分",
          to: "1999年6月25日凌晨一点五十分",
        },
        {
          from: "现在是1999年6月24日",
          to: "现在是1999年6月25日",
        },
      ],
    });
    expect(describeContinuityReplacementFix(fix!)).toBe(
      "将“1999年6月24日凌晨一点五十分”替换为“1999年6月25日凌晨一点五十分”；将“现在是1999年6月24日”替换为“现在是1999年6月25日”",
    );
  });

  it("applies inferred multi-part date-time replacements", () => {
    const result = applyContinuityReplacement(
      "现在是1999年6月24日。\n方老板电话时间：1999年6月24日凌晨一点五十分。",
      {
        from: "1999年6月24日凌晨一点五十分",
        to: "1999年6月25日凌晨一点五十分",
        replacements: [
          {
            from: "1999年6月24日凌晨一点五十分",
            to: "1999年6月25日凌晨一点五十分",
          },
          {
            from: "现在是1999年6月24日",
            to: "现在是1999年6月25日",
          },
        ],
      },
    );

    expect(result).toEqual({
      count: 2,
      text: "现在是1999年6月25日。\n方老板电话时间：1999年6月25日凌晨一点五十分。",
    });
  });

  it("does not infer date-time replacements when evidence is ambiguous", () => {
    expect(
      parseContinuityReplacementFix("建议将时间修正为6月25日凌晨一点五十分。", {
        evidence:
          "1999年6月23日凌晨一点五十分和1999年6月24日凌晨一点五十分都需要检查。",
      }),
    ).toBeNull();
  });

  it("ignores vague suggestions that are not safe to auto-apply", () => {
    expect(parseContinuityReplacementFix("建议补一段解释，避免读者困惑。")).toBeNull();
  });
});
