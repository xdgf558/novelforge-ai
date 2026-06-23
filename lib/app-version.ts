import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.43 模块紧凑化设计";

export const appReleaseNotes = [
  "总设定档表单压缩间距和默认文本框高度，长文本字段仍可滚动编辑。",
  "角色库、大纲模块和结构化记忆改成更紧凑的列表与折叠新增表单，适合长篇项目持续增长。",
  "保留 0.1.42 的章节列表一行式管理视图和 0.1.41 的 TTS/代理兼容修复。",
];
