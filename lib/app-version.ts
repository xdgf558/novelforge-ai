import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.58 移除旧发布包装模块";

export const appReleaseNotes = [
  "移除发布页旧的“生成章节发布包装”和“发布包装记录”模块，避免与公众号排版导出重复。",
  "章节详情页不再提供旧发布包装生成入口；公众号输出统一走“公众号排版导出”和开头/结尾候选。",
  "保留历史发布包装数据和标准网站同步包兼容，不删除既有项目记录。",
];
