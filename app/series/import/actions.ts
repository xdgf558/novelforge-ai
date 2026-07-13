"use server";

import {
  extractShortStorySeriesDocumentDraft,
  shortStorySeriesDocumentMaxBytes,
  type ShortStorySeriesDocumentDraft,
} from "@/lib/short-story-series/document-import";

export type ShortStorySeriesDocumentImportState = {
  status: "idle" | "error" | "success";
  message: string;
  draft?: ShortStorySeriesDocumentDraft;
};

export async function importShortStorySeriesDocument(
  _previousState: ShortStorySeriesDocumentImportState,
  formData: FormData,
): Promise<ShortStorySeriesDocumentImportState> {
  const file = formData.get("document");

  if (!(file instanceof File) || file.size === 0) {
    return importError("请选择一个 DOCX 创作文档。");
  }

  if (!file.name.toLowerCase().endsWith(".docx")) {
    return importError("当前只支持 .docx 文件；旧版 .doc 请先另存为 DOCX。");
  }

  if (file.size > shortStorySeriesDocumentMaxBytes) {
    return importError("DOCX 文件不能超过 10 MB。");
  }

  try {
    const draft = await extractShortStorySeriesDocumentDraft({
      buffer: Buffer.from(await file.arrayBuffer()),
      fileName: file.name,
    });

    return {
      status: "success",
      message: "已生成可编辑的系列资料草稿。",
      draft,
    };
  } catch (error) {
    console.error("Failed to import short-story series document:", error);

    return importError(
      error instanceof Error && error.message
        ? `读取失败：${error.message}`
        : "无法读取这个 DOCX，请确认文件没有损坏后重试。",
    );
  }
}

function importError(message: string): ShortStorySeriesDocumentImportState {
  return {
    status: "error",
    message,
  };
}
