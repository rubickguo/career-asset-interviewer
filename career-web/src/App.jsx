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
    question: "如果先不急着换赛道，你希望下一份工作和现在最大的不同是什么？",
    placeholder: "可以从工作内容、团队环境、成长空间、判断权、强度、收入或作品感里选。这里不是让你做决定，只是先看你真正想改变什么。"
  },
  {
    id: "change_scope",
    question: "如果还是做当前岗位，但换一个业务、团队或公司，你觉得问题会缓解吗？",
    placeholder: "如果会，说明问题可能不在职业本身；如果不会，我们再认真看转向。你可以直接写直觉，不需要证明自己。"
  },
  {
    id: "strengths",
    question: "过去别人最容易在什么时候依赖你？",
    placeholder: "不用写成优势。写具体场景：混乱时找你拆问题、上线前找你兜底、需要判断时找你拿主意、需要推进时找你协调。"
  },
  {
    id: "dislikes",
    question: "有哪些工作状态，是你不想再回去的？",
    placeholder: "可以写“不想做什么”，也可以写“不想再处在什么状态”。比如低自主权、只有执行没有判断、做完没有反馈、长期高压但没有成长。"
  }
];

const projectQuestionFallback = [
  {
    id: "project_most_valuable",
    question: "如果只允许留下 2-3 个项目，你最不想删掉哪几个？",
    placeholder: "写项目名之外，也写为什么舍不得删：它证明了你的判断、推进、技术深度、业务理解、结果，还是某种别人看不见的能力。"
  },
  {
    id: "project_role_boundary",
    question: "这些项目里，哪些判断是你做的？哪些只是你执行的？",
    placeholder: "不用夸大。我们要分清：你定义了问题、设计了方案、做了关键取舍，还是主要负责实现和交付。边界越清楚，简历越可信。"
  },
  {
    id: "project_metrics",
    question: "这些项目有没有能被别人相信的变化？",
    placeholder: "优先写结果指标；没有结果就写过程和质量：效率、稳定性、规模、覆盖范围、错误减少、交付周期、使用人数、被复用次数。"
  },
  {
    id: "life_experience",
    question: "有没有一段“不像工作经历”，但其实能解释你的经历？",
    placeholder: "比如游戏、社区、内容、开源、长期研究某类产品、组织过某个活动。它不一定写进简历，但可能帮助我们理解你为什么适合某个方向。"
  }
];

const gapQuestionFallback = [
  {
    id: "resume_ambiguity",
    question: "如果面试官追问，你最担心哪一段说不清楚？",
    placeholder: "可能是年限、岗位名称、项目时间、负责范围、数据口径、离职原因、是否主导。写担心点，不用先组织答案。"
  },
  {
    id: "weak_claims",
    question: "有哪些能力你想让别人看见，但现在证据还不够硬？",
    placeholder: "比如架构设计、从 0 到 1、增长、管理、AI 落地、复杂协作。我们先标出来，不急着写成优势。"
  },
  {
    id: "priority_order",
    question: "如果简历只能让别人记住一个你，你希望他们记住什么？",
    placeholder: "这会决定项目和关键词的顺序。可以写一个身份、一类能力，或者一个你不想被误读的边界。"
  },
  {
    id: "resume_constraints",
    question: "还有哪些内容必须谨慎处理？",
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
    cta: "整理这一轮线索",
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
    cta: "整理项目线索",
    stepId: "project_mining",
    next: "insight/projects",
    fallback: "interview/projects",
    back: "interview/direction"
  },
  gaps: {
    index: 3,
    total: 3,
    eyebrow: "第三轮",
    title: "把模糊的地方说清楚。",
    description: "这一轮处理那些容易被追问的地方。不是为了包装，而是避免把不确定的内容写成过度确定的优势。",
    cta: "形成简历策略",
    stepId: "resume_strategy",
    next: "insight/gaps",
    fallback: "interview/gaps",
    back: "interview/projects"
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

function parseSavedAnswers(raw) {
  try {
    const parsed = JSON.parse(raw || "{}");
    return Object.fromEntries((parsed.answers || []).map((item) => [item.id, item.answer || ""]));
  } catch {
    return {};
  }
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

function StepShell({ view, status, busy, onReset, children }) {
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
              onClick={() => goTo(item.key)}
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
  const progressWidth = Math.min(92, 22 + elapsed * (elapsed < 18 ? 3.4 : 1.2));
  const waitMessage =
    elapsed >= 35
      ? "信息有点多，你可以先干些别的。页面会继续等待结果，完成后会自动进入下一步。"
      : elapsed >= 18
        ? "马上就好，正在把你的回答和简历放在一起看，避免太早下结论。"
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
          <span style={{ width: `${progressWidth}%` }} />
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

function DiagnosisPage({ result, resumeMeta, busy, onRun }) {
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
  return (
    <section className="solo-page">
      <div className="page-head">
        <p className="eyebrow">Step 02</p>
        <h1>先看初步判断。</h1>
        <p>这些是“待验证假设”，不是最终职业定位。下一步要通过访谈确认。</p>
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
      <div className="step-actions end">
        <GhostButton onClick={() => goTo("upload")}>返回简历</GhostButton>
        <PrimaryButton onClick={() => goTo("interview", "direction")}>继续深访</PrimaryButton>
      </div>
    </section>
  );
}

function InterviewPage({ round, questions, answers, setAnswers, busy, onSave }) {
  return (
    <section className="solo-page compact">
      <div className="page-head">
        <p className="eyebrow">{round.eyebrow}</p>
        <h1>{round.title}</h1>
        <p>{round.description}</p>
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
              onChange={(event) => setAnswers((current) => ({ ...current, [item.id]: event.target.value }))}
            />
          </label>
        ))}
      </div>
      <div className="step-actions end">
        <GhostButton onClick={() => goPath(round.back)}>返回</GhostButton>
        <PrimaryButton icon={busy ? Loader2 : BadgeCheck} onClick={onSave} disabled={busy}>
          {round.cta}
        </PrimaryButton>
      </div>
    </section>
  );
}

function ProjectsPage({ result, cards, busy, onMine, onSave }) {
  if (!result && !cards.length) {
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
        {cards.map((card) => (
          <article key={card.id} className="project-row">
            <div>
              <strong>{card.name || "未命名项目"}</strong>
              <p>{projectSummary(card) || card.context || "需要继续补充证据。"}</p>
            </div>
            <div className="row-actions">
              {card.confirmed && <span className="pill">已确认</span>}
              <button onClick={() => goTo("project", card.id)}>编辑</button>
            </div>
          </article>
        ))}
      </div>
      <div className="step-actions end">
        <GhostButton icon={Save} onClick={onSave} disabled={busy}>保存项目卡</GhostButton>
        <PrimaryButton onClick={() => goTo("resume")}>生成简历策略</PrimaryButton>
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

function MirrorCard({ mirror, nextText, onBack, onNext }) {
  const [feedback, setFeedback] = useState("");
  return (
    <>
      <article className="mirror-card">
        <p className="eyebrow">这一轮留下来的线索</p>
        <h2>刚才这段里，最重要的可能是：</h2>
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
            <button key={item} className={feedback === item ? "active" : ""} onClick={() => setFeedback(item)}>
              {item}
            </button>
          ))}
        </div>
        {feedback === "不完全是" && (
          <div className="feedback-panel">
            <strong>哪里不准确？</strong>
            <button>不是方向问题，更像环境问题</button>
            <button>不是想转行，只是想提高收入</button>
            <button>不是缺判断空间，是缺成长路径</button>
            <button>不是讨厌执行，是讨厌没有反馈</button>
          </div>
        )}
      </article>
      <div className="next-signal">
        <p>下面，我想进一步了解你。</p>
        <strong>{mirror.nextValidation}</strong>
      </div>
      <div className="step-actions end">
        <GhostButton onClick={onBack}>回去调整</GhostButton>
        <PrimaryButton onClick={onNext}>{nextText}</PrimaryButton>
      </div>
    </>
  );
}

function InsightPage({ type, careerResult, projectResult, strategyResult, projectCards }) {
  const mirror = buildMirror(type, careerResult, projectResult, strategyResult);
  if (type === "direction") {
    const narratives = asArray(careerResult?.narratives).slice(0, 3);
    return (
      <section className="solo-page">
        <MirrorCard
          mirror={mirror}
          nextText="继续看项目证据"
          onBack={() => goTo("interview", "direction")}
          onNext={() => goTo("interview", "projects")}
        />
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
      </section>
    );
  }

  if (type === "projects") {
    const projects = asArray(projectResult?.priorityProjects).slice(0, 4);
    const metricPlan = asArray(projectResult?.metricPlan).slice(0, 3);
    return (
      <section className="solo-page">
        <MirrorCard
          mirror={mirror}
          nextText="继续补齐简历缺口"
          onBack={() => goTo("interview", "projects")}
          onNext={() => goTo("interview", "gaps")}
        />
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
      </section>
    );
  }

  return (
    <section className="solo-page">
      <MirrorCard
        mirror={mirror}
        nextText="查看简历策略"
        onBack={() => goTo("interview", "gaps")}
        onNext={() => goTo("resume")}
      />
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
        <GhostButton onClick={() => goTo("projects")}>返回项目</GhostButton>
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
  const activeRoundKey = route.view === "interview" ? route.id || "direction" : "direction";
  const activeRound = interviewRounds[activeRoundKey] || interviewRounds.direction;

  const interviewQuestions = useMemo(() => {
    if (activeRoundKey === "projects") {
      return projectQuestionFallback;
    }
    if (activeRoundKey === "gaps") {
      const metricQuestions = asArray(projectResult?.metricPlan)
        .slice(0, 3)
        .map((item, index) => ({
          id: `metric_gap_${index + 1}`,
          question: `${item.project || `项目 ${index + 1}`} 还缺哪些更可信的指标？`,
          placeholder: "优先补结果指标；如果没有结果指标，补过程指标、质量指标、规模或复杂度。"
        }));
      return metricQuestions.length ? [...metricQuestions, ...gapQuestionFallback] : gapQuestionFallback;
    }
    const dynamic = asArray(careerResult?.questions)
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

  async function runStep(stepId, nextView, fallbackView) {
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
        fallback: fallbackView || waitingCopy[stepId]?.fallback
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
    <StepShell view={route.view} status={status} busy={busy} onReset={resetFlow}>
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
          onRun={() => runStep("career_direction", "diagnosis", "diagnosis")}
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
        />
      )}
      {route.view === "projects" && (
        <ProjectsPage
          result={projectResult}
          cards={projectDrafts}
          busy={busy}
          onMine={() => runStep("project_mining", "insight/projects", "projects")}
          onSave={() => saveProjects()}
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
