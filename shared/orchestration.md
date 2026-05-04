# Skill Orchestration

Use this routing logic when deciding which skill should handle a task.

## A. User Does Not Know Direction

```text
career-direction-interviewer
-> resume-story-builder, if the user wants resume or interview material
-> personal-site-builder, if the user wants a site
```

Primary output: direction ranking, positioning keywords, initial career asset library.

## B. User Has A JD Or Target Role

```text
jd-fit-strategist
-> resume-story-builder
```

Primary output: JD capability model, fit/gap matrix, resume adjustment strategy, interview preparation focus.

## C. User Already Has Positioning And Evidence

```text
resume-story-builder
```

Primary output: resume bullets, STAR stories, self-introduction, risk repair.

## D. User Wants A Personal Website

```text
personal-site-builder
```

Requires: positioning, project evidence, audience, and style references.

## Iteration Entry

If the user brings feedback from applications, recruiters, interviews, or website viewers, route back to the skill that owns the failing artifact:

- Direction confusion -> `career-direction-interviewer`
- JD rejection or mismatch -> `jd-fit-strategist`
- Resume or interview story issue -> `resume-story-builder`
- Website style/content issue -> `personal-site-builder`
