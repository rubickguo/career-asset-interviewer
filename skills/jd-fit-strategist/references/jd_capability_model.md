# JD Capability Model

Build a JD capability model after the user's career direction and positioning keywords are understood. The JD is an optional add-on for application strategy, not a substitute for knowing the user.

## Extraction Steps

### 1. Normalize The Role

Extract:

- Role title.
- Function.
- Seniority.
- Company / product context.
- User or customer type.
- Business stage, if visible.

### 2. Identify Capabilities

Convert JD text into capabilities, not just keywords.

```markdown
| Capability | Priority | Evidence Needed | Hidden Expectation |
|---|---|---|---|
```

Priority values:

- `must-have`: likely screening requirement.
- `high`: important differentiator.
- `medium`: useful but not decisive.
- `nice-to-have`: optional signal.

### 3. Detect Hidden Expectations

Examples:

- "Cross-functional" may require stakeholder influence, not just meeting coordination.
- "Data-driven" may require metric ownership, not just dashboard reading.
- "0-to-1" may require ambiguity handling and scope definition.
- "Commercialization" may require revenue responsibility or pricing/payment experience.
- "AI product" may require use-case definition, workflow design, evaluation, and adoption, not just using AI tools.
- "Platform governance" may require rule design, abuse handling, and ecosystem tradeoffs.
- "Senior" may require independent judgment and scope ownership, not just years.

### 4. Compare Against User Direction

Before judging fit, compare the JD to the user's confirmed direction:

- Does this JD strengthen the user's target narrative?
- Does it pull the user toward work they explicitly want?
- Does it require work the user wants to avoid?
- Does it distort the user's positioning for short-term opportunity?

### 5. When The JD Is Vague

If the JD is too abstract or generic, do not force a confident interpretation. Ask the user to collect internal context:

- Why is this role being hired now?
- What problem will this person solve in the first 3-6 months?
- Who does the role report to?
- Which team owns the actual work?
- What capability is missing from the current team?
- What would make this hire successful?

Use the answers to refine the JD capability model.

## Fit Diagnosis

Classify fit qualitatively:

- `strong`: direct evidence and aligned with target direction.
- `medium`: adjacent evidence or needs clarification.
- `weak`: generic or indirect evidence.
- `missing`: no credible evidence yet.
- `misaligned`: possible on paper, but conflicts with the user's stated goals or preferences.

Do not output a numeric score.

## Clarifying Question Rules

Ask follow-up questions only if the answer can change:

- Whether to apply.
- Which strengths to emphasize.
- Whether a gap can be repaired truthfully.
- Whether the JD conflicts with the user's direction.

Avoid:

- Generic self-discovery questions.
- Asking about low-priority JD requirements first.
- Rewriting resume bullets before evidence is confirmed.
- Interview story preparation.

## Strategy Output Template

```markdown
# JD Fit Strategy

## Target Role

## User Direction Context

## JD Capability Model

| Capability | Priority | Hidden Expectation | Evidence Needed |
|---|---|---|---|

## Fit / Gap Matrix

| Capability | User Evidence | Fit | Gap | Note |
|---|---|---|---|---|

## Objective Recommendation

值得重点投递 / 可以尝试 / 不建议优先 / 先补证据再投

## Advantages To Emphasize

## Risks And Gaps

## Resume Adjustment Brief
```
