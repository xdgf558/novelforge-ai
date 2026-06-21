import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.25 Phase 24 AI 生成封面图";

export const appReleaseNotes = [
  "新增 PPQ / OpenAI-compatible 图片生成配置，可在本机设置中保存图片 API、模型、尺寸和质量。",
  "发布页支持基于发布包装封面提示词生成作品封面、横幅或方形候选图。",
  "封面候选图只进入 AI 任务记录，作者点击采用后才写入正式项目封面。",
  "采用后的封面继续走本地资产存储，并随 Station Cat 标准发布包上传。",
];
