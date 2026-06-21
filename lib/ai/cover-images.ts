export const coverImageGenerationTaskType = "cover_image_generation";
export const coverImageGenerationTemplateKey = "cover_image_generation";
export const coverImagePromptMaxLength = 3000;

export type CoverImageTarget = {
  key: "book_cover" | "wide_banner" | "square";
  label: string;
  aspectRatio: string;
  suggestedSize: string;
  promptHint: string;
};

export type CoverImagePromptContextInput = {
  imageCount?: number | null;
  latestCoverPrompt?: string | null;
  project: {
    title?: string | null;
    genre?: string | null;
    targetAudience?: string | null;
    description?: string | null;
  };
  requestPrompt?: string | null;
  setting?: {
    sellingPoint?: string | null;
    worldviewRules?: string | null;
    styleSample?: string | null;
    forbiddenItems?: string | null;
  } | null;
  target?: string | null;
};

export type CoverImagePromptContext = {
  imageCount: number;
  inputContextSummary: string;
  inputJson: {
    cover: {
      prompt: string;
      target: CoverImageTarget;
    };
    project: CoverImagePromptContextInput["project"];
    setting: CoverImagePromptContextInput["setting"];
    source: "manual_prompt" | "publish_package_prompt" | "project_fallback";
  };
  prompt: string;
  target: CoverImageTarget;
};

export type CoverImageTaskOutput = {
  endpoint?: string;
  images?: StoredCoverImageCandidate[];
  requestJson?: unknown;
};

export type StoredCoverImageCandidate = {
  assetPath: string | null;
  fileName: string | null;
  mimeType: string | null;
  revisedPrompt: string | null;
  sizeBytes: number | null;
};

export const coverImageTargets: readonly CoverImageTarget[] = [
  {
    key: "book_cover",
    label: "作品封面",
    aspectRatio: "2:3",
    suggestedSize: "1024x1536",
    promptHint:
      "竖版小说封面主视觉，适合作品页封面，不要生成可读文字、书名、logo 或水印。",
  },
  {
    key: "wide_banner",
    label: "网站横幅",
    aspectRatio: "16:9",
    suggestedSize: "1536x864",
    promptHint:
      "横版网站头图，主体居中偏上，给网页裁切保留安全边距，不要生成可读文字、logo 或水印。",
  },
  {
    key: "square",
    label: "方形封面",
    aspectRatio: "1:1",
    suggestedSize: "1024x1024",
    promptHint:
      "方形作品缩略图，主体明确，移动端小图也能辨认，不要生成可读文字、logo 或水印。",
  },
];

const fallbackCoverPrompt =
  "根据小说标题、题材和故事简介生成一张有辨识度的长篇连载小说封面。";

export function buildCoverImagePromptContext(
  input: CoverImagePromptContextInput,
): CoverImagePromptContext {
  const target = normalizeCoverImageTarget(input.target);
  const manualPrompt = clean(input.requestPrompt);
  const publishPrompt = clean(input.latestCoverPrompt);
  const source = manualPrompt
    ? "manual_prompt"
    : publishPrompt
      ? "publish_package_prompt"
      : "project_fallback";
  const corePrompt =
    manualPrompt || publishPrompt || fallbackProjectCoverPrompt(input.project);
  const imageCount = normalizeImageCount(input.imageCount);
  const prompt = [
    "# 封面图生成要求",
    `作品：${clean(input.project.title) || "未命名作品"}`,
    input.project.genre ? `题材：${input.project.genre}` : "",
    input.project.targetAudience
      ? `目标读者：${input.project.targetAudience}`
      : "",
    "",
    "# 核心画面提示词",
    corePrompt,
    "",
    "# 画幅与用途",
    `${target.label}，画幅 ${target.aspectRatio}。${target.promptHint}`,
    "",
    "# 作品背景补充",
    input.project.description ? `简介：${input.project.description}` : "",
    input.setting?.sellingPoint ? `卖点：${input.setting.sellingPoint}` : "",
    input.setting?.worldviewRules
      ? `世界观边界：${input.setting.worldviewRules}`
      : "",
    input.setting?.styleSample ? `文风样例：${input.setting.styleSample}` : "",
    input.setting?.forbiddenItems
      ? `禁写/规避项：${input.setting.forbiddenItems}`
      : "",
    "",
    "# 输出约束",
    "画面应像一张可直接用于小说作品页的封面主视觉。避免真实品牌、真实人物肖像、可读中文标题、乱码文字、水印、UI 截图、边框和宣传海报排版。",
  ]
    .filter((line) => line !== "")
    .join("\n");

  return {
    imageCount,
    inputContextSummary: [
      `${target.label}生成`,
      `来源：${coverPromptSourceLabel(source)}`,
      `候选图 ${imageCount} 张`,
      `建议尺寸 ${target.suggestedSize}`,
    ].join("；"),
    inputJson: {
      cover: {
        prompt: corePrompt,
        target,
      },
      project: input.project,
      setting: input.setting ?? null,
      source,
    },
    prompt,
    target,
  };
}

export function parseCoverImageRequestPrompt(value?: string | null) {
  const prompt = clean(value);

  if (prompt.length > coverImagePromptMaxLength) {
    return {
      ok: false as const,
      prompt: "",
    };
  }

  return {
    ok: true as const,
    prompt,
  };
}

export function parseCoverImageTaskOutput(
  outputJson?: string | null,
): CoverImageTaskOutput | null {
  if (!outputJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(outputJson);

    if (!isRecord(parsed)) {
      return null;
    }

    const images = Array.isArray(parsed.images)
      ? parsed.images.flatMap((image) => normalizeStoredImage(image))
      : [];

    return {
      endpoint: clean(parsed.endpoint),
      images,
      requestJson: parsed.requestJson,
    };
  } catch {
    return null;
  }
}

export function normalizeCoverImageTarget(value?: string | null): CoverImageTarget {
  const target = coverImageTargets.find((option) => option.key === value);

  return target ?? coverImageTargets[0];
}

export function coverPromptSourceLabel(
  source: CoverImagePromptContext["inputJson"]["source"],
) {
  if (source === "manual_prompt") {
    return "手动提示词";
  }

  if (source === "publish_package_prompt") {
    return "发布包装封面提示词";
  }

  return "项目基础信息";
}

function normalizeStoredImage(value: unknown): StoredCoverImageCandidate[] {
  if (!isRecord(value)) {
    return [];
  }

  const assetPath = clean(value.assetPath) || null;
  const fileName = clean(value.fileName) || null;
  const mimeType = clean(value.mimeType) || null;
  const revisedPrompt = clean(value.revisedPrompt) || null;
  const sizeBytes = numberValue(value.sizeBytes);

  if (!assetPath || !mimeType) {
    return [];
  }

  return [
    {
      assetPath,
      fileName,
      mimeType,
      revisedPrompt,
      sizeBytes,
    },
  ];
}

function fallbackProjectCoverPrompt(
  project: CoverImagePromptContextInput["project"],
) {
  return [
    clean(project.title) ? `《${clean(project.title)}》` : "",
    clean(project.genre),
    clean(project.description),
    fallbackCoverPrompt,
  ]
    .filter(Boolean)
    .join("，");
}

function normalizeImageCount(value?: number | null) {
  const count = Number(value);

  if (!Number.isInteger(count) || count < 1) {
    return 1;
  }

  return Math.min(count, 4);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clean(value?: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0 ? number : null;
}
