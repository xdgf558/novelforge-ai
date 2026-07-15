export const shortStoryNarrativePerspectiveIds = [
  "immersive-third-person-limited",
  "first-person-experiential",
  "multi-character-limited",
  "objective-camera",
] as const;

export type ShortStoryNarrativePerspectiveId =
  (typeof shortStoryNarrativePerspectiveIds)[number];

export type ShortStoryNarrativePerspective = {
  id: ShortStoryNarrativePerspectiveId;
  label: string;
  recommended?: boolean;
  summary: string;
  dimensions: readonly {
    label: string;
    value: string;
  }[];
  guide: string;
};

const perspectiveMarkerPrefix = "【短故事叙事视角：";
const authorSupplementMarker = "【作者补充】";

export const shortStoryNarrativePerspectives: readonly ShortStoryNarrativePerspective[] = [
  {
    id: "immersive-third-person-limited",
    label: "沉浸式第三人称限制",
    recommended: true,
    summary: "人称使用“他/她”，但感知、判断和信息边界始终锁定在一个主视角人物身上。",
    dimensions: [
      { label: "人称", value: "第三人称，体验距离接近第一人称" },
      { label: "信息", value: "只写主视角当下可感知、回忆或推断的内容" },
      { label: "内心", value: "禁止直接进入其他人物意识" },
      { label: "沉浸", value: "感官、身体反应、即时判断和动作优先" },
    ],
    guide: `【短故事叙事视角：沉浸式第三人称限制】
视角锚点：全篇使用第三人称，但叙事体验锁定在单一主视角人物；语法上写“他/她”，信息距离接近第一人称亲历。
信息边界：只呈现主视角人物当下能够感知、回忆、联想或合理推断的内容。主角看不见的，读者不能直接看见；主角尚不知道的，旁白不能提前揭示。
他人内心：不得直接进入其他人物的思想、情绪或真实动机。只能通过表情、动作、语气、停顿和主视角人物的判断来推测，并允许判断出错。
沉浸表达：优先使用视觉、听觉、触觉、气味、身体反应、即时念头和行动选择呈现压力，避免站在镜头外报告人物状态。
过滤词：减少“他看见”“他感觉”“他意识到”“他发现”等感知过滤词，能直接呈现感官结果时就直接呈现；不要为了删“他”而造成病句或指代不清。
视角稳定：同一场景不得跳入其他人物内心，也不得突然补充主视角无法知道的幕后事实。
输出前自检：将主视角人物姓名或“他/她”临时替换为“我”后，感知、心理与信息逻辑仍应成立；若出现“我”不可能知道的事实，必须改为可观察证据、推测或删除。`,
  },
  {
    id: "first-person-experiential",
    label: "第一人称亲历",
    summary: "由“我”直接经历事件，让声音、误判和认知盲区共同构成叙事。",
    dimensions: [
      { label: "人称", value: "第一人称“我”" },
      { label: "信息", value: "只写叙述者当时知道的内容" },
      { label: "内心", value: "他人动机只能观察和推断" },
      { label: "声音", value: "叙述语言保持角色身份与认知水平" },
    ],
    guide: `【短故事叙事视角：第一人称亲历】
视角锚点：全篇由一个“我”亲历和讲述，叙述声音必须符合该人物的身份、知识、性格与当下情绪。
信息边界：只呈现叙述者在事件当时能够感知、回忆或推断的信息；除非蓝图明确建立回忆体结构，不得用事后全知口吻提前泄露答案。
他人内心：不得把他人的真实思想和动机当作事实，只能写“我”观察到的动作、表情、语气和由此产生的判断。
沉浸表达：让环境刺激、身体反应、即时念头和行动选择自然进入叙述，避免把“我觉得”“我看到”“我意识到”作为每段的固定开头。
可靠性：叙述者可以误解、遗漏或自我欺骗，但文本必须留下公平证据，使后续重释能够回溯。
视角稳定：不得无提示地切换到其他人物或镜头外事件。`,
  },
  {
    id: "multi-character-limited",
    label: "多人物限制视角",
    summary: "允许不同场景采用不同视角人物，但每个场景内部只保留一个认知中心。",
    dimensions: [
      { label: "人称", value: "通常第三人称" },
      { label: "信息", value: "每场只使用当前视角人物所知信息" },
      { label: "切换", value: "只能在清晰场景边界切换" },
      { label: "辨识", value: "新场景尽早建立新的感知锚点" },
    ],
    guide: `【短故事叙事视角：多人物限制视角】
视角锚点：每个场景只能有一个明确的视角人物，场景中的感知、内心和信息边界全部服从该人物。
切换规则：只允许在清晰的场景分隔、时间切换或地点切换后更换视角；新场景开头应尽早通过人物动作或感官建立新锚点。
禁止跳头：同一场景不得在多个人物内心之间来回切换。其他人物的想法只能通过可观察行为和当前视角人物的推断呈现。
信息公平：每个视角只能使用该人物已经获得的信息，不得借切换视角提前泄露本篇真相；切换必须带来新的冲突角度或因果作用。
声音区分：不同视角人物应有不同的注意重点、词汇习惯和判断偏差，但整体文风仍遵守已选择的写作风格。`,
  },
  {
    id: "objective-camera",
    label: "客观镜头视角",
    summary: "只呈现可被观察或记录的行动、对话和环境，不由旁白直接解释任何人的内心。",
    dimensions: [
      { label: "人称", value: "第三人称外部观察" },
      { label: "信息", value: "只写可见、可听或可记录的事实" },
      { label: "内心", value: "不直接书写任何人物心理" },
      { label: "情绪", value: "通过行为、语言和生理细节外化" },
    ],
    guide: `【短故事叙事视角：客观镜头视角】
观察边界：只呈现现场可见、可听或可被设备记录的行动、对话、环境和物理变化。
心理边界：不得直接书写任何人物的思想、感受、记忆或真实动机，也不得使用全知旁白替人物下结论。
情绪外化：通过动作迟疑、语速、呼吸、姿势、沉默、选择和物件互动表现情绪，让读者自行判断。
信息公平：镜头外事件不能直接插入；幕后事实必须通过后来出现的证据、记录、证词或行动后果进入文本。
场景组织：可以改变观察距离和关注对象，但切换必须清楚，不能把推测伪装成客观事实。`,
  },
] as const;

export function shortStoryNarrativePerspectiveById(
  id?: string | null,
): ShortStoryNarrativePerspective | null {
  return (
    shortStoryNarrativePerspectives.find((perspective) => perspective.id === id) ??
    null
  );
}

export function appliedShortStoryNarrativePerspectiveId(
  value?: string | null,
): ShortStoryNarrativePerspectiveId | null {
  const normalized = value?.trim() ?? "";

  for (const perspective of shortStoryNarrativePerspectives) {
    if (normalized.startsWith(`${perspectiveMarkerPrefix}${perspective.label}】`)) {
      return perspective.id;
    }
  }

  return null;
}

export function applyShortStoryNarrativePerspective(
  currentValue: string,
  perspectiveId: ShortStoryNarrativePerspectiveId,
) {
  const perspective = shortStoryNarrativePerspectiveById(perspectiveId);

  if (!perspective) {
    return null;
  }

  const authorSupplement = extractAuthorSupplement(currentValue);

  return [
    perspective.guide,
    authorSupplement
      ? `${authorSupplementMarker}\n${authorSupplement}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function extractAuthorSupplement(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return "";
  }

  const supplementIndex = normalized.indexOf(authorSupplementMarker);

  if (supplementIndex >= 0) {
    return normalized
      .slice(supplementIndex + authorSupplementMarker.length)
      .trim();
  }

  if (normalized.startsWith(perspectiveMarkerPrefix)) {
    return "";
  }

  return normalized;
}
