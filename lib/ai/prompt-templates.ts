export type PromptOutputFormat = "json" | "markdown" | "text";

export type DefaultPromptTemplate = {
  key: string;
  name: string;
  taskType: string;
  version: number;
  outputFormat: PromptOutputFormat;
  systemPrompt: string;
  userPrompt: string;
  contextNotes: string;
  responseSchema?: string;
};

export const DEFAULT_AI_PROMPT_TEMPLATES: readonly DefaultPromptTemplate[] = [
  {
    key: "project_setting_generation",
    name: "项目总设定生成",
    taskType: "project_setting_generation",
    version: 1,
    outputFormat: "json",
    systemPrompt:
      "你是长篇连载小说的设定策划助手。只输出可供作者审核的建议，不得宣称已经修改正式设定。",
    userPrompt:
      "根据项目基础信息、题材、读者定位和创作灵感，生成一份结构化项目总设定草案。",
    contextNotes:
      "输入应包含项目标题、题材、目标读者、平台、字数目标、故事简介和公众号定位。",
    responseSchema: JSON.stringify({
      type: "object",
      required: ["genre", "sellingPoint", "mainConflict", "forbiddenItems"],
      properties: {
        genre: { type: "string" },
        sellingPoint: { type: "string" },
        mainConflict: { type: "string" },
        worldviewRules: { type: "string" },
        protagonistDesire: { type: "string" },
        forbiddenItems: { type: "string" },
      },
    }),
  },
  {
    key: "chapter_beat_generation",
    name: "章节节拍生成",
    taskType: "chapter_beat_generation",
    version: 1,
    outputFormat: "markdown",
    systemPrompt:
      "你是长篇连载小说的章节节拍助手。遵守既有设定、角色信息边界和禁写项，不得引入未经作者确认的正式设定。",
    userPrompt:
      "根据当前章节目标、项目设定、相关角色和最近章节摘要，生成本章关键事件、情绪转折和结尾钩子。",
    contextNotes:
      "输入应限制为任务相关上下文：项目设定摘要、相关角色、最近 3 章摘要、上一章结尾、当前章节目标。",
  },
  {
    key: "outline_generation",
    name: "大纲草案生成",
    taskType: "outline_generation",
    version: 1,
    outputFormat: "markdown",
    systemPrompt:
      "你是长篇连载小说的大纲策划助手。只输出供作者审核和手动整理的规划草案，不得宣称已经写入正式大纲或正式故事记忆。",
    userPrompt:
      "根据项目设定、已有大纲、角色资料和已完成章节，生成卷大纲、剧情单元大纲或章节大纲草案。",
    contextNotes:
      "输入应包含项目基础信息、项目设定摘要、已有大纲、主要角色、已有章节和本次目标层级。输出应提供可复制进大纲表单的结构化字段。",
  },
  {
    key: "character_generation",
    name: "人物草案生成",
    taskType: "character_generation",
    version: 1,
    outputFormat: "json",
    systemPrompt:
      "你是长篇连载小说的人物设定助手。只输出供作者审核的人物草案和关系建议，不得宣称已经写入正式角色库或人物关系网络。",
    userPrompt:
      "根据项目设定、已有角色、人物关系、大纲和作者补充需求，生成一个可审阅的新人物档案草案。",
    contextNotes:
      "输入应包含项目基础信息、总设定摘要、已有角色、已有关系、相关大纲和作者对新人物的定位要求。输出只能是 JSON。",
    responseSchema: JSON.stringify({
      type: "object",
      required: ["character"],
      properties: {
        character: {
          type: "object",
          required: ["name", "roleInStory", "identity"],
          properties: {
            name: { type: "string" },
            roleInStory: { type: "string" },
            identity: { type: "string" },
            status: { type: "string" },
            speakingStyle: { type: "string" },
            desire: { type: "string" },
            fear: { type: "string" },
            secret: { type: "string" },
            relationToProtagonist: { type: "string" },
            relationToAntagonist: { type: "string" },
            knownInfo: { type: "string" },
            hiddenInfo: { type: "string" },
            abilityBoundary: { type: "string" },
            behaviorRules: { type: "string" },
            characterArc: { type: "string" },
            firstAppearance: { type: "string" },
            latestAppearance: { type: "string" },
            notes: { type: "string" },
          },
        },
        suggestedRelationships: {
          type: "array",
          items: { type: "string" },
        },
      },
    }),
  },
  {
    key: "chapter_draft_generation",
    name: "章节草稿生成",
    taskType: "chapter_draft_generation",
    version: 1,
    outputFormat: "text",
    systemPrompt:
      "你是长篇连载小说草稿助手。严格按已确认节拍写作，保持人物说话规则和世界观边界。",
    userPrompt:
      "根据已确认章节节拍、文风样本、角色说话规则和目标字数，生成章节草稿。",
    contextNotes:
      "输入应包含已确认节拍、文风样本、角色说话规则、上一章结尾、目标字数和禁写项。",
  },
  {
    key: "chapter_polish_generation",
    name: "正文精修",
    taskType: "chapter_polish_generation",
    version: 1,
    outputFormat: "text",
    systemPrompt:
      "你是长篇连载小说正文精修助手。只优化表达、节奏、段落衔接和可读性，不改变作者已确认的剧情事实和正式设定。",
    userPrompt:
      "根据章节草稿或已有精修稿、章节目标、文风样本、角色说话规则和禁写事项，输出完整精修正文。",
    contextNotes:
      "输入应包含待精修正文、章节目标、章节节拍、文风样本、角色说话规则、世界观边界和禁写项。输出必须是读者可直接阅读的完整正文，不得保留节拍标题或创作过程说明。",
  },
  {
    key: "chapter_summary_extraction",
    name: "章节摘要提取",
    taskType: "chapter_summary_extraction",
    version: 1,
    outputFormat: "json",
    systemPrompt:
      "你是长篇连载小说的结构化记忆提取助手。只提取文本中明确出现的信息，不推测隐藏设定。",
    userPrompt:
      "从最终章节正文中提取短摘要、主要事件、角色状态变化、新设定、伏笔、时间线事件和连续性风险。",
    contextNotes:
      "输入应包含章节号、最终正文、当前项目设定摘要和必要的角色名表。",
    responseSchema: JSON.stringify({
      type: "object",
      required: ["shortSummary", "mainEvents", "continuityRisks"],
      properties: {
        shortSummary: { type: "string" },
        mainEvents: { type: "array", items: { type: "string" } },
        characterChanges: { type: "array", items: { type: "string" } },
        newForeshadows: { type: "array", items: { type: "string" } },
        newSettings: { type: "array", items: { type: "string" } },
        timelineEvents: { type: "array", items: { type: "string" } },
        continuityRisks: { type: "array", items: { type: "string" } },
      },
    }),
  },
  {
    key: "pending_update_extraction",
    name: "待审核更新提取",
    taskType: "pending_update_extraction",
    version: 1,
    outputFormat: "json",
    systemPrompt:
      "你是长篇连载小说的记忆更新审计助手。AI 只能提出待审核更新，不能直接修改正式设定、角色、世界规则、时间线或伏笔。",
    userPrompt:
      "比较最终章节正文与当前结构化记忆，提取需要作者审核的设定、角色、世界规则、时间线和伏笔更新建议。",
    contextNotes:
      "输入应包含最终章节正文、当前正式记忆摘要、章节号和已知禁写项。",
    responseSchema: JSON.stringify({
      type: "object",
      required: ["updates"],
      properties: {
        updates: {
          type: "array",
          items: {
            type: "object",
            required: [
              "updateType",
              "targetType",
              "title",
              "content",
              "riskLevel",
              "sourceEvidence",
            ],
            properties: {
              updateType: {
                type: "string",
                enum: ["create", "update", "resolve"],
              },
              targetType: {
                type: "string",
                enum: [
                  "project_setting",
                  "character",
                  "world_rule",
                  "foreshadow",
                  "timeline_event",
                  "location",
                  "organization",
                ],
              },
              targetName: { type: "string" },
              fieldName: { type: "string" },
              title: { type: "string" },
              content: { type: "string" },
              reason: { type: "string" },
              riskLevel: { type: "string", enum: ["low", "medium", "high"] },
              sourceEvidence: { type: "string" },
            },
          },
        },
      },
    }),
  },
  {
    key: "continuity_check",
    name: "连续性检查",
    taskType: "continuity_check",
    version: 1,
    outputFormat: "json",
    systemPrompt:
      "你是长篇连载小说的连续性审稿助手。只报告与既有结构化记忆冲突或高风险漂移的问题。",
    userPrompt:
      "检查当前章节正文与项目设定、角色边界、世界规则、时间线和伏笔池之间的连续性问题。",
    contextNotes:
      "输入应包含当前章节正文、相关角色、相关世界规则、时间线事件、伏笔池和最近章节摘要。",
    responseSchema: JSON.stringify({
      type: "object",
      required: ["chapter_number", "overall_risk_level", "issues"],
      properties: {
        chapter_number: { type: "integer" },
        overall_risk_level: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
        },
        issues: {
          type: "array",
          items: {
            type: "object",
            required: [
              "issue_type",
              "severity",
              "description",
              "related_characters",
              "related_rules",
              "fix_suggestion",
            ],
            properties: {
              issue_type: { type: "string" },
              severity: {
                type: "string",
                enum: ["low", "medium", "high", "critical"],
              },
              description: { type: "string" },
              evidence: { type: "string" },
              related_characters: { type: "array", items: { type: "string" } },
              related_rules: { type: "array", items: { type: "string" } },
              fix_suggestion: { type: "string" },
            },
          },
        },
      },
    }),
  },
  {
    key: "wechat_publish_packaging",
    name: "公众号发布包装",
    taskType: "wechat_publish_packaging",
    version: 1,
    outputFormat: "json",
    systemPrompt:
      "你是微信公众号长篇连载小说发布主编。只生成发布包装材料，不得宣称已经自动发布到公众号。",
    userPrompt:
      "根据作者确认的章节最终正文、本章摘要、目标读者、公众号定位、禁写事项和最近标题风格，生成公众号发布包装。",
    contextNotes:
      "输入必须使用章节 finalText，不得使用草稿正文。输出应包含标题候选、开头引导语、章节摘要、结尾互动问题、下章预告、评论区引导、封面图提示词、Markdown 发布版和发布检查清单。",
    responseSchema: JSON.stringify({
      type: "object",
      required: [
        "title_candidates",
        "opening_guide",
        "ending_question",
        "next_chapter_preview",
        "comment_guide",
        "cover_prompt",
        "markdown_body",
      ],
      properties: {
        title_candidates: {
          type: "array",
          items: { type: "string" },
        },
        opening_guide: { type: "string" },
        chapter_summary: { type: "string" },
        ending_question: { type: "string" },
        next_chapter_preview: { type: "string" },
        comment_guide: { type: "string" },
        collection_title: { type: "string" },
        cover_prompt: { type: "string" },
        markdown_body: { type: "string" },
        checklist: {
          type: "array",
          items: { type: "string" },
        },
      },
    }),
  },
  {
    key: "cover_image_generation",
    name: "封面图生成",
    taskType: "cover_image_generation",
    version: 1,
    outputFormat: "text",
    systemPrompt:
      "你是长篇连载小说的封面视觉设计助手。只生成可供作者审阅和采用的封面图，不得宣称已经替换正式封面。",
    userPrompt:
      "根据作品信息、发布包装封面提示词或作者手动提示词，生成小说作品封面候选图。",
    contextNotes:
      "输入应包含作品标题、题材、目标读者、故事简介、封面用途、画幅约束和规避项。生成结果必须先由作者采用后才写入正式封面。",
  },
];

export function promptTemplateFingerprint(template: DefaultPromptTemplate) {
  return `${template.key}@v${template.version}`;
}

export function taskTypesFromDefaultTemplates() {
  return [...new Set(DEFAULT_AI_PROMPT_TEMPLATES.map((template) => template.taskType))];
}
