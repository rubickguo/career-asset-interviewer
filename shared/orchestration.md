# Skill Orchestration

All routing decisions must follow `shared/product_principles.md` and `shared/output_boundaries.md`: understand the user first, keep recommendations objective, and do downstream operations only after diagnosis.

Use this routing logic when deciding which skill should handle a task.

## Main Flow

The main product flow is:

```text
career-direction-interviewer
-> resume-story-builder
```

These two skills are the default path. They create the user understanding, positioning, career assets, resume material, and interview material.

## Optional Add-Ons

`jd-fit-strategist` and `personal-site-builder` are optional add-ons. They should not replace the main flow and should not run before the user's profile, direction, and keywords are sufficiently understood.

## A. User Does Not Know Direction

```text
career-direction-interviewer
-> resume-story-builder, if the user wants resume or interview material
-> personal-site-builder, if the user wants a site
```

Primary output: direction ranking, positioning keywords, initial career asset library.

## B. User Has A JD Or Target Role

```text
career-direction-interviewer, if direction assets are incomplete
-> jd-fit-strategist, optional JD add-on
-> resume-story-builder
```

Primary output: direction-confirmed JD capability model, qualitative fit/gap diagnosis, application recommendation, and resume adjustment brief.

Core rule: understanding the user comes first. A concrete JD should not bypass career direction interviewing. If `career-assets/profile.md`, `directions.md`, and `keywords.md` are missing or weak, first use `$career-direction-interviewer` to understand whether the user truly wants this role or is only casually considering it.

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

## Feedback Tips

If the user asks how to collect or interpret feedback from applications, recruiters, interviews, or website viewers, use `shared/feedback_tips.md`.

Do not treat feedback as a formal loop yet. First help the user collect specific, credible signals. Only update career assets when feedback is concrete and repeated enough to justify a change.
