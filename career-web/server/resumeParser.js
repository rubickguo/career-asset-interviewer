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

export function parseResumeStructure(text) {
  const lines = normalizeExtractedText(text).split("\n").map((line) => line.trim()).filter(Boolean);
  return {
    workExperiences: parseWorkExperiences(lines),
    projects: parseProjects(lines)
  };
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

function isWorkSectionStart(line) {
  return /^(工作经历|职业经历|工作经验|实习经历|Experience|Employment)$/i.test(String(line || "").trim());
}

function isProjectSectionStart(line) {
  return /^(项目经历|重点项目|项目经验|Projects)$/i.test(String(line || "").trim());
}

function isNextMajorSection(line) {
  return /^(项目经历|重点项目|项目经验|教育经历|教育背景|个人作品|作品集|核心能力|专业技能|技能|自我评价|Projects|Education|Skills)$/i.test(String(line || "").trim());
}

function isDateLine(line) {
  return /(?:19|20)\d{2}(?:[./-]\d{1,2})?\s*(?:-|–|—|~|至|到)\s*(?:至今|现在|(?:19|20)\d{2}(?:[./-]\d{1,2})?)/.test(String(line || ""));
}

function looksLikeCompany(line) {
  const text = String(line || "").trim();
  if (!text || text.length > 50) return false;
  if (/邮箱|手机|微信|GitHub|http|个人简介|求职/i.test(text)) return false;
  return /公司|科技|网络|互动|工作室|平台|集团|网易|阿里|腾讯|字节|米哈游|沐瞳|莉莉丝|B站|哔哩|快手|小红书|抖音|百度|京东/i.test(text);
}

function looksLikeRole(line) {
  const text = String(line || "").trim();
  if (!text || text.length > 36) return false;
  if (isDateLine(text) || looksLikeCompany(text)) return false;
  return /产品|运营|工程师|开发|设计|经理|负责人|实习|策划|增长|社区|内容|商业化|后端|前端|全栈|数据|分析|审核/i.test(text);
}

function isBulletLine(line) {
  return /^[-•*·]|负责|参与|主导|推动|搭建|设计|优化|完成|支持|协同|产出|实现|维护|整理|通过|将/.test(String(line || "").trim());
}

function cleanLine(line) {
  return String(line || "").replace(/^[-•*·]\s*/, "").replace(/\s+/g, " ").trim();
}

function sectionAfter(lines, startPredicate) {
  const start = lines.findIndex(startPredicate);
  if (start < 0) return [];
  const section = [];
  for (const line of lines.slice(start + 1)) {
    if (isNextMajorSection(line)) break;
    section.push(line);
  }
  return section;
}

function parseWorkExperiences(lines) {
  const section = sectionAfter(lines, isWorkSectionStart);
  const source = section.length ? section : lines.filter((line) => !isNextMajorSection(line));
  const entries = [];
  let current = null;

  function pushCurrent() {
    if (!current?.title) return;
    current.bullets = current.bullets.map(cleanLine).filter(Boolean).slice(0, 3);
    entries.push(current);
  }

  for (let i = 0; i < source.length; i += 1) {
    const line = cleanLine(source[i]);
    if (!line) continue;

    const next = cleanLine(source[i + 1]);
    const next2 = cleanLine(source[i + 2]);
    const canStartCombined = looksLikeCompany(line) || (isDateLine(line) && /公司|产品|运营|工程师|经理|实习/.test(line));
    if (canStartCombined) {
      const parts = [line];
      const lineHasDate = isDateLine(line);
      let consumedRole = false;
      if (!lineHasDate && next && looksLikeRole(next)) {
        parts.push(next);
        i += 1;
        consumedRole = true;
      }
      if (!lineHasDate) {
        const maybeDate = cleanLine(source[i + 1]);
        if (maybeDate && isDateLine(maybeDate)) {
          parts.push(maybeDate);
          i += 1;
        } else if (consumedRole && next2 && isDateLine(next2) && !parts.includes(next2)) {
          parts.push(next2);
          i += 1;
        }
      }
      pushCurrent();
      current = { title: parts.join(" ｜ "), bullets: [] };
      continue;
    }

    if (isDateLine(line) && current && !isDateLine(current.title)) {
      current.title = `${current.title} ｜ ${line}`;
      continue;
    }

    if (current && isBulletLine(line)) {
      current.bullets.push(line);
    }
  }
  pushCurrent();

  return entries.slice(0, 12);
}

function parseProjects(lines) {
  const section = sectionAfter(lines, isProjectSectionStart);
  const entries = [];
  let current = null;
  for (const raw of section) {
    const line = cleanLine(raw);
    if (!line) continue;
    if (!isBulletLine(line) && line.length <= 42) {
      if (current?.title) entries.push(current);
      current = { title: line, bullets: [] };
      continue;
    }
    if (current) current.bullets.push(line);
  }
  if (current?.title) entries.push(current);
  return entries.map((item) => ({ ...item, bullets: item.bullets.slice(0, 3) })).slice(0, 12);
}
