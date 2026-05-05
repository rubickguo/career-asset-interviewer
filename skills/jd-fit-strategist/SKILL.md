---
name: jd-fit-strategist
description: Use this skill after career direction interviewing when a user provides a target JD, job posting, or clearly defined target role and wants objective JD decomposition, qualitative fit diagnosis, application recommendation, and resume adjustment strategy. Do not use this skill before the user's direction, target narrative, and positioning keywords are sufficiently understood.
---

# JD Fit Strategist

## Purpose

Analyze an optional target JD against a user who has already been understood through career direction interviewing. This skill is for objective JD decomposition and matching. It does not replace user understanding, does not write final resume copy, and does not prepare interview stories.

Follow `../../shared/product_principles.md` and `../../shared/output_boundaries.md`: be objective, understand the user before advising, and do not perform downstream operations before diagnosis.

Core rule:

```text
Understand the user first. Analyze the JD second.
```

## Preconditions

Before running this skill, confirm that the user has sufficient career assets:

- `career-assets/profile.md`: current goal, wants, constraints.
- `career-assets/directions.md`: target direction or ranked directions.
- `career-assets/keywords.md`: primary/supporting positioning keywords.

If these are missing or weak, route to `$career-direction-interviewer` first. If the user brought a JD early, ask why they want to apply to this role, but do not perform full JD matching yet.

## Inputs

- Target JD, job posting, or clearly defined target role.
- Resume or career asset library.
- Direction/keyword outputs from `$career-direction-interviewer`.

## Workflow

### 0. Read User Context

Review the user's confirmed direction and keywords first:

- Target direction.
- Primary narrative.
- Desired and avoided work.
- Evidence-backed strengths.
- Constraints and transition risks.
- Project priorities, public/private evidence boundaries, and metric confidence from `career-assets/projects.md`.

Use this context to judge whether the JD is aligned with the user's direction, not only whether the user can technically match the JD.

### 1. JD Capability Model

Extract:

- Role title, level, and business context.
- Must-have requirements.
- Nice-to-have requirements.
- Repeated keywords.
- Hidden expectations.
- Risk points.

Use `references/jd_capability_model.md` for extraction and prioritization.

### 2. Qualitative Fit Diagnosis

Map each JD capability to user evidence:

```markdown
| JD Capability | Priority | Hidden Expectation | User Evidence | Fit | Gap | Note |
|---|---|---|---|---|---|---|
```

Fit values:

- `strong`: direct evidence and aligned with target direction.
- `medium`: adjacent evidence or needs clarification.
- `weak`: generic or indirect evidence.
- `missing`: no credible evidence.
- `misaligned`: user may be able to do it, but it conflicts with stated preference or target direction.

Do not produce a numeric match score. The tone should be objective and informed, not promotional.

If the JD is hard to interpret, state that the JD lacks enough information. Recommend collecting internal context before overfitting the resume.

### 3. Clarifying Questions

Ask follow-up questions only where they change the application decision or resume strategy:

- A high-priority JD requirement has medium/weak evidence.
- A promising user advantage is under-explained.
- The role appears attractive but conflicts with the user's stated direction.
- A weakness may require truthful framing.

Ask in this format:

```text
JD 需要证明 [能力/经验]。你目前最接近的证据是 [项目/经历]，但还缺 [证据缺口]。
为了判断这个岗位值不值得投，请补充：[具体问题]。
```

### 4. Application Recommendation

Give a clear recommendation:

- `值得重点投递`: high alignment and strong evidence.
- `可以尝试`: some alignment, but gaps or uncertainty exist.
- `不建议优先`: weak fit, high mismatch, or conflicts with user goals.
- `先补证据再投`: direction is plausible but resume evidence is insufficient.

Explain the reasoning objectively. If the JD is not suitable, say so directly.

### 5. Resume Adjustment Brief

Produce a strategy brief for `$resume-story-builder`, not final resume text:

- Keywords to emphasize.
- Projects to emphasize.
- Projects to reduce or remove.
- Evidence gaps to fix.
- Claims that must be softened.
- Summary/bullet ordering strategy.

## Outputs

Create or update:

- `career-assets/jd-fit.md`
- `career-assets/keywords.md`, only if the JD changes keyword emphasis without distorting the user's core positioning.

Use `../../shared/career_asset_schema.md` and `../../shared/safety_boundaries.md` when available.

## Boundaries

- Do not run before career direction interviewing is sufficiently complete.
- Do not fabricate experience, metrics, credentials, titles, or years.
- Do not keyword-stuff.
- Do not flatter the user or inflate fit.
- Do not produce interview stories; route story preparation to `$resume-story-builder`.
- If fit is poor, recommend deprioritizing the JD or choosing adjacent roles.

## Feedback

If the user asks how to collect or interpret rejection reasons, recruiter comments, or interview feedback for this JD or role type, use `../../shared/feedback_tips.md`. Do not update `career-assets/jd-fit.md` unless the feedback is specific enough to diagnose fit, gap, or misalignment.
