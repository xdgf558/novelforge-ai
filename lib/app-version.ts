import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.116 剧情单元续写修复";

export const appReleaseNotes = [
  "下一剧情单元会从审计到的目标章节继续，只生成当前需要的新单元，不再重复卷大纲或旧单元。",
  "剧情单元编号按所属卷递增，复制到表单会优先匹配任务记录中的起始章节。",
  "大纲字段解析更稳定；模型输出章号不符时会明确提示，不再静默填入错误内容。",
];
