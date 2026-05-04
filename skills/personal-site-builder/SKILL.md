---
name: personal-site-builder
description: Use this skill when the user wants a personal website, portfolio site, or career homepage based on career assets and style references. It should ask for preferred websites or visual references, inspect them with browsing/search when possible, extract style principles, and then produce website copy or implementation.
---

# Personal Site Builder

## Purpose

Create a personal website or portfolio site that reflects the user's positioning, audience, and taste.

This skill owns style discovery, site information architecture, website copy, and implementation. It does not own career direction or JD matching.

## Inputs

- Career positioning and keywords.
- Project cards or portfolio material.
- Target audience.
- Style references: URLs, screenshots, website names, brands, or keywords.

## Workflow

### 1. Style Discovery

Ask:

- Which personal websites, portfolios, creator pages, or brand sites do you like?
- What do you like about them: layout, typography, color, density, motion, tone, structure?
- What should be avoided?
- Who is the site for?

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

- Use a simple static HTML file when no framework is specified.
- Use the existing project stack when working inside an app.
- Keep the first screen focused on the user's positioning.
- Use concrete project evidence rather than generic adjectives.

## Outputs

Create or update:

- `career-assets/website-brief.md`
- Website copy or implementation files.

Use `../../shared/career_asset_schema.md` and `../../shared/safety_boundaries.md` when available.
