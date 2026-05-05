---
name: personal-site-builder
description: Use this skill when the user wants a personal website, portfolio site, or career homepage based on career assets and style references. It should ask for preferred websites or visual references, inspect them with browsing/search when possible, extract style principles, and then produce website copy or implementation.
---

# Personal Site Builder

## Purpose

Create a personal website or portfolio site that reflects the user's positioning, audience, and taste.

This skill owns style discovery, site information architecture, website copy, and implementation. It does not own career direction or JD matching.

Follow `../../shared/product_principles.md` and `../../shared/output_boundaries.md`: be objective, understand the user before advising, and do not perform downstream operations before diagnosis.

## Inputs

- Career positioning and keywords.
- Project cards or portfolio material.
- User profile, including preferences, dislikes, target audience, and constraints.
- Target audience.
- Style references: URLs, screenshots, website names, brands, or keywords.

If positioning, keywords, or project evidence are missing, route back to `$career-direction-interviewer` or `$resume-story-builder` before building the site.

Read `career-assets/profile.md`, `directions.md`, `keywords.md`, `projects.md`, and `website-brief.md` when available before making design decisions.

Use project fields such as portfolio priority, public-display suitability, sensitivity risks, and evidence materials when deciding what to show on the site. The website can show demos, product thinking, visual process, and project artifacts that may be inappropriate for a resume, but sensitive or internal material must be sanitized.

## Workflow

### 1. Style Discovery

Ask:

- Which personal websites, portfolios, creator pages, or brand sites do you like?
- What do you like about them: layout, typography, color, density, motion, tone, structure?
- What should be avoided?
- Who is the site for?
- Is the target identity closer to C-end product, B-end product, technical builder, creator, consultant, or manager?

### 2. Reference Analysis

When URLs or recognizable names are provided, use available web browsing/search tools to inspect them.

Extract style principles:

- Layout.
- Navigation.
- Visual density.
- Typography feel.
- Color mood.
- Motion/interaction.
- Writing tone.
- Content hierarchy.

Borrow principles, not proprietary copy or assets.

### 3. Website Brief

Produce:

- Audience.
- Positioning.
- Style interpretation.
- Information architecture.
- Content blocks.
- Build recommendation.

### 4. Build

If the user asks for implementation:

- If a `frontend-design` skill or equivalent design guidance is available, use it to review the page.
- Use a simple static HTML file when no framework is specified.
- Use the existing project stack when working inside an app.
- Keep the first screen focused on the user's positioning.
- Use concrete project evidence rather than generic adjectives.
- Use `references/frontend_quality.md` as a fallback checklist for visual and interaction quality.

## Outputs

Create or update:

- `career-assets/website-brief.md`
- Website copy or implementation files.

Use `../../shared/career_asset_schema.md` and `../../shared/safety_boundaries.md` when available.

## Feedback

If the user asks how to collect or interpret feedback about the site from recruiters, peers, clients, or viewers, use `../../shared/feedback_tips.md`. Do not redesign based on vague taste comments; look for specific audience, positioning, content hierarchy, or credibility signals.
