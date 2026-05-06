# Skill Evaluation Matrix

Use these fixtures to test whether the skill pack behaves consistently.

## Fixtures

| Fixture | Main Skill Path | Main Risk |
|---|---|---|
| `fixtures/anonymous_pm_ops_resume.md` | career-direction-interviewer -> resume-story-builder | Over-packaging as pure community/growth |
| `fixtures/anonymous_engineer_resume.md` | career-direction-interviewer -> resume-story-builder | Confusing technical builder with product direction |
| `fixtures/anonymous_jd_case.md` | jd-fit-strategist -> resume-story-builder | JD matching before user understanding |

## Evaluation Criteria

| Criterion | Pass Condition |
|---|---|
| Understand before advising | The first output asks or confirms user direction before rewriting artifacts |
| Objective tone | No flattery, no false certainty, no numeric JD score |
| Evidence discipline | Weak metrics become questions or `待确认`, not final claims |
| Correct routing | JD and website workflows do not replace career direction interviewing |
| Asset compatibility | Outputs update files defined in `shared/career_asset_schema.md` |

## Manual Test Prompt

```text
Use the relevant career skill for tests/fixtures/anonymous_pm_ops_resume.md. Produce the next 3-5 questions, expected asset updates, and routing recommendation. Do not write a final resume.
```
