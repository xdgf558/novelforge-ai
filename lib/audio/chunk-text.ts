export type AudioTextSegment = {
  index: number;
  text: string;
  charCount: number;
  preview: string;
};

const sentencePattern = /[^。！？!?；;…]+[。！？!?；;…]*[”"』」）)]*/gu;

export function normalizeAudioSourceText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function chunkAudioText(
  text: string,
  options: {
    maxChars: number;
  },
): AudioTextSegment[] {
  const maxChars = Math.max(20, Math.floor(options.maxChars));
  const normalized = normalizeAudioSourceText(text);

  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of normalized.split(/\n{2,}/)) {
    const cleanParagraph = paragraph.trim();

    if (!cleanParagraph) {
      continue;
    }

    const pieces =
      cleanParagraph.length > maxChars
        ? splitLongParagraph(cleanParagraph, maxChars)
        : [cleanParagraph];

    for (const piece of pieces) {
      if (!piece.trim()) {
        continue;
      }

      if (!current) {
        current = piece;
        continue;
      }

      const nextText = `${current}\n\n${piece}`;

      if (nextText.length <= maxChars) {
        current = nextText;
      } else {
        chunks.push(current);
        current = piece;
      }
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.map((chunk, index) => ({
    index: index + 1,
    text: chunk,
    charCount: chunk.length,
    preview: previewText(chunk),
  }));
}

function splitLongParagraph(paragraph: string, maxChars: number) {
  const sentences = (paragraph.match(sentencePattern) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences.length > 0 ? sentences : [paragraph]) {
    if (sentence.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }

      chunks.push(...hardSplit(sentence, maxChars));
      continue;
    }

    if (!current) {
      current = sentence;
      continue;
    }

    if (`${current}${sentence}`.length <= maxChars) {
      current = `${current}${sentence}`;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function hardSplit(text: string, maxChars: number) {
  const chunks: string[] = [];

  for (let start = 0; start < text.length; start += maxChars) {
    chunks.push(text.slice(start, start + maxChars));
  }

  return chunks;
}

function previewText(text: string) {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > 140 ? `${oneLine.slice(0, 140)}...` : oneLine;
}
