#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const fileSpecs = [
  {
    file: "profile.md",
    sections: ["Current Goal", "Current Career Track", "Target Directions", "Confirmed Facts", "Open Questions"]
  },
  {
    file: "directions.md",
    sections: ["Direction Ranking"]
  },
  {
    file: "keywords.md",
    sections: ["Positioning Keywords"]
  },
  {
    file: "projects.md",
    sections: ["Projects", "Classification", "Evidence", "Outputs", "Review"]
  },
  {
    file: "skills-evidence.md",
    sections: ["Skills Evidence"]
  },
  {
    file: "jd-fit.md",
    sections: ["JD Fit", "JD Capability Model", "Fit / Gap Matrix", "Objective Recommendation"]
  },
  {
    file: "resume-stories.md",
    sections: ["Resume Stories", "Resume Strategy", "Resume Bullets", "STAR Stories"]
  },
  {
    file: "website-brief.md",
    sections: ["Website Brief", "Audience", "Positioning", "Information Architecture"]
  }
];

const args = process.argv.slice(2);
const json = args.includes("--json");
const strictSections = args.includes("--strict-sections");
const targetArg = args.find((arg) => !arg.startsWith("--")) || "career-assets";
const targetDir = path.resolve(targetArg);
const missing = [];
const empty = [];
const missingSections = [];
let pendingMarkers = 0;
let filesChecked = 0;

for (const spec of fileSpecs) {
  const { file, sections } = spec;
  const target = path.join(targetDir, file);
  try {
    const content = await fs.readFile(target, "utf8");
    filesChecked += 1;
    if (!content.trim()) empty.push(file);
    pendingMarkers += (content.match(/待确认|TBD|TODO/gi) || []).length;
    const headings = extractHeadings(content);
    const missingForFile = sections.filter((section) => !headings.has(section.toLowerCase()));
    if (missingForFile.length) {
      missingSections.push({ file, sections: missingForFile });
    }
  } catch (error) {
    if (error.code === "ENOENT") missing.push(file);
    else throw error;
  }
}

const blocking = [
  ...missing.map((file) => ({ type: "missing", file })),
  ...empty.map((file) => ({ type: "empty", file })),
  ...(strictSections
    ? missingSections.flatMap((item) =>
        item.sections.map((section) => ({ type: "missing_section", file: item.file, section }))
      )
    : [])
];

const report = {
  targetDir,
  ready: blocking.length === 0,
  filesChecked,
  filesExpected: fileSpecs.length,
  missing,
  empty,
  missingSections,
  pendingMarkers,
  strictSections
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  if (missing.length) console.error(`missing: ${missing.join(", ")}`);
  if (empty.length) console.error(`empty: ${empty.join(", ")}`);
  for (const item of missingSections) {
    console.error(`section warning: ${item.file} missing ${item.sections.join(", ")}`);
  }
  const status = report.ready ? "ok" : "blocked";
  console.log(
    `career assets ${status}: ${targetDir} ` +
      `(files=${filesChecked}/${fileSpecs.length}, pending_markers=${pendingMarkers})`
  );
  if (missingSections.length && !strictSections) {
    console.log("section warnings are non-blocking; add --strict-sections to fail on schema drift");
  }
}

if (!report.ready) process.exit(1);

function extractHeadings(content) {
  return new Set(
    [...content.matchAll(/^#{1,3}\s+(.+)$/gm)].map((match) => match[1].trim().toLowerCase())
  );
}
