export const proseStyleGuardrails = [
  "反模板腔：避免高频使用“不是……而是……”“不是因为……而是因为……”“真正的……不是……而是……”等二元对照句式；除非人物台词或剧情判断确实需要，同一章最多偶尔出现一次。",
  "把抽象判断改成具体动作、场景细节、人物反应和因果推进，不要用排比式总结替代叙事。",
  "句式要有长短变化，减少“他意识到/他明白/真正的问题在于”这类解释腔，让读者从事件本身看出含义。",
];

export function formatProseStyleGuardrails() {
  return proseStyleGuardrails.map((rule) => `- ${rule}`).join("\n");
}
