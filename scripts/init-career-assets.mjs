#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "..");
const sampleDir = path.join(repoRoot, "career-assets.sample");
const targetDir = path.resolve(process.argv[2] || "career-assets");

await fs.mkdir(targetDir, { recursive: true });
const files = await fs.readdir(sampleDir);

for (const file of files.filter((name) => name.endsWith(".md"))) {
  const source = path.join(sampleDir, file);
  const target = path.join(targetDir, file);
  try {
    await fs.copyFile(source, target, fs.constants.COPYFILE_EXCL);
    console.log(`created ${path.relative(process.cwd(), target)}`);
  } catch (error) {
    if (error.code === "EEXIST") {
      console.log(`kept existing ${path.relative(process.cwd(), target)}`);
      continue;
    }
    throw error;
  }
}
