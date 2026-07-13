import mammoth from "mammoth";
import { HTMLElement, NodeType, parse } from "node-html-parser";

export const shortStorySeriesDocumentMaxBytes = 10 * 1024 * 1024;
export const shortStorySeriesImportFieldMaxLength = 12000;

export type ShortStorySeriesImportValues = {
  title: string;
  status: "active";
  premise: string;
  sharedWorldview: string;
  continuityRules: string;
  recurringElements: string;
  longTermMysteries: string;
  futureDirection: string;
};

export type ShortStorySeriesDocumentDraft = {
  sourceFileName: string;
  values: ShortStorySeriesImportValues;
  stats: {
    characterCount: number;
    headingCount: number;
    paragraphCount: number;
    sectionCount: number;
    tableCount: number;
  };
  warnings: string[];
};

type DocumentSection = {
  heading: string;
  level: number;
  parentHeading: string;
  blocks: string[];
};

type FieldRule = {
  name: Exclude<keyof ShortStorySeriesImportValues, "status" | "title">;
  pattern: RegExp;
};

const ignoredSectionPattern = /(?:^|\s)(?:文档)?(?:导航|目录)(?:\s|$)/;
const fieldRules: readonly FieldRule[] = [
  {
    name: "premise",
    pattern: /使用说明|项目定位|核心卖点|故事引擎|创作北极星|系列承诺|一句话提案/,
  },
  {
    name: "sharedWorldview",
    pattern: /世界观|外星科学|架空世界|真相层|能力规则|永生规则|千年时间线|时代书写/,
  },
  {
    name: "continuityRules",
    pattern: /科幻表达原则|永生规则|戏剧边界|禁止临时加码|单元故事|连续性管理|创作约束|检查表|硬约束|开写前|完稿后/,
  },
  {
    name: "recurringElements",
    pattern: /主角|配角|人物|角色|组织|声音与习惯|反复意象|象征物|道具/,
  },
  {
    name: "longTermMysteries",
    pattern: /长期总主线|核心悬念|线索账本|五层揭晓|长期谜团|总谜团|长线/,
  },
  {
    name: "futureDirection",
    pattern: /第一季|第二季|篇故事规划|篇目规划|故事规划|下一步|发布策略|开发顺序|节奏复盘|后续方向/,
  },
] as const;

export async function extractShortStorySeriesDocumentDraft(input: {
  buffer: Buffer;
  fileName: string;
}) {
  const result = await mammoth.convertToHtml(
    {
      buffer: input.buffer,
    },
    {
      convertImage: mammoth.images.imgElement(async () => ({ src: "" })),
      externalFileAccess: false,
      ignoreEmptyParagraphs: true,
    },
  );
  const draft = buildShortStorySeriesImportDraftFromHtml(
    result.value,
    input.fileName,
  );
  const mammothWarnings = result.messages
    .filter((message) => message.type === "warning")
    .map((message) => message.message.trim())
    .filter(Boolean);

  return {
    ...draft,
    warnings: [...draft.warnings, ...mammothWarnings],
  };
}

export function buildShortStorySeriesImportDraftFromHtml(
  html: string,
  fileName: string,
): ShortStorySeriesDocumentDraft {
  const root = parse(html);
  const sections = documentSections(root);
  const renderedDocument = sections
    .map((section) => renderSection(section))
    .filter(Boolean)
    .join("\n\n");

  if (!renderedDocument.trim()) {
    throw new Error("文档中没有可读取的正文、列表或表格。");
  }

  const introSection = sections.find((section) => section.level === 0);
  const warnings: string[] = [];
  const truncatedFields: string[] = [];
  const fieldValues = Object.fromEntries(
    fieldRules.map((rule) => {
      const selectedSections = sections.filter((section) => {
        if (section.level === 0) {
          return rule.name === "premise";
        }

        const label = `${section.parentHeading} ${section.heading}`;
        return !ignoredSectionPattern.test(label) && rule.pattern.test(label);
      });
      const fallback = fallbackSections(rule.name, sections, introSection);
      const rendered = (selectedSections.length > 0 ? selectedSections : fallback)
        .map((section) => renderSection(section))
        .filter(Boolean)
        .join("\n\n");
      const limited = limitImportedField(rendered);

      if (limited.truncated) {
        truncatedFields.push(seriesImportFieldLabel(rule.name));
      }

      return [rule.name, limited.value];
    }),
  ) as Pick<
    ShortStorySeriesImportValues,
    | "premise"
    | "sharedWorldview"
    | "continuityRules"
    | "recurringElements"
    | "longTermMysteries"
    | "futureDirection"
  >;

  const emptyFields = fieldRules
    .filter((rule) => !fieldValues[rule.name].trim())
    .map((rule) => seriesImportFieldLabel(rule.name));

  if (emptyFields.length > 0) {
    warnings.push(`未识别到：${emptyFields.join("、")}。可以在创建前手动补充。`);
  }

  if (truncatedFields.length > 0) {
    warnings.push(
      `${truncatedFields.join("、")}超过单字段长度上限，已保留前 ${shortStorySeriesImportFieldMaxLength.toLocaleString("zh-CN")} 字。`,
    );
  }

  return {
    sourceFileName: fileName,
    values: {
      title: detectSeriesTitle(renderedDocument, fileName),
      status: "active",
      ...fieldValues,
    },
    stats: {
      characterCount: renderedDocument.length,
      headingCount: root.querySelectorAll("h1, h2, h3, h4, h5, h6").length,
      paragraphCount: root.querySelectorAll("p").length,
      sectionCount: sections.filter((section) => section.blocks.length > 0).length,
      tableCount: root.querySelectorAll("table").length,
    },
    warnings,
  };
}

function documentSections(root: HTMLElement) {
  const sections: DocumentSection[] = [
    {
      heading: "文档摘要",
      level: 0,
      parentHeading: "",
      blocks: [],
    },
  ];
  let currentSection = sections[0];
  let currentLevelOneHeading = "";

  for (const node of root.childNodes) {
    if (node.nodeType !== NodeType.ELEMENT_NODE) {
      continue;
    }

    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();
    const headingLevel = headingLevelFromTag(tagName);

    if (headingLevel) {
      const heading = normalizeInlineText(element.innerText);

      if (!heading) {
        continue;
      }

      if (headingLevel === 1) {
        currentLevelOneHeading = heading;
      }

      currentSection = {
        heading,
        level: headingLevel,
        parentHeading:
          headingLevel === 1 ? heading : currentLevelOneHeading,
        blocks: [],
      };
      sections.push(currentSection);
      continue;
    }

    const block = formatDocumentElement(element);

    if (block) {
      currentSection.blocks.push(block);
    }
  }

  return sections;
}

function formatDocumentElement(element: HTMLElement) {
  const tagName = element.tagName.toLowerCase();

  if (tagName === "table") {
    return formatTable(element);
  }

  if (tagName === "ul" || tagName === "ol") {
    return element
      .querySelectorAll("li")
      .map((item, index) => {
        const content = normalizeBlockText(item.innerText);
        const marker = tagName === "ol" ? `${index + 1}.` : "-";
        return content ? `${marker} ${content}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }

  return normalizeBlockText(element.innerText);
}

function formatTable(table: HTMLElement) {
  return table
    .querySelectorAll("tr")
    .map((row) =>
      row
        .querySelectorAll("th, td")
        .map((cell) => normalizeBlockText(cell.innerText))
        .filter(Boolean),
    )
    .filter((cells) => cells.length > 0)
    .map((cells) => {
      if (cells.length === 1) {
        return cells[0];
      }

      if (cells.length === 2) {
        return `${cells[0]}：${cells[1]}`;
      }

      return cells.join(" | ");
    })
    .join("\n");
}

function renderSection(section: DocumentSection) {
  const content = section.blocks.filter(Boolean).join("\n\n").trim();

  if (!content) {
    return "";
  }

  if (section.level === 0) {
    return content;
  }

  const heading =
    section.level > 1 &&
    section.parentHeading &&
    section.parentHeading !== section.heading
      ? `${section.parentHeading} / ${section.heading}`
      : section.heading;

  return `## ${heading}\n${content}`;
}

function fallbackSections(
  fieldName: FieldRule["name"],
  sections: DocumentSection[],
  introSection?: DocumentSection,
) {
  const contentSections = sections.filter(
    (section) =>
      section.blocks.length > 0 &&
      !ignoredSectionPattern.test(`${section.parentHeading} ${section.heading}`),
  );

  if (fieldName === "premise") {
    return [introSection, contentSections[0]].filter(
      (section): section is DocumentSection => Boolean(section?.blocks.length),
    );
  }

  if (fieldName === "sharedWorldview") {
    return contentSections.slice(0, 4);
  }

  return [];
}

function detectSeriesTitle(documentText: string, fileName: string) {
  const labeledTitle = documentText.match(
    /(?:系列(?:暂)?名|系列名称)\s*[：:]?\s*[《“"]?([^》”"\n；;]{1,120})/,
  )?.[1];
  const bracketedTitle = documentText.match(/《([^》\n]{1,120})》/)?.[1];
  const fileTitle = fileName
    .replace(/\.docx$/i, "")
    .replace(/[\s_-]*(?:系列)?(?:创作)?圣经.*$/i, "")
    .trim();

  return normalizeInlineText(labeledTitle || bracketedTitle || fileTitle || "未命名系列")
    .replace(/^[《“"]+|[》”"]+$/g, "")
    .slice(0, 120);
}

function limitImportedField(value: string) {
  const normalized = value.trim();

  if (normalized.length <= shortStorySeriesImportFieldMaxLength) {
    return {
      value: normalized,
      truncated: false,
    };
  }

  const marker = "\n\n[导入内容超过长度上限，后续部分未带入。]";
  const maximumContentLength =
    shortStorySeriesImportFieldMaxLength - marker.length;
  const provisional = normalized.slice(0, maximumContentLength);
  const lastLineBreak = provisional.lastIndexOf("\n");
  const content =
    lastLineBreak > maximumContentLength * 0.8
      ? provisional.slice(0, lastLineBreak)
      : provisional;

  return {
    value: `${content.trimEnd()}${marker}`,
    truncated: true,
  };
}

function normalizeBlockText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeInlineText(value?: string | null) {
  return normalizeBlockText(value || "").replace(/\n+/g, " ");
}

function headingLevelFromTag(tagName: string) {
  const match = tagName.match(/^h([1-6])$/);
  return match ? Number(match[1]) : null;
}

function seriesImportFieldLabel(fieldName: FieldRule["name"]) {
  return {
    premise: "系列定位",
    sharedWorldview: "共享世界观",
    continuityRules: "跨篇连续性规则",
    recurringElements: "复现人物 / 组织 / 技术",
    longTermMysteries: "长期谜团",
    futureDirection: "后续推进方向",
  }[fieldName];
}
