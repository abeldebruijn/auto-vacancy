import { PDFParse } from "pdf-parse";

export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function normalizeMarkdown(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function pdfToMarkdown(file: File) {
  const data = new Uint8Array(await file.arrayBuffer());
  const parser = new PDFParse({ data });

  try {
    const result = await parser.getText();
    const pageText =
      result.pages.length > 0 ? result.pages.map((page) => page.text).join("\n\n") : result.text;
    return normalizeMarkdown(pageText);
  } finally {
    await parser.destroy();
  }
}
