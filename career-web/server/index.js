import express from "express";
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { AsyncLocalStorage } from "node:async_hooks";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { callDeepSeek, getLlmConfig } from "./llmClient.js";
import { parseResumeFile } from "./resumeParser.js";
import { buildPersonalSiteHtml, buildResumeHtml, inspectResumeHtml } from "./renderers.js";
import { buildMessages, parseJsonResult, resultToMarkdown, runnableSteps, workflowSteps } from "./workflow.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const workspaceRootDir = process.env.CAREER_WEB_DATA || path.join(rootDir, "workspace");
const execFileAsync = promisify(execFile);
const sessionStore = new AsyncLocalStorage();

function buildDirs(workspaceDir) {
  return {
  assets: path.join(workspaceDir, "career-assets"),
  tasks: path.join(workspaceDir, "agent-tasks"),
  results: path.join(workspaceDir, "agent-results"),
  intake: path.join(workspaceDir, "intake"),
  llmResults: path.join(workspaceDir, "llm-results"),
  uploads: path.join(workspaceDir, "uploads"),
  exports: path.join(workspaceDir, "exports"),
  actionRuns: path.join(workspaceDir, "action-runs"),
  system: path.join(workspaceDir, "system")
  };
}

function normalizeSessionId(value) {
  const raw = String(value || "").trim();
  if (/^[a-zA-Z0-9_-]{12,80}$/.test(raw)) return raw;
  return "anonymous-session";
}

function buildSessionContext(sessionId) {
  const safeSessionId = normalizeSessionId(sessionId);
  const workspaceDir = path.join(workspaceRootDir, "sessions", safeSessionId);
  return {
    sessionId: safeSessionId,
    workspaceDir,
    dirs: buildDirs(workspaceDir)
  };
}

const fallbackSessionContext = buildSessionContext("anonymous-session");

function getSessionContext() {
  return sessionStore.getStore() || fallbackSessionContext;
}

function currentSessionId() {
  return getSessionContext().sessionId;
}

function currentWorkspaceDir() {
  return getSessionContext().workspaceDir;
}

const dirs = new Proxy(
  {},
  {
    get(_target, key) {
      return getSessionContext().dirs[key];
    }
  }
);

const assetFiles = {
  profile: "profile.md",
  directions: "directions.md",
  keywords: "keywords.md",
  projects: "projects.md",
  skillsEvidence: "skills-evidence.md",
  jdFit: "jd-fit.md",
  resumeStories: "resume-stories.md",
  websiteBrief: "website-brief.md"
};

const defaultAssets = {
  "profile.md": `# Profile

## Current Goal

## Current Career Track

## Continue Or Change Hypothesis

## Target Directions

## Wants

## Does Not Want

| Item | Reason | Type | Solvable? | Notes |
|---|---|---|---|---|

Types: true dislike / bad context / hard constraint / skill gap / identity block / assumed difficulty

## Strengths

## Preferences

## Constraints

## Relevant Life Experience

| Experience | Target Role Relevance | Evidence | Use In Resume? | Notes |
|---|---|---|---|---|

## Confirmed Facts

## Open Questions
`,
  "directions.md": `# Direction Ranking

## Direction Name

- Type: high-certainty / growth / exploration / deprioritized
- Current-track or transition:
- Why it fits:
- Evidence:
- Gaps:
- Risks:
- Assumed difficulties:
- Next experiment:
`,
  "keywords.md": `# Positioning Keywords

| Keyword | Role | Priority | Evidence Strength | Supporting Projects | Missing Proof | Decision | Status |
|---|---|---|---|---|---|---|---|
`,
  "projects.md": `# Projects

## Project Name

### Classification

- Company / Role / Time:
- Project type:
- Target direction(s):
- Target keyword(s):
- Resume priority: P0 / P1 / P2 / omit
- Portfolio priority: P0 / P1 / P2 / omit
- Suitable roles:
- Public display: yes / no / needs sanitization
- Privacy / sensitivity risks:

### Context

- Business context:
- User / customer / stakeholder:
- Core problem:
- Why it mattered:

### User Role

- User's responsibility:
- Decision rights:
- Collaborators:
- Scope:

### Actions

- Key actions:
- Non-obvious judgment:
- Hardest tradeoff:
- Process / mechanism created:
- Tools / AI / automation used:

### Evidence

- Result metrics:
- Process metrics:
- Quality metrics:
- Adoption / usage evidence:
- Before / after:
- Evidence materials:
- Metric confidence: high / medium / low / 待确认

### Capability Mapping

- Skills proven:
- Transferable capability:
- Differentiating detail:
- Weak or missing proof:

### Outputs

- Resume bullet:
- Interview STAR:
- Website / portfolio version:
- JD matching notes:

### Review

- Main narrative / secondary evidence / minimize:
- Assumptions:
- Questions to confirm:
`,
  "skills-evidence.md": `# Skills Evidence

## Skill Name

- Evidence strength: strong / medium / weak / missing
- Supporting projects:
- Best proof:
- Resume wording:
- Interview angle:
- Website angle:
- Missing details:
`,
  "jd-fit.md": `# JD Fit

## Target JD / Role

## User Direction Context

## JD Capability Model

| Requirement | Priority | Hidden Expectation | Evidence Needed |
|---|---|---|---|

## Fit / Gap Matrix

| Requirement | User Evidence | Fit | Gap | Note |
|---|---|---|---|---|

## Objective Recommendation

值得重点投递 / 可以尝试 / 不建议优先 / 先补证据再投

## Resume Adjustment Brief

## Questions To Clarify
`,
  "resume-stories.md": `# Resume Stories

## Target Resume Version

## Resume Strategy

## Resume Bullets

## STAR Stories

## Self Introduction

## Layout / PDF Notes

## Risk Points

## Pending Confirmations
`,
  "website-brief.md": `# Website Brief

## Audience

## Positioning

## User Preferences

## User Dislikes

## Product Identity

C-end product / B-end product / technical builder / operations-growth / manager / creator / other

## Style References

## Style Interpretation

## Information Architecture

## Copy Blocks

## Project Display Rules

## Build Notes
`
};

const localUserId = "local-user";
const projectCardsFile = "project-cards.json";
const usageLedgerFile = "usage-ledger.jsonl";

const actionContracts = {
  career_direction: {
    label: "职业方向深访",
    stage: "after_resume_parse",
    creditCost: 3,
    maxInputChars: 20000,
    maxOutputTokens: 1800,
    cacheFields: ["resume_hash", "career_answers_hash", "prompt_version"],
    preconditions: ["resume_parsed"]
  },
  project_mining: {
    label: "项目证据提炼",
    stage: "after_direction",
    creditCost: 4,
    maxInputChars: 16000,
    maxOutputTokens: 1600,
    cacheFields: ["asset_snapshot_hash", "project_cards_hash", "prompt_version"],
    preconditions: ["career_direction_done"]
  },
  resume_strategy: {
    label: "简历策略",
    stage: "after_project_evidence",
    creditCost: 8,
    maxInputChars: 20000,
    maxOutputTokens: 1800,
    cacheFields: ["asset_snapshot_hash", "target_version", "prompt_version"],
    preconditions: ["project_mining_done"]
  },
  resume_render: {
    label: "简历预览与导出",
    stage: "after_resume_strategy",
    creditCost: 0,
    maxInputChars: 0,
    maxOutputTokens: 0,
    cacheFields: ["resume_strategy_hash"],
    preconditions: ["resume_strategy_done"]
  },
  jd_fit: {
    label: "JD 深度策略",
    stage: "optional_after_assets",
    creditCost: 3,
    maxInputChars: 16000,
    maxOutputTokens: 1800,
    cacheFields: ["jd_hash", "asset_snapshot_hash", "prompt_version"],
    preconditions: ["career_direction_done", "jd_present"]
  },
  personal_site: {
    label: "个人网站 brief",
    stage: "optional_after_resume_strategy",
    creditCost: 5,
    maxInputChars: 20000,
    maxOutputTokens: 2200,
    cacheFields: ["asset_snapshot_hash", "website_preference_hash", "prompt_version"],
    preconditions: ["resume_strategy_done", "project_mining_done"]
  }
};

const orchestratorStages = {
  anonymous: {
    label: "未开始",
    visible: "Landing、上传入口、示例",
    nextStep: "上传 PDF/DOCX 简历"
  },
  resume_parsed: {
    label: "简历已解析",
    visible: "简历解析结果、首次诊断入口",
    nextStep: "生成首次职业诊断"
  },
  diagnosis_ready: {
    label: "首次诊断完成",
    visible: "职业方向判断、候选叙事、风险和追问",
    nextStep: "回答追问并继续深访"
  },
  direction_confirmed: {
    label: "方向已初步确认",
    visible: "方向排序、关键词和用户回答",
    nextStep: "深挖项目证据"
  },
  project_evidence_ready: {
    label: "项目证据已生成",
    visible: "项目证据卡、能力证据和指标补齐方向",
    nextStep: "编辑确认项目卡或生成简历策略"
  },
  resume_strategy_ready: {
    label: "简历策略已生成",
    visible: "简历定位、关键词排序、bullet 和待确认问题",
    nextStep: "生成 HTML/PDF 简历"
  },
  resume_ready: {
    label: "简历已可预览",
    visible: "HTML/PDF 简历、版式检查报告",
    nextStep: "局部修改、JD 分析或个人网站 brief"
  },
  jd_analyzed: {
    label: "JD 已分析",
    visible: "JD fit/gap、投递建议、简历调整 brief",
    nextStep: "生成 JD 定制简历或继续修改"
  },
  site_ready: {
    label: "网站方案已生成",
    visible: "网站 brief、静态预览和公开前检查",
    nextStep: "确认公开边界后发布"
  }
};

function safeAssetName(file) {
  const names = new Set(Object.values(assetFiles));
  if (!names.has(file)) {
    throw new Error(`Unsupported asset file: ${file}`);
  }
  return file;
}

async function ensureWorkspace() {
  const sessionDirs = Object.values(getSessionContext().dirs);
  await Promise.all(sessionDirs.map((dir) => fs.mkdir(dir, { recursive: true })));
  await Promise.all(sessionDirs.map((dir) => fs.writeFile(path.join(dir, ".gitkeep"), "", { flag: "a" })));

  for (const [file, content] of Object.entries(defaultAssets)) {
    const target = path.join(dirs.assets, file);
    try {
      await fs.access(target);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await fs.writeFile(target, content, "utf8");
    }
  }

  try {
    await fs.access(path.join(dirs.assets, projectCardsFile));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await fs.writeFile(path.join(dirs.assets, projectCardsFile), "[]", "utf8");
  }
  await fs.writeFile(path.join(dirs.system, usageLedgerFile), "", { flag: "a" });
}

async function emptyDirectory(dir) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, ".gitkeep"), "", { flag: "a" });
}

async function resetFlowState() {
  await ensureWorkspace();
  await Promise.all([
    emptyDirectory(dirs.llmResults),
    emptyDirectory(dirs.results),
    emptyDirectory(dirs.actionRuns),
    emptyDirectory(dirs.tasks),
    emptyDirectory(dirs.exports),
    emptyDirectory(dirs.intake)
  ]);

  for (const [file, content] of Object.entries(defaultAssets)) {
    await fs.writeFile(path.join(dirs.assets, file), content, "utf8");
  }
  await fs.writeFile(path.join(dirs.assets, projectCardsFile), "[]", "utf8");
  await fs.writeFile(path.join(dirs.system, usageLedgerFile), "", "utf8");
  for (const [jobId, job] of jobs.entries()) {
    if (job.sessionId === currentSessionId()) jobs.delete(jobId);
  }

  return {
    resumeMeta: await readJsonFile(path.join(dirs.uploads, "resume-meta.json"), null),
    resetAt: new Date().toISOString()
  };
}

async function readText(filePath, fallback = "") {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function listJsonFiles(dir) {
  const files = await fs.readdir(dir);
  const items = [];
  for (const file of files.filter((item) => item.endsWith(".json")).sort().reverse()) {
    const fullPath = path.join(dir, file);
    try {
      const raw = await fs.readFile(fullPath, "utf8");
      items.push({ file, ...JSON.parse(raw) });
    } catch {
      items.push({ file, type: "invalid", status: "error" });
    }
  }
  return items;
}

async function listResultFiles(dir) {
  const files = await fs.readdir(dir);
  const visible = files.filter((file) => !file.startsWith(".")).sort().reverse();
  const results = [];
  for (const file of visible) {
    const fullPath = path.join(dir, file);
    const stat = await fs.stat(fullPath);
    results.push({
      file,
      size: stat.size,
      updatedAt: stat.mtime.toISOString(),
      preview: await readText(fullPath, "")
    });
  }
  return results;
}

function normalizeContent(content) {
  return String(content || "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function assetProgress(file, content) {
  const normalized = normalizeContent(content);
  const template = normalizeContent(defaultAssets[file] || "");
  if (!normalized || normalized === template) {
    return { status: "empty", filledCount: 0 };
  }

  const templateLines = new Set(
    template
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  );
  const changedLines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !templateLines.has(line));

  return {
    status: changedLines.length > 0 ? "edited" : "touched",
    filledCount: changedLines.length
  };
}

function slug(input) {
  return String(input || "task")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "task";
}

async function readJsonFile(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

function hashText(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, 16);
}

async function readProjectCards() {
  const cards = await readJsonFile(path.join(dirs.assets, projectCardsFile), []);
  return Array.isArray(cards) ? cards : [];
}

function normalizeProjectCard(card = {}, index = 0) {
  const now = new Date().toISOString();
  return {
    id: String(card.id || `project-${index + 1}-${hashText(card.name || now)}`),
    name: String(card.name || ""),
    role: String(card.role || ""),
    context: String(card.context || ""),
    actions: Array.isArray(card.actions) ? card.actions.map(String) : String(card.actions || "").split("\n").map((item) => item.trim()).filter(Boolean),
    resultMetrics: Array.isArray(card.resultMetrics) ? card.resultMetrics.map(String) : String(card.resultMetrics || "").split("\n").map((item) => item.trim()).filter(Boolean),
    processMetrics: Array.isArray(card.processMetrics) ? card.processMetrics.map(String) : String(card.processMetrics || "").split("\n").map((item) => item.trim()).filter(Boolean),
    qualityMetrics: Array.isArray(card.qualityMetrics) ? card.qualityMetrics.map(String) : String(card.qualityMetrics || "").split("\n").map((item) => item.trim()).filter(Boolean),
    skills: Array.isArray(card.skills) ? card.skills.map(String) : String(card.skills || "").split("\n").map((item) => item.trim()).filter(Boolean),
    publicDisplay: String(card.publicDisplay || "needs_sanitization"),
    privacyRisk: String(card.privacyRisk || ""),
    resumePriority: String(card.resumePriority || "P1"),
    portfolioPriority: String(card.portfolioPriority || "P1"),
    resumeBullet: String(card.resumeBullet || ""),
    interviewStar: String(card.interviewStar || ""),
    websiteVersion: String(card.websiteVersion || ""),
    confirmed: Boolean(card.confirmed),
    updatedAt: card.updatedAt || now
  };
}

async function writeProjectCards(cards) {
  const normalized = (Array.isArray(cards) ? cards : []).map(normalizeProjectCard);
  await fs.writeFile(path.join(dirs.assets, projectCardsFile), JSON.stringify(normalized, null, 2), "utf8");
  await fs.writeFile(path.join(dirs.assets, "projects.md"), projectCardsToMarkdown(normalized), "utf8");
  return normalized;
}

function projectCardsToMarkdown(cards) {
  const lines = ["# Projects", ""];
  if (!cards.length) {
    lines.push("暂无项目卡。");
    return lines.join("\n");
  }
  for (const card of cards) {
    lines.push(`## ${card.name || "未命名项目"}`, "");
    lines.push("### Classification", "");
    lines.push(`- Resume priority: ${card.resumePriority}`);
    lines.push(`- Portfolio priority: ${card.portfolioPriority}`);
    lines.push(`- Public display: ${card.publicDisplay}`);
    lines.push(`- Privacy / sensitivity risks: ${card.privacyRisk || "待确认"}`);
    lines.push(`- Confirmed: ${card.confirmed ? "yes" : "no"}`, "");
    lines.push("### Context", "", card.context || "待补充", "");
    lines.push("### User Role", "", card.role || "待补充", "");
    lines.push("### Actions", "", ...card.actions.map((item) => `- ${item}`), "");
    lines.push("### Evidence", "");
    lines.push("- Result metrics:", ...card.resultMetrics.map((item) => `  - ${item}`));
    lines.push("- Process metrics:", ...card.processMetrics.map((item) => `  - ${item}`));
    lines.push("- Quality metrics:", ...card.qualityMetrics.map((item) => `  - ${item}`), "");
    lines.push("### Capability Mapping", "", ...card.skills.map((item) => `- ${item}`), "");
    lines.push("### Outputs", "");
    lines.push(`- Resume bullet: ${card.resumeBullet || "待生成"}`);
    lines.push(`- Interview STAR: ${card.interviewStar || "待生成"}`);
    lines.push(`- Website / portfolio version: ${card.websiteVersion || "待生成"}`, "");
  }
  return lines.join("\n");
}

function projectCardsFromMining(result) {
  const sourceCards = Array.isArray(result?.projectCards) ? result.projectCards : [];
  return sourceCards.map((item, index) =>
    normalizeProjectCard({
      id: `ai-${index + 1}-${hashText(item.name || item.context || index)}`,
      name: item.name || `项目 ${index + 1}`,
      role: item.role || "",
      context: item.context || "",
      actions: item.actions || [],
      resultMetrics: item.evidence || [],
      skills: item.resumePotential ? [item.resumePotential] : [],
      resumeBullet: item.resumePotential || "",
      confirmed: false
    }, index)
  );
}

async function readUsageLedger() {
  const raw = await readText(path.join(dirs.system, usageLedgerFile), "");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function appendUsageLedger(entry) {
  await fs.writeFile(path.join(dirs.system, usageLedgerFile), `${JSON.stringify(entry)}\n`, { flag: "a" });
}

async function writeActionRun(run) {
  const file = `${run.id}.json`;
  await fs.writeFile(path.join(dirs.actionRuns, file), JSON.stringify(run, null, 2), "utf8");
  return { file, ...run };
}

async function listActionRuns() {
  return listJsonFiles(dirs.actionRuns);
}

async function startActionRun(stepId, context = {}) {
  const now = new Date().toISOString();
  const contract = actionContracts[stepId] || {};
  const run = {
    id: `${now.replace(/[:.]/g, "-")}-${slug(stepId)}`,
    userId: localUserId,
    stepId,
    status: "running",
    startedAt: now,
    contract,
    creditCost: contract.creditCost || 0,
    cacheHit: false,
    inputHash: hashText(JSON.stringify(context).slice(0, contract.maxInputChars || 24000)),
    error: null
  };
  return writeActionRun(run);
}

async function finishActionRun(run, patch = {}) {
  const next = {
    ...run,
    ...patch,
    status: patch.status || "done",
    endedAt: new Date().toISOString()
  };
  await writeActionRun(next);
  await appendUsageLedger({
    userId: localUserId,
    stepId: next.stepId,
    actionRunId: next.id,
    status: next.status,
    creditCost: next.status === "done" ? next.creditCost || 0 : 0,
    cacheHit: next.cacheHit || false,
    usage: next.usage || null,
    createdAt: next.endedAt
  });
  return next;
}

function done(results, stepId) {
  return Boolean(results?.[stepId]?.status === "done" || results?.[stepId]?.result);
}

function actionGate(stepId, context) {
  const results = context.llmResults || {};
  const hasResume = context.resumeMeta?.parseStatus === "parsed";
  const hasJd = Boolean(String(context.jdText || "").replace(/^# JD\s*/i, "").trim());
  const gates = {
    career_direction: [hasResume, "需要先上传并解析简历。"],
    project_mining: [done(results, "career_direction"), "需要先完成职业方向诊断。"],
    resume_strategy: [done(results, "project_mining"), "需要先完成项目证据提炼。"],
    resume_render: [done(results, "resume_strategy"), "需要先生成简历策略。"],
    jd_fit: [done(results, "career_direction") && hasJd, hasJd ? "需要先完成职业方向诊断。" : "需要先粘贴 JD。"],
    personal_site: [done(results, "project_mining") && done(results, "resume_strategy"), "需要先完成项目证据和简历策略。"]
  };
  const [allowed, reason] = gates[stepId] || [false, "未知 action。"];
  return {
    allowed: Boolean(allowed),
    reason: allowed ? "可运行" : reason,
    contract: actionContracts[stepId] || null
  };
}

async function buildOrchestratorState({ resumeMeta, llmResults, artifacts, intake, projectCards }) {
  const jdText = intake?.jd || "";
  let stage = "anonymous";
  if (resumeMeta?.parseStatus === "parsed") stage = "resume_parsed";
  if (done(llmResults, "career_direction")) stage = "diagnosis_ready";
  const answeredCount = (() => {
    try {
      return JSON.parse(intake?.careerDirectionAnswersJson || "{}").answeredCount || 0;
    } catch {
      return 0;
    }
  })();
  if (done(llmResults, "career_direction") && answeredCount > 0) stage = "direction_confirmed";
  if (done(llmResults, "project_mining") || projectCards.length) stage = "project_evidence_ready";
  if (done(llmResults, "resume_strategy")) stage = "resume_strategy_ready";
  if (done(llmResults, "resume_render") || artifacts?.resumeHtml) stage = "resume_ready";
  if (done(llmResults, "jd_fit")) stage = "jd_analyzed";
  if (done(llmResults, "personal_site") || artifacts?.personalSiteHtml) stage = "site_ready";

  const context = { resumeMeta, llmResults, jdText };
  const actions = Object.fromEntries(Object.keys(actionContracts).map((stepId) => [stepId, actionGate(stepId, context)]));
  return {
    userId: localUserId,
    stage,
    ...orchestratorStages[stage],
    actions,
    projectCards: {
      count: projectCards.length,
      confirmedCount: projectCards.filter((card) => card.confirmed).length
    }
  };
}

async function listLlmResults(dir) {
  const files = await fs.readdir(dir);
  const results = {};
  for (const file of files.filter((item) => item.endsWith(".json")).sort()) {
    const fullPath = path.join(dir, file);
    try {
      const item = JSON.parse(await fs.readFile(fullPath, "utf8"));
      results[item.stepId || file.replace(/\.json$/, "")] = { file, ...item };
    } catch {
      results[file.replace(/\.json$/, "")] = { file, status: "error" };
    }
  }
  return results;
}

async function artifactState() {
  const items = {};
  for (const [key, file] of Object.entries({
    resumeHtml: "resume.html",
    resumePdf: "resume.pdf",
    personalSiteHtml: "personal-site.html",
    renderReport: "render-report.json"
  })) {
    const fullPath = path.join(dirs.exports, file);
    try {
      const stat = await fs.stat(fullPath);
      items[key] = {
        file,
        url: `/exports/${file}?session=${encodeURIComponent(currentSessionId())}`,
        size: stat.size,
        updatedAt: stat.mtime.toISOString()
      };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      items[key] = null;
    }
  }
  return items;
}

async function buildWorkflowContext() {
  return {
    resumeText: await readText(path.join(dirs.uploads, "resume-extracted.txt")),
    profile: await readText(path.join(dirs.assets, "profile.md")),
    directions: await readText(path.join(dirs.assets, "directions.md")),
    keywords: await readText(path.join(dirs.assets, "keywords.md")),
    projects: await readText(path.join(dirs.assets, "projects.md")),
    skillsEvidence: await readText(path.join(dirs.assets, "skills-evidence.md")),
    resumeStories: await readText(path.join(dirs.assets, "resume-stories.md")),
    careerAnswers: await readText(path.join(dirs.intake, "career-direction-answers.md")),
    jdText: await readText(path.join(dirs.intake, "jd.md")),
    websiteBrief: await readText(path.join(dirs.assets, "website-brief.md"))
  };
}

async function getStepResult(stepId) {
  return readJsonFile(path.join(dirs.llmResults, `${stepId}.json`));
}

function formatJsonAsMarkdown(title, value) {
  return `# ${title}\n\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n`;
}

async function appendAsset(file, title, value) {
  const target = path.join(dirs.assets, file);
  const current = await readText(target, defaultAssets[file] || "");
  const block = `\n\n---\n\n## ${title}\n\n${typeof value === "string" ? value : `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``}\n`;
  await fs.writeFile(target, `${current.trim()}${block}`, "utf8");
}

async function applyStepToAssets(stepId, result) {
  if (stepId === "career_direction") {
    await appendAsset("profile.md", "LLM Career Direction Update", result.assetUpdates?.profile || result);
    await appendAsset("directions.md", "LLM Direction Ranking Update", result.assetUpdates?.directions || result.narratives || result);
    await appendAsset("keywords.md", "LLM Keyword Update", result.assetUpdates?.keywords || result.recommendedTrack || result);
  }
  if (stepId === "project_mining") {
    await appendAsset("projects.md", "LLM Project Mining Update", result.projectCards || result.priorityProjects || result);
    await appendAsset("skills-evidence.md", "LLM Skill Evidence Update", result.skillEvidence || result.metricPlan || result);
    const nextCards = projectCardsFromMining(result);
    if (nextCards.length) await writeProjectCards(nextCards);
  }
  if (stepId === "resume_strategy") {
    await appendAsset("resume-stories.md", "LLM Resume Strategy Update", result);
  }
  if (stepId === "jd_fit") {
    await appendAsset("jd-fit.md", "LLM JD Fit Update", result);
  }
  if (stepId === "personal_site") {
    await appendAsset("website-brief.md", "LLM Website Brief Update", result);
  }
}

async function runResumeRender() {
  const resumeStrategy = (await getStepResult("resume_strategy"))?.result;
  if (!resumeStrategy) throw new Error("Run resume strategy before rendering resume HTML.");
  const careerDirection = (await getStepResult("career_direction"))?.result || {};
  const projectMining = (await getStepResult("project_mining"))?.result || {};
  const resumeMeta = (await readJsonFile(path.join(dirs.uploads, "resume-meta.json"), {})) || {};
  const resumeText = await readText(path.join(dirs.uploads, "resume-extracted.txt"));
  const html = buildResumeHtml({ resumeStrategy, careerDirection, projectMining, resumeMeta, resumeText });
  const findings = inspectResumeHtml(html);
  const resumeHtmlPath = path.join(dirs.exports, "resume.html");
  const resumePdfPath = path.join(dirs.exports, "resume.pdf");
  await fs.writeFile(resumeHtmlPath, html, "utf8");
  const pdfResult = await renderPdfWithChrome(resumeHtmlPath, resumePdfPath);
  const allFindings = [...findings, ...pdfResult.findings];
  const report = {
    stepId: "resume_render",
    status: allFindings.length ? "warning" : "done",
    updatedAt: new Date().toISOString(),
    artifacts: { resumeHtml: "exports/resume.html", resumePdf: pdfResult.ok ? "exports/resume.pdf" : null },
    findings: allFindings
  };
  await fs.writeFile(path.join(dirs.exports, "render-report.json"), JSON.stringify(report, null, 2), "utf8");
  await fs.writeFile(path.join(dirs.llmResults, "resume_render.json"), JSON.stringify({ ...report, result: report }, null, 2), "utf8");
  return report;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (await pathExists(candidate)) return candidate;
  }
  return null;
}

async function renderPdfWithChrome(inputHtml, outputPdf) {
  const chrome = await findChrome();
  if (!chrome) {
    return { ok: false, findings: ["Chrome/Chromium not found; PDF export skipped. Set CHROME_PATH to enable PDF export."] };
  }
  const userDataDir = path.join(dirs.exports, ".chrome-profile");
  await fs.mkdir(userDataDir, { recursive: true });
  try {
    await execFileAsync(chrome, [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${userDataDir}`,
      `--print-to-pdf=${outputPdf}`,
      `file://${inputHtml}`
    ], { timeout: 30000 });
    return { ok: true, findings: [] };
  } catch (error) {
    return { ok: false, findings: [`PDF export failed: ${error.message}`] };
  }
}

async function runPersonalSiteRender(result) {
  const careerDirection = (await getStepResult("career_direction"))?.result || {};
  const resumeStrategy = (await getStepResult("resume_strategy"))?.result || {};
  const html = buildPersonalSiteHtml({ personalSite: result, careerDirection, resumeStrategy });
  await fs.writeFile(path.join(dirs.exports, "personal-site.html"), html, "utf8");
  return { personalSiteHtml: "exports/personal-site.html" };
}

const app = express();
app.use(express.json({ limit: "30mb" }));
const jobs = new Map();

function sessionMiddleware(req, res, next) {
  const sessionId = normalizeSessionId(req.get("X-Career-Session-Id") || req.query.session);
  const context = buildSessionContext(sessionId);
  res.setHeader("X-Career-Session-Id", context.sessionId);
  sessionStore.run(context, next);
}

app.use(["/api", "/exports"], sessionMiddleware);

app.get("/exports/:file", async (req, res, next) => {
  try {
    await ensureWorkspace();
    const file = path.basename(String(req.params.file || ""));
    if (!["resume.html", "resume.pdf", "personal-site.html", "render-report.json"].includes(file)) {
      throw new Error("Unsupported export file.");
    }
    res.sendFile(path.join(dirs.exports, file));
  } catch (error) {
    next(error);
  }
});

async function executeWorkflowStep(stepId) {
  let actionRun = null;
  try {
    await ensureWorkspace();
    if (!runnableSteps.has(stepId)) throw new Error(`Step is not runnable by LLM: ${stepId}`);
    const step = workflowSteps.find((item) => item.id === stepId);
    const llmResultsBefore = await listLlmResults(dirs.llmResults);
    const resumeMeta = await readJsonFile(path.join(dirs.uploads, "resume-meta.json"), null);
    const intake = {
      careerDirectionAnswersJson: await readText(path.join(dirs.intake, "career-direction-answers.json")),
      jd: await readText(path.join(dirs.intake, "jd.md"))
    };
    const gate = actionGate(stepId, { resumeMeta, llmResults: llmResultsBefore, jdText: intake.jd });
    if (!gate.allowed) throw new Error(gate.reason);
    const context = await buildWorkflowContext();
    actionRun = await startActionRun(stepId, context);

    if (stepId === "resume_render") {
      const result = await runResumeRender();
      const finishedRun = await finishActionRun(actionRun, { result, usage: null });
      const artifacts = await artifactState();
      return {
        ok: true,
        stepId,
        result,
        actionRun: finishedRun,
        artifacts,
        orchestrator: await buildOrchestratorState({
          resumeMeta,
          llmResults: await listLlmResults(dirs.llmResults),
          artifacts,
          intake,
          projectCards: await readProjectCards()
        })
      };
    }

    const messages = buildMessages(stepId, context);
    const startedAt = new Date().toISOString();
    const llmResponse = await callDeepSeek(rootDir, messages, { json: true, thinking: false });
    const result = parseJsonResult(llmResponse.content);
    const payload = {
      stepId,
      status: "done",
      createdAt: startedAt,
      updatedAt: new Date().toISOString(),
      model: llmResponse.model,
      usage: llmResponse.usage,
      result
    };
    await fs.writeFile(path.join(dirs.llmResults, `${stepId}.json`), JSON.stringify(payload, null, 2), "utf8");
    await applyStepToAssets(stepId, result);

    const resultName = `${new Date().toISOString().replace(/[:.]/g, "-")}-${slug(step.title)}.md`;
    await fs.writeFile(path.join(dirs.results, resultName), resultToMarkdown(step, result, { model: llmResponse.model, createdAt: startedAt }), "utf8");

    let generatedArtifacts = {};
    if (stepId === "personal_site") {
      generatedArtifacts = await runPersonalSiteRender(result);
    }

    const finishedRun = await finishActionRun(actionRun, { result, usage: llmResponse.usage });
    const artifacts = await artifactState();
    return {
      ok: true,
      stepId,
      result,
      resultFile: resultName,
      generatedArtifacts,
      actionRun: finishedRun,
      artifacts,
      orchestrator: await buildOrchestratorState({
        resumeMeta,
        llmResults: await listLlmResults(dirs.llmResults),
        artifacts,
        intake,
        projectCards: await readProjectCards()
      })
    };
  } catch (error) {
    if (actionRun) {
      await finishActionRun(actionRun, { status: "failed", error: error.message }).catch(() => {});
    }
    throw error;
  }
}

app.get("/api/state", async (_req, res, next) => {
  try {
    await ensureWorkspace();
    const assets = {};
    const assetStats = {};
    for (const [key, file] of Object.entries(assetFiles)) {
      const content = await readText(path.join(dirs.assets, file), defaultAssets[file] || "");
      assets[key] = content;
      assetStats[key] = assetProgress(file, content);
    }
    const resumeSource = await readText(path.join(dirs.uploads, "resume-source.md"));
    let resumeMeta = null;
    try {
      resumeMeta = JSON.parse(await fs.readFile(path.join(dirs.uploads, "resume-meta.json"), "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const intake = {
      careerDirectionAnswers: await readText(path.join(dirs.intake, "career-direction-answers.md")),
      careerDirectionAnswersJson: await readText(path.join(dirs.intake, "career-direction-answers.json")),
      jd: await readText(path.join(dirs.intake, "jd.md"))
    };
    const projectCards = await readProjectCards();
    const llmResults = await listLlmResults(dirs.llmResults);
    const artifacts = await artifactState();
    res.json({
      user: { id: localUserId, mode: "local_session_user", sessionId: currentSessionId() },
      workspaceDir: currentWorkspaceDir(),
      workspaceRootDir,
      assetFiles,
      workflowSteps,
      llm: await getLlmConfig(rootDir),
      assets,
      assetStats,
      resumeMeta,
      resumeSource,
      intake,
      projectCards,
      llmResults,
      artifacts,
      orchestrator: await buildOrchestratorState({ resumeMeta, llmResults, artifacts, intake, projectCards }),
      actionRuns: await listActionRuns(),
      usageLedger: await readUsageLedger(),
      tasks: await listJsonFiles(dirs.tasks),
      results: await listResultFiles(dirs.results)
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/orchestrator", async (_req, res, next) => {
  try {
    await ensureWorkspace();
    const artifacts = await artifactState();
    const llmResults = await listLlmResults(dirs.llmResults);
    const resumeMeta = await readJsonFile(path.join(dirs.uploads, "resume-meta.json"), null);
    const intake = {
      careerDirectionAnswersJson: await readText(path.join(dirs.intake, "career-direction-answers.json")),
      jd: await readText(path.join(dirs.intake, "jd.md"))
    };
    const projectCards = await readProjectCards();
    res.json({ ok: true, orchestrator: await buildOrchestratorState({ resumeMeta, llmResults, artifacts, intake, projectCards }) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/reset", async (_req, res, next) => {
  try {
    const result = await resetFlowState();
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});

app.post("/api/project-cards", async (req, res, next) => {
  try {
    await ensureWorkspace();
    const cards = await writeProjectCards(Array.isArray(req.body.cards) ? req.body.cards : []);
    res.json({ ok: true, cards });
  } catch (error) {
    next(error);
  }
});

app.post("/api/assets/:file", async (req, res, next) => {
  try {
    await ensureWorkspace();
    const file = safeAssetName(req.params.file);
    await fs.writeFile(path.join(dirs.assets, file), String(req.body.content || ""), "utf8");
    res.json({ ok: true, file });
  } catch (error) {
    next(error);
  }
});

app.post("/api/intake/resume", async (req, res, next) => {
  try {
    await ensureWorkspace();
    const fileName = path.basename(String(req.body.fileName || ""));
    const mimeType = String(req.body.mimeType || "");
    const base64 = String(req.body.base64 || "");

    if (!fileName) throw new Error("Missing resume file name.");
    if (!/\.(pdf|docx)$/i.test(fileName)) throw new Error("Only PDF and DOCX resumes are supported.");
    if (!base64) throw new Error("Missing resume file content.");

    const ext = path.extname(fileName).toLowerCase();
    const storedName = `resume-original${ext}`;
    const storedPath = path.join(dirs.uploads, storedName);
    const buffer = Buffer.from(base64, "base64");
    await fs.writeFile(storedPath, buffer);

    const parsed = await parseResumeFile(storedPath, ext);
    await fs.writeFile(path.join(dirs.uploads, "resume-extracted.txt"), parsed.text, "utf8");

    const meta = {
      originalName: fileName,
      storedName,
      mimeType,
      size: buffer.length,
      uploadedAt: new Date().toISOString(),
      parseStatus: "parsed",
      parser: parsed.parser,
      pageCount: parsed.pageCount,
      charCount: parsed.text.length,
      warnings: parsed.warnings
    };
    await fs.writeFile(path.join(dirs.uploads, "resume-meta.json"), JSON.stringify(meta, null, 2), "utf8");

    const content = `# Resume Source

## Uploaded File

- Original name: ${fileName}
- Stored file: uploads/${storedName}
- MIME type: ${mimeType || "unknown"}
- Size: ${buffer.length} bytes
- Uploaded at: ${meta.uploadedAt}

## Parse Status

已解析

## Notes

- Parser: ${parsed.parser}
- Page count: ${parsed.pageCount ?? "unknown"}
- Extracted characters: ${parsed.text.length}
- Warnings: ${parsed.warnings.length ? parsed.warnings.join("; ") : "none"}

## Extracted Resume Text

\`\`\`text
${parsed.text}
\`\`\`
`;
    await fs.writeFile(path.join(dirs.uploads, "resume-source.md"), content, "utf8");
    res.json({ ok: true, file: `uploads/${storedName}`, meta });
  } catch (error) {
    next(error);
  }
});

app.post("/api/intake/career-direction-answers", async (req, res, next) => {
  try {
    await ensureWorkspace();
    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    const savedAt = new Date().toISOString();
    const safeAnswers = answers.map((item, index) => ({
      id: String(item.id || `q${index + 1}`),
      question: String(item.question || ""),
      answer: String(item.answer || "").trim()
    }));
    const answeredCount = safeAnswers.filter((item) => item.answer).length;
    const markdown = `# Career Direction Answers

Saved at: ${savedAt}

${safeAnswers
  .map((item, index) => `## ${index + 1}. ${item.question || item.id}

${item.answer || "未回答"}
`)
  .join("\n")}
`;
    const json = {
      savedAt,
      answeredCount,
      answers: safeAnswers
    };
    await fs.writeFile(path.join(dirs.intake, "career-direction-answers.md"), markdown, "utf8");
    await fs.writeFile(path.join(dirs.intake, "career-direction-answers.json"), JSON.stringify(json, null, 2), "utf8");
    res.json({ ok: true, savedAt, answeredCount });
  } catch (error) {
    next(error);
  }
});

app.post("/api/intake/jd", async (req, res, next) => {
  try {
    await ensureWorkspace();
    const content = String(req.body.content || "").trim();
    await fs.writeFile(path.join(dirs.intake, "jd.md"), `# JD\n\n${content}\n`, "utf8");
    res.json({ ok: true, charCount: content.length });
  } catch (error) {
    next(error);
  }
});

app.post("/api/jobs/:stepId", async (req, res, next) => {
  try {
    await ensureWorkspace();
    const stepId = String(req.params.stepId || "");
    if (!runnableSteps.has(stepId)) throw new Error(`Step is not runnable by LLM: ${stepId}`);
    const jobContext = getSessionContext();
    const job = {
      id: `${new Date().toISOString().replace(/[:.]/g, "-")}-${slug(stepId)}-${crypto.randomUUID().slice(0, 8)}`,
      sessionId: jobContext.sessionId,
      stepId,
      status: "running",
      startedAt: new Date().toISOString(),
      endedAt: null,
      error: null,
      result: null
    };
    jobs.set(job.id, job);
    sessionStore.run(jobContext, () => {
      executeWorkflowStep(stepId)
        .then((result) => {
          jobs.set(job.id, { ...job, status: "done", endedAt: new Date().toISOString(), result });
        })
        .catch((error) => {
          jobs.set(job.id, { ...job, status: "failed", endedAt: new Date().toISOString(), error: error.message });
        });
    });
    res.json({ ok: true, job });
  } catch (error) {
    next(error);
  }
});

app.get("/api/jobs/:jobId", async (req, res, next) => {
  try {
    const job = jobs.get(String(req.params.jobId || ""));
    if (!job) throw new Error("Job not found. It may have been created before the server restarted.");
    if (job.sessionId && job.sessionId !== currentSessionId()) throw new Error("Job not found in this session.");
    res.json({ ok: true, job });
  } catch (error) {
    next(error);
  }
});

app.post("/api/steps/:stepId/run", async (req, res, next) => {
  try {
    const result = await executeWorkflowStep(String(req.params.stepId || ""));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/export/resume", async (_req, res, next) => {
  try {
    await ensureWorkspace();
    const result = await runResumeRender();
    res.json({ ok: true, result, artifacts: await artifactState() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/tasks", async (req, res, next) => {
  try {
    await ensureWorkspace();
    const now = new Date();
    const title = String(req.body.title || req.body.type || "task");
    const id = `${now.toISOString().replace(/[:.]/g, "-")}-${slug(title)}`;
    const task = {
      id,
      type: req.body.type || "manual",
      title,
      status: "pending",
      priority: req.body.priority || "normal",
      createdAt: now.toISOString(),
      instruction: req.body.instruction || "",
      inputFiles: req.body.inputFiles || [],
      expectedOutputs: req.body.expectedOutputs || [],
      userNotes: req.body.userNotes || ""
    };
    const file = `${id}.json`;
    await fs.writeFile(path.join(dirs.tasks, file), JSON.stringify(task, null, 2), "utf8");
    res.json({ ok: true, task: { file, ...task } });
  } catch (error) {
    next(error);
  }
});

app.post("/api/tasks/:file/status", async (req, res, next) => {
  try {
    await ensureWorkspace();
    const file = path.basename(req.params.file);
    if (!file.endsWith(".json")) throw new Error("Task file must be a JSON file.");
    const fullPath = path.join(dirs.tasks, file);
    const task = JSON.parse(await fs.readFile(fullPath, "utf8"));
    task.status = req.body.status || task.status;
    task.updatedAt = new Date().toISOString();
    await fs.writeFile(fullPath, JSON.stringify(task, null, 2), "utf8");
    res.json({ ok: true, task });
  } catch (error) {
    next(error);
  }
});

app.post("/api/results", async (req, res, next) => {
  try {
    await ensureWorkspace();
    const now = new Date().toISOString().replace(/[:.]/g, "-");
    const name = `${now}-${slug(req.body.name || "result")}.md`;
    const content = String(req.body.content || "");
    await fs.writeFile(path.join(dirs.results, name), content, "utf8");
    res.json({ ok: true, file: name });
  } catch (error) {
    next(error);
  }
});

const distDir = path.join(rootDir, "dist");
app.use(express.static(distDir));
app.get(/.*/, async (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/exports/")) return next();
  try {
    res.sendFile(path.join(distDir, "index.html"));
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  res.status(400).json({ ok: false, error: error.message });
});

const port = Number(process.env.PORT || 5174);
const host = process.env.HOST || "127.0.0.1";
app.listen(port, host, () => {
  console.log(`Career asset app running at http://${host}:${port}`);
  console.log(`Workspace root: ${workspaceRootDir}`);
});
