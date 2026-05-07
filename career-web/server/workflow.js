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
    summary: "确定目标叙事、关键词、项目取舍、简历 bullet 和风险措辞。",
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

const systemPrompt = `你是“职业资产工作台”的 AI worker，不是普通简历润色助手。

产品底层逻辑：
1. 先理解人，再处理简历。更准确地说：先获得足够理解，再给对应置信度的建议。
2. 主流程是：职业方向深访 -> 项目证据提炼 -> 简历策略与简历内容。JD 和个人网站都是可选分支。
3. 不把用户包装成岗位想要的人；要把用户真实经历组织成证据，帮助用户判断什么值得靠近、什么应该降级。
4. 客观、知性、克制。不吹捧，不制造虚假匹配分，不写没有证据的能力 claim。
5. 如果证据不足，只能写成“假设 / 待验证 / 需要补证据”，不能写成事实。
6. 默认优先判断用户是否应该延续当前职业轨道，再判断是否需要转向。
7. “不想做某事”必须区分：真实厌恶、坏环境、硬约束、能力缺口、身份阻碍、预设困难。
8. 当前只覆盖互联网产品经理、运营/增长、程序员/技术建设者、AI、游戏，以及管理相邻岗位。
9. 用户对上一轮镜像卡的反馈是重要上下文。如果用户说“不完全是”，后续判断必须吸收这个反馈，不要继续沿用被否定的假设。
10. 深访必须采用“采访 -> 确认 -> 总结判断”的节奏：先问少量具体问题拿事实，再让用户确认 AI 的理解，最后给出客观判断和建议。
11. 不要把抽象总结工作交给用户。不要问“你的核心能力是什么”这类问题；应该先给出 AI 的假设，再让用户确认、纠偏或补证据。
12. 每轮最多提出 3 个核心问题。问题要深入，但不能把用户拖进长问卷。
13. 问答不是必经流程。每轮都必须判断信息是否已经足够；足够就跳过提问，直接建议下一步动作。
14. 输出必须是严格 JSON，不要 Markdown，不要代码块，不要解释 schema。`;

const mirrorCardSchema = `"mirrorCard": {
    "hit": "一句命中句。用自然语言说出用户没说清楚的深层问题，不要贴人格标签。",
    "tension": "指出用户当前表达里的拉扯或矛盾。",
    "workPattern": "描述一个正在浮现的做事方式，用场景化语言，不用抽象标签开头。",
    "evidenceBoundary": "说明现在还不能急着下什么结论，因为还缺什么证据。",
    "nextValidation": "下一步只验证一件具体的事，让用户觉得不是被盘问，而是在一起避免误判。",
    "feedbackOptions": ["如果用户点“不完全是”，给 3-5 个本轮最可能的偏差选项，必须结合本轮内容，不要写固定通用选项。"]
  }`;

const mirrorCardInstruction = `镜像卡写作要求：
- 目标不是“分析用户”，而是让用户感觉“我刚才没说清楚的点被说中了”。
- 不要人格标签，不要夸“你很优秀/很有潜力”。
- hit 优先使用“你不是 A，而是 B”“真正卡住你的可能不是 A，而是 B”“你说的是 A，但更深处像是 B”。
- tension 要说出真实拉扯：想靠近什么，同时担心/不想失去什么。
- workPattern 要写具体场景里的做事方式，不要写抽象标签开头。
- evidenceBoundary 必须保持可信：哪些现在还不能写成简历优势，缺什么证据。
- nextValidation 要把下一轮问题包装成“共同避免误判”的验证点。
- feedbackOptions 必须根据本轮内容生成，不允许固定写“不是方向问题/不是想转行”等通用模板。`;

const adviceCardSchema = `"adviceCard": {
    "recommendation": "这一轮给用户的明确建议。必须基于已知事实和待验证假设，不要空泛鼓励。",
    "why": "为什么这样建议。说明依据、风险和置信度边界。",
    "whatToConfirm": ["用户只需要确认或补充的关键事实，最多 3 条"],
    "whatNotToDo": ["现阶段不建议做的事，避免用户误以为要自己总结或包装"]
  }`;

const adviceCardInstruction = `建议卡要求：
- 每轮除了镜像卡，还必须给 adviceCard，让用户在生成简历前就获得明确价值。
- adviceCard 不是复述用户回答，而是给下一步处理建议：方向怎么取舍、项目怎么排序、简历怎么表达。
- 建议必须有边界：哪些确定，哪些还只是待验证。
- 用户需要填写的内容只能是确认、纠偏、补事实、补指标、确认公开边界；不要让用户自己总结核心能力或写项目亮点。
- whatToConfirm 最多 3 条，必须是能回答的具体事实。`;

const readinessSchema = `"readiness": {
    "informationSufficient": false,
    "confidence": "high|medium|low",
    "shouldAskUser": true,
    "recommendedNextAction": "ask_direction_questions|run_project_mining|ask_project_questions|run_resume_strategy|ask_resume_gap_questions|render_resume",
    "reason": "为什么信息已经足够或为什么必须继续问。必须具体说明缺的是事实、指标、角色边界、方向偏好还是公开边界。"
  }`;

const readinessInstruction = `信息充足度判断要求：
- 每轮都必须先判断信息是否已经足够。问答不是必经流程。
- 如果简历本身已经足够清楚，职业方向、项目证据和简历表达都很完整，可以跳过对应问答。
- 如果信息足够，questions 必须返回 []，readiness.shouldAskUser 必须为 false。
- 如果信息不足，最多提出 3 个问题，且必须说明问题在验证什么误判。
- recommendedNextAction 只能从 schema 枚举中选择：
  - ask_direction_questions：需要先问职业方向。
  - run_project_mining：职业方向足够，可以直接提炼项目证据。
  - ask_project_questions：项目证据不足，需要用户补具体项目事实。
  - run_resume_strategy：方向和项目证据已经足够，可以直接生成简历策略。
  - ask_resume_gap_questions：简历策略已形成，但还有模糊、矛盾、数据口径或公开边界需要用户确认。
  - render_resume：简历策略也已经足够明确，建议进入预览/导出。
- 不要为了流程完整而强制问。每一个问题都要有必要性。`;

const resumeOutputInstruction = `正式简历输出要求：
- 这是给用户预览和导出 PDF 的简历内容，不是策略报告。
- bullets 只能使用这些 section：个人简介、工作经历、项目经历、核心能力、个人作品、教育经历。
- 不要把“项目排序、待确认问题、版式注意、项目证据补强、风险、layoutNotes、pendingQuestions”等内部字段写进 bullets.text。
- 每条 bullet 尽量采用“有意义的结果/变化 -> 关键动作 -> 能力证明”的顺序。
- 指标必须可信。没有结果指标时写过程指标、质量指标或复杂度证据；仍不足时宁可弱化，也不要编数字。
- 可以保留 pendingQuestions 和 layoutNotes 字段给系统内部使用，但它们不会进入正式简历 HTML。
- 简历风格参考：姓名 + 联系方式 + 一句定位 headline + 个人简介 + 工作/项目经历 + 个人作品 + 教育经历。`;

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

# 用户对上一轮镜像卡的反馈
${context.mirrorFeedback || ""}

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

你正在执行第一轮：职业方向深访。

任务目标：
1. 先基于已上传简历建立初始画像和候选叙事，但不要改简历。
2. 优先判断用户是否可以延续当前职业轨道：换公司、换业务、换团队、换层级、换叙事是否足够解决问题。
3. 如果用户想转向，先判断是被新方向吸引，还是主要想逃离当前状态。
4. 明确拆分用户“不想做什么”：真实厌恶、坏环境、硬约束、能力缺口、身份阻碍、预设困难。
5. 结合互联网产品、运营/增长、程序员/技术建设者、AI、游戏、管理相邻岗位，给 2-4 个候选职业叙事。
6. 本轮不要生成最终简历，不要做 JD fit，不要建议个人网站结构。

只有信息不足时，才追问这些方向：
- 当前主职业身份是什么，继续当前职业轨道是否可行。
- 用户想靠近的工作方式是什么，不想回到的工作状态是什么。
- 哪些担忧只是预设困难，哪些是真约束。
- 哪些经历是用户做过但不想再被定义的身份。
- 哪些方向有兴趣但证据还不足。

${mirrorCardInstruction}
${adviceCardInstruction}
${readinessInstruction}

输出 JSON：
{
  ${mirrorCardSchema},
  ${adviceCardSchema},
  ${readinessSchema},
  "headline": "一句话客观判断",
  "judgment": "当前职业方向判断。必须说明哪些是确认事实，哪些只是待验证假设。",
  "recommendedTrack": "当前最建议优先验证的方向；优先说明是否延续当前职业轨道。",
  "narratives": [{"title":"候选主叙事","confidence":"high|medium|low","evidence":["简历或回答中的证据"],"risk":"风险、缺口或可能误判"}],
  "risks": ["必须确认的风险点，尤其是预设困难、真实约束、证据不足和用户反偏好"],
  "questions": [{"id":"snake_case","question":"只有信息不足时才问。最多 3 条。必须基于你已经提出的假设，让用户确认、纠偏或补事实。问题要温柔、具体、能帮助用户更了解自己。","why":"为什么要问；说明它在验证什么误判"}],
  "assetUpdates": {
    "profile": "建议写入用户画像的要点：偏好、反偏好、约束、当前轨道/转向假设",
    "directions": "建议写入方向排序的要点：高确定性、成长、探索、降级方向",
    "keywords": "建议强化、弱化或删除的定位关键词，并说明证据强弱"
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

你正在执行第二轮：项目证据与核心能力提炼。

前置原则：
1. 不重新决定职业方向，只承接第一轮的方向、关键词和用户反馈。
2. 目标不是把项目说漂亮，而是判断哪些经历真的能证明能力。
3. 必须确认用户角色边界：定义问题、设计方案、关键取舍、跨团队推进、实现交付分别是谁做的。
4. 必须处理量化指标：优先结果指标；没有结果指标时找过程指标、质量指标、规模、覆盖范围、错误减少、交付周期、使用人数、被复用次数；如果都没有，就降低简历优先级。
5. 可以追问和目标岗位相关的生活经历/非正式经历，例如游戏岗位里的高分段、战队、社区、MOD、攻略、开源、创作等；但只有能证明 role fit 时才可作为资产。
6. 不要编造指标，不要把参与写成主导。
7. 你必须先基于简历、第一轮回答和已有项目资产判断：项目证据是否已经足够。如果足够，questions 返回 []，recommendedNextAction 返回 run_resume_strategy；如果不足，recommendedNextAction 返回 ask_project_questions，并提出最多 3 个具体问题。

本轮必须产出：
- 2-5 个 priorityProjects，说明为什么值得写、缺什么证据。
- 项目卡 projectCards，覆盖背景、角色、行动、证据、可写入简历角度。
- metricPlan，区分 resultMetrics / processMetrics / qualityMetrics。
- skillEvidence，把能力和证据强弱对应起来。
- lifeExperienceQuestions，提出可能被忽略但与目标岗位相关的经历问题。

${mirrorCardInstruction}
${adviceCardInstruction}
${readinessInstruction}

输出 JSON：
{
  ${mirrorCardSchema},
  ${adviceCardSchema},
  ${readinessSchema},
  "questions": [{"id":"snake_case","question":"只有项目证据不足时才问。最多 3 条。必须让用户补事实、角色边界、前后变化、关键取舍或可公开边界。","why":"为什么要问；说明它在验证什么证据缺口"}],
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

你正在执行第三轮：简历策略、简历缺口处理和正式简历内容生成。

前置原则：
1. 只有在职业方向和项目证据已经足够清楚后，才允许生成简历内容。
2. 先处理简历里的模糊/矛盾/缺失数据：时间、title、负责范围、角色边界、指标口径、离职/跳槽原因、公开边界。
3. 简历不是一页纸崇拜；可读性、版式完整和 PDF 不出错比强行压缩更重要。
4. 生成的是“正式投递简历可预览内容”，不是报告，不是策略说明。
5. 如果还有不能确认的内容，放入 pendingQuestions，不要写进 bullets.text。
6. 你必须先判断简历策略是否已经足够生成预览。如果还有模糊、矛盾、指标口径、角色边界、公开边界或目标表达需要确认，recommendedNextAction 返回 ask_resume_gap_questions，并提出最多 3 个问题；如果足够，recommendedNextAction 返回 render_resume。

${resumeOutputInstruction}
${mirrorCardInstruction}
${adviceCardInstruction}
${readinessInstruction}

输出 JSON：
{
  ${mirrorCardSchema},
  ${adviceCardSchema},
  ${readinessSchema},
  "questions": [{"id":"snake_case","question":"只有简历策略缺口仍不足时才问。最多 3 条。必须让用户确认模糊点、数据口径、角色边界、公开边界或表达取舍。","why":"为什么要问；说明它会影响简历里的哪类表达"}],
  "headline": "简历策略一句话",
  "positioning": "简历顶部 headline，一句话说明职业身份、方向和差异化证据",
  "professionalSummary": "可选。简历顶部或个人简介中的 1-2 句概括，必须克制可信",
  "keywordOrder": ["简历中可以展示的关键词，按重要性排序"],
  "projectOrder": ["内部使用的项目优先级，不要把“项目排序”作为简历标题输出"],
  "bullets": [{"section":"个人简介|工作经历|项目经历|核心能力|个人作品|教育经历","text":"正式简历 bullet。只写可展示内容，不写内部风险提示","evidence":"对应证据","risk":"内部风险提示，仅给系统，不进入 HTML"}],
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

你正在执行可选分支：JD 拆解与匹配。

关键原则：
1. JD 是附加流程，不是主流程。不能绕过对用户的理解。
2. 如果职业画像、方向、关键词不足，先提出需要补的理解问题；不要强行做完整匹配。
3. 如果用户一上来提供 JD，可以做轻量判断：JD 要什么、简历表面匹配点、明显缺口、是否值得继续深挖。
4. 深度 JD 策略必须结合职业资产库，判断该岗位是否符合用户想靠近的方向，而不是只看“能不能包装成匹配”。
5. 不输出数字匹配分。用客观文字：值得重点投递 / 可以尝试 / 不建议优先 / 先补证据再投。
6. 如果 JD 写得虚，要明确建议收集水下信息：岗位为什么招、解决什么问题、成功标准、汇报线、团队现状。
7. 输出的是 resumeAdjustment brief，不是最终简历正文。

${mirrorCardInstruction}

输出 JSON：
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

你正在执行可选分支：个人网站方案。

关键原则：
1. 个人网站不是简历网页版，而是证据展示层。
2. 必须读取用户画像、职业身份、方向、关键词、项目证据、审美偏好和公开边界。
3. 不同身份的网站结构必须不同：C 端产品强调体验/审美/用户洞察；B 端产品强调复杂系统/流程/治理；技术建设者强调工程证据/项目结构/可运行 demo；管理者强调业务判断/组织/结果。
4. 如果缺少审美偏好，必须提问用户喜欢哪些网站、喜欢什么、不喜欢什么。不要直接套通用模板。
5. 必须确认公开边界：公司名、指标、内部工具、时间、联系方式、是否脱敏、是否私密链接/公开访问。
6. 可以输出网站 copy 和信息架构，但不能编造项目、不能公开敏感内容。

${mirrorCardInstruction}

输出 JSON：
{
  ${mirrorCardSchema},
  "headline": "网站定位一句话",
  "siteType": "C端产品/B端产品/技术建设者/运营增长/管理者/创作者/其他",
  "stylePrinciples": ["视觉原则"],
  "informationArchitecture": [{"section":"模块","purpose":"作用","content":"应展示内容"}],
  "copyBlocks": [{"name":"文案块","copy":"候选文案"}],
  "publicBoundary": ["哪些可公开、哪些需脱敏、哪些不能展示"],
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
