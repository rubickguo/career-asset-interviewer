# Skill Routing Guide

Use this guide when deciding which skill should handle a user request. `agents/openai.yaml` is UI metadata only; the primary trigger surface is each `SKILL.md` frontmatter description plus this routing guide.

## career-direction-interviewer

Use when the user says or implies:

- 不知道职业方向 / 想重新定位 / 想知道自己适合什么。
- 有旧简历，希望先聊清楚方向。
- 想区分不喜欢、做不好、门槛高、预设困难。
- 需要方向排序、职业主叙事、核心关键词。

Do not use for:

- Final resume writing.
- JD fit conclusion.
- Website implementation.

## resume-story-builder

Use when the user already has direction, keywords, or project notes and wants:

- Resume bullets.
- Project cards.
- STAR stories.
- Self-introduction.
- Resume ambiguity, missing metrics, layout, HTML/PDF repair.

Do not use for:

- Initial career direction discovery.
- JD fit diagnosis.
- Website style decisions.

## jd-fit-strategist

Use only after user understanding exists and the user provides:

- A JD.
- A target role.
- A job posting screenshot or text.
- A request to judge whether a role is worth applying to.

Do not use before `profile.md`, `directions.md`, and `keywords.md` are sufficiently clear. If the JD arrives early, route to `career-direction-interviewer` first and ask why the user wants the role.

## personal-site-builder

Use after career assets exist and the user wants:

- Personal website.
- Portfolio site.
- Career homepage.
- Website style reference analysis.

Do not use when the user only wants a resume. If project evidence is missing, route to `resume-story-builder` first.
