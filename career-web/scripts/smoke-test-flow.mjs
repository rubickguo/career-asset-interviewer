import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), "..");
const baseUrl = process.env.CAREER_WEB_URL || "http://127.0.0.1:5174";
const sessionId = process.env.CAREER_WEB_TEST_SESSION || `career-smoke-${Date.now()}`;
const keepSession = process.env.KEEP_SMOKE_SESSION === "1";

function assertNotIncludes(haystack, needles, label) {
  for (const needle of needles) {
    assert.equal(haystack.includes(needle), false, `${label} should not include "${needle}"`);
  }
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Career-Session-Id": sessionId,
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok || data?.ok === false) {
    throw new Error(`Request failed ${response.status} ${pathname}: ${typeof data === "string" ? data : data?.error}`);
  }
  return { response, data, text };
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

async function writeText(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data, "utf8");
}

async function pollJob(jobId) {
  const started = Date.now();
  while (Date.now() - started < 70000) {
    const { data } = await request(`/api/jobs/${jobId}`);
    if (data.job.status === "done") return data.job;
    if (data.job.status === "failed") throw new Error(data.job.error || "job failed");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Job timed out: ${jobId}`);
}

async function main() {
  const appSource = await fs.readFile(path.join(rootDir, "src/App.jsx"), "utf8");
  assertNotIncludes(appSource, ["刚才这段里，最重要的可能是", "这些项目有没有能被别人相信的变化"], "App source");
  assert.match(appSource, /这里有一个值得继续验证的信号/);
  assert.match(appSource, /按“前后对比”说清楚/);
  assert.match(appSource, /下一步怎么处理/);
  assert.match(appSource, /insight-action/);
  assert.match(appSource, /我们从你简历中发现的事/);
  assert.match(appSource, /正在阅读你的简历/);
  assert.match(appSource, /开始第一轮访谈/);
  assert.match(appSource, /判断项目证据/);
  assert.match(appSource, /判断简历缺口/);
  assert.match(appSource, /保存并查看判断/);
  assert.match(appSource, /routeForNav/);
  assert.match(appSource, /readOnly=\{readOnly\}/);
  assert.match(appSource, /projectItemsFromResult/);
  assert.match(appSource, /查看项目证据/);
  assertNotIncludes(appSource, ["先看初步判断", "继续深访", "整理项目线索", "回去调整", "每个重点项目，最后有哪些可以被别人相信的变化", "progressWidth"], "App source");

  const rendererSource = await fs.readFile(path.join(rootDir, "server/renderers.js"), "utf8");
  assert.match(rendererSource, /class="page"/);
  assert.match(rendererSource, /section-title/);
  assert.match(rendererSource, /headline/);

  const workflowSource = await fs.readFile(path.join(rootDir, "server/workflow.js"), "utf8");
  assert.match(workflowSource, /先理解人，再处理简历/);
  assert.match(workflowSource, /职业方向深访 -> 项目证据提炼 -> 简历策略与简历内容/);
  assert.match(workflowSource, /不把用户包装成岗位想要的人/);
  assert.match(workflowSource, /三轮|第一轮：职业方向深访|第二轮：项目证据与核心能力提炼|第三轮：简历策略/);
  assert.match(workflowSource, /JD 是附加流程，不是主流程/);
  assert.match(workflowSource, /个人网站不是简历网页版/);
  assert.match(workflowSource, /正式投递简历可预览内容/);
  assert.match(workflowSource, /个人简介\\|工作经历\\|项目经历\\|核心能力\\|个人作品\\|教育经历/);
  assert.match(workflowSource, /采访 -> 确认 -> 总结判断/);
  assert.match(workflowSource, /每轮最多提出 3 个核心问题/);
  assert.match(workflowSource, /问答不是必经流程/);
  assert.match(workflowSource, /recommendedNextAction/);
  assert.match(workflowSource, /adviceCard/);
  assertNotIncludes(workflowSource, ["你是一个客观、知性的职业发展分析助手"], "workflow prompt");

  const landing = await request("/");
  assert.match(landing.text, /<div id="root"><\/div>/);
  assert.match(landing.text, /assets\/index-/);

  const initialState = await request("/api/state");
  const workspaceDir = initialState.data.workspaceDir;
  assert.ok(workspaceDir.includes(path.join("workspace", "sessions", sessionId)), "test must use an isolated session workspace");

  await request("/api/intake/mirror-feedback", {
    method: "POST",
    body: JSON.stringify({
      type: "direction",
      choice: "不完全是",
      detail: "这里低估了我已有的产品判断"
    })
  });
  const feedbackText = await fs.readFile(path.join(workspaceDir, "intake/mirror-feedback.md"), "utf8");
  assert.match(feedbackText, /这里低估了我已有的产品判断/);

  await writeJson(path.join(workspaceDir, "uploads/resume-meta.json"), {
    originalName: "anonymous-engineer-resume.docx",
    storedName: "resume-original.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 4096,
    uploadedAt: new Date().toISOString(),
    parseStatus: "parsed",
    parser: "smoke-fixture",
    pageCount: 1,
    charCount: 420,
    warnings: []
  });
  await writeText(
    path.join(workspaceDir, "uploads/resume-extracted.txt"),
    [
      "匿名候选人",
      "邮箱：test@example.com ｜ 手机：18600000000",
      "GitHub：https://github.com/example ｜ 个人网站：https://example.dev",
      "后端/工具工程师，3 年经验。做过内部自动化、权限系统重构、线上稳定性治理和个人工具。"
    ].join("\n")
  );

  await writeJson(path.join(workspaceDir, "llm-results/career_direction.json"), {
    stepId: "career_direction",
    status: "done",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    model: "smoke-fixture",
    result: {
      headline: "技术建设者方向成立，但产品转向需要继续找证据。",
      recommendedTrack: "优先验证技术型产品 / AI 工具产品，其次保留后端工程主线。",
      mirrorCard: {
        hit: "你不是单纯想离开工程方向，你更像是在确认技术能力能不能通向更有问题定义权的位置。",
        tension: "一方面你不想浪费已有工程积累，另一方面你又担心继续做纯执行会缺少作品感。",
        workPattern: "当流程混乱或系统不稳定时，你会先把问题拆成结构、监控和可复用工具。",
        evidenceBoundary: "现在还不能直接写成产品能力，因为还缺用户反馈和取舍决策证据。",
        nextValidation: "下一步只验证一件事：你是否把工程问题推进成别人也能使用的机制。",
        feedbackOptions: ["定位太偏产品", "定位太偏工程", "这里低估了稳定性诉求"]
      }
    }
  });

  await writeJson(path.join(workspaceDir, "llm-results/project_mining.json"), {
    stepId: "project_mining",
    status: "done",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    model: "smoke-fixture",
    result: {
      headline: "项目素材可用，但需要补角色边界和指标口径。",
      projectCards: [
        {
          name: "权限系统重构",
          resumePotential: "重构企业权限模型，支持自定义角色和细粒度鉴权，减少权限配置问题。"
        }
      ]
    }
  });

  await writeJson(path.join(workspaceDir, "llm-results/resume_strategy.json"), {
    stepId: "resume_strategy",
    status: "done",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    model: "smoke-fixture",
    result: {
      headline: "主线是技术建设者，向 AI 工具产品保留转向空间。",
      positioning: "后端/工具工程师，关注 AI 工具、内部效率与复杂系统稳定性。",
      keywordOrder: ["复杂系统治理", "内部工具", "权限模型", "稳定性优化", "AI 工具"],
      projectOrder: ["权限系统重构", "CPU 尖刺治理"],
      bullets: [
        {
          section: "个人简介",
          text: "3 年后端与内部工具经验，长期处理权限、稳定性和自动化问题，关注如何把复杂工程问题沉淀成可复用机制。"
        },
        {
          section: "项目经历",
          text: "权限系统重构：重构企业权限模型，支持自定义角色与细粒度鉴权，降低权限配置复杂度并提升后续维护效率。"
        },
        {
          section: "项目经历",
          text: "CPU 尖刺治理：定位线上 CPU 尖刺问题，通过性能剖析、缓存和异步化处理降低服务峰值压力，补齐监控和排查流程。"
        },
        {
          section: "个人作品",
          text: "内部工具 Demo：将重复排查流程做成自助工具，减少人工协作成本。"
        },
        {
          section: "教育经历",
          text: "某大学 ｜ 本科 ｜ 计算机科学 ｜ 2019 - 2023"
        }
      ],
      pendingQuestions: ["权限工单下降口径待确认"],
      layoutNotes: ["不要强行压缩到一页"]
    }
  });

  const jobStart = await request("/api/jobs/resume_render", { method: "POST", body: "{}" });
  const job = await pollJob(jobStart.data.job.id);
  assert.equal(job.status, "done");

  const finalState = await request("/api/state");
  assert.equal(finalState.data.orchestrator.stage, "resume_ready");
  assert.ok(finalState.data.artifacts.resumeHtml?.url, "resume HTML URL should exist");
  assert.ok(finalState.data.artifacts.renderReport?.url, "render report URL should exist");

  const report = await request(finalState.data.artifacts.renderReport.url);
  assert.equal(report.data.stepId, "resume_render");
  assert.ok(Array.isArray(report.data.findings), "report findings should be an array");

  const resumeHtml = await request(finalState.data.artifacts.resumeHtml.url);
  assert.match(resumeHtml.text, /class="page"/);
  assert.match(resumeHtml.text, /class="header-top"/);
  assert.match(resumeHtml.text, /class="headline"/);
  assert.match(resumeHtml.text, /个人简介/);
  assert.match(resumeHtml.text, /项目经历/);
  assert.match(resumeHtml.text, /个人作品/);
  assert.match(resumeHtml.text, /教育经历/);
  assertNotIncludes(resumeHtml.text, ["项目排序", "待确认问题", "版式注意", "项目证据补强", "风险：", "layoutNotes", "pendingQuestions"], "resume HTML");

  if (!keepSession && sessionId.startsWith("career-smoke-")) {
    await fs.rm(workspaceDir, { recursive: true, force: true });
  }

  console.log(`Smoke test passed for ${baseUrl} with session ${sessionId}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
