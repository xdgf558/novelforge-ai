import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.60 多故事线底座";

export const appReleaseNotes = [
  "新增多故事线模块，可手动维护主线、支线、角色线、商业线、反派线、伏笔线等正式故事线。",
  "故事线可关联角色、伏笔、章节和大纲；章节详情页会显示本章推进了哪些故事线，大纲列表会显示关联故事线。",
  "多故事线仍保持作者控制：本阶段不接 AI 自动识别或自动改写，只作为后续章节生成读取的结构化底座。",
];
