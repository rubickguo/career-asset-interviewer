# 职业 Skills Pack

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
├── orchestration.md
└── safety_boundaries.md
```

## 每个 Skill 负责什么

- `$career-direction-interviewer`：用户不清楚方向时使用，负责自我理解、职业主叙事、方向排序和核心关键词。
- `$jd-fit-strategist`：用户有目标 JD 或目标岗位时使用，负责岗位能力模型、匹配度、差距和投递策略。
- `$resume-story-builder`：用户已有职业资产后使用，负责简历 bullet、项目卡、STAR 面试故事和自我介绍。
- `$personal-site-builder`：用户要个人网站或作品集时使用，负责审美访谈、参考站点分析、网站文案和实现。

## 推荐调用链路

```text
不知道方向：
career-direction-interviewer -> resume-story-builder
```

```text
有明确 JD：
jd-fit-strategist -> resume-story-builder
```

```text
要个人网站：
career-direction-interviewer 或 resume-story-builder -> personal-site-builder
```

## 共享职业资产协议

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

## 后续优化

后续需要逐项解决的问题见：

[OPTIMIZATION_BACKLOG.zh-CN.md](OPTIMIZATION_BACKLOG.zh-CN.md)
