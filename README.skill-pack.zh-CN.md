# 职业 Skills Pack

[旧版单体 skill 中文说明](LEGACY_README.zh-CN.md)

这个仓库现在拆成了一组聚焦的职业类 Codex skills：职业方向深访、JD 匹配策略、简历故事构建、个人网站构建。

之前的单一 `career-asset-interviewer` 覆盖范围过大，容易导致触发泛化、上下文污染和输出不稳定。现在每个 skill 只负责一个清晰工作流，并通过统一的职业资产协议衔接。

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
