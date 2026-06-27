import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.59 章节列表折叠优化";

export const appReleaseNotes = [
  "章节编辑器默认只显示章节号最新的 3 章，历史章节自动折叠，长篇项目列表更容易扫读。",
  "折叠的历史章节仍可展开查看并进入详情页，不影响旧章节编辑、版本快照或连续性检查。",
  "保留 0.1.58 的旧发布包装模块移除：公众号输出统一走公众号排版导出。",
];
