#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const requiredFiles = [
  "profile.md",
  "directions.md",
  "keywords.md",
  "projects.md",
  "skills-evidence.md",
  "jd-fit.md",
  "resume-stories.md",
  "website-brief.md"
];

const targetDir = path.resolve(process.argv[2] || "career-assets");
const missing = [];
const empty = [];

for (const file of requiredFiles) {
  const target = path.join(targetDir, file);
  try {
    const content = await fs.readFile(target, "utf8");
    if (!content.trim()) empty.push(file);
  } catch (error) {
    if (error.code === "ENOENT") missing.push(file);
    else throw error;
  }
}

if (missing.length || empty.length) {
  if (missing.length) console.error(`missing: ${missing.join(", ")}`);
  if (empty.length) console.error(`empty: ${empty.join(", ")}`);
  process.exit(1);
}

console.log(`career assets ok: ${targetDir}`);
