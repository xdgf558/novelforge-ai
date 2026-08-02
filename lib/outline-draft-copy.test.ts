import { describe, expect, it } from "vitest";
import {
  inferOutlineDraftLevel,
  parseOutlineDraftCopyResult,
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
**单元号：** 2
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
      unitNumber: 2,
    });
  });

  it("parses prompt-v5 story-unit fields without markdown headings", () => {
    const suggestion = parseOutlineDraftCopySuggestion({
      inputContextSummary:
        "《离线未来》剧情单元大纲生成；建议第 2 单元从第 11 章开始",
      outputText: `
**标题：** 查分决战
**所属卷号：** 1
**单元号：** 2
**目标：** 完成查分服务决战。
**章节范围：** 第11章-第15章
**核心事件：** 陈远处理首日查分高峰。
`,
    });

    expect(suggestion).toEqual({
      level: "unit",
      title: "查分决战",
      goal: "完成查分服务决战。",
      startChapter: 11,
      endChapter: 15,
      volumeNumber: 1,
      unitNumber: 2,
    });
  });

  it("selects the requested next unit from a mixed-level model response", () => {
    const suggestion = parseOutlineDraftCopySuggestion({
      inputContextSummary:
        "《离线未来》剧情单元大纲生成；已有大纲 10 条；角色 12 个；已有章节 5 个；建议起始第 11 章",
      outputText: `
# 卷大纲：县城打拼
**目标：** 重述第一卷整体目标。
**章节范围：** 第1章-第30章

# 剧情单元大纲：第一单元「第一桶金」
**目标：** 重述已经完成的第一单元。
**章节范围：** 第3章-第15章

# 剧情单元大纲：子单元「查分决战」
**目标：** 承接第10章结尾，在查分服务上线前完成最后部署并击退罗文斌的干扰。
**章节范围：** 第11章-第15章

# 第11章《查分首日》章节大纲
**目标：** 展开单章事件。
`,
    });

    expect(suggestion).toEqual({
      level: "unit",
      title: "查分决战",
      goal:
        "承接第10章结尾，在查分服务上线前完成最后部署并击退罗文斌的干扰。",
      startChapter: 11,
      endChapter: 15,
    });
  });

  it("uses the task summary to carry the suggested next unit number", () => {
    const suggestion = parseOutlineDraftCopySuggestion({
      inputContextSummary:
        "《离线未来》剧情单元大纲生成；建议第 2 单元从第 11 章开始",
      outputText: `
# 剧情单元大纲：查分决战
**所属卷号：** 1
**目标：** 完成查分服务决战。
**章节范围：** 第11章-第15章
`,
    });

    expect(suggestion).toMatchObject({
      level: "unit",
      title: "查分决战",
      startChapter: 11,
      endChapter: 15,
      volumeNumber: 1,
      unitNumber: 2,
    });
  });

  it("reports when multiple unit blocks have no audited start chapter", () => {
    const result = parseOutlineDraftCopyResult({
      inputContextSummary: "《离线未来》剧情单元大纲生成",
      outputText: `
# 第一单元「第一桶金」
**目标：** 已完成的旧单元。
**章节范围：** 第3章-第10章

# 第二单元「查分决战」
**目标：** 下一剧情单元。
**章节范围：** 第11章-第15章
`,
    });

    expect(result.suggestion).toBeNull();
    expect(result.errorMessage).toContain("任务没有记录建议起始章");
  });

  it("reports when no unit block matches the audited start chapter", () => {
    const result = parseOutlineDraftCopyResult({
      inputContextSummary:
        "《离线未来》剧情单元大纲生成；建议第 2 单元从第 11 章开始",
      outputText: `
# 第一单元「第一桶金」
**目标：** 已完成的旧单元。
**章节范围：** 第3章-第10章

# 第三单元「省城采购」
**目标：** 更晚的剧情单元。
**章节范围：** 第16章-第20章
`,
    });

    expect(result.suggestion).toBeNull();
    expect(result.errorMessage).toContain("从第 11 章开始");
  });

  it("rejects a single unit block whose start chapter misses the audit anchor", () => {
    const result = parseOutlineDraftCopyResult({
      inputContextSummary:
        "《离线未来》剧情单元大纲生成；建议第 2 单元从第 11 章开始",
      outputText: `
**标题：** 查分决战
**所属卷号：** 1
**单元号：** 2
**目标：** 完成查分服务决战。
**章节范围：** 第12章-第15章
`,
    });

    expect(result.suggestion).toBeNull();
    expect(result.errorMessage).toContain("从第 11 章开始");
  });

  it("keeps leading unit metadata with label-based blocks", () => {
    const suggestion = parseOutlineDraftCopySuggestion({
      inputContextSummary:
        "《离线未来》剧情单元大纲生成；建议第 2 单元从第 11 章开始",
      outputText: `
**所属卷号：** 1
**单元号：** 1
**标题：** 第一桶金
**目标：** 已完成的旧单元。
**章节范围：** 第3章-第10章

**所属卷号：** 1
**单元号：** 2
**标题：** 查分决战
**目标：** 完成查分服务决战。
**章节范围：** 第11章-第15章
`,
    });

    expect(suggestion).toEqual({
      level: "unit",
      title: "查分决战",
      goal: "完成查分服务决战。",
      startChapter: 11,
      endChapter: 15,
      volumeNumber: 1,
      unitNumber: 2,
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

  it("uses the first beat-overview paragraph when a chapter draft omits an explicit goal", () => {
    const suggestion = parseOutlineDraftCopySuggestion({
      inputContextSummary:
        "《照夜寒舟录》章节大纲生成；已有大纲 27 条；角色 12 个；已有章节 5 个；目标第 24 章；固定 1 条章节大纲",
      outputText: `
# 第24章《酉位移库》章节大纲草案

**状态：待作者审核，未写入正式故事记忆**

---

## 节拍总览

本章承接第23章结尾沈照夜与裴寒舟识破崔晏的布局，近午时分做出三入宗正寺后仓的决定，目标锁定酉位架第七格的移库令底档。

核心场景压缩在天黑后一个时辰内，关键转折发生在酉位架第七格。

章末以灰衣人换防提前的脚步声收束，为下一章埋下钩子。

---

## 节拍序列

### 节拍一：三入后仓
沈裴二人确认行动路线。
`,
    });

    expect(suggestion).toEqual({
      level: "chapter",
      title: "酉位移库",
      goal:
        "本章承接第23章结尾沈照夜与裴寒舟识破崔晏的布局，近午时分做出三入宗正寺后仓的决定，目标锁定酉位架第七格的移库令底档。",
      chapterNumber: 24,
    });
  });

  it("prefers an explicit chapter goal over the beat-overview fallback", () => {
    const suggestion = parseOutlineDraftCopySuggestion({
      inputContextSummary: "《照夜寒舟录》章节大纲生成；目标第 24 章",
      outputText: `
# 第24章《酉位移库》章节大纲草案

**目标：** 取得酉位架第七格的移库令底档。

## 节拍总览

这里是更长的章节背景与节拍说明。
`,
    });

    expect(suggestion?.goal).toBe("取得酉位架第七格的移库令底档。");
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

  it("stops volume goals at every prompt-v5 volume field label", () => {
    const suggestion = parseOutlineDraftCopySuggestion({
      inputContextSummary: "《离线未来》卷大纲生成",
      outputText: `
**标题：** 省城扩张
**目标：** 完成省城立足。
**主线推进：** 建立供应链。
**核心冲突：** 与渠道商争夺代理权。
**主要对手：** 罗文斌。
**关键转折：** 核心成员倒戈。
**高潮：** 省城发布会反击。
**章节范围：** 第31章-第60章
`,
    });

    expect(suggestion?.goal).toBe("完成省城立足。");
  });

  it("stops chapter goals at every prompt-v5 chapter field label", () => {
    const suggestion = parseOutlineDraftCopySuggestion({
      inputContextSummary: "《离线未来》章节大纲生成；目标第 11 章",
      outputText: `
**标题：** 查分首日
**目标：** 扛住第一波查分高峰。
**章节号：** 11
**预计字数：** 5000
**章节冲突：** 线路突然中断。
**章节爽点：** 陈远启用备用线路。
**伏笔：** 白衬衫在门外记下时间。
**出场角色：** 陈远、方老板。
**地点：** 新世纪电脑培训班。
**章末钩子：** 罗文斌亲自出现。
`,
    });

    expect(suggestion?.goal).toBe("扛住第一波查分高峰。");
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
