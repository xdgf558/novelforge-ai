import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.32 发布包装记录收纳";

export const appReleaseNotes = [
  "发布页的发布包装记录默认只展示最新一条，避免历史包装把页面撑得太长。",
  "旧发布包装不会删除，统一收进折叠的“历史发布包装记录”区域，需要回看或复制时再展开。",
  "最新包装仍保留完整的公众号材料、标题候选、检查清单和 Markdown 发布版。",
];
