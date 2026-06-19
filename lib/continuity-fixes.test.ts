import { describe, expect, it } from "vitest";
import {
  applyContinuityReplacement,
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

  it("ignores vague suggestions that are not safe to auto-apply", () => {
    expect(parseContinuityReplacementFix("建议补一段解释，避免读者困惑。")).toBeNull();
  });
});
