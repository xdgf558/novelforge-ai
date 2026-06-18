"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  saveAiConnectionSettings,
  saveStationCatPublishSettings,
} from "@/lib/ai/local-config";

export async function saveAiConnectionSettingsAction(formData: FormData) {
  saveAiConnectionSettings({
    apiKey: formData.get("apiKey")?.toString(),
    clearApiKey: formData.get("clearApiKey") === "on",
    model: formData.get("model")?.toString(),
    baseUrl: formData.get("baseUrl")?.toString(),
  });

  revalidatePath("/ai-settings");
  revalidatePath("/");
  redirect("/ai-settings?saved=ai");
}

export async function saveStationCatPublishSettingsAction(formData: FormData) {
  saveStationCatPublishSettings({
    apiBaseUrl: formData.get("stationCatApiBaseUrl")?.toString(),
    token: formData.get("stationCatToken")?.toString(),
    clearToken: formData.get("clearStationCatToken") === "on",
    defaultMode: formData.get("stationCatDefaultMode")?.toString(),
  });

  revalidatePath("/ai-settings");
  revalidatePath("/");
  redirect("/ai-settings?saved=station-cat");
}
