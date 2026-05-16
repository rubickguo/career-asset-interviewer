# 职业 Skills Pack

[旧版单体 skill 中文说明](LEGACY_README.zh-CN.md)

把零散、复杂、很难直接写进简历的职业经历，整理成可长期复用的职业资产库。

这套 Skills Pack 面向的不是“换个模板就能解决”的求职场景，而是更复杂的职业表达问题：经历跨度大、项目难以外部化、想换方向但证据还没整理清楚、需要同时准备简历、JD 策略、面试故事和个人网站。

这个仓库现在拆成了一组聚焦的职业类 Codex skills：职业方向深访、JD 匹配策略、简历故事构建、个人网站构建。

之前的单一 `career-asset-interviewer` 覆盖范围过大，容易导致触发泛化、上下文污染和输出不稳定。现在每个 skill 只负责一个清晰工作流，并通过统一的职业资产协议衔接。

## 核心价值

- **先判断方向，再写材料**：避免一上来就润色简历，先确认用户真正适合和愿意追求什么。
- **把项目证据拆清楚**：区分背景、角色、动作、指标、证据强度和市场价值。
- **输出可复用资产库**：`career-assets/` 可以继续支持简历、JD、面试、自我介绍和个人网站。
- **避免虚假包装**：可以突出优势，但不把参与写成 owner，不把协作写成管理，不编造指标。

## 设计哲学

这个项目的核心不是“帮用户把简历写得更漂亮”，而是先建立对用户的真实理解，再决定应该如何表达。

求职材料的问题通常不只是措辞问题，而是更前置的判断问题：

- 用户到底想继续当前职业，还是想换方向？
- 用户说“不想做”的事情，是真不喜欢，还是因为过去环境不好、预设了困难、缺少信息或缺少证据？
- 用户擅长什么、喜欢什么、过去经历里真正有市场价值的证据是什么？
- 简历里应该凸显的核心关键词是什么，哪些关键词没有证据、不应该硬写？
- 一个项目到底是在证明业务理解、工程复杂度、协作推进、结果负责，还是只是“做过一个需求”？

所以这个 skill pack 的默认顺序是：

```text
先理解人
-> 再确认方向和关键词
-> 再深挖项目证据
-> 最后优化简历、JD 策略或个人网站
```

所有 skill 都遵循同一个原则：**先了解用户，再给建议和操作**。如果用户画像、方向、关键词和证据不清楚，skill 应该先追问，而不是直接生成一份看似完整但泛化的材料。

## 和常见简历工具的不同

市面上很多工具以“上传简历 -> 改写措辞 -> 生成模板”为主，解决的是表达层的浅问题。这个项目刻意把重心放在表达之前：

- **不是简历润色器**：不会只把原句改得更像 AI 文案，而是先判断哪些经历值得写、哪些要弱化、哪些还缺证据。
- **不是 JD 打分器**：JD 分析是可选附加流程，不用虚假的数字匹配分；只做定性、客观的 fit/gap 判断。
- **不是通用模板生成器**：个人网站必须读取用户画像、职业身份、审美偏好和参考网站。C 端产品、B 端产品、技术建设者、管理者的网站不应长得一样。
- **不是鼓励包装**：默认语气是客观、知性、克制。可以劝退不合适岗位，也会标记证据不足和风险。
- **不是一次性输出**：核心产物是 `career-assets/` 下的职业资产库，后续简历、JD、面试、自我介绍、个人网站都从同一套用户理解里生成。

这套设计更适合认真求职、转型判断、复杂经历梳理，以及需要长期复用职业素材的人。

## Skills

```text
skills/
├── career-direction-interviewer/
├── jd-fit-strategist/
├── resume-story-builder/
└── personal-site-builder/
shared/
├── career_asset_schema.md
├── feedback_tips.md
├── orchestration.md
├── output_boundaries.md
├── product_principles.md
├── protocol_version.md
├── skill_routing.md
└── safety_boundaries.md
```

## 目录说明

`skills/` 是真正会被 Codex 触发的技能目录。每个子目录都是一个独立工作流，里面通常包含 `SKILL.md`、`agents/openai.yaml`，以及按需加载的 `references/` 和输出模板 `assets/`。

- `career-direction-interviewer/`：负责第一轮职业方向深访，帮助用户先理解自己，产出职业方向排序、主叙事和定位关键词。
- `resume-story-builder/`：负责把已经确认的职业资产转成简历 bullet、项目卡、STAR 面试故事、自我介绍，以及简历 HTML/PDF 版式检查规则。
- `jd-fit-strategist/`：可选附加流程。用户提供 JD 后，负责拆解岗位能力模型、做定性匹配、判断是否值得投，以及给出简历调整策略。
- `personal-site-builder/`：可选附加流程。基于用户画像、审美偏好、参考网站和项目公开边界，生成个人网站/作品集方案或实现。

`shared/` 是所有 skill 共同读取的规则和协议目录。它本身不是一个会被单独触发的 skill，而是保证多个 skill 不跑偏的“共同底座”。

- `product_principles.md`：全局产品原则，核心是“先了解用户，再给建议和操作”。
- `output_boundaries.md`：定义每个 skill 能做什么、不能做什么，避免职责混乱。
- `orchestration.md`：定义 skill 之间的调用顺序，区分主流程和可选附加流程。
- `career_asset_schema.md`：定义 `career-assets/` 下用户画像、方向、关键词、项目卡等结构化文件格式。
- `protocol_version.md`：声明共享职业资产协议版本，避免上下游 skill 字段不兼容。
- `skill_routing.md`：补充四个 skill 的触发场景和路由规则。
- `safety_boundaries.md`：定义真实性、隐私、风险表达等边界。
- `feedback_tips.md`：提供如何收集真实反馈的轻量提示，目前不是正式迭代闭环。

## 每个 Skill 负责什么

- `$career-direction-interviewer`：用户需要结构化理解自己、澄清职业方向、确定职业主叙事和核心关键词时使用。
- `$jd-fit-strategist`：完成用户理解后，用户有目标 JD 或目标岗位时使用，负责岗位能力模型、定性匹配、差距和投递策略。
- `$resume-story-builder`：用户已有职业资产后使用，负责简历 bullet、项目卡、STAR 面试故事和自我介绍。
- `$personal-site-builder`：用户要个人网站或作品集时使用，基于职业资产、审美偏好和参考站点负责网站文案和实现。

## 简历优化方法

这个项目里的“简历优化”不是最后一步的文字润色，而是一套从判断到交付的流程。

### 1. 先做职业方向深访

即使用户只是说“帮我优化简历”，也需要先确认：

- 是否优先延续当前职业轨道。
- 是否真的想转岗，还是只是想换公司、业务、团队、强度、薪资或成长空间。
- 用户不想做的事情属于真实不喜欢、坏经验、硬限制、能力缺口，还是预设困难。
- 用户希望市场记住自己的主身份是什么。

第一版重点覆盖互联网行业的主要职能：产品、运营/增长、程序员/技术建设者，并辅助考虑管理类岗位；AI 和游戏作为领域分支处理。

### 2. 从简历和访谈里提炼核心关键词

简历不是从模板开始，而是从关键词开始。skill 会判断：

- 哪些关键词是主叙事，例如 Node 后端、B 端产品、内容生态、增长、平台工具、AI workflow。
- 每个关键词是否有强证据、弱证据或缺证据。
- 哪些关键词只是用户做过，但不想被定义成这个身份。
- 哪些关键词适合主简历，哪些只适合 JD 定制版或面试故事。

弱证据关键词不能直接放到显眼位置；缺证据但有潜力的方向应该进入追问或小实验。

### 3. 深挖项目证据，而不是只改 bullet

`resume-story-builder` 会把项目拆成：

- 业务背景：为什么这个项目重要。
- 用户角色：用户负责什么，有没有 owner 范围和决策权。
- 行动和判断：做了什么非显而易见的取舍。
- 结果指标：业务结果、效率提升、质量改善、规模、稳定性等。
- 过程指标：如果没有最终结果，至少补充过程规模、复杂度、覆盖范围、上线节奏。
- 证据置信度：哪些数据确定，哪些需要确认口径。

如果用户有和目标岗位相关的生活经历，也应该挖掘。例如找游戏公司工作时，职业战队、高分段玩家、社区组织、创作者经历都可能成为有价值证据。

### 4. 重写简历时保持客观和可验证

简历表达必须遵循：

- 把最有结果的数据放在前面。
- 指标名称要对招聘方有意义，不只写“提升 xx%”。
- 没有结果指标时，优先寻找过程指标；真的没有指标时，调整项目顺序，不硬造数据。
- 不把参与需求包装成 owner，不把协作经历包装成管理经验。
- 可以突出优势，但不夸大、不虚构、不制造不可验证的叙事。

### 5. 版式和 PDF 是简历质量的一部分

最终简历不能只给 Markdown。格式化简历应遵循：

```text
生成 HTML 预览
-> 检查版式
-> 导出 PDF
-> 再次检查 PDF
-> 修复空白、断行、分页和可读性问题
```

重点避免：

- 大片空白。
- 单字或单词单独成行。
- 为了压成一页纸导致字体不可读。
- HTML 预览正常但 PDF 导出后分页错乱。
- 中英文混排换行不自然。

仓库提供了基础脚本：

```bash
node scripts/check-resume-html.mjs ./exports/resume.html
node scripts/render-resume-pdf.mjs ./exports/resume.html ./exports/resume.pdf
```

## 推荐调用链路

```text
不知道方向：
career-direction-interviewer -> resume-story-builder
```

```text
有明确 JD：
career-direction-interviewer（如果职业资产不完整）-> jd-fit-strategist -> resume-story-builder
```

```text
要个人网站：
career-direction-interviewer 或 resume-story-builder（如果职业资产不完整）-> personal-site-builder
```

## 共享职业资产协议

所有 skill 遵循同一个产品原则：先了解用户，再给建议和操作。JD 分析和个人网站都是可选附加流程，不能替代“职业深访 -> 简历素材构建”这条主流程。

所有 skill 通过 `career-assets/` 下的结构化文件衔接：

```text
career-assets/
├── profile.md
├── directions.md
├── keywords.md
├── projects.md
├── skills-evidence.md
├── jd-fit.md
├── resume-stories.md
└── website-brief.md
```

具体字段见 [shared/career_asset_schema.md](shared/career_asset_schema.md)。

初始化一份本地职业资产目录：

```bash
node scripts/init-career-assets.mjs ./career-assets
```

常用脚本：

```bash
node scripts/check-career-assets.mjs ./career-assets
node scripts/check-resume-html.mjs ./exports/resume.html
node scripts/render-resume-pdf.mjs ./exports/resume.html ./exports/resume.pdf
```

轻量测试样例见 [tests/evaluation_matrix.md](tests/evaluation_matrix.md)。

## 当前状态

当前讨论过的核心优化已经落到 skill pack 里：主流程、JD 可选附加、个人网站读取用户画像、简历版式/PDF 检查、量化指标、生活经历挖掘、反馈获取 tips 都已经有对应文件承接。

仓库保留 [OPTIMIZATION_BACKLOG.zh-CN.md](OPTIMIZATION_BACKLOG.zh-CN.md) 作为实现记录和未来扩展清单。里面的 P2 内容属于后续增强，例如更多匿名测试样例、更多行业模板差异化，不影响当前版本使用。
