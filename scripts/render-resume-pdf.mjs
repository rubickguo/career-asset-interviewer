#!/usr/bin/env node
import path from "node:path";

const [input, output] = process.argv.slice(2);

if (!input || !output) {
  console.error("Usage: node scripts/render-resume-pdf.mjs input.html output.pdf");
  process.exit(1);
}

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("Missing dependency: playwright. Install it in the working project before using this script.");
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`file://${path.resolve(input)}`, { waitUntil: "networkidle" });
await page.pdf({
  path: path.resolve(output),
  format: "A4",
  printBackground: true,
  margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" }
});
await browser.close();
console.log(`wrote ${path.resolve(output)}`);
