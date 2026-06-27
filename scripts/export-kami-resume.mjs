#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "..");

const args = parseArgs(process.argv.slice(2));
const assetsDir = path.resolve(args.assets || args._[0] || "career-assets");
const outDir = path.resolve(args.out || "exports/kami-adapter");

const assets = await readAssets(assetsDir);
const projects = parseProjects(assets["projects.md"] || "");
const keywords = parseKeywordRows(assets["keywords.md"] || "");
const directions = parseDirections(assets["directions.md"] || "");
const skills = parseSkills(assets["skills-evidence.md"] || "");

const resumeData = {
  protocol: {
    source: "career-asset-interviewer",
    target: "kami.resume",
    version: "0.1.0",
    generatedAt: new Date().toISOString()
  },
  source: {
    assetsDir,
    files: Object.keys(assets).sort()
  },
  candidate: {
    name: "",
    alias: "",
    targetRole: firstNonEmpty([
      firstDirectionName(directions),
      firstKeywordByRole(keywords, "primary"),
      sectionText(assets["profile.md"], "Current Career Track")
    ]),
    location: "",
    contact: {
      email: "",
      phone: "",
      github: "",
      website: "",
      x: ""
    }
  },
  positioning: {
    currentGoal: sectionText(assets["profile.md"], "Current Goal"),
    currentTrack: sectionText(assets["profile.md"], "Current Career Track"),
    continueOrChangeHypothesis: sectionText(assets["profile.md"], "Continue Or Change Hypothesis"),
    targetDirections: directions.map((item) => ({
      name: item.name,
      type: item.fields.Type || "",
      why: item.fields["Why it fits"] || "",
      evidence: item.fields.Evidence || "",
      gaps: item.fields.Gaps || "",
      risks: item.fields.Risks || ""
    })),
    keywords: keywords.map((item) => ({
      keyword: item.Keyword || "",
      role: item.Role || "",
      priority: item.Priority || "",
      evidenceStrength: item["Evidence Strength"] || "",
      supportingProjects: item["Supporting Projects"] || "",
      missingProof: item["Missing Proof"] || "",
      decision: item.Decision || "",
      status: item.Status || ""
    }))
  },
  resume: {
    summary: buildSummary(assets, directions, keywords),
    metrics: buildMetricCandidates(projects).slice(0, 4),
    projects: projects.map(projectToKamiProject),
    skills: skills.map((item) => ({
      name: item.name,
      evidenceStrength: item.fields["Evidence strength"] || "",
      supportingProjects: item.fields["Supporting projects"] || "",
      bestProof: item.fields["Best proof"] || "",
      resumeWording: item.fields["Resume wording"] || "",
      missingDetails: item.fields["Missing details"] || ""
    })),
    storyBlocks: {
      resumeStrategy: sectionText(assets["resume-stories.md"], "Resume Strategy"),
      resumeBullets: sectionText(assets["resume-stories.md"], "Resume Bullets"),
      layoutNotes: sectionText(assets["resume-stories.md"], "Layout / PDF Notes")
    }
  },
  boundaries: {
    publicPrivate: projects.map((project) => ({
      project: project.name,
      publicDisplay: project.fields["Public display"] || "",
      sensitivityRisks: project.fields["Privacy / sensitivity risks"] || "",
      metricConfidence: project.fields["Metric confidence"] || ""
    })),
    riskPoints: sectionText(assets["resume-stories.md"], "Risk Points"),
    pendingConfirmations: sectionText(assets["resume-stories.md"], "Pending Confirmations"),
    warnings: buildWarnings(projects, keywords, assets)
  },
  kamiTemplateHints: {
    recommendedTemplate: "resume.html",
    adapterMode: "agent_filled_template",
    notes: [
      "Use Kami as the presentation layer, not the career-understanding layer.",
      "Do not promote weak-evidence keywords into the resume header.",
      "Keep public/private boundaries outside final resume copy unless sanitized.",
      "If a project has low metric confidence, downgrade the impact line or ask for confirmation."
    ],
    fieldMapping: {
      "{{姓名}}": "candidate.name",
      "{{岗位定位}}": "candidate.targetRole",
      "{{摘要}}": "resume.summary",
      "{{关键词}}": "positioning.keywords[].keyword",
      "metrics": "resume.metrics",
      "project role/action/impact rows": "resume.projects[].role/actions/impact",
      "risk review": "boundaries.warnings and boundaries.publicPrivate"
    }
  }
};

await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, "kami-resume-data.json"), `${JSON.stringify(resumeData, null, 2)}\n`, "utf8");
await fs.writeFile(path.join(outDir, "kami-resume-brief.md"), buildBrief(resumeData), "utf8");

console.log(`wrote ${path.relative(process.cwd(), path.join(outDir, "kami-resume-data.json"))}`);
console.log(`wrote ${path.relative(process.cwd(), path.join(outDir, "kami-resume-brief.md"))}`);

function parseArgs(argv) {
  const result = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--assets") result.assets = argv[++i];
    else if (arg === "--out") result.out = argv[++i];
    else result._.push(arg);
  }
  return result;
}

async function readAssets(dir) {
  const names = [
    "profile.md",
    "directions.md",
    "keywords.md",
    "projects.md",
    "skills-evidence.md",
    "resume-stories.md",
    "website-brief.md"
  ];
  const entries = {};
  for (const name of names) {
    const file = path.join(dir, name);
    try {
      entries[name] = await fs.readFile(file, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      entries[name] = "";
    }
  }
  return entries;
}

function sectionText(content, heading) {
  if (!content) return "";
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^##+\\s+${escaped}\\s*$([\\s\\S]*?)(?=^##+\\s+|\\z)`, "im");
  const match = content.match(pattern);
  return cleanBlock(match?.[1] || "");
}

function parseDirections(content) {
  return parseNamedBlocks(content, 2)
    .filter((item) => item.name !== "Direction Ranking")
    .map((item) => ({ name: item.name, fields: parseDashFields(item.body) }));
}

function parseSkills(content) {
  return parseNamedBlocks(content, 2)
    .filter((item) => item.name !== "Skills Evidence")
    .map((item) => ({ name: item.name, fields: parseDashFields(item.body) }));
}

function parseProjects(content) {
  return parseNamedBlocks(content, 2)
    .filter((item) => item.name !== "Projects")
    .map((item) => {
      const fields = {};
      const subSections = parseNamedBlocks(item.body, 3);
      for (const sub of subSections) {
        Object.assign(fields, parseDashFields(sub.body));
      }
      return {
        name: item.name,
        body: item.body,
        fields
      };
    });
}

function parseNamedBlocks(content, level) {
  if (!content) return [];
  const hashes = "#".repeat(level);
  const re = new RegExp(`^${hashes}\\s+(.+)$`, "gm");
  const matches = [...content.matchAll(re)];
  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? content.length;
    return {
      name: match[1].trim(),
      body: content.slice(start, end).trim()
    };
  });
}

function parseDashFields(content) {
  const fields = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*-\s+([^:：]+)[:：]\s*(.*)$/);
    if (match) fields[match[1].trim()] = match[2].trim();
  }
  return fields;
}

function parseKeywordRows(content) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().startsWith("|"));
  if (lines.length < 3) return [];
  const headers = splitTableRow(lines[0]);
  return lines
    .slice(2)
    .map(splitTableRow)
    .filter((cells) => cells.length === headers.length)
    .map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function buildSummary(assets, directions, keywords) {
  const facts = [
    sectionText(assets["profile.md"], "Current Career Track"),
    sectionText(assets["profile.md"], "Current Goal"),
    strongestKeywords(keywords).join(" / ")
  ].filter(Boolean);
  const firstDirection = directions[0];
  if (firstDirection?.fields?.["Why it fits"]) facts.push(firstDirection.fields["Why it fits"]);
  return facts.join(" ");
}

function buildMetricCandidates(projects) {
  const candidates = [];
  for (const project of projects) {
    for (const key of ["Result metrics", "Process metrics", "Quality metrics", "Adoption / usage evidence"]) {
      const value = project.fields[key];
      if (!value || value === "待确认") continue;
      candidates.push({
        value: extractMetricValue(value),
        label: `${project.name} · ${key}`,
        sourceProject: project.name,
        confidence: project.fields["Metric confidence"] || ""
      });
    }
  }
  return candidates;
}

function extractMetricValue(text) {
  const match = text.match(/([0-9][0-9,]*(?:\.[0-9]+)?\s*(?:%|万|亿|k|K|人|次|天|小时|stars?|forks?)?)/);
  return match ? match[1].trim() : text.slice(0, 24);
}

function projectToKamiProject(project) {
  const context = firstNonEmpty([
    project.fields["Business context"],
    project.fields["Core problem"],
    project.fields["Why it mattered"]
  ]);
  const role = firstNonEmpty([
    project.fields["User's responsibility"],
    project.fields["Decision rights"],
    project.fields.Scope
  ]);
  const actions = firstNonEmpty([
    project.fields["Key actions"],
    project.fields["Non-obvious judgment"],
    project.fields["Process / mechanism created"]
  ]);
  const impact = firstNonEmpty([
    project.fields["Result metrics"],
    project.fields["Before / after"],
    project.fields["Process metrics"],
    project.fields["Quality metrics"],
    project.fields["Resume bullet"]
  ]);
  return {
    name: project.name,
    type: project.fields["Project type"] || "",
    roleTag: role,
    resumePriority: project.fields["Resume priority"] || "",
    portfolioPriority: project.fields["Portfolio priority"] || "",
    role: compactSentence([context, role].filter(Boolean).join(" ")),
    actions: compactSentence(actions),
    impact: compactSentence(impact),
    evidenceConfidence: project.fields["Metric confidence"] || "",
    publicDisplay: project.fields["Public display"] || "",
    risks: project.fields["Privacy / sensitivity risks"] || ""
  };
}

function buildWarnings(projects, keywords, assets) {
  const warnings = [];
  for (const keyword of keywords) {
    if (["weak", "missing"].includes(String(keyword["Evidence Strength"] || "").toLowerCase())) {
      warnings.push(`Keyword "${keyword.Keyword}" has ${keyword["Evidence Strength"]} evidence; keep it out of high-emphasis Kami slots unless confirmed.`);
    }
  }
  for (const project of projects) {
    const publicDisplay = String(project.fields["Public display"] || "").toLowerCase();
    const confidence = String(project.fields["Metric confidence"] || "").toLowerCase();
    if (publicDisplay.includes("needs") || publicDisplay.includes("no")) {
      warnings.push(`Project "${project.name}" requires public-display review before portfolio output.`);
    }
    if (confidence && !["high", "confirmed"].includes(confidence)) {
      warnings.push(`Project "${project.name}" metric confidence is "${project.fields["Metric confidence"]}"; downgrade or confirm impact wording.`);
    }
  }
  const pending = sectionText(assets["resume-stories.md"], "Pending Confirmations");
  if (pending) warnings.push("Resume stories still have pending confirmations; do not render them as final claims.");
  return warnings;
}

function buildBrief(data) {
  const projects = data.resume.projects;
  const lines = [
    "# Kami Resume Adapter Brief",
    "",
    "This file is generated from `career-assets/` and is intended for an agent or adapter that fills Kami's `resume.html` template.",
    "",
    "## Positioning",
    "",
    `- Target role: ${data.candidate.targetRole || "待确认"}`,
    `- Summary: ${data.resume.summary || "待确认"}`,
    `- Keywords: ${data.positioning.keywords.map((item) => item.keyword).filter(Boolean).join(", ") || "待确认"}`,
    "",
    "## Metric Candidates",
    ""
  ];

  if (data.resume.metrics.length) {
    for (const metric of data.resume.metrics) {
      lines.push(`- ${metric.value} — ${metric.label} (${metric.confidence || "confidence 待确认"})`);
    }
  } else {
    lines.push("- 待确认：no confirmed metrics found in career assets.");
  }

  lines.push("", "## Projects For Kami Resume", "");
  for (const project of projects) {
    lines.push(
      `### ${project.name}`,
      "",
      `- Type: ${project.type || "待确认"}`,
      `- Role row: ${project.role || "待确认"}`,
      `- Actions row: ${project.actions || "待确认"}`,
      `- Impact row: ${project.impact || "待确认"}`,
      `- Resume priority: ${project.resumePriority || "待确认"}`,
      `- Public display: ${project.publicDisplay || "待确认"}`,
      `- Metric confidence: ${project.evidenceConfidence || "待确认"}`,
      ""
    );
  }

  lines.push("## Boundary Warnings", "");
  if (data.boundaries.warnings.length) {
    for (const warning of data.boundaries.warnings) lines.push(`- ${warning}`);
  } else {
    lines.push("- No blocking warnings generated by the adapter.");
  }

  lines.push(
    "",
    "## Suggested Kami Mapping",
    "",
    "- Use `candidate.targetRole` for the header role slot.",
    "- Use `resume.summary` for the short summary slot.",
    "- Use up to four `resume.metrics` items for the metric strip.",
    "- Use `resume.projects[].role/actions/impact` for Kami's project row structure.",
    "- Keep `boundaries.warnings` outside final resume copy; use them as pre-render checks.",
    ""
  );

  return `${lines.join("\n")}\n`;
}

function firstDirectionName(directions) {
  return directions[0]?.name || "";
}

function firstKeywordByRole(keywords, role) {
  return keywords.find((item) => item.Role === role)?.Keyword || "";
}

function strongestKeywords(keywords) {
  return keywords
    .filter((item) => ["strong", "medium"].includes(String(item["Evidence Strength"] || "").toLowerCase()))
    .slice(0, 5)
    .map((item) => item.Keyword)
    .filter(Boolean);
}

function firstNonEmpty(values) {
  return values.map((value) => String(value || "").trim()).find(Boolean) || "";
}

function cleanBlock(text) {
  return text
    .replace(/^\s+|\s+$/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

function compactSentence(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/^[-\s]+/, "")
    .trim();
}
