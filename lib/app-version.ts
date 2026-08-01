import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.114 完结归档与 Luna 写作路由";

export const appReleaseNotes = [
  "长篇作品达到目标字数且章节均已确认后，可一键完结并进入归档目录。",
  "章节草稿新增 GPT-5.6 Luna 路由，使用 OpenAI API 和极高推理强度。",
  "强化 Kimi 与 OpenAI 路由隔离，切换模型时会安全校正对应的默认接口地址。",
];
