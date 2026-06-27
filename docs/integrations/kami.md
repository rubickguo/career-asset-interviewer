# Kami Integration

This integration keeps the boundary suggested by Kami's maintainer:

```text
career-asset-interviewer = upstream career asset layer
Kami = downstream document delivery layer
```

`career-asset-interviewer` should decide what is true, useful, risky, weak, or worth emphasizing. Kami should remain responsible for templates, typography, HTML/PDF rendering, density checks, font handling, and document quality gates.

## Goal

Export structured `career-assets/` into a small adapter payload that can be used to fill Kami's resume or portfolio templates.

The first version targets Kami resume output only:

```text
career-assets/
  profile.md
  directions.md
  keywords.md
  projects.md
  skills-evidence.md
  resume-stories.md
    ↓
scripts/export-kami-resume.mjs
    ↓
exports/kami-adapter/
  kami-resume-data.json
  kami-resume-brief.md
    ↓
Kami resume.html / resume-en.html
    ↓
HTML + PDF + Kami checks
```

## Why This Boundary

Most resume tools jump directly from uploaded resume text to rewritten bullets and templates. This project intentionally works before that layer:

- clarify career direction;
- rank positioning keywords;
- mine project evidence;
- mark missing proof;
- keep role boundaries honest;
- separate public and private material.

Kami is a better fit for the final presentation layer because it already has document templates, PDF rendering, font checks, density checks, and document anti-pattern rules.

## Adapter Output

Run:

```bash
node scripts/export-kami-resume.mjs ./career-assets --out ./exports/kami-adapter
```

For the bundled sample:

```bash
node scripts/export-kami-resume.mjs ./career-assets.sample --out ./examples/kami-adapter
```

The script writes:

- `kami-resume-data.json`: machine-readable mapping payload.
- `kami-resume-brief.md`: human-readable brief for an agent that fills Kami's template.

## Minimal Payload Contract

```json
{
  "protocol": {
    "source": "career-asset-interviewer",
    "target": "kami.resume",
    "version": "0.1.0"
  },
  "candidate": {
    "name": "",
    "targetRole": "",
    "contact": {}
  },
  "positioning": {
    "currentGoal": "",
    "currentTrack": "",
    "targetDirections": [],
    "keywords": []
  },
  "resume": {
    "summary": "",
    "metrics": [],
    "projects": [],
    "skills": []
  },
  "boundaries": {
    "publicPrivate": [],
    "warnings": []
  },
  "kamiTemplateHints": {
    "recommendedTemplate": "resume.html",
    "adapterMode": "agent_filled_template",
    "fieldMapping": {}
  }
}
```

## Mapping To Kami Resume

| Career asset source | Kami resume target |
|---|---|
| `profile.md` current track / goal | header role, summary |
| `directions.md` first high-priority direction | target role and narrative |
| `keywords.md` confirmed strong/medium keywords | keyword/meta slots and emphasis candidates |
| `projects.md` project cards | Kami project role / actions / impact rows |
| `projects.md` metrics | top metric strip and impact rows |
| `skills-evidence.md` | skills section |
| `resume-stories.md` | summary, bullet candidates, layout notes |
| public/private fields | pre-render warnings, not final resume copy |

## Rules Before Rendering In Kami

- Do not promote weak-evidence keywords into the resume header.
- Do not put `待确认` content into final resume copy.
- Do not turn participation into ownership.
- If metric confidence is not high, downgrade the impact line or ask for confirmation.
- If public display is `no` or `needs sanitization`, do not send that project to portfolio output without a sanitization pass.
- Keep warnings outside the final resume. They are quality gates, not user-facing copy.

## Next Step

The adapter is intentionally small. Once the payload shape proves stable, a second step can add:

- a `portfolio` payload;
- a richer project ranking model;
- a filled Kami HTML fixture;
- a verification note linking Kami's `build.py --verify resume` flow.
