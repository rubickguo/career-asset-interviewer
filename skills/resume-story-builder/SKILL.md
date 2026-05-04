---
name: resume-story-builder
description: Use this skill when the user has career assets, project notes, a direction, or a JD strategy and wants resume bullets, project cards, STAR interview stories, self-introductions, or resume issue repair. Do not use it for initial career direction discovery or personal website implementation.
---

# Resume Story Builder

## Purpose

Turn confirmed career assets into truthful, targeted resume and interview material.

This skill owns expression and evidence repair. It does not decide the user's career direction.

## Inputs

- `career-assets/profile.md`, `directions.md`, `keywords.md`, and `projects.md` when available.
- Optional `career-assets/jd-fit.md`.
- Resume draft or project notes.

## Workflow

### 1. Evidence Selection

Select the strongest evidence for the chosen direction or JD:

- Main narrative projects.
- Supporting proof.
- Projects to minimize.
- Missing or weak evidence.

### 2. Project Card Completion

For each priority project, clarify:

- Business context.
- Problem.
- User's role and decision rights.
- Key actions.
- Tradeoffs.
- Result.
- Capability proven.

### 3. Resume Issue Repair

Fix:

- Vague claims.
- Missing data.
- Overstated ownership.
- Contradictions.
- Unsupported keywords.
- Distracting projects.

### 4. Output Writing

Generate:

- Resume bullets.
- Professional summary.
- STAR stories.
- Self-introduction.
- Risk explanations.

## Quality Rules

- Do not fabricate metrics.
- Prefer truthful quantified ranges or proxy evidence when exact data is unavailable.
- Keep final resume wording clean; keep `待确认` notes outside final copy.
- Make each bullet serve the chosen positioning or JD.

## Outputs

Create or update:

- `career-assets/projects.md`
- `career-assets/skills-evidence.md`
- `career-assets/resume-stories.md`

Use `../../shared/career_asset_schema.md` and `../../shared/safety_boundaries.md` when available.
