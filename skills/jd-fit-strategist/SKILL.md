---
name: jd-fit-strategist
description: Use this skill when a user provides a target JD, job posting, or clearly defined target role and wants fit analysis, gap diagnosis, application strategy, JD-tailored resume emphasis, and interview preparation. This skill treats the JD as the starting point.
---

# JD Fit Strategist

## Purpose

Analyze a target JD first, then match the user's confirmed career assets against it. This skill is for "how do I win this role?", not general self-discovery.

## Inputs

- Target JD or clearly defined target role.
- Resume or career asset library.
- Optional direction/keyword outputs from `$career-direction-interviewer`.

## Workflow

### 1. JD Capability Model

Extract:

- Role title, level, and business context.
- Must-have requirements.
- Nice-to-have requirements.
- Repeated keywords.
- Hidden expectations.
- Likely interview focus.
- Risk points.

### 2. User Fit Matrix

Map each JD requirement to user evidence:

```markdown
| JD Requirement | Priority | User Evidence | Fit | Gap | Follow-up Question |
|---|---|---|---|---|---|
```

Fit values: `strong`, `medium`, `weak`, `missing`.

### 3. Gap-Focused Interview

Ask follow-up questions only where they can change the strategy:

- Promising but under-evidenced requirements.
- Claims that need stronger proof.
- Hidden expectations not visible in the resume.
- Weaknesses that need truthful framing.

### 4. Strategy

Produce:

- Overall fit summary.
- User advantages to emphasize.
- Resume ordering and bullet strategy.
- Projects to emphasize or de-emphasize.
- Interview stories to prepare.
- Weakness handling.
- Questions to ask the interviewer.

## Outputs

Create or update:

- `career-assets/jd-fit.md`
- `career-assets/keywords.md`

Use `../../shared/career_asset_schema.md` and `../../shared/safety_boundaries.md` when available.

## Boundaries

Do not fabricate experience, metrics, credentials, titles, or years. Do not keyword-stuff. If fit is weak, propose adjacent roles or a gap-closing plan.
