import { describe, expect, it } from "vitest";
import {
  appendMemoryNote,
  inferProjectSettingFieldName,
  normalizeRiskLevel,
  normalizeTargetType,
  normalizeUpdateType,
  pendingUpdateRiskLabel,
  pendingUpdateStatusLabel,
  pendingUpdateTargetLabel,
} from "./pending-updates";

describe("pending update helpers", () => {
  it("normalizes labels and risk levels", () => {
    expect(pendingUpdateStatusLabel("pending")).toBe("待审核");
    expect(pendingUpdateRiskLabel("high")).toBe("高风险");
    expect(pendingUpdateTargetLabel("world_rule")).toBe("世界规则");
    expect(normalizeRiskLevel("涉及核心世界观规则")).toBe("high");
    expect(normalizeRiskLevel("低风险补充")).toBe("low");
    expect(normalizeRiskLevel("普通更新")).toBe("medium");
  });

  it("normalizes target and update types from Chinese or loose model output", () => {
    expect(normalizeTargetType("角色")).toBe("character");
    expect(normalizeTargetType("时间线")).toBe("timeline_event");
    expect(normalizeTargetType("world_rule")).toBe("world_rule");
    expect(normalizeUpdateType("新增")).toBe("create");
    expect(normalizeUpdateType("回收")).toBe("resolve");
    expect(normalizeUpdateType("whatever")).toBe("update");
  });

  it("infers project setting fields for approved updates", () => {
    expect(inferProjectSettingFieldName("禁写变化", "新增红线")).toBe(
      "forbiddenItems",
    );
    expect(inferProjectSettingFieldName("长期伏笔", "倒计时含义待解")).toBe(
      "longTermForeshadowing",
    );
    expect(inferProjectSettingFieldName("势力更新", "地下契约组织登场")).toBe(
      "factions",
    );
    expect(inferProjectSettingFieldName("普通世界补充", "七天后生效")).toBe(
      "worldviewRules",
    );
  });

  it("appends formal memory notes without duplicating identical content", () => {
    expect(appendMemoryNote("", "新规则")).toBe("新规则");
    expect(appendMemoryNote("旧规则", "新规则")).toBe("旧规则\n\n新规则");
    expect(appendMemoryNote("旧规则\n\n新规则", "新规则")).toBe(
      "旧规则\n\n新规则",
    );
  });
});
