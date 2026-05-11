import "./localEnv.js";
import express from "express";
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
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
const authCookieName = process.env.AUTH_COOKIE_NAME || "career_web_auth";
const authSessionSecret = process.env.AUTH_SESSION_SECRET || process.env.SESSION_SECRET || "career-web-local-dev-secret";
const authRequireLogin = process.env.AUTH_REQUIRE_LOGIN === "true";
const appOrigin = (process.env.APP_ORIGIN || process.env.PUBLIC_BASE_URL || "http://127.0.0.1:5174").replace(/\/$/, "");
const phoneLoginEnabled = process.env.PHONE_LOGIN_ENABLED !== "false";
const smsCodeTtlSeconds = Math.max(60, Number(process.env.SMS_CODE_TTL_SECONDS || 600));
const smsCodeResendSeconds = Math.max(10, Number(process.env.SMS_CODE_RESEND_SECONDS || 60));
const smsDevLoginEnabled = process.env.SMS_DEV_LOGIN_ENABLED === "true" || (process.env.NODE_ENV !== "production" && process.env.SMS_DEV_LOGIN_ENABLED !== "false");
const smsDevCode = String(process.env.SMS_DEV_CODE || "123456").replace(/\D/g, "").slice(0, 6) || "123456";
const aliyunSmsProvider = process.env.ALIYUN_SMS_PROVIDER || "aliyun_verify";
const aliyunSmsConfig = {
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || "",
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || "",
  provider: aliyunSmsProvider,
  signName: process.env.ALIYUN_SMS_SIGN_NAME || "速通互联验证码",
  templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || "100001",
  templateParam: process.env.ALIYUN_SMS_TEMPLATE_PARAM || JSON.stringify({ code: "##code##", min: String(Math.ceil(smsCodeTtlSeconds / 60)) }),
  regionId: process.env.ALIYUN_SMS_REGION_ID || "cn-hangzhou",
  endpoint: process.env.ALIYUN_SMS_ENDPOINT || (aliyunSmsProvider === "aliyun_dysms" ? "https://dysmsapi.aliyuncs.com" : "https://dypnsapi.aliyuncs.com")
};
const wechatConfig = {
  enabled: process.env.WECHAT_LOGIN_ENABLED === "true",
  appId: process.env.WECHAT_APP_ID || "",
  appSecret: process.env.WECHAT_APP_SECRET || "",
  redirectUri: process.env.WECHAT_REDIRECT_URI || `${appOrigin}/api/auth/wechat/callback`
};
const devLoginEnabled = process.env.AUTH_DEV_LOGIN_ENABLED === "true" || (process.env.NODE_ENV !== "production" && !wechatConfig.enabled);

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === false) return [];
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (typeof value === "object") return Object.values(value).filter((item) => item !== undefined && item !== null && item !== "");
  return [value];
}

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

function hashStableId(value, prefix = "id") {
  return `${prefix}_${crypto.createHash("sha256").update(String(value || "anonymous")).digest("hex").slice(0, 32)}`;
}

function normalizeSessionId(value) {
  const raw = String(value || "").trim();
  if (/^[a-zA-Z0-9_-]{12,80}$/.test(raw)) return raw;
  return "anonymous-session";
}

function buildSessionContext(sessionId, auth = null) {
  const authIdentity = auth?.phoneHash || auth?.unionid || auth?.openid || auth?.userId || "";
  const safeSessionId = authIdentity ? hashStableId(authIdentity, auth.provider || "user") : normalizeSessionId(sessionId);
  const workspaceDir = path.join(workspaceRootDir, "sessions", safeSessionId);
  return {
    sessionId: safeSessionId,
    userId: authIdentity ? safeSessionId : "local-user",
    auth: authIdentity ? {
      provider: auth.provider || "wechat",
      openid: auth.openid || "",
      unionid: auth.unionid || "",
      phoneHash: auth.phoneHash || "",
      maskedPhone: auth.maskedPhone || "",
      nickname: auth.nickname || "",
      avatar: auth.avatar || "",
      loginAt: auth.loginAt || ""
    } : null,
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

function currentUserId() {
  return getSessionContext().userId || "local-user";
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

function parseCookies(header = "") {
  return Object.fromEntries(
    String(header || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index === -1) return [part, ""];
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function signValue(value) {
  return crypto.createHmac("sha256", authSessionSecret).update(String(value || "")).digest("base64url");
}

function encodeSignedCookie(value) {
  return `${value}.${signValue(value)}`;
}

function decodeSignedCookie(value) {
  const raw = String(value || "");
  const index = raw.lastIndexOf(".");
  if (index <= 0) return "";
  const payload = raw.slice(0, index);
  const signature = raw.slice(index + 1);
  const expected = signValue(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return "";
  return payload;
}

function setAuthCookie(res, sessionId) {
  const secure = appOrigin.startsWith("https://") || process.env.AUTH_COOKIE_SECURE === "true";
  res.setHeader("Set-Cookie", [
    `${authCookieName}=${encodeURIComponent(encodeSignedCookie(sessionId))}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
    `Max-Age=${60 * 60 * 24 * 30}`
  ].filter(Boolean).join("; "));
}

function clearAuthCookie(res) {
  res.setHeader("Set-Cookie", `${authCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function authDir() {
  return path.join(workspaceRootDir, "auth");
}

async function ensureAuthStore() {
  await fs.mkdir(authDir(), { recursive: true });
  await fs.writeFile(path.join(authDir(), ".gitkeep"), "", { flag: "a" });
}

async function readAuthJson(file, fallback) {
  await ensureAuthStore();
  try {
    return JSON.parse(await fs.readFile(path.join(authDir(), file), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeAuthJson(file, value) {
  await ensureAuthStore();
  await fs.writeFile(path.join(authDir(), file), JSON.stringify(value, null, 2), "utf8");
}

async function readAuthSession(req) {
  const signed = parseCookies(req.headers.cookie || "")[authCookieName];
  const sessionId = decodeSignedCookie(signed);
  if (!sessionId) return null;
  const sessions = await readAuthJson("sessions.json", {});
  const session = sessions[sessionId];
  if (!session || Date.parse(session.expiresAt || "") < Date.now()) return null;
  return session;
}

async function createAuthSession(profile) {
  const sessions = await readAuthJson("sessions.json", {});
  const sessionId = crypto.randomUUID().replace(/-/g, "");
  const now = new Date();
  const session = {
    id: sessionId,
    provider: profile.provider || "phone",
    userId: profile.userId || "",
    openid: profile.openid || "",
    unionid: profile.unionid || "",
    phoneHash: profile.phoneHash || "",
    maskedPhone: profile.maskedPhone || "",
    nickname: profile.nickname || "",
    avatar: profile.avatar || "",
    loginAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30).toISOString()
  };
  sessions[sessionId] = session;
  await writeAuthJson("sessions.json", sessions);
  return session;
}

async function deleteAuthSession(req) {
  const signed = parseCookies(req.headers.cookie || "")[authCookieName];
  const sessionId = decodeSignedCookie(signed);
  if (!sessionId) return;
  const sessions = await readAuthJson("sessions.json", {});
  delete sessions[sessionId];
  await writeAuthJson("sessions.json", sessions);
}

function publicReturnPath(value = "") {
  const raw = String(value || "/").trim() || "/";
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      return `${url.pathname}${url.search}${url.hash}` || "/";
    } catch {
      return "/";
    }
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function wechatConfigured() {
  return Boolean(wechatConfig.enabled && wechatConfig.appId && wechatConfig.appSecret && wechatConfig.redirectUri);
}

function aliyunSmsConfigured() {
  return Boolean(aliyunSmsConfig.accessKeyId && aliyunSmsConfig.accessKeySecret && aliyunSmsConfig.signName && aliyunSmsConfig.templateCode);
}

function aliyunVerifyConfigured() {
  return Boolean(aliyunSmsConfigured() && aliyunSmsConfig.provider === "aliyun_verify");
}

function normalizeMainlandPhone(value) {
  const phone = String(value || "").replace(/[^\d]/g, "");
  if (!/^1[3-9]\d{9}$/.test(phone)) throw new Error("请输入有效的中国大陆手机号。");
  return phone;
}

function maskPhone(phone) {
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function generateSmsCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function smsCodeHash(phone, code) {
  return crypto.createHmac("sha256", authSessionSecret).update(`${phone}:${code}`).digest("hex");
}

function aliyunPercentEncode(value) {
  return encodeURIComponent(String(value))
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmacSha256Hex(secret, value) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function buildAliyunAuthorization({ method, pathname, host, query, headers, body = "" }) {
  const sortedQuery = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== "")
    .sort(([a], [b]) => a.localeCompare(b));
  const canonicalQuery = sortedQuery
    .map(([key, value]) => `${aliyunPercentEncode(key)}=${aliyunPercentEncode(value)}`)
    .join("&");

  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers)
      .map(([key, value]) => [key.toLowerCase(), String(value).trim()])
      .sort(([a], [b]) => a.localeCompare(b))
  );
  normalizedHeaders.host = host;
  const signedHeaderNames = Object.keys(normalizedHeaders).sort();
  const signedHeaders = signedHeaderNames.join(";");
  const canonicalHeaders = signedHeaderNames.map((key) => `${key}:${normalizedHeaders[key]}\n`).join("");
  const payloadHash = normalizedHeaders["x-acs-content-sha256"] || sha256Hex(body);
  const canonicalRequest = [
    method.toUpperCase(),
    pathname || "/",
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");
  const stringToSign = `ACS3-HMAC-SHA256\n${sha256Hex(canonicalRequest)}`;
  const signature = hmacSha256Hex(aliyunSmsConfig.accessKeySecret, stringToSign);
  return {
    authorization: `ACS3-HMAC-SHA256 Credential=${aliyunSmsConfig.accessKeyId},SignedHeaders=${signedHeaders},Signature=${signature}`,
    canonicalQuery,
    payloadHash
  };
}

async function sendAliyunSmsCode(phone, code) {
  if (!aliyunSmsConfigured()) {
    throw new Error("阿里云短信服务未配置。请设置 AccessKey、短信签名和模板 Code。");
  }
  if (aliyunSmsConfig.provider !== "aliyun_dysms") {
    throw new Error("当前短信提供方不是普通短信服务。请使用短信认证接口发送验证码。");
  }

  const endpoint = new URL(aliyunSmsConfig.endpoint);
  const method = "GET";
  const pathname = endpoint.pathname && endpoint.pathname !== "/" ? endpoint.pathname : "/";
  const query = {
    RegionId: aliyunSmsConfig.regionId,
    PhoneNumbers: phone,
    SignName: aliyunSmsConfig.signName,
    TemplateCode: aliyunSmsConfig.templateCode,
    TemplateParam: JSON.stringify({ code })
  };
  const headers = {
    host: endpoint.host,
    "x-acs-action": "SendSms",
    "x-acs-version": "2017-05-25",
    "x-acs-date": new Date().toISOString().replace(/\..+/, "Z"),
    "x-acs-signature-nonce": crypto.randomUUID(),
    "x-acs-content-sha256": sha256Hex("")
  };
  const signed = buildAliyunAuthorization({ method, pathname, host: endpoint.host, query, headers });
  const url = `${endpoint.origin}${pathname}?${signed.canonicalQuery}`;
  const response = await fetch(url, {
    method,
    headers: {
      ...headers,
      Authorization: signed.authorization
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.Code !== "OK") {
    throw new Error(`阿里云短信发送失败：${data.Message || data.Code || response.statusText}`);
  }
  return data;
}

async function callAliyunVerifyApi(action, query) {
  if (!aliyunVerifyConfigured()) {
    throw new Error("阿里云短信认证未配置。请设置 AccessKey，并使用短信认证赠送签名和模板。");
  }

  const endpoint = new URL(aliyunSmsConfig.endpoint);
  const method = "GET";
  const pathname = endpoint.pathname && endpoint.pathname !== "/" ? endpoint.pathname : "/";
  const headers = {
    host: endpoint.host,
    "x-acs-action": action,
    "x-acs-version": "2017-05-25",
    "x-acs-date": new Date().toISOString().replace(/\..+/, "Z"),
    "x-acs-signature-nonce": crypto.randomUUID(),
    "x-acs-content-sha256": sha256Hex("")
  };
  const signed = buildAliyunAuthorization({ method, pathname, host: endpoint.host, query, headers });
  const url = `${endpoint.origin}${pathname}?${signed.canonicalQuery}`;
  const response = await fetch(url, {
    method,
    headers: {
      ...headers,
      Authorization: signed.authorization
    }
  });
  const data = await response.json().catch(() => ({}));
  if (action === "CheckSmsVerifyCode" && data.Code === "isv.ValidateFail") {
    return { ...data, Success: true, Model: { ...(data.Model || {}), VerifyResult: "UNKNOWN" } };
  }
  if (!response.ok || data.Code !== "OK" || data.Success === false) {
    throw new Error(`阿里云短信认证失败：${data.Message || data.Code || response.statusText}`);
  }
  return data;
}

async function sendAliyunVerifyCode(phone) {
  const data = await callAliyunVerifyApi("SendSmsVerifyCode", {
    RegionId: aliyunSmsConfig.regionId,
    CountryCode: "86",
    PhoneNumber: phone,
    SignName: aliyunSmsConfig.signName,
    TemplateCode: aliyunSmsConfig.templateCode,
    TemplateParam: aliyunSmsConfig.templateParam,
    CodeType: 1,
    CodeLength: 6,
    ValidTime: smsCodeTtlSeconds,
    Interval: smsCodeResendSeconds,
    DuplicatePolicy: 1,
    ReturnVerifyCode: false
  });
  return data;
}

async function checkAliyunVerifyCode(phone, code) {
  const data = await callAliyunVerifyApi("CheckSmsVerifyCode", {
    RegionId: aliyunSmsConfig.regionId,
    CountryCode: "86",
    PhoneNumber: phone,
    VerifyCode: code,
    CaseAuthPolicy: 1
  });
  const result = data?.Model?.VerifyResult;
  if (result !== "PASS") {
    throw new Error("验证码不正确。");
  }
  return data;
}

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
    emptyDirectory(dirs.uploads),
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
    resumeMeta: null,
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
    userId: currentUserId(),
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
    userId: currentUserId(),
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

function countMatches(text, patterns) {
  return patterns.reduce((count, pattern) => count + (String(text || "").match(pattern) || []).length, 0);
}

function countAnsweredAnswers(raw, round = "") {
  try {
    const parsed = JSON.parse(raw || "{}");
    return asArray(parsed.answers).filter((item) => {
      const answer = String(item?.answer || "").trim();
      if (!answer || answer === "未回答") return false;
      if (!round) return true;
      return !item?.round || item.round === round;
    }).length;
  } catch {
    return 0;
  }
}

function hasUserAnsweredCareerQuestions(context) {
  const answered = countAnsweredAnswers(context?.careerAnswersJson, "direction");
  if (answered > 0) return true;
  const markdown = String(context?.careerAnswers || "");
  return markdown
    .split("\n")
    .some((line) => line.trim() && !/^#|Saved at:|未回答$/i.test(line.trim()));
}

function resumeHasEnoughEvidenceForSkippingInterview(context, resumeMeta) {
  const text = String(context?.resumeText || "");
  const charCount = Number(resumeMeta?.charCount || text.length || 0);
  const structureSignals = countMatches(text, [
    /工作经历|项目经历|实习经历|职业经历|Experience|Projects|Employment/gi
  ]);
  const actionSignals = countMatches(text, [
    /负责|主导|推动|搭建|设计|上线|优化|增长|转化|留存|交付|协作|管理|复盘|落地|built|led|launched|improved|owned|designed/gi
  ]);
  const metricSignals = countMatches(text, [
    /\d+(\.\d+)?\s*(%|万|千|k|K|w|W|人|次|元|月|天|年|倍|小时|分钟|DAU|MAU|GMV|ROI|CTR|CVR)/g
  ]);
  return charCount >= 1800 && structureSignals >= 1 && actionSignals >= 6 && metricSignals >= 2;
}

function scoreMeetsThreshold(result) {
  const score = result?.score || {};
  const total = Number(score.total);
  const threshold = Number(score.threshold);
  if (!Number.isFinite(total) || !Number.isFinite(threshold)) return false;
  const hasBlockingDimension = asArray(score.dimensions).some((dimension) => {
    if (dimension?.blocking !== true) return false;
    const dimensionScore = Number(dimension.score);
    const dimensionMax = Number(dimension.max);
    if (!Number.isFinite(dimensionScore) || !Number.isFinite(dimensionMax)) return true;
    return dimensionScore < dimensionMax;
  });
  return total >= threshold && !hasBlockingDimension;
}

function scoreIsBelowThreshold(result) {
  const score = result?.score || {};
  const total = Number(score.total);
  const threshold = Number(score.threshold);
  return Number.isFinite(total) && Number.isFinite(threshold) && total < threshold;
}

function projectEvidenceLooksSufficient(result) {
  const projects = [
    ...asArray(result?.priorityProjects),
    ...asArray(result?.projectCards)
  ];
  if (projects.length >= 2) return true;
  const serialized = JSON.stringify(result || "");
  const missingSignals = countMatches(serialized, [/缺失|不足|待确认|missing|unclear|unknown/gi]);
  const metricSignals = countMatches(serialized, [/\d+(\.\d+)?\s*(%|万|千|k|K|w|W|人|次|元|月|天|年|倍|DAU|MAU|GMV|ROI|CTR|CVR)/g]);
  return projects.length >= 1 && metricSignals >= 2 && missingSignals <= 1;
}

function projectEvidenceNeedsUser(result) {
  const directQuestions = asArray(result?.questions).length;
  const priorityGaps = asArray(result?.priorityProjects).some((project) =>
    asArray(project?.missing).length || asArray(project?.questions).length
  );
  const skillGaps = asArray(result?.skillEvidence).some((item) =>
    /weak|missing/i.test(String(item?.evidenceStrength || "")) || String(item?.missing || "").trim()
  );
  const lifeQuestions = asArray(result?.lifeExperienceQuestions).length;
  const reason = String(result?.readiness?.reason || result?.nextStep || "");
  const textualGaps = /需要确认|待确认|缺失|不足|边界|口径|missing|unclear|unknown/i.test(reason);
  return Boolean(directQuestions || priorityGaps || skillGaps || lifeQuestions || textualGaps);
}

function stepNeedsUser(results, stepId, intake = null) {
  const result = results?.[stepId]?.result;
  if (scoreMeetsThreshold(result)) return false;
  if (!result?.readiness?.shouldAskUser) return false;
  const round = roundByStepId[stepId];
  if (round && intake) {
    const roundState = buildInterviewRoundState(round, results, intake);
    if (roundState.openCount === 0 && roundState.answeredCount > 0) return false;
  }
  return true;
}

function resultRecommended(results, stepId, actions) {
  return actions.includes(recommendedNextAction(results, stepId));
}

function actionableResumeStrategyQuestions(result) {
  return [
    ...asArray(result?.questions),
    ...asArray(result?.pendingQuestions)
  ].filter(questionLooksUsefulForResumeStrategy);
}

function resumeStrategyHasBlockingGaps(result) {
  if (scoreMeetsThreshold(result) && hasPublicResumeSource(result)) return false;
  const hasActionableQuestions = actionableResumeStrategyQuestions(result).length > 0;
  return Boolean(
    result?.readiness?.shouldAskUser ||
      hasActionableQuestions ||
      !hasPublicResumeSource(result)
  );
}

function fallbackDirectionQuestions() {
  return [
    {
      id: "current_track_or_change",
      question: "你目前还打算继续求职这个方向吗？如果想调整方向，想靠近什么；如果仍然继续，最想换掉当前工作的哪一部分？",
      why: "先确认真实求职方向，再判断后面应该保留哪些经历、弱化哪些叙事。"
    },
    {
      id: "wants_strengths_weaknesses",
      question: "把过去的工作放在一起看：你最想继续做的是什么，你明显擅长什么；又有哪些事虽然能做，但不想长期做或做起来很消耗？",
      why: "第一轮要把想做、擅长、不擅长、不想做分开，避免只按简历上的岗位标签判断你。"
    },
    {
      id: "evidence_to_verify",
      question: "如果只挑一个你觉得最能代表自己的经历，不一定写在简历里，它是什么？可以是工作项目，也可以是和目标岗位相关的生活经历、作品、游戏/社区/AI 工具实践。",
      why: "很多关键证据不在简历里。这里是在找能支撑职业叙事的真实素材，而不是让你自己总结优势。"
    }
  ];
}

function fallbackProjectQuestions() {
  return [
    {
      id: "project_before_after",
      question: "挑一个最重要的项目，按“前后对比”说清楚：做之前是什么状态，做之后哪一个指标、效率、质量、使用人数或协作方式发生了变化？",
      why: "简历需要可信变化，而不是只写做了什么。没有结果指标时，也可以先找过程指标或质量指标。"
    },
    {
      id: "project_role_boundary",
      question: "这个项目里，哪些判断是你做的？哪些事情是你推动别人一起完成的？哪些只是你参与执行的？",
      why: "这是为了确认角色边界，避免把团队结果写成个人 claim，也避免低估你的真实贡献。"
    },
    {
      id: "project_hard_tradeoff",
      question: "这个项目里最难的取舍是什么？比如资源不够、目标不清、跨团队阻力、数据不好看、上线风险、用户不买账，你当时怎么判断？",
      why: "真正有区分度的能力通常藏在取舍里，而不是藏在职责列表里。"
    }
  ];
}

function fallbackResumeGapQuestions() {
  return [
    {
      id: "resume_metric_evidence",
      question: "如果只补一类最能写进简历的数据，你能补哪一种：效率提升、准确率变化、覆盖规模、采用人数、内容/交易规模、人工成本下降，还是只能先写过程指标？",
      why: "简历证据补充只追能改变简历 bullet 说服力的指标口径；没有结果指标时，也要找到最可信的过程指标。",
      relatedAssetField: "resumeStories",
      blocksWhichDecision: "简历 bullet 的强弱和指标写法",
      expectedAnswerType: "metric",
      evidenceAnchor: "简历关键项目",
      targetScoreDimension: "数据指标说服力",
      expectedScoreGain: 12
    },
    {
      id: "resume_public_link_asset",
      question: "有没有可以放进简历或作品区的公开材料：作品集、GitHub、Demo、文章、产品页或可脱敏项目链接？没有也可以直接说没有。",
      why: "公开链接不是必须，但如果存在，会明显提高作品和项目的可信度；如果没有，就不强行包装。",
      relatedAssetField: "resumeStories",
      blocksWhichDecision: "个人作品和公开边界",
      expectedAnswerType: "boundary",
      evidenceAnchor: "作品或可公开材料",
      targetScoreDimension: "作品/链接资产",
      expectedScoreGain: 8
    }
  ];
}

const questionDefaultsByStep = {
  career_direction: {
    prefix: "direction_question",
    relatedAssetField: "directions",
    blocksWhichDecision: "是否继续当前职业轨道，还是验证转向",
    expectedAnswerType: "preference"
  },
  project_mining: {
    prefix: "project_question",
    relatedAssetField: "projects",
    blocksWhichDecision: "项目是否可以写成可信简历证据",
    expectedAnswerType: "fact"
  },
  resume_strategy: {
    prefix: "resume_gap_question",
    relatedAssetField: "resumeStories",
    blocksWhichDecision: "是否允许生成正式简历预览",
    expectedAnswerType: "metric"
  }
};

const interviewRoundConfig = {
  direction: {
    stepId: "career_direction",
    askAction: "ask_direction_questions",
    nextActionWhenComplete: "run_project_mining",
    maxQuestions: 3
  },
  projects: {
    stepId: "project_mining",
    askAction: "ask_project_questions",
    nextActionWhenComplete: "run_resume_strategy",
    maxQuestions: 4
  },
  gaps: {
    stepId: "resume_strategy",
    askAction: "ask_resume_gap_questions",
    nextActionWhenComplete: "render_resume",
    maxQuestions: 2
  }
};

const roundByStepId = Object.fromEntries(Object.entries(interviewRoundConfig).map(([round, config]) => [config.stepId, round]));

const allowedQuestionAssetFields = new Set(["profile", "directions", "keywords", "projects", "skillsEvidence", "resumeStories", "publicBoundary"]);
const allowedAnswerTypes = new Set(["fact", "metric", "preference", "constraint", "boundary", "correction"]);

function normalizeQuestionForStep(stepId, item, index) {
  const defaults = questionDefaultsByStep[stepId] || questionDefaultsByStep.career_direction;
  const source = typeof item === "string" ? { question: item } : { ...(item || {}) };
  const question = String(source.question || source.text || "").trim();
  if (!question) return null;
  const relatedAssetField = allowedQuestionAssetFields.has(source.relatedAssetField) ? source.relatedAssetField : defaults.relatedAssetField;
  const expectedAnswerType = allowedAnswerTypes.has(source.expectedAnswerType) ? source.expectedAnswerType : defaults.expectedAnswerType;
  return {
    id: String(source.id || `${defaults.prefix}_${index + 1}`)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "") || `${defaults.prefix}_${index + 1}`,
    question,
    why: String(source.why || source.whyNeeded || "这个问题会影响下一步判断。").trim(),
    whyNeeded: String(source.whyNeeded || source.why || "这个问题会影响下一步判断。").trim(),
    relatedAssetField,
    blocksWhichDecision: String(source.blocksWhichDecision || defaults.blocksWhichDecision).trim(),
    expectedAnswerType,
    evidenceAnchor: String(source.evidenceAnchor || "暂无明确锚点").trim(),
    isRequired: source.isRequired === false ? false : true,
    placeholder: String(source.placeholder || "写事实、边界或真实判断即可，不需要自己包装。").trim()
  };
}

function questionLooksLikeDocumentProofRequest(question) {
  const text = String(question?.question || question || "");
  return /需求文档|设计稿|截图|证明.*独立负责|证明材料|审核界面|结果展示.*设计|PRD.*证明/i.test(text);
}

function questionLooksUsefulForResumeStrategy(question) {
  const text = String(question?.question || question || "");
  if (questionLooksLikeDocumentProofRequest(text)) return false;
  return /指标|数据|效率|准确率|覆盖|规模|人数|采用|反馈|留存|转化|成本|流水|收入|前后|变化|复核|错误|人工|GitHub|作品集|Demo|文章|产品页|链接|公开|脱敏|bullet|口径|claim|强弱/i.test(text);
}

function sanitizeQuestionsForStep(stepId, questions) {
  const normalized = asArray(questions);
  if (stepId !== "resume_strategy") return normalized;
  return normalized.filter(questionLooksUsefulForResumeStrategy);
}

function normalizeQuestionsForStep(stepId, questions) {
  return sanitizeQuestionsForStep(stepId, questions)
    .map((item, index) => normalizeQuestionForStep(stepId, item, index))
    .filter(Boolean)
    .slice(0, interviewRoundConfig[roundByStepId[stepId]]?.maxQuestions || 3);
}

function parseAnswerItems(raw) {
  try {
    return asArray(JSON.parse(raw || "{}")?.answers)
      .map((item) => ({
        id: String(item?.id || "").trim(),
        round: String(item?.round || "").trim(),
        question: String(item?.question || "").trim(),
        answer: String(item?.answer || "").trim()
      }))
      .filter((item) => item.id || item.question || item.answer);
  } catch {
    return [];
  }
}

function answeredItemsForRound(raw, round) {
  return parseAnswerItems(raw).filter((item) => item.round === round && item.answer);
}

function normalizedQuestionKey(value) {
  return String(value || "").trim().replace(/\s+/g, "");
}

function unansweredQuestionsForRound(questions, raw, round) {
  const answered = answeredItemsForRound(raw, round);
  const answeredIds = new Set(answered.map((item) => item.id).filter(Boolean));
  const answeredQuestions = new Set(answered.map((item) => normalizedQuestionKey(item.question)).filter(Boolean));
  return asArray(questions).filter((item) => {
    const id = String(item?.id || "").trim();
    const question = normalizedQuestionKey(item?.question);
    return !(id && answeredIds.has(id)) && !(question && answeredQuestions.has(question));
  });
}

function applyRoundQuestionLimit(stepId, result, context) {
  const round = roundByStepId[stepId];
  const config = interviewRoundConfig[round];
  if (!round || !config) return result;
  const next = { ...(result || {}) };
  if (scoreMeetsThreshold(next)) {
    return applyDeterministicReadiness(next, {
      action: config.nextActionWhenComplete,
      shouldAskUser: false,
      reason: `本轮评分已达到 ${next.score?.threshold || "目标"}，不再追加问题。`
    });
  }
  const shouldAsk = next.readiness?.shouldAskUser || recommendedActionFromResult(next) === config.askAction || asArray(next.questions).length > 0;
  if (!shouldAsk) return next;
  const answeredCount = answeredItemsForRound(context?.careerAnswersJson, round).length;
  const remaining = Math.max(0, config.maxQuestions - answeredCount);
  next.questions = unansweredQuestionsForRound(next.questions, context?.careerAnswersJson, round).slice(0, remaining);
  if (remaining <= 0 || next.questions.length === 0) {
    const roundLabel = round === "direction" ? "一" : round === "projects" ? "二" : "三";
    return applyDeterministicReadiness(next, {
      action: config.nextActionWhenComplete,
      shouldAskUser: false,
      reason: remaining <= 0
        ? `第 ${roundLabel} 轮已达到 ${config.maxQuestions} 个问题上限，流程进入下一步。`
        : `第 ${roundLabel} 轮没有新的未回答问题，已有回答足够进入下一步。`
    });
  }
  next.readiness = {
    ...(next.readiness || {}),
    informationSufficient: false,
    shouldAskUser: true,
    recommendedNextAction: config.askAction,
    reason: next.readiness?.reason || `本轮还剩 ${remaining} 个可追问名额，只保留会影响判断的问题。`
  };
  return next;
}

function recommendedActionFromResult(result) {
  return String(result?.readiness?.recommendedNextAction || "");
}

function applyDeterministicReadiness(result, { action, shouldAskUser, reason }) {
  const next = { ...(result || {}) };
  next.readiness = {
    ...(next.readiness || {}),
    informationSufficient: !shouldAskUser,
    shouldAskUser,
    recommendedNextAction: action,
    reason: reason || next.readiness?.reason || "由产品编排器基于当前资产完整度确认。"
  };
  if (!shouldAskUser) next.questions = [];
  return next;
}

function hasPublicResumeSource(result) {
  const publicResume = result?.publicResume || {};
  return Boolean(
    publicResume?.headline ||
    asArray(publicResume?.summary).length ||
    asArray(publicResume?.experiences).length ||
    asArray(publicResume?.projects).length ||
    asArray(result?.bullets).length
  );
}

function forceAsk(result, { action, reason, questions }) {
  const next = { ...(result || {}) };
  next.readiness = {
    ...(next.readiness || {}),
    informationSufficient: false,
    confidence: next.readiness?.confidence || "low",
    shouldAskUser: true,
    recommendedNextAction: action,
    reason
  };
  const existingQuestions = asArray(next.questions).filter((item) => item?.question);
  next.questions = existingQuestions.length ? existingQuestions : questions;
  return next;
}

function sanitizeUnconfirmedRoleClaims(value, sourceText) {
  const hasLeadEvidence = /主导|负责人|owner|owned|led/i.test(String(sourceText || ""));
  const sanitizeText = (text) => {
    let next = String(text || "");
    if (!hasLeadEvidence) {
      next = next
        .replace(/近期主导了/g, "近期参与/推动了")
        .replace(/主导过/g, "参与/推动过")
        .replace(/主导了/g, "参与/推动了");
    }
    return next
      .replace(/资深/g, "")
      .replace(/专家/g, "方向")
      .replace(/领军/g, "")
      .replace(/顶尖/g, "");
  };
  if (typeof value === "string") return sanitizeText(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeUnconfirmedRoleClaims(item, sourceText));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeUnconfirmedRoleClaims(item, sourceText)]));
  }
  return value;
}

function fallbackMirrorCard(result) {
  const headline = String(result?.headline || result?.judgment || "这一轮已经补充了重要信息。");
  const advice = result?.adviceCard || {};
  const keywordSources = [
    result?.recommendedTrack,
    result?.assetUpdates?.keywords,
    ...asArray(result?.keywordOrder),
    ...asArray(result?.narratives).map((item) => item?.title),
    ...asArray(result?.skillEvidence).map((item) => item?.skill)
  ];
  const userKeywords = keywordSources
    .flatMap((item) => String(item || "").split(/[、/，,｜|]/))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
  return {
    heading: "这一轮留下来的线索",
    hit: headline,
    sections: [
      {
        title: "正在叠加到职业资产库的认知",
        content: advice.why || "现在能看到一些方向信号，但还需要分清哪些是已经发生过的事实，哪些只是待验证的方向假设。"
      },
      {
        title: "需要谨慎处理的边界",
        content: "还需要确认项目中的真实角色、关键动作、指标口径和可公开结果，避免把待验证假设直接写成简历优势。"
      }
    ],
    userKeywords: userKeywords.length ? userKeywords : ["职业方向", "项目证据", "角色边界", "指标口径"],
    feedbackOptions: [
      "这里把我的方向判断说得太窄了",
      "这里低估了我已有的项目证据",
      "这里把兴趣和能力混在一起了"
    ]
  };
}

function normalizeWorkflowResult(stepId, result, context, resumeMeta) {
  let next = { ...(result || {}) };
  next.questions = normalizeQuestionsForStep(stepId, next.questions);

  if (
    stepId === "career_direction" &&
    !hasUserAnsweredCareerQuestions(context) &&
    !resumeHasEnoughEvidenceForSkippingInterview(context, resumeMeta) &&
    next?.readiness?.shouldAskUser === false
  ) {
    next = forceAsk(next, {
      action: "ask_direction_questions",
      reason: `模型判断可跳过问答，但当前简历文本里的经历、项目动作和指标证据过少。为避免误判，需要先完成第一轮访谈。模型原判断：${result?.readiness?.reason || "未说明"}`,
      questions: fallbackDirectionQuestions()
    });
  }

  if (stepId === "career_direction") {
    const hasAnsweredCareerQuestions = hasUserAnsweredCareerQuestions(context);
    if (!hasAnsweredCareerQuestions) {
      next = sanitizeUnconfirmedRoleClaims(next, context.resumeText);
      next.questions = normalizeQuestionsForStep(stepId, next.questions);
    } else if (!next.mirrorCard) {
      next.mirrorCard = fallbackMirrorCard(next);
    }
    next.questions = normalizeQuestionsForStep(stepId, next.questions);
    next = applyRoundQuestionLimit(stepId, next, context);
    if (!next.readiness?.shouldAskUser) return next;
    if (next.questions.length && !hasUserAnsweredCareerQuestions(context)) {
      return applyDeterministicReadiness(next, {
        action: "ask_direction_questions",
        shouldAskUser: true,
        reason: next.readiness?.reason || "职业方向仍有关键判断需要用户确认。"
      });
    }
    return applyDeterministicReadiness(next, {
      action: "run_project_mining",
      shouldAskUser: false,
      reason: hasUserAnsweredCareerQuestions(context)
        ? "第一轮方向访谈已经完成。仍未确认的方向假设会带到项目证据轮继续验证。"
        : next.readiness?.reason || "职业方向信息已足够进入项目证据提炼。"
    });
  }

  if (stepId === "project_mining" && scoreMeetsThreshold(next)) {
    return applyDeterministicReadiness(next, {
      action: "run_resume_strategy",
      shouldAskUser: false,
      reason: `第二轮项目证据评分已达到 ${next.score?.threshold || "目标"}，不再追加项目问题。`
    });
  }

  if (stepId === "project_mining" && (!projectEvidenceLooksSufficient(next) || projectEvidenceNeedsUser(next))) {
    next = forceAsk(next, {
      action: "ask_project_questions",
      reason: `项目证据里仍有角色边界、指标口径或非正式经历需要确认。为避免把参与写成主导，需要先补项目事实。模型原判断：${result?.readiness?.reason || "未说明"}`,
      questions: fallbackProjectQuestions()
    });
    next.questions = normalizeQuestionsForStep(stepId, next.questions);
    return applyRoundQuestionLimit(stepId, next, context);
  }

  if (stepId === "project_mining") {
    return applyDeterministicReadiness(next, {
      action: "run_resume_strategy",
      shouldAskUser: false,
      reason: next.readiness?.reason || "项目证据已达到生成简历策略的最低要求。"
    });
  }

  if (stepId === "resume_strategy") {
    const hasBlockingGaps = resumeStrategyHasBlockingGaps(next);
    next = applyDeterministicReadiness(next, {
      action: hasBlockingGaps ? "ask_resume_gap_questions" : "render_resume",
      shouldAskUser: hasBlockingGaps,
      reason: hasBlockingGaps
        ? next.readiness?.reason || "简历策略还有模糊点、公开边界或可渲染简历内容需要确认。"
        : next.readiness?.reason || "简历策略和可展示内容已足够进入预览。"
    });
    if (hasBlockingGaps && next.questions.length === 0 && (scoreIsBelowThreshold(next) || !hasPublicResumeSource(next))) {
      next.questions = normalizeQuestionsForStep(stepId, fallbackResumeGapQuestions());
    }
    return applyRoundQuestionLimit(stepId, next, context);
  }

  return next;
}

function recommendedNextAction(results, stepId) {
  return String(results?.[stepId]?.result?.readiness?.recommendedNextAction || "");
}

function allowsResumeStrategy(results, intake = null) {
  if (done(results, "project_mining")) return !stepNeedsUser(results, "project_mining", intake);
  return resultRecommended(results, "career_direction", ["run_resume_strategy", "render_resume"]);
}

function actionGate(stepId, context) {
  const results = context.llmResults || {};
  const hasResume = context.resumeMeta?.parseStatus === "parsed";
  const hasJd = Boolean(String(context.jdText || "").replace(/^# JD\s*/i, "").trim());
  const careerReadyForProjects = done(results, "career_direction") && !stepNeedsUser(results, "career_direction", context.intake);
  const projectReadyForStrategy = allowsResumeStrategy(results, context.intake);
  const resumeStrategyDone = done(results, "resume_strategy");
  const strategyReadyForRender = resumeStrategyDone && !resumeStrategyHasBlockingGaps(results.resume_strategy?.result);
  const gates = {
    career_direction: [hasResume, "需要先上传并解析简历。"],
    project_mining: [careerReadyForProjects, stepNeedsUser(results, "career_direction", context.intake) ? "需要先完成第一轮职业方向访谈。" : "需要先完成职业方向诊断。"],
    resume_strategy: [projectReadyForStrategy, stepNeedsUser(results, "project_mining", context.intake) ? "需要先完成第二轮项目证据确认。" : "需要先完成项目证据提炼，或由模型判断现有信息已足够生成简历策略。"],
    resume_render: [strategyReadyForRender, resumeStrategyDone ? "需要先完成简历证据补充，才能生成正式预览。" : "需要先生成简历策略。"],
    jd_fit: [done(results, "career_direction") && hasJd, hasJd ? "需要先完成职业方向诊断。" : "需要先粘贴 JD。"],
    personal_site: [done(results, "project_mining") && !stepNeedsUser(results, "project_mining", context.intake) && strategyReadyForRender, "需要先完成项目证据和简历策略。"]
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

  const context = { resumeMeta, llmResults, jdText, intake };
  const actions = Object.fromEntries(Object.keys(actionContracts).map((stepId) => [stepId, actionGate(stepId, context)]));
  return {
    userId: currentUserId(),
    stage,
    ...orchestratorStages[stage],
    actions,
    projectCards: {
      count: projectCards.length,
      confirmedCount: projectCards.filter((card) => card.confirmed).length
    }
  };
}

function buildInterviewRoundState(round, llmResults, intake) {
  const config = interviewRoundConfig[round];
  const result = llmResults?.[config.stepId]?.result || {};
  const answers = answeredItemsForRound(intake?.careerDirectionAnswersJson, round);
  const answerById = new Map(answers.map((item) => [item.id, item]));
  const merged = [];
  const seen = new Set();

  for (const item of answers) {
    if (!item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push({
      id: item.id,
      round,
      question: item.question || item.id,
      placeholder: "这个问题已经回答过。为了保持判断连续，答案会保留为只读。",
      savedAnswer: item.answer,
      locked: true
    });
  }

  const shouldShowOpenQuestions = !scoreMeetsThreshold(result) && (
    recommendedActionFromResult(result) === config.askAction ||
    result?.readiness?.shouldAskUser === true
  );
  const remaining = Math.max(0, config.maxQuestions - merged.length);
  if (shouldShowOpenQuestions && remaining > 0) {
    let sourceQuestions = normalizeQuestionsForStep(config.stepId, result.questions);
    if (config.stepId === "resume_strategy" && sourceQuestions.length === 0 && (scoreIsBelowThreshold(result) || !hasPublicResumeSource(result))) {
      sourceQuestions = normalizeQuestionsForStep(config.stepId, fallbackResumeGapQuestions());
    }
    for (const item of sourceQuestions.slice(0, remaining)) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      const saved = answerById.get(item.id);
      merged.push({
        ...item,
        round,
        savedAnswer: saved?.answer || "",
        locked: Boolean(saved?.answer)
      });
    }
  }

  const openCount = merged.filter((item) => !item.locked).length;
  const answeredCount = answers.length;
  const status = openCount > 0 ? "open" : answeredCount > 0 ? "answered" : "empty";
  return {
    round,
    stepId: config.stepId,
    maxQuestions: config.maxQuestions,
    askedCount: merged.length,
    answeredCount,
    remainingCount: Math.max(0, config.maxQuestions - merged.length),
    openCount,
    status,
    questions: merged
  };
}

async function buildInterviewState({ llmResults, intake }) {
  const rounds = Object.fromEntries(
    Object.keys(interviewRoundConfig).map((round) => [round, buildInterviewRoundState(round, llmResults, intake)])
  );
  let currentRound = "direction";
  if (rounds.gaps.openCount || recommendedActionFromResult(llmResults?.resume_strategy?.result) === "ask_resume_gap_questions") {
    currentRound = "gaps";
  } else if (
    rounds.projects.openCount ||
    rounds.projects.answeredCount > 0 ||
    recommendedActionFromResult(llmResults?.project_mining?.result) === "ask_project_questions" ||
    done(llmResults, "project_mining")
  ) {
    currentRound = "projects";
  } else if (rounds.direction.openCount || rounds.direction.answeredCount > 0 || done(llmResults, "career_direction")) {
    currentRound = "direction";
  }
  return {
    currentRound,
    currentRoute: `interview/${currentRound}`,
    rounds,
    assetNotes: [
      ...rounds.direction.questions.filter((item) => item.locked).slice(-2).map((item) => `方向线索：${item.answer || item.savedAnswer}`),
      ...rounds.projects.questions.filter((item) => item.locked).slice(-3).map((item) => `项目证据：${item.answer || item.savedAnswer}`),
      ...rounds.gaps.questions.filter((item) => item.locked).slice(-2).map((item) => `表达边界：${item.answer || item.savedAnswer}`)
    ].filter(Boolean)
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
      const exportUrl = getSessionContext().auth
        ? `/exports/${file}`
        : `/exports/${file}?session=${encodeURIComponent(currentSessionId())}`;
      items[key] = {
        file,
        url: exportUrl,
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
    careerAnswersJson: await readText(path.join(dirs.intake, "career-direction-answers.json")),
    mirrorFeedback: await readText(path.join(dirs.intake, "mirror-feedback.md")),
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
  if (resumeStrategyHasBlockingGaps(resumeStrategy)) {
    throw new Error("简历策略仍有待确认问题。请先完成简历证据补充，再生成正式 HTML/PDF 预览。");
  }
  const careerDirection = (await getStepResult("career_direction"))?.result || {};
  const projectMining = (await getStepResult("project_mining"))?.result || {};
  const resumeMeta = (await readJsonFile(path.join(dirs.uploads, "resume-meta.json"), {})) || {};
  const resumeText = await readText(path.join(dirs.uploads, "resume-extracted.txt"));
  const html = buildResumeHtml({ resumeStrategy, careerDirection, projectMining, resumeMeta, resumeText });
  const findings = inspectResumeHtml(html);
  const resumeHtmlPath = path.join(dirs.exports, "resume.html");
  const resumePdfPath = path.join(dirs.exports, "resume.pdf");
  const blockingFindings = findings.filter((item) => /^Blocking /i.test(item));
  if (blockingFindings.length) {
    await Promise.all([
      fs.rm(resumeHtmlPath, { force: true }),
      fs.rm(resumePdfPath, { force: true })
    ]);
    throw new Error(`简历预览包含内部字段，已阻止导出：${blockingFindings.join("；")}`);
  }
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

async function sessionMiddleware(req, res, next) {
  try {
    const authSession = await readAuthSession(req);
    const isAuthRoute = String(req.originalUrl || "").startsWith("/api/auth/");
    if (authRequireLogin && !authSession && !isAuthRoute) {
      res.status(401).json({ ok: false, error: "请先登录后再继续。", authRequired: true });
      return;
    }
    const sessionId = normalizeSessionId(req.get("X-Career-Session-Id") || req.query.session);
    const context = buildSessionContext(sessionId, authSession);
    res.setHeader("X-Career-Session-Id", context.sessionId);
    sessionStore.run(context, next);
  } catch (error) {
    next(error);
  }
}

app.use(["/api", "/exports"], sessionMiddleware);

app.get("/api/auth/me", async (_req, res, next) => {
  try {
    const context = getSessionContext();
    res.json({
      ok: true,
      auth: {
        enabled: phoneLoginEnabled || wechatConfig.enabled || authRequireLogin || devLoginEnabled,
        configured: phoneLoginEnabled,
        phoneLoginEnabled,
        smsConfigured: aliyunSmsConfigured(),
        smsDevLoginEnabled,
        requireLogin: authRequireLogin,
        devLoginEnabled,
        provider: context.auth?.provider || "",
        user: context.auth ? {
          id: context.userId,
          nickname: context.auth.nickname || context.auth.maskedPhone,
          maskedPhone: context.auth.maskedPhone,
          avatar: context.auth.avatar,
          provider: context.auth.provider
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/phone/send-code", async (req, res, next) => {
  try {
    if (!phoneLoginEnabled) throw new Error("手机号登录未启用。");
    const phone = normalizeMainlandPhone(req.body?.phone);
    const key = hashStableId(phone, "phone");
    const codes = await readAuthJson("sms-codes.json", {});
    const previous = codes[key];
    const now = Date.now();
    if (previous?.sentAt && now - Date.parse(previous.sentAt) < smsCodeResendSeconds * 1000) {
      const remaining = Math.ceil((smsCodeResendSeconds * 1000 - (now - Date.parse(previous.sentAt))) / 1000);
      res.json({
        ok: true,
        sent: false,
        resendAfter: remaining,
        message: `验证码刚刚发送过，请 ${remaining} 秒后再试。`
      });
      return;
    }

    const provider = aliyunVerifyConfigured() ? "aliyun_verify" : aliyunSmsConfigured() ? "aliyun_dysms" : "dev";
    const code = provider === "dev" && smsDevLoginEnabled ? smsDevCode : generateSmsCode();
    if (provider === "aliyun_verify") {
      await sendAliyunVerifyCode(phone);
    } else if (provider === "aliyun_dysms") {
      await sendAliyunSmsCode(phone, code);
    }

    codes[key] = {
      phoneHash: key,
      codeHash: provider === "aliyun_verify" ? "" : smsCodeHash(phone, code),
      sentAt: new Date(now).toISOString(),
      expiresAt: new Date(now + smsCodeTtlSeconds * 1000).toISOString(),
      attempts: 0,
      provider
    };
    await writeAuthJson("sms-codes.json", codes);
    res.json({
      ok: true,
      sent: true,
      resendAfter: smsCodeResendSeconds,
      expiresIn: smsCodeTtlSeconds,
      maskedPhone: maskPhone(phone),
      devCode: provider === "dev" && smsDevLoginEnabled ? code : undefined,
      message: provider === "dev" ? `本地测试验证码：${code}` : "验证码已发送。"
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/phone/login", async (req, res, next) => {
  try {
    if (!phoneLoginEnabled) throw new Error("手机号登录未启用。");
    const phone = normalizeMainlandPhone(req.body?.phone);
    const code = String(req.body?.code || "").replace(/\D/g, "");
    if (!/^\d{6}$/.test(code)) throw new Error("请输入 6 位短信验证码。");

    const key = hashStableId(phone, "phone");
    const codes = await readAuthJson("sms-codes.json", {});
    const saved = codes[key];
    if (!saved || Date.parse(saved.expiresAt || "") < Date.now()) {
      delete codes[key];
      await writeAuthJson("sms-codes.json", codes);
      throw new Error("验证码已过期，请重新获取。");
    }
    if (Number(saved.attempts || 0) >= 5) {
      delete codes[key];
      await writeAuthJson("sms-codes.json", codes);
      throw new Error("验证码错误次数过多，请重新获取。");
    }
    if (saved.provider === "aliyun_verify") {
      try {
        await checkAliyunVerifyCode(phone, code);
      } catch (error) {
        saved.attempts = Number(saved.attempts || 0) + 1;
        await writeAuthJson("sms-codes.json", codes);
        throw error;
      }
    } else {
      const expected = saved.codeHash || "";
      const actual = smsCodeHash(phone, code);
      const a = Buffer.from(actual);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        saved.attempts = Number(saved.attempts || 0) + 1;
        await writeAuthJson("sms-codes.json", codes);
        throw new Error("验证码不正确。");
      }
    }

    delete codes[key];
    await writeAuthJson("sms-codes.json", codes);
    const maskedPhone = maskPhone(phone);
    const authSession = await createAuthSession({
      provider: "phone",
      userId: key,
      phoneHash: key,
      maskedPhone,
      nickname: maskedPhone
    });
    setAuthCookie(res, authSession.id);
    res.json({
      ok: true,
      user: {
        id: hashStableId(key, "phone"),
        nickname: maskedPhone,
        maskedPhone,
        provider: "phone"
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/wechat/start", async (req, res, next) => {
  try {
    if (!wechatConfigured()) throw new Error("微信登录尚未配置。请设置 WECHAT_LOGIN_ENABLED、WECHAT_APP_ID、WECHAT_APP_SECRET 和 WECHAT_REDIRECT_URI。");
    const states = await readAuthJson("oauth-states.json", {});
    const state = crypto.randomUUID().replace(/-/g, "");
    states[state] = {
      returnTo: publicReturnPath(req.query.returnTo || "/"),
      createdAt: new Date().toISOString()
    };
    await writeAuthJson("oauth-states.json", states);
    const params = new URLSearchParams({
      appid: wechatConfig.appId,
      redirect_uri: wechatConfig.redirectUri,
      response_type: "code",
      scope: "snsapi_login",
      state
    });
    res.redirect(`https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`);
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/wechat/callback", async (req, res, next) => {
  try {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    if (!code || !state) throw new Error("微信登录回调缺少 code 或 state。");
    const states = await readAuthJson("oauth-states.json", {});
    const savedState = states[state];
    delete states[state];
    await writeAuthJson("oauth-states.json", states);
    if (!savedState || Date.now() - Date.parse(savedState.createdAt || "") > 1000 * 60 * 10) {
      throw new Error("微信登录状态已失效，请重新登录。");
    }

    const tokenParams = new URLSearchParams({
      appid: wechatConfig.appId,
      secret: wechatConfig.appSecret,
      code,
      grant_type: "authorization_code"
    });
    const tokenResponse = await fetch(`https://api.weixin.qq.com/sns/oauth2/access_token?${tokenParams.toString()}`);
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || tokenData.errcode) {
      throw new Error(`微信登录换取 token 失败：${tokenData.errmsg || tokenResponse.statusText}`);
    }

    let profile = {
      provider: "wechat",
      openid: tokenData.openid || "",
      unionid: tokenData.unionid || "",
      nickname: "",
      avatar: ""
    };
    try {
      const userParams = new URLSearchParams({
        access_token: tokenData.access_token,
        openid: tokenData.openid,
        lang: "zh_CN"
      });
      const userResponse = await fetch(`https://api.weixin.qq.com/sns/userinfo?${userParams.toString()}`);
      const userData = await userResponse.json();
      if (userResponse.ok && !userData.errcode) {
        profile = {
          ...profile,
          nickname: userData.nickname || "",
          avatar: userData.headimgurl || "",
          unionid: userData.unionid || profile.unionid
        };
      }
    } catch {
      // User profile is optional. openid/unionid are enough for session isolation.
    }

    const authSession = await createAuthSession(profile);
    setAuthCookie(res, authSession.id);
    res.redirect(publicReturnPath(savedState.returnTo || "/"));
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/dev-login", async (req, res, next) => {
  try {
    if (!devLoginEnabled) throw new Error("本地测试登录未启用。");
    const name = String(req.body?.name || "本地测试用户").trim().slice(0, 40);
    const authSession = await createAuthSession({
      provider: "dev",
      openid: hashStableId(name, "dev_openid"),
      unionid: hashStableId(name, "dev_unionid"),
      nickname: name,
      avatar: ""
    });
    setAuthCookie(res, authSession.id);
    res.json({ ok: true, user: { id: hashStableId(authSession.unionid, "dev"), nickname: authSession.nickname, provider: "dev" } });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout", async (req, res, next) => {
  try {
    await deleteAuthSession(req);
    clearAuthCookie(res);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

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
    const gate = actionGate(stepId, { resumeMeta, llmResults: llmResultsBefore, jdText: intake.jd, intake });
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
    const rawResult = parseJsonResult(llmResponse.content);
    const result = normalizeWorkflowResult(stepId, rawResult, context, resumeMeta);
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
    const interview = await buildInterviewState({ llmResults, intake });
    res.json({
      user: {
        id: currentUserId(),
        mode: getSessionContext().auth ? "authenticated" : "local_session_user",
        sessionId: currentSessionId(),
        auth: getSessionContext().auth
      },
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
      interview,
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
  let tempDir = "";
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
    const buffer = Buffer.from(base64, "base64");
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "career-web-upload-"));
    const tempPath = path.join(tempDir, storedName);
    await fs.writeFile(tempPath, buffer);

    const parsed = await parseResumeFile(tempPath, ext);
    if (parsed.text.length < 80) {
      throw new Error("简历解析出的文字太少，可能是扫描件或图片型 PDF。请上传可复制文字的 PDF/DOCX，或先转成文本版简历。");
    }

    await resetFlowState();
    const storedPath = path.join(dirs.uploads, storedName);
    await fs.writeFile(storedPath, buffer);
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
  } finally {
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

app.post("/api/intake/career-direction-answers", async (req, res, next) => {
  try {
    await ensureWorkspace();
    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    const savedAt = new Date().toISOString();
    const safeAnswers = answers.map((item, index) => ({
      id: String(item.id || `q${index + 1}`),
      round: String(item.round || ""),
      question: String(item.question || ""),
      answer: String(item.answer || "").trim()
    }));
    const answeredCount = safeAnswers.filter((item) => item.answer).length;
    if (answeredCount === 0) {
      throw new Error("请至少回答一个问题，再继续生成判断。");
    }
    const markdown = `# Career Direction Answers

Saved at: ${savedAt}

${safeAnswers
  .map((item, index) => `## ${index + 1}. ${item.question || item.id}

- Round: ${item.round || "unknown"}

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

app.post("/api/intake/mirror-feedback", async (req, res, next) => {
  try {
    await ensureWorkspace();
    const savedAt = new Date().toISOString();
    const entry = {
      savedAt,
      type: String(req.body.type || "unknown"),
      choice: String(req.body.choice || ""),
      detail: String(req.body.detail || "").trim()
    };
    const markdown = `## ${savedAt} / ${entry.type}

- 选择：${entry.choice || "未选择"}
- 细节：${entry.detail || "无"}
`;
    await fs.appendFile(path.join(dirs.intake, "mirror-feedback.md"), `\n${markdown}`, "utf8");
    await fs.appendFile(path.join(dirs.intake, "mirror-feedback.jsonl"), `${JSON.stringify(entry)}\n`, "utf8");
    res.json({ ok: true, entry });
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
app.use(
  express.static(distDir, {
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-store");
        return;
      }
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return;
      }
      res.setHeader("Cache-Control", "no-cache");
    }
  })
);
app.get(/.*/, async (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/exports/")) return next();
  try {
    res.setHeader("Cache-Control", "no-store");
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
  console.log(`HiJob app running at http://${host}:${port}`);
  console.log(`Workspace root: ${workspaceRootDir}`);
});
