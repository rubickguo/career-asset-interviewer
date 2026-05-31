# Career Skills Pack

[中文说明](README.skill-pack.zh-CN.md)

[旧版单体 skill 中文说明](LEGACY_README.zh-CN.md)

Career Skills Pack turns messy career history into reusable career assets: direction clarity, positioning keywords, project evidence, JD strategy, resume stories, and personal-site material.

It is designed for people whose experience cannot be captured by a generic resume template: career changers, product and AI builders, operators with complex project histories, and candidates who need credible evidence rather than inflated wording.

The pack is split into focused Codex skills for career direction, JD fit, resume story building, and personal site creation. Each skill owns one workflow and shares a common career asset protocol, so the output can be reused across resumes, interviews, outreach, and portfolio pages.

## What You Get

- A structured interview flow that clarifies what the user is actually good at and willing to pursue.
- A durable `career-assets/` knowledge base instead of one-off resume copy.
- Evidence-first project stories with role, action, metrics, confidence, and market value separated.
- JD analysis that explains fit and gaps without fake numeric scores.
- Personal-site guidance that adapts to the user's professional identity instead of applying one generic layout.

## Design Philosophy

This project is not a resume beautifier. Its core idea is to understand the person first, then decide what should be expressed.

Most resume problems are not only wording problems. They are upstream judgment problems:

- Does the user want to continue the current career track or change direction?
- When the user says they do not want something, is it a true dislike, a bad prior context, an assumed difficulty, missing information, or missing evidence?
- What is the user genuinely good at, what do they prefer, and which past experiences have market value?
- What are the core positioning keywords the resume should highlight?
- Is a project proving business judgment, engineering complexity, cross-functional ownership, measurable results, or merely that the user completed a task?

The default flow is:

```text
Understand the person
-> confirm direction and keywords
-> mine project evidence
-> then optimize resume, JD strategy, or personal site
```

Every skill follows the same rule: **understand the user before giving advice or producing artifacts**. If profile, direction, keywords, or evidence are unclear, the skill should ask focused questions instead of generating generic material.

## What Makes It Different

Many resume tools follow an "upload resume -> rewrite wording -> apply template" flow. This pack intentionally works before the writing layer:

- **Not a resume polisher**: it decides which experiences deserve emphasis, which should be reduced, and which still lack evidence.
- **Not a JD scoring tool**: JD analysis is optional and qualitative; it avoids fake numeric match scores.
- **Not a generic template generator**: personal sites must read the user's profile, professional identity, taste preferences, and reference sites. C-end product, B-end product, technical builder, and manager sites should not share the same layout by default.
- **Not a hype engine**: the default tone is objective, informed, and restrained. It can deprioritize weak roles and mark risks clearly.
- **Not a one-off output**: the durable artifact is the `career-assets/` knowledge base, which later powers resumes, JD strategy, interviews, self-introductions, and personal sites.

This design is best for serious job search, career transition decisions, complex experience reconstruction, and long-term reuse of career material.

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

## Resume Optimization Method

Resume optimization in this project is not final-stage wording polish. It is a diagnosis-to-delivery workflow.

### 1. Start With Career Direction

Even if the user only asks to "optimize my resume", first confirm:

- Whether the current career track should be continued.
- Whether the user truly wants a career change, or mainly wants a different company, business, team, workload, compensation, or growth path.
- Whether dislikes are true dislikes, bad contexts, hard constraints, skill gaps, or assumed difficulties.
- What identity the user wants the market to remember.

The first version focuses on major internet-industry functions: product, operations/growth, programmers/technical builders, and adjacent management roles. AI and games are treated as domain branches.

### 2. Extract Positioning Keywords

The resume starts from keywords, not from a template. The skill identifies:

- Primary narratives, such as Node backend, B-end product, content ecosystem, growth, platform tooling, or AI workflows.
- Whether each keyword has strong, weak, or missing evidence.
- Which keywords describe work the user did but does not want to be defined by.
- Which keywords belong in the main resume, JD-specific variants, or interview stories.

Weak-evidence keywords should not be placed prominently. Potential but unsupported directions should become follow-up questions or small experiments.

### 3. Mine Project Evidence Before Rewriting Bullets

`resume-story-builder` decomposes projects into:

- Business context: why the project mattered.
- User role: ownership, responsibility, and decision rights.
- Actions and judgment: non-obvious tradeoffs and execution choices.
- Result metrics: business outcomes, efficiency, quality, scale, stability.
- Process metrics: scale, complexity, coverage, launch rhythm when final outcomes are unavailable.
- Evidence confidence: which numbers are confirmed and which need validation.

Work-related life experiences can matter too. For example, when applying to game companies, professional team experience, high-rank player experience, community organization, or creator experience may become valuable evidence.

### 4. Keep Resume Claims Objective And Verifiable

Resume writing must follow these rules:

- Put the strongest result data first.
- Use metric names that mean something to external hiring readers.
- If result metrics are missing, look for process metrics; if metrics are truly unavailable, change project ordering instead of inventing data.
- Do not turn participation into ownership.
- Do not turn collaboration into management experience.
- Highlight strengths without exaggeration, fabrication, or unverifiable packaging.

### 5. Layout And PDF Quality Are Part Of Resume Quality

A final formatted resume should not stop at Markdown. The required flow is:

```text
Generate HTML preview
-> check layout
-> export PDF
-> inspect the PDF
-> fix whitespace, line wrapping, page breaks, and readability
```

Avoid:

- Large blank areas.
- One character or one word alone on a line.
- Unreadable fonts just to force a one-page resume.
- HTML preview looking fine while PDF export breaks.
- Awkward Chinese-English line wrapping.

The repo includes basic scripts:

```bash
node scripts/check-resume-html.mjs ./exports/resume.html
node scripts/render-resume-pdf.mjs ./exports/resume.html ./exports/resume.pdf
```

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
node scripts/check-career-assets.mjs ./career-assets --strict-sections
node scripts/check-resume-html.mjs ./exports/resume.html
node scripts/render-resume-pdf.mjs ./exports/resume.html ./exports/resume.pdf
```

`check-career-assets.mjs` is a handoff gate, not only a file-existence check. It reports missing files, empty files, schema section drift, and unresolved `待确认`/`TODO` markers. By default section drift is a warning so work-in-progress assets remain usable; add `--strict-sections` before release or when handing assets to another skill.

See `tests/evaluation_matrix.md` for lightweight fixture-based evaluation.
