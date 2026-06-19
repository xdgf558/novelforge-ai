import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.12 新建章节表单减负";

export const appReleaseNotes = [
  "新建章节页现在只保留章节号、章节标题和章节目标。",
  "章节状态、节拍、正文、备注和修改原因移到章节详情/编辑流程处理。",
  "创建章节后会进入章节详情页，再从那里生成 AI 节拍和章节草稿。",
  "新建章节会自动保存完整默认值和初始版本快照，不影响后续编辑。",
];
