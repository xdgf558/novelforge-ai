import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.53 终局规划与收尾检查";

export const appReleaseNotes = [
  "大纲模块新增“终局规划 / 收尾检查”，会根据总字数目标、章节状态、未回收伏笔和大纲进度给出本地收尾阶段判断。",
  "新增 AI 终局规划草案任务，输出剩余章节、终局卷、伏笔回收、角色落点和大结局风格建议，但不会自动修改正式大纲或伏笔状态。",
  "保留作者控制：伏笔回收、废弃、大纲调整和正式记忆变更仍需作者手动确认。",
];
