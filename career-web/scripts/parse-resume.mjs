#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { parseResumeFile } from "../server/resumeParser.js";

const [input, output = "resume-extracted.txt"] = process.argv.slice(2);

if (!input) {
  console.error("Usage: node scripts/parse-resume.mjs input.pdf|input.docx [output.txt]");
  process.exit(1);
}

const ext = path.extname(input).toLowerCase();
const result = await parseResumeFile(path.resolve(input), ext);
await fs.writeFile(path.resolve(output), result.text, "utf8");
console.log(JSON.stringify({
  parser: result.parser,
  pageCount: result.pageCount,
  charCount: result.text.length,
  warnings: result.warnings
}, null, 2));
