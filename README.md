# Career Skills Pack

[中文说明](README.skill-pack.zh-CN.md)

[旧版单体 skill 中文说明](LEGACY_README.zh-CN.md)

Career Skills Pack is a set of focused Codex skills for career direction, JD fit, resume story building, and personal site creation.

The previous single `career-asset-interviewer` skill has been split because the original scope was too broad. Each skill now owns one workflow and shares a common career asset protocol.

## Skills

```text
skills/
├── career-direction-interviewer/
├── jd-fit-strategist/
├── resume-story-builder/
└── personal-site-builder/
shared/
├── career_asset_schema.md
├── feedback_tips.md
├── orchestration.md
├── output_boundaries.md
├── product_principles.md
├── protocol_version.md
├── skill_routing.md
└── safety_boundaries.md
```

## Directory Guide

`skills/` contains the actual Codex skills. Each subdirectory is an independently triggerable workflow with its own `SKILL.md`, UI metadata in `agents/openai.yaml`, and optional `references/` or `assets/`.

- `career-direction-interviewer/`: owns the initial career-direction interview, self-understanding, direction ranking, and positioning keywords.
- `resume-story-builder/`: turns confirmed career assets into resume bullets, project cards, STAR stories, self-introductions, and resume layout/PDF guidance.
- `jd-fit-strategist/`: optional add-on for JD decomposition, qualitative fit diagnosis, objective application recommendation, and resume adjustment strategy.
- `personal-site-builder/`: optional add-on for personal websites and portfolio sites based on career assets, taste preferences, style references, and frontend quality checks.

`shared/` contains cross-skill rules and protocols. These files are not standalone skills; they are the common operating system that keeps the skills consistent.

- `product_principles.md`: global product philosophy, especially "understand the user before advising or producing artifacts".
- `output_boundaries.md`: what each skill can and cannot output.
- `orchestration.md`: routing logic between the main flow and optional add-ons.
- `career_asset_schema.md`: shared schema for files under `career-assets/`.
- `protocol_version.md`: compatibility version for the shared career asset protocol.
- `skill_routing.md`: trigger and routing guide across the four skills.
- `safety_boundaries.md`: truthfulness, privacy, and risk boundaries.
- `feedback_tips.md`: lightweight guidance for collecting more credible feedback; not a formal iteration loop yet.

## When To Use Each Skill

- `$career-direction-interviewer`: use when the user needs structured self-understanding, career direction clarification, positioning, and keywords.
- `$jd-fit-strategist`: use after user understanding when the user has a target JD or target role and needs objective JD decomposition, qualitative fit diagnosis, and application strategy.
- `$resume-story-builder`: use when the user already has career assets and needs resume bullets, STAR stories, or self-introduction material.
- `$personal-site-builder`: use when the user wants a personal website or portfolio site based on career assets, taste preferences, and style references.

## Recommended Flows

```text
Unclear direction:
career-direction-interviewer -> resume-story-builder
```

```text
Specific JD:
career-direction-interviewer, if career assets are incomplete -> jd-fit-strategist -> resume-story-builder
```

```text
Personal site:
career-direction-interviewer or resume-story-builder, if assets are incomplete -> personal-site-builder
```

## Shared Protocol

All skills follow the same product rule: understand the user before giving advice or producing artifacts. JD analysis and personal websites are optional add-ons, not substitutes for the main interview and resume-material workflow.

All skills should read and write compatible files under `career-assets/`:

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

See `shared/career_asset_schema.md` for the schema.

To initialize a local career asset folder, use:

```bash
node scripts/init-career-assets.mjs ./career-assets
```

Useful scripts:

```bash
node scripts/check-career-assets.mjs ./career-assets
node scripts/check-resume-html.mjs ./exports/resume.html
node scripts/render-resume-pdf.mjs ./exports/resume.html ./exports/resume.pdf
```

See `tests/evaluation_matrix.md` for lightweight fixture-based evaluation.
