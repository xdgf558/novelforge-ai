export const shortStoryWritingStylePresetIds = [
  "rational-urban-mystery",
  "engineering-adventure",
  "logical-thought-experiment",
  "reality-dislocation",
] as const;

export type ShortStoryWritingStylePresetId =
  (typeof shortStoryWritingStylePresetIds)[number];

export type ShortStoryWritingStylePreset = {
  id: ShortStoryWritingStylePresetId;
  label: string;
  referenceLabel: string;
  summary: string;
  dimensions: readonly {
    label: string;
    value: string;
  }[];
  styleGuide: string;
  emotionalTone: string;
};

const presetMarkerPrefix = "【短故事文风预设：";
const authorSupplementMarker = "【作者补充】";

export const shortStoryWritingStylePresets: readonly ShortStoryWritingStylePreset[] = [
  {
    id: "rational-urban-mystery",
    label: "理性都市奇谈",
    referenceLabel: "灵感参考：卫斯理式科幻冒险",
    summary: "让熟悉的现实生活逐步裂开一道异常缝隙，由调查、见闻和证据推动谜团。",
    dimensions: [
      { label: "叙事", value: "第一人称或紧贴调查者" },
      { label: "节奏", value: "发现快、解释清、场景短" },
      { label: "科学感", value: "以观察和验证对抗怪谈" },
      { label: "结局", value: "解决本案，保留一层未知" },
    ],
    styleGuide: `【短故事文风预设：理性都市奇谈】
叙事视角：使用第一人称见闻或紧贴调查者的有限视角，让异常从日常环境中逐步显形。
句式节奏：语言明快直接，以行动、观察和对话推进；场景转换利落，避免长篇抒情和故弄玄虚。
科学解释：角色先怀疑、取证、验证，再提出解释；科学机制说到足以改变人物选择，不写成知识讲义。
悬疑方式：每次发现都回答一个小问题并制造一个更具体的问题，证据之间必须能够互相校验。
人物关系：让不同立场的人通过追问、争辩和共同遇险暴露性格，避免所有人只为主角提供信息。
结局倾向：本篇异常事件必须闭环，同时保留一项仍无法完全解释的事实，作为余味而非续集欠账。
原创边界：不得复制任何参考作品的角色、世界、专名、情节、标志性表达或原句。`,
    emotionalTone: "理性好奇、都市异闻感、明快冒险；危险真实但不过度阴郁，真相揭开后仍留少量未知。",
  },
  {
    id: "engineering-adventure",
    label: "工程冒险与个人抉择",
    referenceLabel: "灵感参考：罗伯特·海因莱因式工程科幻",
    summary: "由能动的人物处理具体难题，让技术限制、行动后果和个人责任共同制造戏剧。",
    dimensions: [
      { label: "叙事", value: "贴近有能力但会犯错的行动者" },
      { label: "节奏", value: "问题、方案、失败、再选择" },
      { label: "科学感", value: "技术细节服务解决问题" },
      { label: "结局", value: "以承担代价完成个人选择" },
    ],
    styleGuide: `【短故事文风预设：工程冒险与个人抉择】
叙事视角：贴近具备专业能力、愿意行动但判断并非永远正确的主角。
句式节奏：用明确的目标、物理障碍和时间压力组织场景；行动与对话优先，说明只在决策前出现。
科学解释：技术细节必须影响方案、风险或资源分配；避免堆砌术语，也不让新技术在结尾突然救场。
冲突方式：让人物在多个可行但代价不同的方案之间选择，失败来自限制、误判或价值冲突。
人物关系：同伴应拥有独立专业判断，可以反驳主角；能力通过协作和承担责任呈现，不靠口号证明。
结局倾向：主角通过行动解决本篇问题，并为自己的方案承担清晰后果；胜利可以不完整，但不能逃避选择。
原创边界：不得复制任何参考作品的角色、世界、专名、情节、标志性表达或原句。`,
    emotionalTone: "务实、昂扬、紧迫而克制；强调解决问题的满足感，以及选择之后必须承担的责任。",
  },
  {
    id: "logical-thought-experiment",
    label: "逻辑推演与思想实验",
    referenceLabel: "灵感参考：艾萨克·阿西莫夫式逻辑科幻",
    summary: "先建立清楚规则，再让人物把规则推到意外结论，以对话和推理完成反转。",
    dimensions: [
      { label: "叙事", value: "客观清晰，聚焦问题求解" },
      { label: "节奏", value: "设问、推理、反证、重释" },
      { label: "科学感", value: "规则一致，结论可追溯" },
      { label: "结局", value: "反转来自既有规则的后果" },
    ],
    styleGuide: `【短故事文风预设：逻辑推演与思想实验】
叙事视角：采用清楚克制的有限视角，把注意力集中在核心问题、规则和人物判断上。
句式节奏：说明简洁，对话承担推理推进；每场戏都提出假设、检验假设或修正结论。
科学解释：先明确少量关键规则，再始终遵守；所有重要结论都能从前文信息回溯，不靠隐藏万能条件。
悬疑方式：通过定义冲突、规则边界和看似矛盾的证据制造谜题，让人物用反证或重新解释概念破局。
人物关系：价值观差异应进入推理过程，同一事实可以导向不同选择；避免角色只充当问答机器。
结局倾向：反转来自既有规则被推到极限后的自然后果，同时回答思想实验对人的影响。
原创边界：不得复制任何参考作品的角色、世界、专名、情节、标志性表达或原句。`,
    emotionalTone: "冷静、清晰、智性张力强；情绪来自逻辑结论对人物选择的冲击，而非大段煽情。",
  },
  {
    id: "reality-dislocation",
    label: "现实错位与身份疑云",
    referenceLabel: "灵感参考：菲利普·迪克式现实疑云",
    summary: "让人物赖以判断现实的证据彼此冲突，在身份、记忆和制度压力中作出不可撤回的选择。",
    dimensions: [
      { label: "叙事", value: "受限视角，认知可能不可靠" },
      { label: "节奏", value: "日常失真逐层升级" },
      { label: "科学感", value: "技术改变感知与身份" },
      { label: "结局", value: "事件闭环，现实解释保留张力" },
    ],
    styleGuide: `【短故事文风预设：现实错位与身份疑云】
叙事视角：使用受限且可能不可靠的视角，只呈现人物当下能确认的感官、记录和记忆。
句式节奏：从平常生活中的一个微小不一致开始，让证据冲突逐层升级；关键段落可缩短句子强化不安。
科学解释：技术或制度必须具体改变记忆、身份、感知或社会关系，避免把一切含糊归因于幻觉。
悬疑方式：让官方记录、私人记忆和他人证词彼此矛盾；每次验证都改变人物对自己或现实的定义。
人物关系：压力来自普通人面对机构、流程与熟人的共同否认，关系中的信任必须承受可见代价。
结局倾向：解决本篇行动冲突并让主角作出不可撤回的选择；可以保留两种现实解释，但两种解释都要有证据。
原创边界：不得复制任何参考作品的角色、世界、专名、情节、标志性表达或原句。`,
    emotionalTone: "日常中的持续不安、身份疏离与制度性压迫；避免纯粹绝望，保留人物选择带来的微弱主动性。",
  },
] as const;

export function shortStoryWritingStylePresetById(
  id?: string | null,
): ShortStoryWritingStylePreset | null {
  return (
    shortStoryWritingStylePresets.find((preset) => preset.id === id) ?? null
  );
}

export function appliedShortStoryWritingStylePresetId(
  styleSample?: string | null,
): ShortStoryWritingStylePresetId | null {
  const normalized = styleSample?.trim() ?? "";

  for (const preset of shortStoryWritingStylePresets) {
    if (normalized.startsWith(`${presetMarkerPrefix}${preset.label}】`)) {
      return preset.id;
    }
  }

  return null;
}

export function applyShortStoryWritingStylePreset(
  currentStyleSample: string,
  presetId: ShortStoryWritingStylePresetId,
) {
  const preset = shortStoryWritingStylePresetById(presetId);

  if (!preset) {
    return null;
  }

  const authorSupplement = extractAuthorSupplement(currentStyleSample);

  return {
    styleSample: [
      preset.styleGuide,
      authorSupplement
        ? `${authorSupplementMarker}\n${authorSupplement}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    emotionalTone: preset.emotionalTone,
  };
}

function extractAuthorSupplement(styleSample: string) {
  const normalized = styleSample.trim();

  if (!normalized) {
    return "";
  }

  const supplementIndex = normalized.indexOf(authorSupplementMarker);

  if (supplementIndex >= 0) {
    return normalized
      .slice(supplementIndex + authorSupplementMarker.length)
      .trim();
  }

  if (normalized.startsWith(presetMarkerPrefix)) {
    return "";
  }

  return normalized;
}
