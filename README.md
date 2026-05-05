# Career Skills Pack

[中文说明](README.skill-pack.zh-CN.md)

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
└── safety_boundaries.md
```

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
