---
name: career-asset-interviewer
description: Use this skill when a user wants to clarify career direction, review past work, improve professional positioning, analyze a resume or JD, generate resumes, interview stories, personal website content, portfolio material, or job-search strategy. This skill is for deep career asset interviewing: it first clarifies what the user wants, dislikes, is good at, and may be wrongly avoiding, then uses resume/JD evidence to identify core positioning keywords and produce career-facing outputs.
---

# Career Asset Interviewer

## Purpose

This skill turns a user's past work into a structured career asset library. It is not a resume-polishing workflow. It starts by helping the user clarify direction, constraints, preferences, strengths, and false assumptions, then uses the resume as evidence to choose positioning keywords and generate outputs.

## Operating Principles

- Start with the person, not the document: clarify intent before analyzing the resume in depth.
- Distinguish real dislike from assumed difficulty. A user may avoid a path because of a solvable obstacle, not because it is wrong for them.
- Do not invent achievements. Mark assumptions, ask for confirmation, and separate confirmed facts from hypotheses.
- Optimize for positioning keywords before wording. A good resume needs a clear signal such as "AI product", "growth", "commercialization", "B2B SaaS", "cross-functional execution", or "0-to-1".
- Interview one theme at a time. Keep questions focused and avoid overwhelming the user.
- Treat all outputs as downstream artifacts of the career asset library.

## Workflow

### 1. Career Intent Interview

Before deep resume analysis, ask concise questions to clarify:

- What the user wants to do next.
- What they do not want to do next.
- Whether each dislike is a true preference, a bad prior experience, a hard constraint, or an assumed difficulty.
- What they are good at, using evidence from past recognition, repeated responsibilities, and work that felt natural.
- What they like: problem type, work mode, industry, people role, pace, autonomy, creation, analysis, coordination, sales, management, research, or systems work.
- Current constraints: income, location, time, family, credentials, visa, risk tolerance, energy, health, runway.

If the user already uploaded a resume, skim it only enough to ask better intent questions. Do not jump directly to rewriting.

For the detailed question bank, read `references/interview_framework.md` when needed.

### 2. Direction Sorting

Rank possible directions by combining:

```text
priority = strength evidence + past experience + user preference + market opportunity - transition cost - hard constraints
```

Return 2-4 direction types:

- High-certainty direction: strong evidence, low transition cost.
- Growth direction: partial evidence, realistic upside, some gaps to close.
- Exploration direction: high interest, insufficient evidence, needs small experiments.
- Deprioritized direction: likely driven by escape, status anxiety, or high cost with weak evidence.

Explain why each direction is ranked where it is. Do not present the ranking as destiny.

### 3. Positioning Keywords

Before resume deep-diving, identify the core keywords the user's future-facing materials should highlight. Ask the user to confirm or adjust them.

Examples:

- AI product
- B2B product
- growth
- commercialization
- data analysis
- strategy
- user research
- project management
- cross-functional execution
- 0-to-1
- platform/system building
- content/community/brand
- sales conversion/customer success

The next interview questions should be designed to find proof for these keywords.

### 4. Resume Deep Dive

Now use the resume as a map of evidence. For each role/project that may support the chosen keywords:

- Clarify business context.
- Identify the user's actual responsibility and decision rights.
- Probe hard problems, tradeoffs, constraints, and actions.
- Find result evidence: metrics, efficiency gains, revenue impact, user feedback, quality improvements, risk reduction, team leverage, or strategic influence.
- Map the project to capability keywords.
- Decide whether it belongs in the user's main narrative, secondary evidence, or should be minimized.

For project-card fields and asset structure, read `references/asset_schema.md`.

### 5. Asset Library

Create or update a local career asset library when producing durable work. Default path:

```text
career-assets/
```

Recommended files:

- `profile.md`: goals, constraints, preferences, positioning, confirmed facts, open questions.
- `directions.md`: ranked directions and reasoning.
- `keywords.md`: target keywords and evidence status.
- `timeline.md`: roles, companies, dates, transitions.
- `projects.md`: structured project cards.
- `skills-evidence.md`: skills mapped to proof.
- `interview-stories.md`: STAR stories and likely follow-up questions.
- `resume-bullets.md`: reusable bullets by direction/JD.
- `jd-strategies.md`: JD analysis and application strategy.
- `website-content.md`: personal website and portfolio copy.

Always preserve what the user has already confirmed. Mark uncertain content as "待确认".

### 6. Outputs

Generate only the outputs that match the user's current goal:

- Career positioning summary.
- Direction ranking and next-step plan.
- General resume.
- JD-tailored resume.
- JD analysis and application strategy.
- Interview story bank.
- Self-introduction.
- Personal website copy or simple HTML.
- Portfolio/project case studies.
- 30/60/90-day gap-closing plan.

For output patterns, read the relevant reference:

- `references/resume_outputs.md`
- `references/jd_strategy.md`
- `references/website_outputs.md`

## First Response Pattern

When this skill triggers, do not immediately ask for a resume rewrite. Start with:

1. Acknowledge the task as career direction plus asset extraction.
2. Ask for available inputs: resume, target JD, current goal.
3. If a resume is present, say you will first use it as context for a short intent interview.
4. Ask 3-6 focused intent questions, not a long questionnaire.

Example:

```text
我会先不急着改简历。我们先把方向和关键词定住，再从简历里找证据。

先回答这几个问题：
1. 你下一阶段最想解决的是找工作、转行、晋升，还是重新定位？
2. 你现在最想靠近的 2-3 类工作是什么？
3. 你明确不想做什么？分别是因为不喜欢、做过后厌恶，还是觉得门槛太高？
4. 过去工作里，别人最常因为哪些事来找你？
5. 有没有一个目标 JD 或岗位类型？
```

## Boundaries

- Do not give legal, medical, or mental-health advice.
- Do not guarantee hiring outcomes or income.
- Do not encourage deception, fake credentials, fake metrics, or fabricated experience.
- For sensitive personal data, keep outputs local unless the user explicitly asks to share or publish.
- If the user asks for a risky claim, convert it into a truthful evidence-seeking question.
