# Career Asset Interviewer

[中文说明](README.zh-CN.md)

Career Asset Interviewer is a Codex skill for deep career asset interviewing. It helps users clarify career direction before rewriting resumes, then turns past work into reusable assets for resumes, JD strategy, interview stories, personal websites, and portfolios.

This is not a simple resume optimizer. The skill starts with the person: what they want, what they do not want, what they are good at, what they enjoy, and which obstacles may only be assumed rather than real. Only after that does it use the resume as an evidence map.

## What It Does

- Clarifies career intent through structured conversation
- Separates true dislikes from solvable assumed difficulties
- Sorts possible career directions by preference, evidence, market opportunity, transition cost, and constraints
- Identifies core positioning keywords before rewriting career materials
- Deep-dives resume projects around those keywords
- Builds a durable career asset library
- Generates resumes, JD strategy, interview stories, self-introductions, website copy, and portfolio material

## Core Workflow

1. Career intent interview
2. Preference, strength, and constraint clarification
3. Direction ranking
4. Positioning keyword confirmation
5. Resume and project deep dive
6. Career asset library creation
7. Output generation

## Repository Structure

```text
.
├── SKILL.md
├── agents/
│   └── openai.yaml
├── assets/
│   ├── career_report_template.md
│   ├── resume_template.md
│   └── website_template.html
└── references/
    ├── asset_schema.md
    ├── interview_framework.md
    ├── jd_strategy.md
    ├── resume_outputs.md
    └── website_outputs.md
```

## Usage

Install or copy this folder into your Codex skills directory, then invoke it explicitly:

```text
Use $career-asset-interviewer to help me clarify my career direction from my resume and generate positioning keywords.
```

A typical first session includes:

- Uploading or pasting an existing resume
- Sharing the current goal, such as job search, transition, promotion, or repositioning
- Optionally providing a target JD
- Answering a short intent interview before any resume rewriting begins

## Example Prompt

```text
Use $career-asset-interviewer. I have an old resume and a target JD. First help me clarify whether this direction fits me, then identify the keywords my resume should highlight.
```

## Design Principles

- Start with the person, not the document
- Do not rewrite before positioning is clear
- Do not fabricate achievements or metrics
- Mark unconfirmed assumptions clearly
- Interview one theme at a time
- Treat resumes, websites, and interview answers as downstream artifacts of the career asset library

## Outputs

Depending on the user's goal, the skill can produce:

- Career positioning summary
- Direction ranking
- Positioning keyword map
- Structured project cards
- Skill evidence map
- Resume bullets and full resume drafts
- JD matching and application strategy
- Interview STAR story bank
- Self-introduction
- Personal website copy or a simple HTML page
- 30/60/90-day action plan

## License

No license has been specified yet.
