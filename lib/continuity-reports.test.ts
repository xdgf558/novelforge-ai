import { describe, expect, it } from "vitest";
import {
  continuityCategoryLabel,
  continuitySeverityLabel,
  continuityStatusLabel,
  normalizeContinuityCategory,
  normalizeContinuitySeverity,
} from "./continuity-reports";

describe("continuity report helpers", () => {
  it("labels statuses, severities, and categories", () => {
    expect(continuityStatusLabel("open")).toBe("待处理");
    expect(continuitySeverityLabel("critical")).toBe("严重");
    expect(continuityCategoryLabel("timeline")).toBe("时间线");
  });

  it("normalizes loose model severity output", () => {
    expect(normalizeContinuitySeverity("严重阻塞")).toBe("critical");
    expect(normalizeContinuitySeverity("核心冲突")).toBe("high");
    expect(normalizeContinuitySeverity("轻微提示")).toBe("low");
    expect(normalizeContinuitySeverity("普通问题")).toBe("medium");
  });

  it("normalizes issue categories from English or Chinese output", () => {
    expect(normalizeContinuityCategory("人物知道了不该知道的信息")).toBe(
      "character_knowledge",
    );
    expect(normalizeContinuityCategory("世界观规则冲突")).toBe("world_rule");
    expect(normalizeContinuityCategory("foreshadow duplicated")).toBe(
      "foreshadow",
    );
    expect(normalizeContinuityCategory("公众号发布风险")).toBe(
      "publishing_risk",
    );
    expect(normalizeContinuityCategory("opening_promise")).toBe(
      "opening_promise",
    );
    expect(normalizeContinuityCategory("重复信息过多")).toBe(
      "repeated_information",
    );
    expect(normalizeContinuityCategory("段落中途跳视角进入配角内心")).toBe(
      "narrative_perspective",
    );
  });
});
