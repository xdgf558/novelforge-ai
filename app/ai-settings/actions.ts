"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveAiConnectionSettings } from "@/lib/ai/local-config";

export async function saveAiConnectionSettingsAction(formData: FormData) {
  saveAiConnectionSettings({
    apiKey: formData.get("apiKey")?.toString(),
    clearApiKey: formData.get("clearApiKey") === "on",
    model: formData.get("model")?.toString(),
    baseUrl: formData.get("baseUrl")?.toString(),
  });

  revalidatePath("/ai-settings");
  revalidatePath("/");
  redirect("/ai-settings");
}
