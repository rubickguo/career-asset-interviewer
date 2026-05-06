export const workflowSteps = [
  {
    id: "resume_parse",
    title: "简历解析",
    owner: "script",
    summary: "PDF/DOCX 文本抽取、页数、字符数、解析警告。",
    reason: "这是确定性工程问题，不需要 LLM。"
  },
  {
    id: "career_direction",
    title: "职业方向深访",
    owner: "llm",
    summary: "基于简历和回答判断主轨道、转向意愿、风险点和下一轮追问。",
    reason: "需要理解动机、偏好、约束和经历之间的关系。"
  },
  {
    id: "project_mining",
    title: "项目证据提炼",
    owner: "llm",
    summary: "挖掘项目背景、个人贡献、量化指标、过程指标和可迁移能力。",
    reason: "需要判断哪些经历值得展开、哪些只是噪音。"
  },
  {
    id: "resume_strategy",
    title: "简历策略",
    owner: "llm",
    summary: "确定目标叙事、关键词、项目排序、简历 bullet 和风险措辞。",
    reason: "需要结合用户画像和职业方向做表达取舍。"
  },
  {
    id: "resume_render",
    title: "简历预览与导出",
    owner: "script",
    summary: "HTML 预览、版式检查、PDF 导出、空白和断行检查。",
    reason: "排版质量应该由脚本和浏览器渲染验证，而不是凭 LLM 猜测。"
  },
  {
    id: "jd_fit",
    title: "JD 可选匹配",
    owner: "llm",
    summary: "拆解 JD，和用户证据做定性匹配，给出客观投递建议。",
    reason: "需要理解岗位隐含要求和用户证据强弱。"
  },
  {
    id: "personal_site",
    title: "个人网站",
    owner: "llm_and_frontend",
    summary: "LLM 产出内容策略和风格 brief，前端实现与设计检查负责落地。",
    reason: "内容策略需要 LLM，视觉实现和适配需要工程化验证。"
  }
];

export const runnableSteps = new Set(["career_direction", "project_mining", "resume_strategy", "resume_render", "jd_fit", "personal_site"]);

const systemPrompt = `你是一个客观、知性的职业发展分析助手。核心原则：
1. 先获得足够理解，再给对应置信度的建议；不要把初步假设写成最终判断。
2. 不吹捧，不用虚假的匹配分，不做无证据包装。
3. 默认优先判断用户是否应该延续当前职业轨道，再判断是否转向。
4. 只覆盖互联网产品、运营、程序员、AI、游戏及管理类相邻岗位。
5. 每轮输出都要包含一张“镜像卡”：不是人格标签，不夸人，而是用克制、精准、有停顿感的语言，把用户表达里的真实张力、隐含需求、工作模式、证据边界和下一步验证说清楚。
6. 镜像卡的语言要像“继续往深处说”，不要像报告目录。优先使用“你不是 A，而是 B”“真正卡住你的可能不是 A，而是 B”“我先不急着下结论，因为……”这类结构。
7. 输出必须是 JSON，不要 Markdown。`;

const mirrorCardSchema = `"mirrorCard": {
    "hit": "一句命中句。用自然语言说出用户没说清楚的深层问题，不要贴人格标签。",
    "tension": "指出用户当前表达里的拉扯或矛盾。",
    "workPattern": "描述一个正在浮现的做事方式，用场景化语言，不用抽象标签开头。",
    "evidenceBoundary": "说明现在还不能急着下什么结论，因为还缺什么证据。",
    "nextValidation": "下一步只验证一件具体的事，让用户觉得不是被盘问，而是在一起避免误判。"
  }`;

function baseUserContext(context) {
  return `# 已解析简历
${context.resumeText || "未上传或未解析"}

# 职业画像
${context.profile || ""}

# 方向排序
${context.directions || ""}

# 关键词
${context.keywords || ""}

# 项目卡
${context.projects || ""}

# 技能证据
${context.skillsEvidence || ""}

# 简历素材
${context.resumeStories || ""}

# 用户职业方向回答
${context.careerAnswers || ""}

# JD
${context.jdText || ""}

# 网站偏好
${context.websiteBrief || ""}`;
}

const prompts = {
  career_direction: (context) => [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `${baseUserContext(context)}

请完成职业方向深访分析。输出 JSON：
{
  ${mirrorCardSchema},
  "headline": "一句话客观判断",
  "judgment": "当前职业方向判断，说明不确定性",
  "recommendedTrack": "当前最建议优先验证的方向",
  "narratives": [{"title":"候选主叙事","confidence":"high|medium|low","evidence":["证据"],"risk":"风险或缺口"}],
  "risks": ["必须确认的风险点"],
  "questions": [{"id":"snake_case","question":"下一轮必须问的问题","why":"为什么要问"}],
  "assetUpdates": {
    "profile": "建议写入用户画像的要点",
    "directions": "建议写入方向排序的要点",
    "keywords": "建议强化或删除的关键词"
  },
  "nextStep": "下一步建议"
}`
    }
  ],
  project_mining: (context) => [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `${baseUserContext(context)}

请进入项目证据提炼。输出 JSON：
{
  ${mirrorCardSchema},
  "headline": "项目素材当前质量判断",
  "priorityProjects": [{"name":"项目名","priority":"P0|P1|P2","why":"为什么值得写","missing":["缺失证据"],"questions":["需要追问的问题"]}],
  "metricPlan": [{"project":"项目名","resultMetrics":["结果指标"],"processMetrics":["过程指标"],"qualityMetrics":["质量指标"]}],
  "projectCards": [{"name":"项目名","context":"背景","role":"用户角色","actions":["行动"],"evidence":["证据"],"resumePotential":"可写入简历的角度"}],
  "skillEvidence": [{"skill":"能力","evidenceStrength":"strong|medium|weak|missing","proof":"证据","missing":"缺口"}],
  "lifeExperienceQuestions": ["和目标岗位相关、可能被忽略的生活/社区/开源/游戏经历问题"],
  "nextStep": "下一步建议"
}`
    }
  ],
  resume_strategy: (context) => [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `${baseUserContext(context)}

请生成简历策略，不要生成最终 PDF。输出 JSON：
{
  ${mirrorCardSchema},
  "headline": "简历策略一句话",
  "positioning": "简历顶部定位",
  "keywordOrder": ["关键词排序"],
  "projectOrder": ["项目排序"],
  "bullets": [{"section":"工作经历/项目经历/技能","text":"bullet","evidence":"对应证据","risk":"风险"}],
  "selfIntroduction": "30-60秒自我介绍",
  "starStories": [{"project":"项目","situation":"背景","task":"任务","action":"行动","result":"结果"}],
  "layoutNotes": ["版式注意点"],
  "pendingQuestions": ["改写前还必须确认的问题"],
  "nextStep": "下一步建议"
}`
    }
  ],
  jd_fit: (context) => [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `${baseUserContext(context)}

请做 JD 拆解和用户证据匹配。没有 JD 时要求用户补充 JD。输出 JSON：
{
  ${mirrorCardSchema},
  "headline": "是否值得投递的客观判断",
  "jdRequirements": [{"requirement":"要求","priority":"must|important|nice","hiddenExpectation":"隐含期待"}],
  "matches": [{"requirement":"要求","userEvidence":"用户证据","fit":"strong|partial|weak|missing","advice":"建议"}],
  "resumeAdjustment": ["针对该 JD 的简历调整策略"],
  "rejectionRisk": ["可能被筛掉的原因"],
  "nextStep": "下一步建议"
}`
    }
  ],
  personal_site: (context) => [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `${baseUserContext(context)}

请生成个人网站方案。必须读取用户画像、职业身份和审美偏好。输出 JSON：
{
  ${mirrorCardSchema},
  "headline": "网站定位一句话",
  "siteType": "C端产品/B端产品/技术建设者/管理者/其他",
  "stylePrinciples": ["视觉原则"],
  "informationArchitecture": [{"section":"模块","purpose":"作用","content":"应展示内容"}],
  "copyBlocks": [{"name":"文案块","copy":"候选文案"}],
  "frontendNotes": ["前端实现和设计检查注意点"],
  "questions": ["还需要问用户的审美或内容问题"],
  "nextStep": "下一步建议"
}`
    }
  ]
};

export function buildMessages(stepId, context) {
  const build = prompts[stepId];
  if (!build) throw new Error(`Unsupported LLM step: ${stepId}`);
  return build(context);
}

export function parseJsonResult(content) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("LLM response was not valid JSON.");
    return JSON.parse(match[0]);
  }
}

export function resultToMarkdown(step, result, meta = {}) {
  const lines = [`# ${step.title}`, "", `- Step: ${step.id}`, `- Model: ${meta.model || "unknown"}`, `- Created at: ${meta.createdAt || new Date().toISOString()}`, ""];
  if (result.headline) lines.push(`## 结论`, "", result.headline, "");
  for (const [key, value] of Object.entries(result)) {
    if (key === "headline") continue;
    lines.push(`## ${key}`, "");
    lines.push(typeof value === "string" ? value : JSON.stringify(value, null, 2));
    lines.push("");
  }
  return lines.join("\n");
}
