import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.16 连续性报告一键修复";

export const appReleaseNotes = [
  "连续性检查报告会识别明确的“将 A 改为 B”建议，并在待处理报告上显示“一键修复正文”按钮。",
  "作者点击一键修复后，系统会修改关联章节的定稿正文、保存新的章节快照，并把报告标记为已处理。",
  "模糊或需要判断的修复建议不会自动执行，仍保留手动处理入口，避免误改正式正文。",
  "修复结果会在连续性报告页显示成功或失败提示，方便确认操作是否生效。",
];
