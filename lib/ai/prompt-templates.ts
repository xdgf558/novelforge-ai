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
    key: "project_setting_completion",
    name: "项目总设定补全",
    taskType: "project_setting_completion",
    version: 1,
    outputFormat: "json",
    systemPrompt:
      "你是长篇连载小说的设定补全助手。只补全作者缺失或薄弱的设定字段，不得宣称已经修改正式设定。",
    userPrompt:
      "根据项目基础信息和已有总设定，补全空缺字段或明显薄弱字段，输出可供作者审核的 JSON 草案。",
    contextNotes:
      "输入应包含项目基础信息、当前总设定、空缺字段列表和允许输出字段。输出可以只包含需要补全的字段。",
    responseSchema: JSON.stringify({
      type: "object",
      properties: {
        genre: { type: "string" },
        targetAudience: { type: "string" },
        sellingPoint: { type: "string" },
        mainConflict: { type: "string" },
        worldviewRules: { type: "string" },
        protagonistDesire: { type: "string" },
        protagonistFlaw: { type: "string" },
        villainLogic: { type: "string" },
        supportingCharacters: { type: "string" },
        factions: { type: "string" },
        timeline: { type: "string" },
        pleasureMechanism: { type: "string" },
        longTermForeshadowing: { type: "string" },
        endingDirection: { type: "string" },
        styleSample: { type: "string" },
        wechatPositioning: { type: "string" },
        emotionalTone: { type: "string" },
        readerExpectation: { type: "string" },
        commercialHook: { type: "string" },
        forbiddenItems: { type: "string" },
        sensitiveContentRules: { type: "string" },
      },
    }),
  },
  {
    key: "project_setting_optimization",
    name: "项目总设定优化建议",
    taskType: "project_setting_optimization",
    version: 1,
    outputFormat: "json",
    systemPrompt:
      "你是长篇连载小说的设定优化助手。只能提出供作者审核的优化候选，不得自动改变正式设定。",
    userPrompt:
      "根据项目基础信息和已有总设定，提出更适合长篇连载、公众号发布和后续 AI 生成的优化版本。",
    contextNotes:
      "输入应包含项目基础信息和当前总设定。输出可以只包含建议替换或强化的字段，避免引入与已写章节冲突的新事实。",
    responseSchema: JSON.stringify({
      type: "object",
      properties: {
        sellingPoint: { type: "string" },
        mainConflict: { type: "string" },
        worldviewRules: { type: "string" },
        protagonistDesire: { type: "string" },
        protagonistFlaw: { type: "string" },
        villainLogic: { type: "string" },
        supportingCharacters: { type: "string" },
        factions: { type: "string" },
        timeline: { type: "string" },
        pleasureMechanism: { type: "string" },
        longTermForeshadowing: { type: "string" },
        endingDirection: { type: "string" },
        styleSample: { type: "string" },
        wechatPositioning: { type: "string" },
        emotionalTone: { type: "string" },
        readerExpectation: { type: "string" },
        commercialHook: { type: "string" },
        forbiddenItems: { type: "string" },
        sensitiveContentRules: { type: "string" },
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
    key: "ending_planning_generation",
    name: "终局规划草案",
    taskType: "ending_planning_generation",
    version: 1,
    outputFormat: "markdown",
    systemPrompt:
      "你是长篇连载小说的终局规划助手。只输出供作者审核的收尾规划草案，不得自动修改正式大纲、伏笔池、时间线或故事记忆。",
    userPrompt:
      "根据总目标字数、当前章节进度、已有大纲、角色弧线、未回收伏笔和结局方向，判断作品是否应开始收束，并生成终局规划草案。",
    contextNotes:
      "输入应包含当前字数进度、总设定结局方向、已有大纲、未回收伏笔、角色弧线、最近章节和时间线。输出必须保持作者控制：只给建议，不宣称已回收伏笔或已修改大纲。",
  },
  {
    key: "storyline_generation",
    name: "故事线草案生成",
    taskType: "storyline_generation",
    version: 1,
    outputFormat: "json",
    systemPrompt:
      "你是长篇连载小说的多故事线规划助手。只输出供作者审核的故事线候选，不得宣称已经写入正式故事线、角色、伏笔、章节或大纲。",
    userPrompt:
      "根据项目设定、已有故事线、角色、伏笔、章节摘要和大纲，梳理可供作者确认的多故事线候选。",
    contextNotes:
      "输入应包含项目基础信息、总设定摘要、已有正式故事线、可用角色 ID、可用伏笔 ID、可用章节 ID、可用大纲 ID。输出只能是 JSON，且关系字段只能引用输入中提供的 ID。",
    responseSchema: JSON.stringify({
      type: "object",
      required: ["storylines"],
      properties: {
        storylines: {
          type: "array",
          items: {
            type: "object",
            required: ["name", "type", "status", "coreGoal", "currentProgress"],
            properties: {
              name: { type: "string" },
              type: {
                type: "string",
                enum: [
                  "mainline",
                  "subplot",
                  "character_arc",
                  "business_line",
                  "antagonist_line",
                  "foreshadow_line",
                  "world_line",
                  "other",
                ],
              },
              status: {
                type: "string",
                enum: ["planned", "active", "paused", "completed"],
              },
              startChapter: { type: "integer" },
              endChapter: { type: "integer" },
              coreGoal: { type: "string" },
              currentProgress: { type: "string" },
              notes: { type: "string" },
              characterIds: { type: "array", items: { type: "string" } },
              foreshadowIds: { type: "array", items: { type: "string" } },
              chapterIds: { type: "array", items: { type: "string" } },
              outlineIds: { type: "array", items: { type: "string" } },
              rationale: { type: "string" },
            },
          },
        },
      },
    }),
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
    key: "character_relationship_generation",
    name: "人物关系草案生成",
    taskType: "character_relationship_generation",
    version: 1,
    outputFormat: "json",
    systemPrompt:
      "你是长篇连载小说的人物关系网络助手。只输出供作者审核的人物关系草案，不得宣称已经写入正式人物关系网络。",
    userPrompt:
      "根据项目设定、已有角色、已有关系、大纲和最近章节摘要，生成可审阅的人物关系草案。",
    contextNotes:
      "输入应包含项目基础信息、总设定摘要、可用角色 ID、已有关系、相关大纲和最近章节摘要。输出只能是 JSON，且关系端点必须引用已有角色 ID。",
    responseSchema: JSON.stringify({
      type: "object",
      required: ["relationships"],
      properties: {
        relationships: {
          type: "array",
          items: {
            type: "object",
            required: [
              "sourceCharacterId",
              "targetCharacterId",
              "relationshipType",
              "direction",
              "status",
              "summary",
            ],
            properties: {
              sourceCharacterId: { type: "string" },
              sourceCharacterName: { type: "string" },
              targetCharacterId: { type: "string" },
              targetCharacterName: { type: "string" },
              relationshipType: {
                type: "string",
                enum: [
                  "family",
                  "ally",
                  "partner",
                  "mentor",
                  "rival",
                  "enemy",
                  "romantic",
                  "business",
                  "secret",
                  "other",
                ],
              },
              direction: {
                type: "string",
                enum: [
                  "two_way",
                  "source_to_target",
                  "target_to_source",
                  "unclear",
                ],
              },
              status: {
                type: "string",
                enum: ["active", "tension", "hidden", "resolved"],
              },
              summary: { type: "string" },
              dynamics: { type: "string" },
              evidence: { type: "string" },
              sourceChapterNumber: { type: "integer" },
              rationale: { type: "string" },
            },
          },
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
    key: "continuity_fix_patch_generation",
    name: "连续性修复候选补丁",
    taskType: "continuity_fix_patch_generation",
    version: 1,
    outputFormat: "markdown",
    systemPrompt:
      "你是长篇连载小说的连续性修复编辑。只生成供作者审阅的修复候选补丁，不得宣称已经修改正式正文或正式故事记忆。",
    userPrompt:
      "根据连续性报告、关联章节正文摘录和作者建议，生成可审阅的修复候选补丁。",
    contextNotes:
      "输出必须保持作者控制：优先给出精确查找/替换候选；无法精确替换时给出可粘贴的改写片段和作者核对点。不得自动修改章节正文、设定、角色、时间线或伏笔。",
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
      "根据作品信息、已有封面提示词或作者手动提示词，生成小说作品封面候选图。",
    contextNotes:
      "输入应包含作品标题、题材、目标读者、故事简介、封面用途、画幅约束和规避项。生成结果必须先由作者采用后才写入正式封面。",
  },
  {
    key: "wechat_layout_candidate_generation",
    name: "公众号排版开头结尾候选",
    taskType: "wechat_layout_candidate_generation",
    version: 1,
    outputFormat: "json",
    systemPrompt:
      "你是微信公众号长篇连载小说排版编辑。只生成开头、结尾和标题候选，不得重写正文，不得宣称已经发布或修改正式内容。",
    userPrompt:
      "根据当前章节正文预览、项目定位、总设定摘要和章节目标，生成公众号排版用的标题、开头引导语和结尾追更钩子候选。",
    contextNotes:
      "输入可使用精修正文、定稿正文或草稿正文的排版预览，输出必须是 JSON。默认模式是只排版、不改文；候选必须等待作者手动套用。",
    responseSchema: JSON.stringify({
      type: "object",
      required: ["title_candidates", "opening_guide", "ending_follow_hook"],
      properties: {
        title_candidates: {
          type: "array",
          items: { type: "string" },
        },
        selected_title: { type: "string" },
        opening_guide: { type: "string" },
        ending_follow_hook: { type: "string" },
        interaction_question: { type: "string" },
        next_chapter_preview: { type: "string" },
        comment_guide: { type: "string" },
      },
    }),
  },
];

export function promptTemplateFingerprint(template: DefaultPromptTemplate) {
  return `${template.key}@v${template.version}`;
}

export function taskTypesFromDefaultTemplates() {
  return [...new Set(DEFAULT_AI_PROMPT_TEMPLATES.map((template) => template.taskType))];
}
