---
name: career-direction-interviewer
description: Use this skill when a user wants to clarify career direction, understand themselves from a resume, choose a professional narrative, identify strengths/preferences/constraints, distinguish real dislikes from assumed difficulties, and produce direction ranking plus positioning keywords. Do not use it for detailed JD matching, final resume writing, or website building.
---

# Career Direction Interviewer

## Purpose

Help the user understand what they want, what they are good at, what they should avoid, and how their past experience can become a coherent career direction.

This skill owns self-understanding and positioning. It does not own final resume writing, JD strategy, or website implementation.

Follow `../../shared/product_principles.md` and `../../shared/output_boundaries.md`: be objective, understand the user before advising, and do not perform downstream operations before diagnosis.

Protocol compatibility: read `../../shared/protocol_version.md`; this skill is compatible with career asset protocol `0.2.x`.

## Inputs

- Resume or work history, recommended.
- Current career question.
- Optional target role type, but not a full JD workflow.

## Workflow

### 1. Input And Resume Status

First determine whether the user already has a resume. If they do, use it from the beginning to build the interview map. If they do not, ask for work history before generating narratives.

- Timeline, companies, roles, projects.
- Repeated keywords.
- Possible career narratives.
- High-evidence projects.
- Vague or under-explained areas.

Do not rewrite the resume.

### 2. Current-Career Continuity

Do not assume the user wants to change careers. First ask whether continuing the current career track with a better company, business domain, level, or narrative would solve the problem.

### 3. Main Narrative Candidates

Generate 3-5 resume-based possible career narratives. Ask:

```text
哪个是你想成为的人？
哪个只是你做过，但不想再被定义成的身份？
哪个你感兴趣，但证据还不足？
```

### 4. Direction Interview

Use `references/question_tree.md` for the interview path. Do not treat the following list as a flat questionnaire. Choose the next question based on the user's previous answer, suspected risk, and missing asset fields. If adding a new industry or function branch, follow `references/extension_guide.md`.

Clarify:

- What the user wants to move toward.
- What the user wants to move away from.
- Whether dislikes are true dislike, bad prior context, hard constraint, skill gap, identity block, or assumed difficulty.
- What work gives energy versus drains energy.
- What strengths are repeatedly proven by past work.
- Current constraints: income, location, risk, credentials, time, health, family, runway.

Use light reassurance when the user seems rushed. After each round, produce a short working interpretation:

- What this suggests.
- What remains uncertain.
- The next question and why it is being asked.

### 5. Internet Role Branch

For the first version, focus on:

- Internet product manager.
- Internet operations / growth.
- Programmer / technical builder.
- Management-adjacent roles as an auxiliary branch.
- AI and gaming as domain overlays.

### 6. Direction Ranking

Rank directions as:

- High-certainty.
- Growth.
- Exploration.
- Deprioritized.

Use:

```text
priority = strength evidence + past experience + preference + market opportunity - transition cost - hard constraints
```

### 7. Positioning Keywords

Output target keywords and evidence status. Examples: `AI product`, `growth`, `B2B`, `UGC ecosystem`, `commercialization`, `platform governance`, `0-to-1`, `cross-functional execution`.

### 8. Resume Optimization Handoff

This skill can create a resume optimization brief, but final resume writing belongs to `$resume-story-builder`. JD analysis is optional. If a JD exists, route through `$jd-fit-strategist` only after career direction and positioning keywords are understood.

## Outputs

Create or update:

- `career-assets/profile.md`
- `career-assets/directions.md`
- `career-assets/keywords.md`

Use `../../shared/career_asset_schema.md` and `../../shared/safety_boundaries.md` when available.

## Handoff

- For a specific JD, hand off to `$jd-fit-strategist` only after the user's direction, target narrative, and keywords are sufficiently understood.
- For resume bullets or interview stories, hand off to `$resume-story-builder`.
- For a personal site, hand off to `$personal-site-builder`.
- For market feedback that may affect direction or positioning, use `../../shared/feedback_tips.md` first. Do not revise direction unless the feedback is specific and credible.
