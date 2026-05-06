---
name: resume-story-builder
description: Use this skill when the user has career assets, project notes, a direction, or a JD strategy and wants resume bullets, project cards, STAR interview stories, self-introductions, or resume issue repair. Do not use it for initial career direction discovery or personal website implementation.
---

# Resume Story Builder

## Purpose

Turn confirmed career assets into truthful, targeted resume and interview material.

This skill owns expression and evidence repair. It does not decide the user's career direction.

Follow `../../shared/product_principles.md` and `../../shared/output_boundaries.md`: be objective, understand the user before advising, and do not perform downstream operations before diagnosis.

Protocol compatibility: read `../../shared/protocol_version.md`; this skill is compatible with career asset protocol `0.2.x`.

## Inputs

- `career-assets/profile.md`, `directions.md`, `keywords.md`, and `projects.md` when available.
- Optional `career-assets/jd-fit.md`.
- Resume draft or project notes.

If `profile.md`, `directions.md`, or `keywords.md` are missing or contradictory, route back to `$career-direction-interviewer` before writing resume material.

## Workflow

### 1. Evidence Selection

Select the strongest evidence for the chosen direction or JD:

- Main narrative projects.
- Supporting proof.
- Projects to minimize.
- Missing or weak evidence.
- Work-relevant life experience, if it strengthens the target role.

### 2. Project Card Completion

For each priority project, clarify:

- Business context.
- Problem.
- User's role and decision rights.
- Key actions.
- Tradeoffs.
- Result.
- Capability proven.
- Resume priority, portfolio priority, public-display suitability, metric confidence, and evidence materials.

Also ask about relevant non-work experience when the target role makes it meaningful:

- Games roles: esports history, high-rank play, guild/community leadership, mod/map creation, fan/community operations.
- AI/tool roles: personal tools, open-source projects, automation habits, self-built workflows.
- Consumer product roles: creator experience, content practice, community participation, personal products.

Only include life experience when it proves useful role fit. Do not add hobbies as filler.

### 3. Resume Issue Repair

Fix:

- Vague claims.
- Missing data.
- Overstated ownership.
- Contradictions.
- Unsupported keywords.
- Distracting projects.
- Weak metrics, meaningless metric names, or results buried behind process descriptions.

### 4. Output Writing

Generate:

- Resume bullets.
- Professional summary.
- STAR stories.
- Self-introduction.
- Risk explanations.

Use `references/metrics_and_evidence.md` for quantitative evidence and `references/resume_layout_pdf.md` for HTML/PDF layout QA. When producing formatted resume files, prefer the root scripts `scripts/check-resume-html.mjs` and `scripts/render-resume-pdf.mjs` instead of writing one-off conversion code.

## Quality Rules

- Do not fabricate metrics.
- Prefer truthful quantified ranges or proxy evidence when exact data is unavailable.
- Keep final resume wording clean; keep `待确认` notes outside final copy.
- Make each bullet serve the chosen positioning or JD.
- Put the strongest results before process details.
- Prefer meaningful metrics over internal vanity metrics.
- If no result metric exists, use process or operational metrics; if those are weak, move stronger quantified projects earlier.
- Avoid bullets that only say what the user did. Show result, difference, or why the action was not generic.
- Generate an HTML preview before PDF export when creating a formatted resume.
- After PDF export, inspect the PDF or rendered preview for layout issues: large blank areas, single-character lines, clipped text, unreadable font size, awkward page breaks, and broken alignment.
- Do not force a one-page resume if readability suffers. Two readable pages are better than one cramped page.

## Outputs

Create or update:

- `career-assets/projects.md`
- `career-assets/skills-evidence.md`
- `career-assets/resume-stories.md`

Use `../../shared/career_asset_schema.md` and `../../shared/safety_boundaries.md` when available.

## Feedback

If the user asks how to collect or interpret feedback about resume clarity, interview answers, weak stories, or credibility concerns, use `../../shared/feedback_tips.md`. Do not rewrite based on vague praise or polite rejection.
