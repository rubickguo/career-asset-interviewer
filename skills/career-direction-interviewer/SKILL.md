---
name: career-direction-interviewer
description: Use this skill when a user wants to clarify career direction, understand themselves from a resume, choose a professional narrative, identify strengths/preferences/constraints, distinguish real dislikes from assumed difficulties, and produce direction ranking plus positioning keywords. Do not use it for detailed JD matching, final resume writing, or website building.
---

# Career Direction Interviewer

## Purpose

Help the user understand what they want, what they are good at, what they should avoid, and how their past experience can become a coherent career direction.

This skill owns self-understanding and positioning. It does not own final resume writing, JD strategy, or website implementation.

## Inputs

- Resume or work history, recommended.
- Current career question.
- Optional target role type, but not a full JD workflow.

## Workflow

### 1. Resume Pre-Parse

Skim the resume only to build an interview map:

- Timeline, companies, roles, projects.
- Repeated keywords.
- Possible career narratives.
- High-evidence projects.
- Vague or under-explained areas.

Do not rewrite the resume.

### 2. Main Narrative Candidates

Generate 3-5 possible career narratives. Ask:

```text
哪个是你想成为的人？
哪个只是你做过，但不想再被定义成的身份？
哪个你感兴趣，但证据还不足？
```

### 3. Direction Interview

Clarify:

- What the user wants to move toward.
- What the user wants to move away from.
- Whether dislikes are true dislike, bad prior context, hard constraint, skill gap, identity block, or assumed difficulty.
- What work gives energy versus drains energy.
- What strengths are repeatedly proven by past work.
- Current constraints: income, location, risk, credentials, time, health, family, runway.

### 4. Direction Ranking

Rank directions as:

- High-certainty.
- Growth.
- Exploration.
- Deprioritized.

Use:

```text
priority = strength evidence + past experience + preference + market opportunity - transition cost - hard constraints
```

### 5. Positioning Keywords

Output target keywords and evidence status. Examples: `AI product`, `growth`, `B2B`, `UGC ecosystem`, `commercialization`, `platform governance`, `0-to-1`, `cross-functional execution`.

## Outputs

Create or update:

- `career-assets/profile.md`
- `career-assets/directions.md`
- `career-assets/keywords.md`

Use `../../shared/career_asset_schema.md` and `../../shared/safety_boundaries.md` when available.

## Handoff

- For a specific JD, hand off to `$jd-fit-strategist`.
- For resume bullets or interview stories, hand off to `$resume-story-builder`.
- For a personal site, hand off to `$personal-site-builder`.
