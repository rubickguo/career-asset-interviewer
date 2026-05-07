import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Brain,
  Check,
  FileText,
  FolderOpen,
  Globe2,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
  Target,
  Upload
} from "lucide-react";

const APP_BASE = import.meta.env.BASE_URL || "/";
const APP_PREFIX = APP_BASE === "/" ? "" : APP_BASE.replace(/\/$/, "");
const API_BASE = `${APP_PREFIX}/api`;
const SESSION_STORAGE_KEY = "career-web-session-id";

function createSessionId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID().replace(/-/g, "");
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

function getSessionId() {
  let sessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!/^[a-zA-Z0-9_-]{12,80}$/.test(sessionId || "")) {
    sessionId = createSessionId();
    window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

const questionFallback = [
  {
    id: "target_direction",
    question: "我先假设：你未必一定要换职业，可能只是想换一种工作方式。这个判断哪里不对？",
    placeholder: "可以写：其实我就是想转行；或者问题主要在公司/业务/团队；或者我想保留当前职业，但不想继续低判断权、低反馈、低作品感。"
  },
  {
    id: "change_scope",
    question: "如果继续当前职业轨道，换业务、团队、公司或层级，哪些问题会缓解？哪些仍然不会？",
    placeholder: "这不是劝你留下，而是先分清：你要离开的到底是岗位、环境、工作方式，还是某种被固定住的身份。"
  },
  {
    id: "strengths",
    question: "我需要验证一个关键点：过去别人最容易在什么场景下依赖你？你又最不想再回到什么状态？",
    placeholder: "写具体场景即可：混乱时找你拆问题、上线前找你兜底、需要判断时找你拿主意；也可以写你不想再经历的状态，比如只有执行、没有反馈、长期高压但没有成长。"
  }
];

const projectQuestionFallback = [
  {
    id: "project_most_valuable",
    question: "我先不让你总结能力。只看事实：如果只留下 2-3 个项目或非正式经历，你最不想删掉哪几个？",
    placeholder: "可以是工作项目，也可以是和目标方向相关的游戏、社区、内容、开源、长期研究。写名字和一句为什么：它证明了判断、推进、技术深度、业务理解、结果，还是某种别人看不见的能力。"
  },
  {
    id: "project_role_boundary",
    question: "这些经历里，哪些关键判断是你做的？哪些主要是你执行或协作完成的？",
    placeholder: "不用夸大。我们要分清：你定义问题、设计方案、做关键取舍、推进协作、实现交付分别到了哪一步。边界越清楚，简历越可信。"
  },
  {
    id: "project_metrics",
    question: "挑一个最重要的项目，按“前后对比”说清楚：做之前是什么状态，做之后哪一个指标或现象变了？",
    placeholder: "只写一个项目也可以。按这个格式填：之前：___；我做了：___；之后：___。如果没有结果指标，就写过程变化，例如交付周期、错误率、响应速度、复用次数、覆盖人数、协作成本或稳定性。"
  }
];

const gapQuestionFallback = [
  {
    id: "resume_ambiguity",
    question: "基于前面的判断，我担心简历里最容易被追问的是模糊边界。你最担心哪一段说不清楚？",
    placeholder: "可能是年限、岗位名称、项目时间、负责范围、数据口径、离职原因、是否主导。写担心点，不用先组织答案。"
  },
  {
    id: "weak_claims",
    question: "我会先给出简历主叙事，但需要你确认：哪些能力现在还不能写太满？",
    placeholder: "比如架构设计、从 0 到 1、增长、管理、AI 落地、复杂协作。我们先标出来，证据不足就降级表达，不硬包装。"
  },
  {
    id: "priority_order",
    question: "最后确认公开边界和表达边界：哪些内容必须谨慎处理？",
    placeholder: "比如公司名、项目细节、指标脱敏、目标城市、是否必须一页、是否要中英文、哪些经历不能公开。"
  }
];

const interviewRounds = {
  direction: {
    index: 1,
    total: 3,
    eyebrow: "第一轮",
    title: "先别急着选方向。",
    description: "这一轮先看你真正想改变什么。很多时候，问题不是“要不要转行”，而是当前工作方式里有些东西已经不适合你了。",
    cta: "保存并查看判断",
    stepId: "career_direction",
    next: "insight/direction",
    fallback: "interview/direction",
    back: "diagnosis"
  },
  projects: {
    index: 2,
    total: 3,
    eyebrow: "第二轮",
    title: "把经历变成证据。",
    description: "这一轮不追求把项目说漂亮，只看哪些经历真的能证明你做成过什么、判断过什么、影响过什么。",
    cta: "保存并查看判断",
    stepId: "project_mining",
    next: "insight/projects",
    fallback: "interview/projects",
    back: "insight/direction"
  },
  gaps: {
    index: 3,
    total: 3,
    eyebrow: "第三轮",
    title: "把模糊的地方说清楚。",
    description: "这一轮处理那些容易被追问的地方。不是为了包装，而是避免把不确定的内容写成过度确定的优势。",
    cta: "保存并生成策略",
    stepId: "resume_strategy",
    next: "insight/gaps",
    fallback: "interview/gaps",
    back: "insight/projects"
  }
};

const routes = [
  { key: "landing", label: "开始" },
  { key: "upload", label: "简历" },
  { key: "diagnosis", label: "诊断" },
  { key: "interview", label: "深访" },
  { key: "projects", label: "项目" },
  { key: "resume", label: "简历预览" }
];

const waitingCopy = {
  career_direction: {
    title: "正在重新理解你的职业方向",
    text: "这一步会把你的回答和已有简历放在一起看。也许你现在会觉得等待有点慢，但求职方向会影响未来几年的选择，多花几十秒把判断做扎实是值得的。",
    next: "insight/direction",
    fallback: "interview/direction"
  },
  project_mining: {
    title: "正在提炼项目证据",
    text: "系统会检查哪些经历真的能证明你的能力，优先找结果指标；没有结果指标时，再找过程指标和质量指标。",
    next: "insight/projects",
    fallback: "interview/projects"
  },
  resume_strategy: {
    title: "正在生成简历策略",
    text: "这里不会直接堆好听的话，而是先确认定位、关键词顺序和项目取舍。策略稳定后，简历才会更像你本人。",
    next: "insight/gaps",
    fallback: "interview/gaps"
  },
  resume_render: {
    title: "正在生成简历预览",
    text: "系统会先生成 HTML，再尝试导出 PDF，并检查是否有明显排版问题。",
    next: "resume",
    fallback: "resume"
  },
  jd_fit: {
    title: "正在拆解目标岗位",
    text: "这一步会先看 JD 真正要求什么，再用你的职业资产做定性匹配。不会给虚高分数，也不会为了投递而强行包装。",
    next: "jd",
    fallback: "jd"
  },
  personal_site: {
    title: "正在生成个人网站方案",
    text: "网站会读取你的画像、项目证据和公开边界，避免做成和职业身份不匹配的通用模板。",
    next: "resume",
    fallback: "resume"
  }
};

const initialDiagnosisWaiting = {
  title: "正在阅读你的简历",
  text: "这一步只基于简历内容做初步判断：先看可能的职业叙事、证据缺口和下一轮应该验证的问题。现在还不会把这些结论写进最终简历。",
  next: "diagnosis",
  fallback: "diagnosis"
};

const waitingTips = [
  "理解你，才可能真正帮到你。简历不是把经历写满，而是把值得被看见的证据放到正确位置。",
  "求职里最危险的不是表达不够漂亮，而是把还没有证据的判断写得太确定。",
  "如果一段经历暂时没有结果指标，我们会先找过程指标、质量指标和复杂度证据。",
  "真正好的简历不是一页纸的压缩包，而是一套清楚的职业叙事：你是谁、做成过什么、凭什么值得相信。",
  "我们不会急着给你贴标签。先找稳定出现的信号，再确认它是否真的发生在项目里。",
  "很多人的问题不是没有经历，而是经历还没有被组织成证据。"
];

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", "X-Career-Session-Id": getSessionId(), ...(options.headers || {}) },
    ...options
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.error || "Request failed");
  return data;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function routeFromHash() {
  const raw = window.location.hash.replace(/^#\/?/, "") || "landing";
  const [view, id] = raw.split("/");
  return { view: view || "landing", id: id || "" };
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function textToList(value) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function listToText(value) {
  return asArray(value).join("\n");
}

function compactText(value, limit = 128) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).replace(/[，。；、\s]+$/g, "")}...`;
}

function formatSize(size) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function appUrl(url) {
  if (!url || /^https?:\/\//i.test(url)) return url;
  if (!url.startsWith("/")) return `${APP_PREFIX}/${url}`.replace(/\/{2,}/g, "/");
  return `${APP_PREFIX}${url}`;
}

function feedbackOptionsFor(type, mirror) {
  const llmOptions = asArray(mirror?.feedbackOptions).map(String).filter(Boolean);
  if (llmOptions.length >= 3) return llmOptions.slice(0, 5);
  const fallback = {
    direction: [
      "我不是想换方向，更像是想换环境",
      "我不是缺判断空间，主要是缺成长路径",
      "我不是预设困难，而是真的不想做这类工作",
      "这里把我的收入、城市或强度约束看轻了"
    ],
    projects: [
      "我的角色边界没有这里说得这么大",
      "这些项目不是缺结果，而是结果不方便公开",
      "更应该突出另一个项目或经历",
      "这里把执行、推进和决策混在一起了"
    ],
    gaps: [
      "我真正担心的不是表达，而是证据不足",
      "这里的职业定位还没有说中",
      "有些数据或项目不能这样公开",
      "我更想弱化某段经历，而不是补强它"
    ]
  };
  return fallback[type] || fallback.direction;
}

function parseSavedAnswers(raw) {
  try {
    const parsed = JSON.parse(raw || "{}");
    return Object.fromEntries((parsed.answers || []).map((item) => [item.id, item.answer || ""]));
  } catch {
    return {};
  }
}

function savedAnswersList(raw) {
  try {
    const parsed = JSON.parse(raw || "{}");
    return asArray(parsed.answers);
  } catch {
    return [];
  }
}

function answeredIdsFromState(state) {
  return new Set(savedAnswersList(state?.intake?.careerDirectionAnswersJson).filter((item) => String(item.answer || "").trim()).map((item) => item.id));
}

function routeForNav(key, state) {
  if (key === "landing") return "landing";
  if (key === "upload") return "upload";
  if (key === "diagnosis") return state?.llmResults?.career_direction?.result ? "diagnosis" : "upload";
  if (key === "interview") return "interview/direction";
  if (key === "projects") return state?.llmResults?.project_mining?.result ? "insight/projects" : "projects";
  if (key === "resume") return "resume";
  return key;
}

function isRouteReadOnly(route, state) {
  if (route.view !== "interview") return false;
  const answeredIds = answeredIdsFromState(state);
  const round = interviewRounds[route.id || "direction"] || interviewRounds.direction;
  if (route.id === "projects" && state?.llmResults?.project_mining?.result) return true;
  if (route.id === "gaps" && state?.llmResults?.resume_strategy?.result) return true;
  const idsByRound = {
    direction: [
      ...questionFallback.map((item) => item.id),
      ...asArray(state?.llmResults?.career_direction?.result?.questions).map((item, index) => item.id || `dynamic_${index + 1}`)
    ],
    projects: [
      ...projectQuestionFallback.map((item) => item.id),
      ...projectQuestionsFromResult(state?.llmResults?.project_mining?.result).map((item) => item.id)
    ],
    gaps: [
      ...gapQuestionFallback.map((item) => item.id),
      ...gapQuestionsFromResult(state?.llmResults?.resume_strategy?.result).map((item) => item.id)
    ]
  };
  return asArray(idsByRound[route.id || "direction"]).some((id) => answeredIds.has(id)) || state?.orchestrator?.stage !== "diagnosis_ready" && round.index < 3;
}

function projectItemsFromResult(result, cards) {
  const cardItems = cards.map((card) => ({ ...card, source: "card" }));
  if (cardItems.length) return cardItems;
  const items = [
    ...asArray(result?.projectCards),
    ...asArray(result?.priorityProjects)
  ]
    .map((item, index) => ({
      id: item.id || `result-project-${index + 1}`,
      name: item.name || item.project || `项目 ${index + 1}`,
      role: item.role,
      context: item.context,
      resumePotential: item.resumePotential || item.why,
      resultMetrics: item.resultMetrics,
      processMetrics: item.processMetrics,
      qualityMetrics: item.qualityMetrics,
      priority: item.priority || item.resumePriority,
      missing: item.missing,
      source: "result"
    }))
    .filter((item) => item.name || item.resumePotential || item.context);
  if (items.length) return items;
  if (result?.headline) {
    return [{
      id: "project-summary",
      name: "项目证据概览",
      resumePotential: result.headline,
      context: result.nextStep || "",
      source: "result"
    }];
  }
  return [];
}

function projectSummary(card) {
  return [
    card.role,
    asArray(card.resultMetrics)[0],
    asArray(card.processMetrics)[0],
    asArray(card.skills)[0]
  ]
    .filter(Boolean)
    .join(" / ");
}

function readinessOf(result) {
  return result?.readiness || {};
}

function nextActionOf(result, fallback = "") {
  return String(readinessOf(result).recommendedNextAction || fallback);
}

function shouldAskUser(result) {
  const readiness = readinessOf(result);
  if (typeof readiness.shouldAskUser === "boolean") return readiness.shouldAskUser;
  return asArray(result?.questions).length > 0;
}

function questionFromLlm(item, index, prefix = "dynamic") {
  if (typeof item === "string") {
    return { id: `${prefix}_${index + 1}`, question: item, placeholder: "写事实和真实判断即可，不需要自己包装。" };
  }
  return {
    id: item?.id || `${prefix}_${index + 1}`,
    question: item?.question || item?.text || item?.why || "",
    placeholder: item?.why || item?.placeholder || "写事实和真实判断即可，不需要自己包装。"
  };
}

function projectQuestionsFromResult(result) {
  const direct = asArray(result?.questions).map((item, index) => questionFromLlm(item, index, "project_dynamic")).filter((item) => item.question);
  if (direct.length) return direct.slice(0, 3);
  const fromPriority = asArray(result?.priorityProjects)
    .flatMap((project, projectIndex) =>
      asArray(project?.questions).map((question, index) => ({
        id: `project_${projectIndex + 1}_question_${index + 1}`,
        question,
        placeholder: `${project?.name || "这个项目"}：补事实、角色边界、前后变化或指标。`
      }))
    )
    .filter((item) => item.question);
  const life = asArray(result?.lifeExperienceQuestions)
    .map((question, index) => ({
      id: `life_experience_${index + 1}`,
      question,
      placeholder: "可以写工作外但和目标岗位相关的长期经历、作品、社区、游戏、开源或 AI 工具实践。"
    }))
    .filter((item) => item.question);
  return [...fromPriority, ...life].slice(0, 3);
}

function gapQuestionsFromResult(result) {
  const direct = asArray(result?.questions).map((item, index) => questionFromLlm(item, index, "gap_dynamic")).filter((item) => item.question);
  if (direct.length) return direct.slice(0, 3);
  return asArray(result?.pendingQuestions)
    .map((question, index) => ({
      id: `pending_gap_${index + 1}`,
      question,
      placeholder: "确认口径即可。无法确认就写不能公开、记不清、只能脱敏或需要降级表达。"
    }))
    .filter((item) => item.question)
    .slice(0, 3);
}

function StepShell({ view, status, busy, onReset, state, children }) {
  return (
    <main className="app-shell">
      <header className="top-nav">
        <button className="brand" onClick={() => goTo("landing")}>
          <span>仙人指路</span>
        </button>
        <nav className="route-dots" aria-label="流程">
          {routes.slice(1).map((item) => (
            <button
              key={item.key}
              className={item.key === view ? "active" : ""}
              type="button"
              onClick={() => goPath(routeForNav(item.key, state))}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button className="reset-button" onClick={onReset} aria-label="重置流程" disabled={busy}>
          {busy ? <Loader2 className="spin" size={18} /> : <RotateCcw size={18} />}
          <span>重置</span>
        </button>
      </header>
      {children}
      {status && <div className="toast">{status}</div>}
    </main>
  );
}

function goTo(view, id = "") {
  window.location.hash = `/${view}${id ? `/${id}` : ""}`;
}

function goPath(path) {
  window.location.hash = `/${String(path || "landing").replace(/^\/+/, "")}`;
}

function scrollPageToTop() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  const reset = () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  reset();
  window.requestAnimationFrame(() => {
    reset();
    window.requestAnimationFrame(reset);
  });
  window.setTimeout(reset, 140);
}

function startWaiting(stepId, overrides = {}) {
  const context = {
    stepId,
    startedAt: Date.now(),
    pollSeconds: 5,
    ...(waitingCopy[stepId] || {}),
    ...overrides
  };
  window.sessionStorage.setItem("career-web-waiting", JSON.stringify(context));
  goTo("waiting", stepId);
}

function isDirectionInterviewStarted(state) {
  const raw = state?.intake?.careerDirectionAnswersJson;
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return asArray(parsed.answers).some((item) => String(item.answer || "").trim());
  } catch {
    return String(raw).trim().length > 0;
  }
}

function isProjectInterviewStarted(state) {
  const raw = state?.intake?.careerDirectionAnswersJson;
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    const projectIds = new Set([
      ...projectQuestionFallback.map((item) => item.id),
      ...projectQuestionsFromResult(state?.llmResults?.project_mining?.result).map((item) => item.id)
    ]);
    return asArray(parsed.answers).some((item) => projectIds.has(item.id) && String(item.answer || "").trim());
  } catch {
    return false;
  }
}

function readWaiting(stepId) {
  try {
    const context = JSON.parse(window.sessionStorage.getItem("career-web-waiting") || "{}");
    return context.stepId === stepId ? context : null;
  } catch {
    return null;
  }
}

function PrimaryButton({ children, onClick, disabled, icon: Icon = ArrowRight, type = "button" }) {
  return (
    <button className="primary-button" onClick={onClick} disabled={disabled} type={type}>
      <span>{children}</span>
      <Icon size={18} />
    </button>
  );
}

function GhostButton({ children, onClick, disabled, icon: Icon = ArrowLeft, type = "button" }) {
  return (
    <button className="ghost-button" onClick={onClick} disabled={disabled} type={type}>
      <Icon size={17} />
      <span>{children}</span>
    </button>
  );
}

function WaitingPage({ stepId, busy, onRefresh }) {
  const context = readWaiting(stepId) || waitingCopy[stepId] || {};
  const [elapsed, setElapsed] = useState(0);
  const [job, setJob] = useState(null);
  const [jobError, setJobError] = useState("");
  const pollSeconds = context.pollSeconds || 5;
  const activeTip = elapsed >= 10 ? waitingTips[Math.floor((elapsed - 10) / 8) % waitingTips.length] : "";
  const waitMessage =
    elapsed >= 35
      ? "信息有点多，你可以先干些别的。页面会继续等待结果，完成后会自动进入下一步。"
    : elapsed >= 18
        ? "马上就好，正在把材料放在一起看，避免太早下结论。"
        : "已经开始整理了，完成后会自动进入下一步。";

  useEffect(() => {
    const startedAt = context.startedAt || Date.now();
    const tick = window.setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);
    async function pollJob() {
      try {
        if (context.jobId) {
          const response = await api(`/jobs/${context.jobId}`);
          setJob(response.job);
          if (response.job.status === "done") {
            await onRefresh();
            window.sessionStorage.removeItem("career-web-waiting");
            goPath(context.next || waitingCopy[stepId]?.next || "diagnosis");
            return;
          }
          if (response.job.status === "failed") {
            setJobError(response.job.error || "处理失败。");
            await onRefresh().catch(() => {});
            goPath(context.fallback || waitingCopy[stepId]?.fallback || "diagnosis");
          }
        } else {
          await onRefresh();
        }
      } catch (error) {
        setJobError(error.message);
      }
    }
    pollJob();
    const poll = window.setInterval(pollJob, pollSeconds * 1000);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(poll);
    };
  }, [context.fallback, context.jobId, context.next, context.startedAt, onRefresh, pollSeconds, stepId]);

  return (
    <section className="waiting-page">
      <div className="waiting-card">
        <div className="orbital-loader" aria-hidden="true">
          <Loader2 className="spin" size={34} />
        </div>
        <p className="eyebrow">正在整理</p>
        <h1>{context.title || "正在处理你的请求"}</h1>
        <p>{context.text || "系统正在刷新状态，完成后会自动进入下一步。"}</p>
        <div className="waiting-progress" aria-hidden="true">
          <span />
        </div>
        <p className="waiting-reassurance" aria-live="polite">{waitMessage}</p>
        {activeTip && <div className="waiting-tip">{activeTip}</div>}
        {jobError && <p className="waiting-error">{jobError}</p>}
      </div>
    </section>
  );
}

function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <button className="brand" onClick={() => goTo("landing")}>
          <span>仙人指路</span>
        </button>
        <button className="nav-link" onClick={() => goTo("jd")}>分析 JD</button>
      </header>
      <section className="landing-center">
        <p className="eyebrow">Career Asset OS</p>
        <h1>
          <span>先读懂你，</span>
          <span>再开始处理简历。</span>
        </h1>
        <p className="landing-copy">
          通过简历和一轮轮对话，把你的职业方向、项目证据、关键词和表达策略沉淀成可复用的个人知识库。
        </p>
        <div className="landing-actions">
          <PrimaryButton icon={Sparkles} onClick={() => goTo("upload")}>
            开始创建我的个人知识库
          </PrimaryButton>
          <button className="small-entry" onClick={() => goTo("jd")}>
            已有目标岗位，先分析 JD
          </button>
        </div>
      </section>
    </main>
  );
}

function UploadPage({ selectedFile, setSelectedFile, resumeMeta, busy, onUpload }) {
  return (
    <section className="step-page upload-page">
      <div className="step-copy">
        <p className="eyebrow">Step 01</p>
        <h1>先给我一份已有简历。</h1>
        <p>
          简历不是最终答案，它只是起点。我们会先从里面找到你的经历、项目和可能的职业主线。
        </p>
      </div>
      <div className="step-card upload-panel">
        <label className="upload-zone">
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
          />
          <Upload size={28} />
          <strong>{selectedFile?.name || resumeMeta?.originalName || "选择 PDF 或 DOCX 简历"}</strong>
          <span>{selectedFile ? formatSize(selectedFile.size) : resumeMeta ? `已解析 ${resumeMeta.charCount || 0} 字` : "上传后进入初步诊断"}</span>
        </label>
        <div className="step-actions">
          <GhostButton onClick={() => goTo("landing")}>返回</GhostButton>
          <PrimaryButton icon={busy ? Loader2 : ArrowRight} onClick={onUpload} disabled={busy || (!selectedFile && !resumeMeta)}>
            {resumeMeta && !selectedFile ? "继续诊断" : "上传并继续"}
          </PrimaryButton>
        </div>
      </div>
    </section>
  );
}

function DiagnosisPage({ result, resumeMeta, busy, onRun, onAskDirection, onRunProjects, onRunStrategy }) {
  if (!resumeMeta) return <GuardPage title="还没有简历" text="先上传简历，才能生成初步职业诊断。" target="upload" />;

  if (!result) {
    return (
      <section className="step-page diagnosis-page">
        <div className="step-copy">
          <p className="eyebrow">Step 02</p>
          <h1>先做一次初步诊断。</h1>
          <p>这一步只基于你已有简历，结论会保持克制：指出可能方向、证据缺口和下一轮要问的问题。</p>
        </div>
        <div className="step-card centered-card">
          <Brain size={34} />
          <strong>还未生成诊断</strong>
          <p>点击后会调用模型读取解析后的简历。</p>
          <PrimaryButton icon={busy ? Loader2 : Sparkles} onClick={onRun} disabled={busy}>
            生成初步诊断
          </PrimaryButton>
        </div>
      </section>
    );
  }

  const narratives = asArray(result.narratives).slice(0, 3);
  const risks = asArray(result.risks).slice(0, 4);
  const nextAction = nextActionOf(result, shouldAskUser(result) ? "ask_direction_questions" : "run_project_mining");
  const nextConfig = (() => {
    if (nextAction === "run_resume_strategy" || nextAction === "render_resume") {
      return { label: "直接生成简历策略", onClick: onRunStrategy };
    }
    if (nextAction === "run_project_mining") {
      return { label: "直接提炼项目证据", onClick: onRunProjects };
    }
    return { label: "开始第一轮访谈", onClick: onAskDirection };
  })();
  return (
    <section className="solo-page">
      <div className="page-head">
        <p className="eyebrow">Step 02</p>
        <h1>我们从你简历中发现的事。</h1>
        <p>这些只来自简历文本，是初步线索，不是最终职业定位。下一步才会通过第一轮访谈确认。</p>
      </div>
      <div className="diagnosis-layout">
        <article className="hero-card">
          <Brain size={24} />
          <h2>{result.headline || result.judgment || "当前简历已经完成初步诊断。"}</h2>
          {result.recommendedTrack && <p>{result.recommendedTrack}</p>}
        </article>
        <div className="stack-list">
          {narratives.map((item, index) => (
            <article key={`${item.title || index}`} className="thin-card">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.title || "候选主叙事"}</strong>
              <p>{asArray(item.evidence)[0] || item.risk || "证据需要继续确认。"}</p>
            </article>
          ))}
        </div>
      </div>
      {risks.length > 0 && (
        <div className="note-strip">
          <strong>需要确认</strong>
          <p>{risks.join(" / ")}</p>
        </div>
      )}
      {result.readiness?.reason && (
        <div className="note-strip">
          <strong>{shouldAskUser(result) ? "为什么还要问" : "为什么可以跳过问答"}</strong>
          <p>{result.readiness.reason}</p>
        </div>
      )}
      <div className="step-actions end">
        <GhostButton onClick={() => goTo("upload")}>返回简历</GhostButton>
        <PrimaryButton onClick={nextConfig.onClick} disabled={busy}>{nextConfig.label}</PrimaryButton>
      </div>
    </section>
  );
}

function InterviewPage({ round, questions, answers, setAnswers, busy, onSave, readOnly }) {
  return (
    <section className="solo-page compact">
      <div className="page-head">
        <p className="eyebrow">{round.eyebrow}</p>
        <h1>{round.title}</h1>
        <p>{round.description}</p>
        {readOnly && <p className="readonly-note">这一轮已经提交。你可以回看问题和答案，但这里不会再修改，避免重复消耗模型和让问题漂移。</p>}
        <div className="round-progress">
          {Array.from({ length: round.total }).map((_, index) => (
            <span key={index} className={index + 1 <= round.index ? "active" : ""} />
          ))}
          <strong>第 {round.index} / {round.total} 轮</strong>
        </div>
      </div>
      <div className="question-stack">
        {questions.map((item, index) => (
          <label key={item.id} className="question-panel">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item.question}</strong>
            <textarea
              value={answers[item.id] || ""}
              placeholder={item.placeholder || "写真实想法即可。"}
              readOnly={readOnly}
              onChange={(event) => setAnswers((current) => ({ ...current, [item.id]: event.target.value }))}
            />
          </label>
        ))}
      </div>
      {!readOnly && (
        <div className="step-actions end">
          <PrimaryButton icon={busy ? Loader2 : BadgeCheck} onClick={onSave} disabled={busy}>
            {round.cta}
          </PrimaryButton>
        </div>
      )}
    </section>
  );
}

function ProjectsPage({ result, cards, busy, onMine, onSave, onResume }) {
  const items = projectItemsFromResult(result, cards);
  if (!result && !items.length) {
    return (
      <section className="step-page projects-page">
        <div className="step-copy">
          <p className="eyebrow">Step 04</p>
          <h1>接下来提炼项目证据。</h1>
          <p>简历优势不来自形容词，而来自项目、行动和指标。我们先把可证明的内容整理出来。</p>
        </div>
        <div className="step-card centered-card">
          <FolderOpen size={34} />
          <strong>还没有项目证据卡</strong>
          <p>系统会从简历和深访结果里抽取项目，再让你逐个确认。</p>
          <PrimaryButton icon={busy ? Loader2 : Sparkles} onClick={onMine} disabled={busy}>
            提炼项目证据
          </PrimaryButton>
        </div>
      </section>
    );
  }

  return (
    <section className="solo-page compact">
      <div className="page-head">
        <p className="eyebrow">Step 04</p>
        <h1>确认项目证据。</h1>
        <p>每张项目卡都会影响后面的简历、JD 策略和个人网站。先确认事实，再生成表达。</p>
      </div>
      <div className="project-list">
        {items.map((card) => (
          <article key={card.id || card.name} className="project-row">
            <div>
              <strong>{card.name || "未命名项目"}</strong>
              <p>{projectSummary(card) || card.resumePotential || card.context || "需要继续补充证据。"}</p>
              {asArray(card.missing).length > 0 && <p className="muted-line">待补：{asArray(card.missing).join(" / ")}</p>}
            </div>
            <div className="row-actions">
              {card.confirmed && <span className="pill">已确认</span>}
              {card.priority && <span className="pill">{card.priority}</span>}
              {card.source === "card" && <button onClick={() => goTo("project", card.id)}>编辑</button>}
            </div>
          </article>
        ))}
      </div>
      <div className="step-actions end">
        {cards.length > 0 && <GhostButton icon={Save} onClick={onSave} disabled={busy}>保存项目卡</GhostButton>}
        <PrimaryButton onClick={onResume}>生成简历策略</PrimaryButton>
      </div>
    </section>
  );
}

function buildMirror(type, careerResult, projectResult, strategyResult) {
  if (type === "direction") {
    return careerResult?.mirrorCard || {
      hit: careerResult?.headline || careerResult?.judgment || "你不是来简单改简历的，你是在确认过去这些经历能不能通向一个更适合自己的位置。",
      tension: "你一方面想延续已经积累过的东西，另一方面又不想被旧岗位里的低判断空间固定住。",
      workPattern: "当事情不清楚、边界不明确时，你更容易先去拆结构、找证据、确认问题，而不是直接把自己包装成某个标签。",
      evidenceBoundary: "我先不急着下结论，因为现在还缺具体项目来证明这不是偏好，而是你已经做成过的能力。",
      nextValidation: "下一步我们只验证一件事：过去有没有一个项目，能证明你真的做过这种判断和推进。"
    };
  }
  if (type === "projects") {
    return projectResult?.mirrorCard || {
      hit: projectResult?.headline || "你不是经历少，而是很多经历还没有被整理成证据。",
      tension: "你想让别人看到你的能力，但又不能把参与过的事情都写成主导，这里面需要很清楚的边界。",
      workPattern: "当一个项目值得写时，通常不是因为它看起来大，而是因为里面有你的判断、取舍、行动和结果。",
      evidenceBoundary: "我先不急着把项目写成优势，因为每个项目还需要确认角色边界和指标可信度。",
      nextValidation: "下一步我们只验证一件事：哪些项目可以被写成可信证据，哪些只能作为辅助经历。"
    };
  }
  return strategyResult?.mirrorCard || {
    hit: strategyResult?.headline || "现在不是继续堆经历，而是决定别人应该先记住哪个你。",
    tension: "你既希望简历完整，又需要避免把信息铺得太散，导致真正有价值的证据被淹没。",
    workPattern: "一份更好的简历会把项目、关键词和表达顺序收束到同一条叙事里。",
    evidenceBoundary: "我先不急着把所有表达写死，因为还有些数据、公开边界和项目优先级需要你确认。",
    nextValidation: "下一步我们只验证一件事：这份策略是否真的能解释你的过去，也能支撑你想去的方向。"
  };
}

function buildAdvice(type, careerResult, projectResult, strategyResult) {
  const result = type === "direction" ? careerResult : type === "projects" ? projectResult : strategyResult;
  if (result?.adviceCard) return result.adviceCard;
  if (type === "direction") {
    return {
      recommendation: careerResult?.recommendedTrack || "先不要急着把自己定义成转行或不转行。更稳的做法是先验证：当前职业轨道能否通过换业务、换团队或换工作方式解决主要问题。",
      why: careerResult?.judgment || "现在能看到一些方向信号，但还缺项目证据来证明它不是短期焦虑或对当前环境的反应。",
      whatToConfirm: ["继续当前职业轨道是否仍有可接受版本", "真正想靠近的是岗位名称还是工作方式", "哪些反感来自职业本身，哪些来自环境"],
      whatNotToDo: ["现在不急着重写简历标题", "不把兴趣直接写成能力", "不把逃离当前状态误判为长期方向"]
    };
  }
  if (type === "projects") {
    return {
      recommendation: projectResult?.headline || "接下来优先保留能证明判断、取舍、推进和结果的项目。只有参与但缺少个人边界的经历，先降级为辅助素材。",
      why: "简历的说服力不是来自项目数量，而是来自可信证据。角色边界和指标口径越清楚，后面的表达越不容易翻车。",
      whatToConfirm: ["每个重点项目里你具体负责到哪一步", "有没有结果指标、过程指标或质量指标", "是否有和目标方向相关的非正式经历"],
      whatNotToDo: ["不把参与写成主导", "不为了好看编数字", "不把所有项目平均用力"]
    };
  }
  return {
    recommendation: strategyResult?.headline || "生成简历前，先确认主叙事、关键词顺序和不能写太满的地方。简历应该先让别人记住一个清晰的你。",
    why: "如果策略不稳定，简历会变成经历堆叠；如果边界不清楚，面试时容易被追问到失真。",
    whatToConfirm: ["顶部定位是否像你本人", "关键词顺序是否符合目标方向", "是否有数据、项目或公司信息需要脱敏"],
    whatNotToDo: ["不强行压成一页导致不可读", "不把待验证假设写成确定能力", "不把内部策略字段写进简历正文"]
  };
}

function AdviceCard({ advice }) {
  if (!advice) return null;
  const confirms = asArray(advice.whatToConfirm).slice(0, 3);
  const recommendation = compactText(advice.recommendation, 118);
  const reason = compactText(advice.why, 96);
  return (
    <article className="advice-card">
      <div className="advice-main">
        <p className="eyebrow">下一步怎么处理</p>
        <h2>{recommendation}</h2>
        {reason && <p className="advice-reason">{reason}</p>}
      </div>
      {confirms.length > 0 && (
        <div className="advice-confirm-list">
          <span>只需要你确认</span>
          <div>
            {confirms.map((item) => <p key={item}>{compactText(item, 72)}</p>)}
          </div>
        </div>
      )}
    </article>
  );
}

function InsightAction({ nextText, onNext }) {
  if (!nextText || !onNext) return null;
  return (
    <div className="insight-action">
      <PrimaryButton onClick={onNext}>{nextText}</PrimaryButton>
    </div>
  );
}

function MirrorCard({ type, mirror, onFeedback, title = "这一轮留下来的线索" }) {
  const [feedback, setFeedback] = useState("");
  const [detail, setDetail] = useState("");
  const [selectedCorrection, setSelectedCorrection] = useState("");
  const correctionOptions = feedbackOptionsFor(type, mirror);
  const saveFeedback = (choice, extra = "") => {
    setFeedback(choice);
    onFeedback?.({ type, choice, detail: extra });
  };
  return (
    <>
      <article className="mirror-card">
        <p className="eyebrow">{title}</p>
        <h2>这里有一个值得继续验证的信号</h2>
        <p className="mirror-hit">{mirror.hit}</p>
        <div className="mirror-sections">
          <section>
            <span>这里有一个拉扯</span>
            <p>{mirror.tension}</p>
          </section>
          <section>
            <span>一个正在浮现的工作模式</span>
            <p>{mirror.workPattern}</p>
          </section>
          <section>
            <span>我先不急着下结论，因为</span>
            <p>{mirror.evidenceBoundary}</p>
          </section>
        </div>
        <div className="mirror-feedback">
          {["这很像我", "不完全是", "我想补充"].map((item) => (
            <button
              key={item}
              className={feedback === item ? "active" : ""}
              onClick={() => {
                if (item === "这很像我") saveFeedback(item);
                else setFeedback(item);
              }}
            >
              {item}
            </button>
          ))}
        </div>
        {feedback === "不完全是" && (
          <div className="feedback-panel">
            <strong>哪里不准确？</strong>
            {correctionOptions.map((option) => (
              <button
                key={option}
                className={selectedCorrection === option ? "active" : ""}
                onClick={() => {
                  setSelectedCorrection(option);
                  onFeedback?.({ type, choice: "不完全是", detail: option });
                }}
              >
                {option}
              </button>
            ))}
          </div>
        )}
        {feedback === "我想补充" && (
          <div className="feedback-panel">
            <strong>补充一句你觉得更准确的说法</strong>
            <textarea
              value={detail}
              placeholder="比如：我不是想转行，而是不想继续做低自主权的执行工作。"
              onChange={(event) => setDetail(event.target.value)}
              onBlur={() => detail.trim() && onFeedback?.({ type, choice: "我想补充", detail })}
            />
            <button
              className={detail.trim() ? "active" : ""}
              disabled={!detail.trim()}
              onClick={() => onFeedback?.({ type, choice: "我想补充", detail })}
            >
              保存补充
            </button>
          </div>
        )}
      </article>
      <div className="next-signal">
        <p>下面，我想进一步了解你。</p>
        <strong>{mirror.nextValidation}</strong>
      </div>
    </>
  );
}

function InsightPage({
  type,
  careerResult,
  projectResult,
  strategyResult,
  projectCards,
  onMirrorFeedback,
  directionInterviewStarted,
  projectInterviewStarted,
  onRunProjects,
  onRunStrategy,
  onRenderResume
}) {
  const mirror = buildMirror(type, careerResult, projectResult, strategyResult);
  const advice = buildAdvice(type, careerResult, projectResult, strategyResult);
  if (type === "direction") {
    const resumeOnly = !directionInterviewStarted;
    const narratives = asArray(careerResult?.narratives).slice(0, 3);
    const action = nextActionOf(careerResult, resumeOnly ? "ask_direction_questions" : "run_project_mining");
    const nextConfig = (() => {
      if (action === "ask_direction_questions") return { label: resumeOnly ? "开始第一轮访谈" : "继续确认职业方向", onClick: () => goTo("interview", "direction") };
      if (resumeOnly && action === "ask_direction_questions") return { label: "开始第一轮访谈", onClick: () => goTo("interview", "direction") };
      if (action === "run_resume_strategy" || action === "render_resume") return { label: "直接生成简历策略", onClick: onRunStrategy };
      if (action === "ask_project_questions") return { label: "进入第二轮访谈", onClick: onRunProjects };
      if (action === "run_project_mining" || !resumeOnly) return { label: "判断项目证据", onClick: onRunProjects };
      return { label: "开始第一轮访谈", onClick: () => goTo("interview", "direction") };
    })();
    return (
      <section className="solo-page">
        <MirrorCard
          type={type}
          mirror={mirror}
          title={resumeOnly ? "我们从你简历中发现的事" : "这一轮留下来的线索"}
          onFeedback={onMirrorFeedback}
        />
        <AdviceCard advice={advice} />
        <div className="insight-grid">
          <div className="stack-list">
            {narratives.map((item, index) => (
              <article className="thin-card" key={`${item.title || index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.title || "候选主叙事"}</strong>
                <p>{asArray(item.evidence)[0] || item.risk || "证据还需要继续确认。"}</p>
              </article>
            ))}
          </div>
          <article className="asset-card">
            <span>暂时进入资产库的内容</span>
            <p>{careerResult?.recommendedTrack || "候选方向还需要继续验证。"}</p>
            <p>{careerResult?.assetUpdates?.keywords || "关键词会在项目证据确认后再收束。"}</p>
          </article>
        </div>
        <InsightAction nextText={nextConfig.label} onNext={nextConfig.onClick} />
      </section>
    );
  }

  if (type === "projects") {
    const projects = asArray(projectResult?.priorityProjects).slice(0, 4);
    const metricPlan = asArray(projectResult?.metricPlan).slice(0, 3);
    const action = nextActionOf(projectResult, shouldAskUser(projectResult) ? "ask_project_questions" : "run_resume_strategy");
    const nextConfig = (() => {
      if (action === "ask_project_questions") return { label: projectInterviewStarted ? "继续补充项目事实" : "开始第二轮访谈", onClick: () => goTo("interview", "projects") };
      return { label: "判断简历缺口", onClick: onRunStrategy };
    })();
    return (
      <section className="solo-page">
        <MirrorCard
          type={type}
          mirror={mirror}
          onFeedback={onMirrorFeedback}
        />
        <AdviceCard advice={advice} />
        <div className="project-list">
          {(projects.length ? projects : projectCards).slice(0, 4).map((item, index) => (
            <article className="project-row" key={`${item.name || item.id || index}`}>
              <div>
                <strong>{item.name || "待命名项目"}</strong>
                <p>{item.why || projectSummary(item) || item.context || "需要继续补充角色、行动和指标。"}</p>
              </div>
              <span className="pill">{item.priority || item.resumePriority || "待确认"}</span>
            </article>
          ))}
        </div>
        {metricPlan.length > 0 && (
          <div className="asset-card">
            <span>还需要补强的证据</span>
            <p>{metricPlan.map((item) => `${item.project || "项目"}：${asArray(item.resultMetrics).join("、") || "结果指标待补"}`).join(" / ")}</p>
          </div>
        )}
        <InsightAction nextText={nextConfig.label} onNext={nextConfig.onClick} />
      </section>
    );
  }

  const gapAction = nextActionOf(strategyResult, shouldAskUser(strategyResult) ? "ask_resume_gap_questions" : "render_resume");
  const gapNextConfig = (() => {
    if (gapAction === "ask_resume_gap_questions") return { label: "开始第三轮访谈", onClick: () => goTo("interview", "gaps") };
    return { label: "查看简历策略", onClick: onRenderResume || (() => goTo("resume")) };
  })();
  return (
    <section className="solo-page">
      <MirrorCard
        type={type}
        mirror={mirror}
        onFeedback={onMirrorFeedback}
      />
      <AdviceCard advice={advice} />
      <div className="deliverable-grid">
        <article className="hero-card">
          <FileText size={24} />
          <h2>{strategyResult?.positioning || strategyResult?.headline || "简历定位待生成"}</h2>
          <p>{asArray(strategyResult?.keywordOrder).slice(0, 6).join(" / ") || "下一步查看策略和预览。"}</p>
        </article>
        <article className="hero-card light">
          <BadgeCheck size={24} />
          <h2>暂时还不能写太满的地方</h2>
          <p>{asArray(strategyResult?.pendingQuestions).slice(0, 4).join(" / ") || "没有明显未确认问题，仍建议预览后检查版式和措辞。"}</p>
        </article>
      </div>
      <InsightAction nextText={gapNextConfig.label} onNext={gapNextConfig.onClick} />
    </section>
  );
}

function ProjectEditorPage({ card, patchCard, busy, onSave }) {
  if (!card) return <GuardPage title="没有找到这张项目卡" text="回到项目列表选择一张卡片。" target="projects" />;
  return (
    <section className="solo-page compact">
      <div className="page-head">
        <p className="eyebrow">Project</p>
        <h1>{card.name || "编辑项目卡"}</h1>
        <p>重点确认角色、行动、指标和公开边界。没有结果指标时，先补过程指标。</p>
      </div>
      <div className="edit-form">
        <label>
          项目名称
          <input value={card.name || ""} onChange={(event) => patchCard({ name: event.target.value })} />
        </label>
        <label>
          我的角色
          <input value={card.role || ""} onChange={(event) => patchCard({ role: event.target.value })} />
        </label>
        <label className="wide">
          项目背景
          <textarea value={card.context || ""} onChange={(event) => patchCard({ context: event.target.value })} />
        </label>
        <label className="wide">
          关键行动
          <textarea value={listToText(card.actions)} onChange={(event) => patchCard({ actions: textToList(event.target.value) })} />
        </label>
        <label>
          结果指标
          <textarea value={listToText(card.resultMetrics)} onChange={(event) => patchCard({ resultMetrics: textToList(event.target.value) })} />
        </label>
        <label>
          过程指标
          <textarea value={listToText(card.processMetrics)} onChange={(event) => patchCard({ processMetrics: textToList(event.target.value) })} />
        </label>
        <label>
          证明的能力
          <textarea value={listToText(card.skills)} onChange={(event) => patchCard({ skills: textToList(event.target.value) })} />
        </label>
        <label>
          公开边界
          <select value={card.publicDisplay || "needs_sanitization"} onChange={(event) => patchCard({ publicDisplay: event.target.value })}>
            <option value="yes">可公开</option>
            <option value="needs_sanitization">需脱敏</option>
            <option value="concept_only">只展示方法</option>
            <option value="no">不可公开</option>
          </select>
        </label>
        <label className="wide">
          简历 bullet
          <textarea value={card.resumeBullet || ""} onChange={(event) => patchCard({ resumeBullet: event.target.value })} />
        </label>
      </div>
      <div className="step-actions end">
        <GhostButton onClick={() => goTo("projects")}>返回项目</GhostButton>
        <PrimaryButton icon={Save} onClick={onSave} disabled={busy}>保存</PrimaryButton>
      </div>
    </section>
  );
}

function ResumePage({ strategy, renderResult, artifacts, busy, onStrategy, onRender }) {
  return (
    <section className="solo-page">
      <div className="page-head">
        <p className="eyebrow">Step 05</p>
        <h1>生成简历策略和预览。</h1>
        <p>这里先给出写作策略，再生成 HTML 预览和 PDF。版式问题要在预览后检查。</p>
      </div>
      <div className="deliverable-grid">
        <article className="hero-card">
          <FileText size={24} />
          <h2>{strategy?.positioning || strategy?.headline || "还没有简历策略"}</h2>
          <p>{strategy ? asArray(strategy.keywordOrder).slice(0, 5).join(" / ") || "已生成策略。" : "先基于职业画像和项目证据生成策略。"}</p>
          <PrimaryButton icon={busy ? Loader2 : Sparkles} onClick={onStrategy} disabled={busy}>
            {strategy ? "重新生成策略" : "生成简历策略"}
          </PrimaryButton>
        </article>
        <article className="hero-card light">
          <Globe2 size={24} />
          <h2>{artifacts?.resumeHtml ? "简历预览已生成" : "生成 HTML 预览"}</h2>
          <p>{renderResult?.findings?.length ? renderResult.findings.join(" / ") : "生成后检查排版和导出文件。"}</p>
          <PrimaryButton icon={busy ? Loader2 : FileText} onClick={onRender} disabled={busy}>
            生成预览和 PDF
          </PrimaryButton>
        </article>
      </div>
      <div className="artifact-links">
        {artifacts?.resumeHtml && <a href={appUrl(artifacts.resumeHtml.url)} target="_blank" rel="noreferrer">打开 HTML 预览</a>}
        {artifacts?.resumePdf && <a href={appUrl(artifacts.resumePdf.url)} target="_blank" rel="noreferrer">打开 PDF</a>}
        {artifacts?.renderReport && <a href={appUrl(artifacts.renderReport.url)} target="_blank" rel="noreferrer">查看检查报告</a>}
      </div>
      <div className="step-actions end">
        <GhostButton onClick={() => goTo("insight", "projects")}>查看项目证据</GhostButton>
        <PrimaryButton icon={Target} onClick={() => goTo("jd")}>可选：分析 JD</PrimaryButton>
      </div>
    </section>
  );
}

function JdPage({ jdInput, setJdInput, result, busy, onRun }) {
  return (
    <section className="solo-page compact">
      <div className="page-head">
        <p className="eyebrow">Optional</p>
        <h1>有目标岗位时，再做 JD 分析。</h1>
        <p>JD 不是主流程。它用于判断是否值得投、差距在哪里，以及简历应该突出哪些证据。</p>
      </div>
      <div className="jd-layout">
        <textarea
          className="jd-textarea"
          value={jdInput}
          placeholder="把目标岗位 JD 粘贴在这里。"
          onChange={(event) => setJdInput(event.target.value)}
        />
        <article className="thin-card">
          <strong>{result?.headline || "定性匹配结果会显示在这里"}</strong>
          <p>{result ? asArray(result.resumeAdjustment || result.rejectionRisk || result.matches).slice(0, 3).map((item) => typeof item === "string" ? item : item.requirement || item.advice).filter(Boolean).join(" / ") : "没有 JD 可以直接跳过，回到主流程优化简历。"}</p>
        </article>
      </div>
      <div className="step-actions end">
        <GhostButton onClick={() => goTo("landing")}>回到首页</GhostButton>
        <PrimaryButton icon={busy ? Loader2 : Sparkles} onClick={onRun} disabled={busy || !jdInput.trim()}>
          分析 JD
        </PrimaryButton>
      </div>
    </section>
  );
}

function DevPage({ state }) {
  return (
    <section className="solo-page compact dev-page">
      <div className="page-head">
        <p className="eyebrow">Dev</p>
        <h1>调试信息</h1>
        <p>用户流程不会展示这些内容。</p>
      </div>
      <pre>{JSON.stringify({
        stage: state?.orchestrator?.stage,
        resume: state?.resumeMeta,
        actions: state?.orchestrator?.actions,
        artifacts: state?.artifacts
      }, null, 2)}</pre>
    </section>
  );
}

function GuardPage({ title, text, target }) {
  return (
    <section className="step-page">
      <div className="step-copy">
        <p className="eyebrow">需要前置步骤</p>
        <h1>{title}</h1>
        <p>{text}</p>
        <PrimaryButton onClick={() => goTo(target)}>继续</PrimaryButton>
      </div>
    </section>
  );
}

function App() {
  const [route, setRoute] = useState(routeFromHash);
  const [state, setState] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState({});
  const [answersHydrated, setAnswersHydrated] = useState(false);
  const [jdInput, setJdInput] = useState("");
  const [jdHydrated, setJdHydrated] = useState(false);
  const [projectDrafts, setProjectDrafts] = useState([]);
  const [projectsHydrated, setProjectsHydrated] = useState(false);

  async function loadState() {
    const next = await api("/state");
    setState(next);
  }

  async function resetFlow() {
    const confirmed = window.confirm("重置后会保留已上传简历，但清空本轮诊断、回答、项目卡、简历策略和导出预览。确定重置吗？");
    if (!confirmed) return;
    setBusy(true);
    setStatus("正在重置流程...");
    try {
      const result = await api("/reset", { method: "POST", body: JSON.stringify({}) });
      window.sessionStorage.removeItem("career-web-waiting");
      setAnswers({});
      setAnswersHydrated(false);
      setJdInput("");
      setJdHydrated(false);
      setProjectDrafts([]);
      setProjectsHydrated(false);
      await loadState();
      setStatus("流程已重置。");
      goTo(result.resumeMeta ? "diagnosis" : "upload");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    if (route.view === "waiting" || route.view === "insight") {
      setStatus("");
    }
    scrollPageToTop();
  }, [route.view, route.id]);

  useEffect(() => {
    loadState().catch((error) => setStatus(error.message));
  }, []);

  useEffect(() => {
    if (!state?.intake?.careerDirectionAnswersJson || answersHydrated) return;
    setAnswers(parseSavedAnswers(state.intake.careerDirectionAnswersJson));
    setAnswersHydrated(true);
  }, [state?.intake?.careerDirectionAnswersJson, answersHydrated]);

  useEffect(() => {
    if (jdHydrated || state?.intake?.jd === undefined) return;
    setJdInput(String(state.intake.jd || "").replace(/^# JD\s*/i, "").trim());
    setJdHydrated(true);
  }, [state?.intake?.jd, jdHydrated]);

  useEffect(() => {
    if (projectsHydrated || !state?.projectCards) return;
    setProjectDrafts(state.projectCards);
    setProjectsHydrated(true);
  }, [state?.projectCards, projectsHydrated]);

  const careerResult = state?.llmResults?.career_direction?.result || null;
  const projectResult = state?.llmResults?.project_mining?.result || null;
  const strategyResult = state?.llmResults?.resume_strategy?.result || null;
  const renderResult = state?.llmResults?.resume_render?.result || null;
  const jdResult = state?.llmResults?.jd_fit?.result || null;
  const directionInterviewStarted = isDirectionInterviewStarted(state);
  const projectInterviewStarted = isProjectInterviewStarted(state);
  const activeRoundKey = route.view === "interview" ? route.id || "direction" : "direction";
  const activeRound = interviewRounds[activeRoundKey] || interviewRounds.direction;

  const interviewQuestions = useMemo(() => {
    if (activeRoundKey === "projects") {
      const dynamic = projectQuestionsFromResult(projectResult);
      return dynamic.length ? dynamic : projectQuestionFallback;
    }
    if (activeRoundKey === "gaps") {
      const dynamic = gapQuestionsFromResult(strategyResult);
      return dynamic.length ? dynamic : gapQuestionFallback;
    }
    const dynamic = asArray(careerResult?.questions)
      .slice(0, 3)
      .map((item, index) => ({
        id: item.id || `dynamic_${index + 1}`,
        question: item.question || item,
        placeholder: item.why || "写真实想法即可。"
      }))
      .filter((item) => item.question);
    return dynamic.length ? dynamic : questionFallback;
  }, [activeRoundKey, careerResult, projectResult]);

  const activeProject = projectDrafts.find((item) => item.id === route.id);

  useEffect(() => {
    if (route.view !== "waiting" || !state || busy) return;
    const context = readWaiting(route.id) || waitingCopy[route.id];
    if (context?.jobId) return;
    const hasResult = route.id === "resume_render"
      ? Boolean(state?.llmResults?.resume_render?.result || state?.artifacts?.resumeHtml)
      : Boolean(state?.llmResults?.[route.id]?.result);
    if (hasResult && context?.next) goPath(context.next);
  }, [route.view, route.id, state, busy]);

  useEffect(() => {
    if (!state || busy) return;
    if (route.view === "interview" && route.id === "projects" && !directionInterviewStarted && !projectResult) {
      goTo("interview", "direction");
    }
  }, [route.view, route.id, state, busy, directionInterviewStarted, careerResult, projectResult]);

  function gate(stepId) {
    return state?.orchestrator?.actions?.[stepId] || { allowed: true, reason: "" };
  }

  async function uploadAndContinue() {
    if (!selectedFile && state?.resumeMeta) {
      goTo(careerResult ? "diagnosis" : "diagnosis");
      return;
    }
    if (!selectedFile) {
      setStatus("请先选择 PDF 或 DOCX 简历。");
      return;
    }
    setBusy(true);
    setStatus("正在解析简历...");
    try {
      const base64 = await fileToBase64(selectedFile);
      await api("/intake/resume", {
        method: "POST",
        body: JSON.stringify({
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
          base64
        })
      });
      setSelectedFile(null);
      await loadState();
      setStatus("简历已解析。");
      goTo("diagnosis");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  function buildAnswerPayload(currentQuestions) {
    const questionMap = new Map(
      [...questionFallback, ...projectQuestionFallback, ...gapQuestionFallback, ...currentQuestions].map((item) => [item.id, item.question])
    );
    const ids = new Set([...Object.keys(answers), ...currentQuestions.map((item) => item.id)]);
    return Array.from(ids).map((id) => ({
      id,
      question: questionMap.get(id) || id,
      answer: answers[id] || ""
    }));
  }

  async function runStep(stepId, nextView, fallbackView, waitingOverrides = {}) {
    const actionGate = gate(stepId);
    if (!actionGate.allowed) {
      setStatus(actionGate.reason);
      return;
    }
    if (stepId !== "resume_render" && !state?.llm?.hasKey) {
      setStatus("本地还没有可用模型 Key。");
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      if (stepId === "jd_fit") {
        await api("/intake/jd", {
          method: "POST",
          body: JSON.stringify({ content: jdInput })
        });
      }
      const response = await api(`/jobs/${stepId}`, { method: "POST", body: JSON.stringify({}) });
      startWaiting(stepId, {
        jobId: response.job.id,
        next: nextView || waitingCopy[stepId]?.next,
        fallback: fallbackView || waitingCopy[stepId]?.fallback,
        ...waitingOverrides
      });
    } catch (error) {
      setStatus(error.message);
      goPath(fallbackView || waitingCopy[stepId]?.fallback || "diagnosis");
    } finally {
      setBusy(false);
    }
  }

  async function saveInterviewRound() {
    setBusy(true);
    setStatus("正在保存回答...");
    try {
      await api("/intake/career-direction-answers", {
        method: "POST",
        body: JSON.stringify({
          answers: buildAnswerPayload(interviewQuestions)
        })
      });
      const response = await api(`/jobs/${activeRound.stepId}`, { method: "POST", body: JSON.stringify({}) });
      setStatus("");
      startWaiting(activeRound.stepId, {
        jobId: response.job.id,
        next: activeRound.next,
        fallback: activeRound.fallback
      });
    } catch (error) {
      setStatus(error.message);
      goPath(activeRound.fallback);
    } finally {
      setBusy(false);
    }
  }

  async function saveProjects(nextView = "") {
    setBusy(true);
    setStatus("正在保存项目卡...");
    try {
      const next = await api("/project-cards", {
        method: "POST",
        body: JSON.stringify({ cards: projectDrafts })
      });
      setProjectDrafts(next.cards || projectDrafts);
      await loadState();
      setStatus("项目卡已保存。");
      if (nextView) goTo(nextView);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveMirrorFeedback(payload) {
    try {
      await api("/intake/mirror-feedback", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    } catch (error) {
      setStatus(`反馈暂时没有保存：${error.message}`);
    }
  }

  function patchProjectCard(patch) {
    setProjectDrafts((current) =>
      current.map((item) => (item.id === route.id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item))
    );
  }

  if (!state && route.view !== "landing") {
    return (
      <main className="loading-page">
        <Loader2 className="spin" size={26} />
        <span>正在打开...</span>
      </main>
    );
  }

  if (route.view === "landing") return <LandingPage />;

  return (
    <StepShell view={route.view} status={status} busy={busy} onReset={resetFlow} state={state}>
      {route.view === "upload" && (
        <UploadPage
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          resumeMeta={state?.resumeMeta}
          busy={busy}
          onUpload={uploadAndContinue}
        />
      )}
      {route.view === "diagnosis" && (
        <DiagnosisPage
          result={careerResult}
          resumeMeta={state?.resumeMeta}
          busy={busy}
          onRun={() => runStep("career_direction", "diagnosis", "diagnosis", initialDiagnosisWaiting)}
          onAskDirection={() => goTo("interview", "direction")}
          onRunProjects={() => runStep("project_mining", "insight/projects", "diagnosis")}
          onRunStrategy={() => runStep("resume_strategy", "insight/gaps", "diagnosis")}
        />
      )}
      {route.view === "interview" && (
        <InterviewPage
          round={activeRound}
          questions={interviewQuestions}
          answers={answers}
          setAnswers={setAnswers}
          busy={busy}
          onSave={saveInterviewRound}
          readOnly={isRouteReadOnly(route, state)}
        />
      )}
      {route.view === "projects" && (
        <ProjectsPage
          result={projectResult}
          cards={projectDrafts}
          busy={busy}
          onMine={() => runStep("project_mining", "insight/projects", "projects")}
          onSave={() => saveProjects()}
          onResume={() => runStep("resume_strategy", "insight/gaps", "projects")}
        />
      )}
      {route.view === "project" && (
        <ProjectEditorPage
          card={activeProject}
          patchCard={patchProjectCard}
          busy={busy}
          onSave={() => saveProjects("projects")}
        />
      )}
      {route.view === "resume" && (
        <ResumePage
          strategy={strategyResult}
          renderResult={renderResult}
          artifacts={state?.artifacts}
          busy={busy}
          onStrategy={() => runStep("resume_strategy", "resume", "resume")}
          onRender={() => runStep("resume_render", "resume", "resume")}
        />
      )}
      {route.view === "jd" && (
        <JdPage
          jdInput={jdInput}
          setJdInput={setJdInput}
          result={jdResult}
          busy={busy}
          onRun={() => runStep("jd_fit", "jd", "jd")}
        />
      )}
      {route.view === "insight" && (
        <InsightPage
          type={route.id}
          careerResult={careerResult}
          projectResult={projectResult}
          strategyResult={strategyResult}
          projectCards={projectDrafts}
          onMirrorFeedback={saveMirrorFeedback}
          directionInterviewStarted={directionInterviewStarted}
          projectInterviewStarted={projectInterviewStarted}
          onRunProjects={() => runStep("project_mining", "insight/projects", "insight/direction")}
          onRunStrategy={() => runStep("resume_strategy", "insight/gaps", "insight/projects")}
          onRenderResume={() => goTo("resume")}
        />
      )}
      {route.view === "waiting" && <WaitingPage stepId={route.id} busy={busy} onRefresh={loadState} />}
      {route.view === "dev" && <DevPage state={state} />}
      {!["upload", "diagnosis", "interview", "projects", "project", "resume", "jd", "insight", "waiting", "dev"].includes(route.view) && (
        <GuardPage title="页面不存在" text="回到首页重新开始。" target="landing" />
      )}
    </StepShell>
  );
}

export default App;
