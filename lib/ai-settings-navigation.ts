export const aiSettingsTabIds = {
  defaultConnection: "default-ai-connection",
  localData: "local-data",
  stationCatPublish: "station-cat-publish",
  tts: "tts-settings",
  writingModelRoutes: "writing-model-routes",
} as const;

type AiSettingsTabId =
  (typeof aiSettingsTabIds)[keyof typeof aiSettingsTabIds];

export function buildAiSettingsHref(
  tabId: AiSettingsTabId,
  values: Record<string, string | number | null | undefined>,
) {
  const query = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });

  const search = query.toString();

  return `/ai-settings${search ? `?${search}` : ""}#${tabId}`;
}
