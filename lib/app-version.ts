import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.107 终局规划连续性";

export const appReleaseNotes = [
  "终局规划可在有效章节射程内自动纳入后续卷、剧情单元和章节大纲。",
  "规划超出建议射程时会明确提示重新生成，也可在单次生成时主动跳过。",
  "正式大纲、设定和定稿正文始终优先，终局规划不会自动写入正式记忆。",
];
