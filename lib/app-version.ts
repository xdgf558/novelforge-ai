import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.105 下线 AI 书籍封面生成";

export const appReleaseNotes = [
  "项目发布页不再提供 AI 封面候选图生成，界面更简洁。",
  "设置页移除封面图片模型、接口和密钥配置。",
  "手动上传、替换、删除封面及 Station Cat 发布能力保持不变。",
];
