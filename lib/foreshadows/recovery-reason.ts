export type ForeshadowRecoveryReasonInput = {
  status?: string | null;
  expectedResolveChapter?: number | null;
};

export function foreshadowRecoveryReason(
  foreshadow: ForeshadowRecoveryReasonInput,
  currentChapterNumber: number,
) {
  if (foreshadow.status === "needs_attention") {
    return "已标记需要处理";
  }

  if (foreshadow.expectedResolveChapter === currentChapterNumber) {
    return "预计本章回收";
  }

  if (
    foreshadow.expectedResolveChapter != null &&
    foreshadow.expectedResolveChapter < currentChapterNumber
  ) {
    return `已超过预计第 ${foreshadow.expectedResolveChapter} 章`;
  }

  return "建议本章处理";
}
