import fs from "node:fs/promises";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export async function parseResumeFile(filePath, ext) {
  const normalizedExt = ext.toLowerCase();

  if (normalizedExt === ".pdf") {
    return parsePdf(filePath);
  }

  if (normalizedExt === ".docx") {
    return parseDocx(filePath);
  }

  throw new Error(`Unsupported resume extension: ${ext}`);
}

async function parsePdf(filePath) {
  const buffer = await fs.readFile(filePath);
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return {
      parser: "pdf-parse",
      pageCount: result.total || result.pages?.length || null,
      text: normalizeExtractedText(result.text || ""),
      warnings: []
    };
  } finally {
    await parser.destroy();
  }
}

async function parseDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return {
    parser: "mammoth",
    pageCount: null,
    text: normalizeExtractedText(result.value || ""),
    warnings: (result.messages || []).map((item) => item.message || String(item))
  };
}

function normalizeExtractedText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
