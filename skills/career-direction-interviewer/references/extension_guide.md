# Question Tree Extension Guide

Use this when adding new industries, functions, or seniority levels to `question_tree.md`.

## Add A New Branch

Each new branch should include:

- Scope: when the branch applies.
- Entry signal: what user answer triggers it.
- Core questions: 3-6 questions max.
- Good signals: evidence that strengthens the direction.
- Risk signals: evidence that weakens or complicates the direction.
- Asset updates: which `career-assets/` fields should be updated.
- Handoff: which downstream skill should run next.

## Branch Template

```markdown
### Branch Name

Scope:

Ask:

- Question 1
- Question 2
- Question 3

Good signals:

- Signal

Risk signals:

- Risk

Next:

- Route

Update:

- `profile.md`:
- `directions.md`:
- `keywords.md`:
```

## Design Rules

- Do not add a flat question bank.
- Keep questions diagnostic, not generic.
- Preserve the core logic: current-career continuity first, then motivation, evidence, preference, constraints, and ranking.
- Add domain overlays when the industry changes the evidence standard but not the user's function.
- Add function branches when the role requires a different capability model.

## Example: Design Branch

Use only after deciding to support design roles.

Good signals:

- Portfolio quality.
- Design decision rationale.
- User research and iteration evidence.
- Shipped product impact.

Risk signals:

- Visual polish without problem framing.
- No shipped work.
- No collaboration or tradeoff evidence.

Asset updates:

- `projects.md`: add design process, artifacts, shipped result, and portfolio-public suitability.
- `keywords.md`: distinguish product design, UX research, visual design, design systems.
