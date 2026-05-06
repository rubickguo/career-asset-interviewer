#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/check-resume-html.mjs resume.html");
  process.exit(1);
}

const html = await fs.readFile(path.resolve(input), "utf8");
const findings = [];

if (!/@page/.test(html)) findings.push("Missing @page print CSS.");
if (!/print-color-adjust|webkit-print-color-adjust/i.test(html)) findings.push("Missing print color adjustment.");
if (/font-size\s*:\s*(?:[0-9](?:px)?|1[01]px)/i.test(html)) findings.push("Possible unreadable small font size.");
if (/height\s*:\s*100vh/i.test(html)) findings.push("100vh can cause PDF page break problems.");
if (/<table[\s>]/i.test(html) && !/page-break-inside\s*:\s*avoid|break-inside\s*:\s*avoid/i.test(html)) {
  findings.push("Tables may break across PDF pages without break-inside rules.");
}

if (findings.length) {
  console.error(findings.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("resume html checks passed");
