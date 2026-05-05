# Career Asset Schema

Use this shared schema across all career skills. The career asset library is the central user memory. Every skill should read it before producing advice or artifacts, update only the sections it owns, and preserve confirmed user facts.

## Principles

- Treat user understanding as the source of truth.
- Keep personal conclusions separate from reusable evidence.
- Mark uncertain content as `待确认`.
- Keep public-facing and private/internal evidence separate.
- Prefer project evidence over adjectives.

## career-assets/profile.md

```markdown
# Profile

## Current Goal

## Current Career Track

## Continue Or Change Hypothesis

## Target Directions

## Wants

## Does Not Want

| Item | Reason | Type | Solvable? | Notes |
|---|---|---|---|---|

Types: true dislike / bad context / hard constraint / skill gap / identity block / assumed difficulty

## Strengths

## Preferences

## Constraints

## Relevant Life Experience

| Experience | Target Role Relevance | Evidence | Use In Resume? | Notes |
|---|---|---|---|---|

## Confirmed Facts

## Open Questions
```

## career-assets/directions.md

```markdown
# Direction Ranking

## Direction Name

- Type: high-certainty / growth / exploration / deprioritized
- Current-track or transition:
- Why it fits:
- Evidence:
- Gaps:
- Risks:
- Assumed difficulties:
- Next experiment:
```

## career-assets/keywords.md

```markdown
# Positioning Keywords

| Keyword | Role | Priority | Evidence Strength | Supporting Projects | Missing Proof | Decision | Status |
|---|---|---|---|---|---|---|---|
```

Role values:

- `primary`
- `supporting`
- `differentiator`
- `minimize`
- `experiment`

Evidence strength values:

- `strong`
- `medium`
- `weak`
- `missing`

Status values:

- `confirmed`
- `likely`
- `待确认`

## career-assets/projects.md

Use this as the main project card format.

```markdown
## Project Name

### Classification

- Company / Role / Time:
- Project type:
- Target direction(s):
- Target keyword(s):
- Resume priority: P0 / P1 / P2 / omit
- Portfolio priority: P0 / P1 / P2 / omit
- Suitable roles:
- Public display: yes / no / needs sanitization
- Privacy / sensitivity risks:

### Context

- Business context:
- User / customer / stakeholder:
- Core problem:
- Why it mattered:

### User Role

- User's responsibility:
- Decision rights:
- Collaborators:
- Scope:

### Actions

- Key actions:
- Non-obvious judgment:
- Hardest tradeoff:
- Process / mechanism created:
- Tools / AI / automation used:

### Evidence

- Result metrics:
- Process metrics:
- Quality metrics:
- Adoption / usage evidence:
- Before / after:
- Evidence materials:
- Metric confidence: high / medium / low / 待确认

### Capability Mapping

- Skills proven:
- Transferable capability:
- Differentiating detail:
- Weak or missing proof:

### Outputs

- Resume bullet:
- Interview STAR:
- Website / portfolio version:
- JD matching notes:

### Review

- Main narrative / secondary evidence / minimize:
- Assumptions:
- Questions to confirm:
```

## career-assets/skills-evidence.md

```markdown
# Skills Evidence

## Skill Name

- Evidence strength: strong / medium / weak / missing
- Supporting projects:
- Best proof:
- Resume wording:
- Interview angle:
- Website angle:
- Missing details:
```

## career-assets/jd-fit.md

```markdown
# JD Fit

## Target JD / Role

## User Direction Context

## JD Capability Model

| Requirement | Priority | Hidden Expectation | Evidence Needed |
|---|---|---|---|

## Fit / Gap Matrix

| Requirement | User Evidence | Fit | Gap | Note |
|---|---|---|---|---|

## Objective Recommendation

值得重点投递 / 可以尝试 / 不建议优先 / 先补证据再投

## Resume Adjustment Brief

## Questions To Clarify
```

## career-assets/resume-stories.md

```markdown
# Resume Stories

## Target Resume Version

## Resume Strategy

## Resume Bullets

## STAR Stories

## Self Introduction

## Layout / PDF Notes

## Risk Points

## Pending Confirmations
```

## career-assets/website-brief.md

```markdown
# Website Brief

## Audience

## Positioning

## User Preferences

## User Dislikes

## Product Identity

C-end product / B-end product / technical builder / operations-growth / manager / creator / other

## Style References

## Style Interpretation

## Information Architecture

## Copy Blocks

## Project Display Rules

## Build Notes
```
