import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.62 有声导出增强";

export const appReleaseNotes = [
  "有声导出默认实时读取 Station Cat 网站当前公开正文，适合网站后台继续修文后的最终音频生成。",
  "章节音频仍按安全分段生成，但成功后会自动合并为整章 WAV，并在导出历史中优先播放合并文件。",
  "导出历史新增删除功能，并接入 GLM-TTS（智谱）作为可选中文有声阅读模型。",
];
