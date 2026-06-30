import { describe, expect, it } from "vitest";
import {
  inferOutlineDraftLevel,
  parseOutlineDraftCopySuggestion,
} from "./outline-draft-copy";

describe("outline draft copy helpers", () => {
  it("parses a volume outline draft into quick-create fields", () => {
    const suggestion = parseOutlineDraftCopySuggestion({
      inputContextSummary: "《离线未来》卷大纲生成；已有大纲 0 条",
      outputText: `
## 《离线未来》第一卷大纲（草案）

**卷标题：** 县城起跑线
**卷目标：** 完成主角从1999年夏天重生到在县城站稳脚跟，并拿到第一桶金的完整阶段。
**章节范围：** 第1章 至 第30章 (预估)
`,
    });

    expect(suggestion).toEqual({
      level: "volume",
      title: "县城起跑线",
      goal: "完成主角从1999年夏天重生到在县城站稳脚跟，并拿到第一桶金的完整阶段。",
      startChapter: 1,
      endChapter: 30,
    });
  });

  it("parses markdown table volume drafts from model output", () => {
    const suggestion = parseOutlineDraftCopySuggestion({
      inputContextSummary: "《照夜寒舟录》卷大纲生成；已有大纲 0 条",
      outputText: `
# 照夜寒舟录 · 卷一大纲草案

## 卷信息

| 字段 | 内容 |
|------|------|
| **卷序号** | 第一卷 |
| **卷标题** | 无头照夜 |
| **卷主题** | 旧案遗孤与边军少将的被迫联手 |
| **卷字数目标** | 约 120,000 字（30–48 章） |
| **主线推进** | 两案线索交汇，揭露军饷被吞与沈家旧案同根；沈裴从对立到初步联手 |

### 第一单元：雨夜与尸

| 字段 | 内容 |
|------|------|
| **单元标题** | 雨夜与尸 |
| **章范围** | 第 1–8 章 |

### 第五单元：照夜寒舟

| 字段 | 内容 |
|------|------|
| **单元标题** | 照夜寒舟 |
| **章范围** | 第 39–46 章（卷终章） |
`,
    });

    expect(suggestion).toEqual({
      level: "volume",
      title: "无头照夜",
      goal: "两案线索交汇，揭露军饷被吞与沈家旧案同根；沈裴从对立到初步联手",
      startChapter: 1,
      endChapter: 46,
    });
  });

  it("parses a story-unit outline draft", () => {
    const suggestion = parseOutlineDraftCopySuggestion({
      inputContextSummary: "《离线未来》剧情单元大纲生成",
      outputText: `
## 剧情单元大纲：培训班破局

**剧情单元标题：** 培训班破局
**所属卷号：** 1
**章节范围：** 第3章-第8章
**剧情单元目标：** 让陈远通过培训班打开第一批客户入口。
`,
    });

    expect(suggestion).toEqual({
      level: "unit",
      title: "培训班破局",
      goal: "让陈远通过培训班打开第一批客户入口。",
      startChapter: 3,
      endChapter: 8,
      volumeNumber: 1,
    });
  });

  it("parses markdown table story-unit drafts", () => {
    const suggestion = parseOutlineDraftCopySuggestion({
      inputContextSummary: "《照夜寒舟录》剧情单元大纲生成",
      outputText: `
### 第一单元：雨夜与尸

| 字段 | 内容 |
|------|------|
| **单元标题** | 雨夜与尸 |
| **所属卷号** | 1 |
| **章范围** | 第 1–8 章 |
| **核心事件** | 大理寺旧牢雨夜发现无头尸，沈照夜与裴寒舟两条线在长安交汇。 |
`,
    });

    expect(suggestion).toEqual({
      level: "unit",
      title: "雨夜与尸",
      goal: "大理寺旧牢雨夜发现无头尸，沈照夜与裴寒舟两条线在长安交汇。",
      startChapter: 1,
      endChapter: 8,
      volumeNumber: 1,
    });
  });

  it("skips already-written chapter outline blocks and copies the first future chapter", () => {
    const suggestion = parseOutlineDraftCopySuggestion({
      inputContextSummary: "《离线未来》章节大纲生成；目标 10 个章节条目",
      outputText: `
## 卷一·第一章：重生初醒（已写章节）
- **章节范围**：第1章《1999年的风扇声》
- **状态**：已有章节。

## 第3章《上课与踩点》
- **章节号：** 3
- **目标**：完成首次电脑培训班上课场景，建立主角对本地市场和人际的第一手认知。
- **预计字数：** 8000
`,
    });

    expect(suggestion).toEqual({
      level: "chapter",
      title: "上课与踩点",
      goal: "完成首次电脑培训班上课场景，建立主角对本地市场和人际的第一手认知。",
      chapterNumber: 3,
      expectedWords: 8000,
    });
  });

  it("parses single chapter drafts that use markdown sections for title and goal", () => {
    const suggestion = parseOutlineDraftCopySuggestion({
      inputContextSummary:
        "《离线未来》章节大纲生成；已有大纲 6 条；目标第 7 章；固定 1 条章节大纲",
      outputText: `
# 第7章《断供》章节大纲（草案）

---

## 标题
第7章《断供》

## 目标
承接第6章结尾罗文斌施压升级的预判与方老板对省城渠道的摸底，将冲突从“试探”推进到“实质施压”。

## 章节范围
- **时间**：1999年6月29日至7月1日
- **地点**：新世纪电脑培训班、陈家

## 核心事件
罗文斌通过控制本地配件供应，对培训班实施实质性断供威胁。
`,
    });

    expect(suggestion).toEqual({
      level: "chapter",
      title: "第7章《断供》",
      goal:
        "承接第6章结尾罗文斌施压升级的预判与方老板对省城渠道的摸底，将冲突从“试探”推进到“实质施压”。",
      chapterNumber: 7,
    });
  });

  it("does not treat ordinary chapter-related section headings as chapter titles", () => {
    const suggestion = parseOutlineDraftCopySuggestion({
      inputContextSummary:
        "《离线未来》章节大纲生成；已有大纲 6 条；目标第 7 章；固定 1 条章节大纲",
      outputText: `
## 章节范围
- 时间：1999年6月29日至7月1日

## 目标
承接第6章后的断供危机。
`,
    });

    expect(suggestion).toEqual({
      level: "chapter",
      title: "",
      goal: "承接第6章后的断供危机。",
      chapterNumber: 7,
    });
  });

  it("stops markdown heading sections at colon-labelled fields", () => {
    const suggestion = parseOutlineDraftCopySuggestion({
      inputContextSummary:
        "《离线未来》章节大纲生成；已有大纲 6 条；目标第 7 章；固定 1 条章节大纲",
      outputText: `
## 标题
第7章《断供》
**目标：** 承接第6章后的断供危机。
**章节范围：** 第7章
**核心事件：** 罗文斌制造配件断供。
`,
    });

    expect(suggestion).toEqual({
      level: "chapter",
      title: "第7章《断供》",
      goal: "承接第6章后的断供危机。",
      chapterNumber: 7,
    });
  });

  it("infers the target level from the task summary before scanning draft text", () => {
    expect(
      inferOutlineDraftLevel(
        "《离线未来》卷大纲生成；已有章节 2 个",
        "正文里可能提到章节大纲",
      ),
    ).toBe("volume");
  });
});
