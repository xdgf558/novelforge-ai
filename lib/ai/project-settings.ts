import {
  projectSettingFields,
  projectSettingValuesFromRecord,
  type ProjectSettingFieldName,
  type ProjectSettingValues,
} from "../project-setting-fields";

type Scalar = string | number | boolean | Date | null | undefined;

export type ProjectSettingGenerationProjectContext = {
  title?: Scalar;
  genre?: Scalar;
  targetAudience?: Scalar;
  platform?: Scalar;
  totalWordTarget?: Scalar;
  description?: Scalar;
  wechatPositioning?: Scalar;
};

export type ProjectSettingGenerationInput = {
  project: ProjectSettingGenerationProjectContext;
  setting?: Partial<Record<ProjectSettingFieldName, string | null>> | null;
};

export function buildProjectSettingGenerationContext(
  input: ProjectSettingGenerationInput,
) {
  const currentSetting = projectSettingValuesFromRecord(input.setting);
  const filledSettingFields = projectSettingFields.filter((field) =>
    currentSetting[field.name].trim(),
  );
  const projectTitle = stringValue(input.project.title) || "未命名项目";

  return {
    inputContextSummary: `${projectTitle} 总设定生成；已有设定字段 ${filledSettingFields.length} 个`,
    inputJson: {
      project: {
        title: stringValue(input.project.title),
        genre: stringValue(input.project.genre),
        targetAudience: stringValue(input.project.targetAudience),
        platform: stringValue(input.project.platform),
        totalWordTarget: numberValue(input.project.totalWordTarget),
        description: stringValue(input.project.description),
        wechatPositioning: stringValue(input.project.wechatPositioning),
      },
      currentSetting,
      allowedFields: projectSettingFields.map((field) => ({
        name: field.name,
        label: field.label,
      })),
    },
    inputText: [
      "# 项目基础",
      `标题：${projectTitle}`,
      `题材：${stringValue(input.project.genre) || "未设置"}`,
      `目标读者：${stringValue(input.project.targetAudience) || "未设置"}`,
      `平台：${stringValue(input.project.platform) || "未设置"}`,
      `目标字数：${numberValue(input.project.totalWordTarget) ?? "未设置"}`,
      `简介：${stringValue(input.project.description) || "未设置"}`,
      `公众号定位：${stringValue(input.project.wechatPositioning) || "未设置"}`,
      "",
      "# 已有总设定档",
      formatSettingValues(currentSetting) || "当前总设定档为空，请生成完整初稿。",
      "",
      "# 输出要求",
      "请只输出 JSON 对象，不要输出 Markdown。",
      "JSON 字段名只能使用下列总设定字段名；没有把握的字段可以留空字符串。",
      projectSettingFields.map((field) => `- ${field.name}：${field.label}`).join("\n"),
      "所有内容都只是供作者审核的草案，不得宣称已经写入正式设定。",
    ].join("\n"),
  };
}

export function parseProjectSettingGenerationOutput(
  output?: string | null,
): Partial<ProjectSettingValues> {
  const parsed = parseJsonLikeObject(output);
  const record = isRecord(parsed?.settings)
    ? parsed.settings
    : isRecord(parsed?.projectSetting)
      ? parsed.projectSetting
      : parsed;
  const values: Partial<ProjectSettingValues> = {};

  if (!isRecord(record)) {
    return values;
  }

  for (const field of projectSettingFields) {
    const value = stringifyDraftValue(record[field.name]);

    if (value) {
      values[field.name] = value;
    }
  }

  return values;
}

export function hasProjectSettingDraftValues(
  values: Partial<ProjectSettingValues>,
) {
  return Object.values(values).some((value) => Boolean(value?.trim()));
}

function formatSettingValues(values: ProjectSettingValues) {
  return projectSettingFields
    .map((field) => {
      const value = values[field.name].trim();

      return value ? `## ${field.label}\n${value}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function parseJsonLikeObject(output?: string | null) {
  const text = output?.trim();

  if (!text) {
    return null;
  }

  for (const candidate of jsonCandidates(text)) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Continue trying less strict extraction candidates.
    }
  }

  return null;
}

function jsonCandidates(text: string) {
  const candidates = [text];
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    candidates.push(fencedMatch[1].trim());
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }

  return candidates;
}

function stringifyDraftValue(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyDraftValue(item))
      .filter(Boolean)
      .join("\n");
  }

  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, item]) => {
        const content = stringifyDraftValue(item);

        return content ? `${key}：${content}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: Scalar) {
  if (value == null) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value).trim();
}

function numberValue(value: Scalar) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}
