import { describe, expect, it } from "vitest";
import {
  buildShortStorySeriesImportDraftFromHtml,
  shortStorySeriesImportFieldMaxLength,
} from "./document-import";

describe("short-story series document import", () => {
  it("maps a structured series bible into reviewable series fields", () => {
    const draft = buildShortStorySeriesImportDraftFromHtml(
      [
        "<p>科幻短故事系列 · 创作圣经</p>",
        "<p>《永生者档案》</p>",
        "<table><tr><td>一句话提案</td><td>不死者穿越千年调查异常。</td></tr></table>",
        "<h1>1. 项目定位与核心卖点</h1>",
        "<p>每篇独立闭环，同时推进千年真相。</p>",
        "<h1>2. 世界观与外星科学底层</h1>",
        "<p>银色药剂是外星文明备份协议。</p>",
        "<h1>3. 主角阿德里安</h1>",
        "<table><tr><td>身份</td><td>王室制图局学徒</td></tr></table>",
        "<h1>4. 永生规则与戏剧边界</h1>",
        "<ul><li>不会自然衰老</li><li>重大修复会失忆</li></ul>",
        "<h1>7. 长期总主线</h1>",
        "<h2>核心悬念</h2>",
        "<p>先行者是否仍然存在？</p>",
        "<h1>10. 第一季十篇故事规划</h1>",
        "<h2>01《坠星瓶》</h2>",
        "<p>误服药剂并焚毁坠毁舱。</p>",
      ].join(""),
      "永生者系列_科幻短故事创作圣经.docx",
    );

    expect(draft.values.title).toBe("永生者档案");
    expect(draft.values.premise).toContain("不死者穿越千年调查异常");
    expect(draft.values.sharedWorldview).toContain("外星文明备份协议");
    expect(draft.values.continuityRules).toContain("重大修复会失忆");
    expect(draft.values.recurringElements).toContain("王室制图局学徒");
    expect(draft.values.longTermMysteries).toContain("先行者是否仍然存在");
    expect(draft.values.futureDirection).toContain("坠星瓶");
    expect(draft.stats.tableCount).toBe(2);
    expect(draft.warnings).toEqual([]);
  });

  it("ignores navigation text and falls back without inventing content", () => {
    const draft = buildShortStorySeriesImportDraftFromHtml(
      [
        "<p>《雾城异闻录》</p>",
        "<h1>使用说明</h1>",
        "<p>每篇处理一个独立案件。</p>",
        "<h2>文档导航</h2>",
        "<ul><li>世界观</li><li>人物</li></ul>",
        "<h1>世界观</h1>",
        "<p>所有异常都留下潮湿盐霜。</p>",
      ].join(""),
      "series.docx",
    );

    expect(draft.values.premise).not.toContain("文档导航");
    expect(draft.values.sharedWorldview).toContain("潮湿盐霜");
    expect(draft.values.longTermMysteries).toBe("");
    expect(draft.warnings.join(" ")).toContain("长期谜团");
  });

  it("assigns each section to one best field without duplicating parent matches", () => {
    const draft = buildShortStorySeriesImportDraftFromHtml(
      [
        "<p>《单一归属测试》</p>",
        "<h1>世界观</h1>",
        "<p>基础世界事实。</p>",
        "<h2>永生规则</h2>",
        "<p>每次复生都会遗失一段记忆。</p>",
        "<h1>第一季故事规划</h1>",
        "<h2>主角阶段变化</h2>",
        "<p>阿德里安开始怀疑自己的来历。</p>",
        "<h2>01《坠星瓶》</h2>",
        "<p>第一篇独立故事。</p>",
      ].join(""),
      "exclusive.docx",
    );

    expect(draft.values.continuityRules).toContain("每次复生都会遗失");
    expect(draft.values.sharedWorldview).not.toContain("每次复生都会遗失");
    expect(draft.values.recurringElements).toContain("开始怀疑自己的来历");
    expect(draft.values.futureDirection).not.toContain("开始怀疑自己的来历");
    expect(draft.values.futureDirection).toContain("第一篇独立故事");
  });

  it("caps imported field values at the series form limit", () => {
    const longText = "世界规则。".repeat(4000);
    const draft = buildShortStorySeriesImportDraftFromHtml(
      `<p>《长文档》</p><h1>世界观</h1><p>${longText}</p>`,
      "long.docx",
    );

    expect(draft.values.sharedWorldview.length).toBeLessThanOrEqual(
      shortStorySeriesImportFieldMaxLength,
    );
    expect(draft.values.sharedWorldview).toContain("导入内容超过长度上限");
    expect(draft.warnings.join(" ")).toContain("共享世界观超过单字段长度上限");
  });
});
