# Output Boundaries

This file defines what each skill can and cannot output.

Core rule:

```text
Every skill must read the user's career assets before producing advice or artifacts.
```

Minimum career assets:

- `career-assets/profile.md`
- `career-assets/directions.md`
- `career-assets/keywords.md`

If these are missing or weak, route to `$career-direction-interviewer` before doing downstream work.

## Main Flow Skills

### 1. career-direction-interviewer

Role: understand the user and establish positioning.

Can output:

- Career positioning summary.
- Main professional narrative.
- Direction ranking.
- Primary/supporting/minimized keywords.
- Resume optimization brief.
- Evidence gaps and next clarification questions.

Cannot output:

- Final resume copy.
- Final interview stories.
- JD fit conclusion.
- Website implementation.

Handoff:

- To `$resume-story-builder` for resume and interview material.
- To `$jd-fit-strategist` only when a JD is provided after user understanding.
- To `$personal-site-builder` only when a site is requested.

### 2. resume-story-builder

Role: turn confirmed career assets into resume and interview material.

Can output:

- Project cards.
- Skill evidence map.
- Resume bullets.
- Professional summary.
- STAR interview stories.
- Self-introduction.
- Risk explanations.

Cannot output:

- Career direction decisions.
- JD fit conclusions.
- Website style decisions or implementation.

Handoff:

- To `$career-direction-interviewer` if positioning is missing or contradictory.
- To `$jd-fit-strategist` if a JD changes emphasis.
- To `$personal-site-builder` if material should become a site.

## Optional Add-On Skills

### 3. jd-fit-strategist

Role: optional JD decomposition and qualitative fit diagnosis after user understanding.

Can output:

- JD capability model.
- Qualitative fit/gap matrix.
- Objective application recommendation.
- Resume adjustment brief.
- Questions needed to judge whether the role is worth pursuing.

Cannot output:

- Numeric match score.
- Final resume copy.
- Interview stories.
- Career direction replacement.

Handoff:

- To `$resume-story-builder` for JD-adjusted resume material.
- Back to `$career-direction-interviewer` if the JD conflicts with the user's direction.

### 4. personal-site-builder

Role: optional personal website or portfolio creation after positioning and evidence exist.

Can output:

- Style discovery summary.
- Reference-site style interpretation.
- Website information architecture.
- Website copy.
- Website implementation when requested.

Cannot output:

- Career direction decisions.
- JD fit conclusions.
- Resume strategy.

Handoff:

- To `$career-direction-interviewer` if positioning is unclear.
- To `$resume-story-builder` if project evidence or case studies are missing.

Required input:

- Read the user profile and career assets before making design decisions. C-end product, B-end product, technical builder, and manager-oriented sites should have different information architecture and visual emphasis.
