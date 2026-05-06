# Resume Layout And PDF QA

Use this when generating a formatted resume.

## Required Flow

```text
Draft content
-> Generate HTML preview
-> User/browser review
-> Export PDF
-> Inspect rendered PDF or preview
-> Fix layout issues
```

Do not jump directly from markdown to final PDF when layout matters.

Prefer reusable scripts when available:

```bash
node scripts/check-resume-html.mjs path/to/resume.html
node scripts/render-resume-pdf.mjs path/to/resume.html path/to/resume.pdf
```

`render-resume-pdf.mjs` requires Playwright in the working project. If Playwright is not installed, state that dependency clearly instead of rewriting a temporary converter.

## HTML Preview Requirements

- Use stable page width and print styles.
- Keep contact information aligned and readable.
- Avoid large empty blocks.
- Avoid single-character or single-word orphan lines.
- Avoid dense paragraphs that reduce scanability.
- Make section spacing consistent.
- Ensure links are readable and not visually dominant.
- Keep bullets compact but not cramped.

## PDF Export Requirements

- Check page breaks.
- Check whether bullets split awkwardly across pages.
- Check whether text is clipped or too close to page edges.
- Check whether font size remains readable.
- Check whether the final page has excessive blank space.
- Check whether Chinese and English mixed text wraps cleanly.

## One Page Rule

Do not force a one-page resume by making fonts unreadable or spacing unprofessional. A readable two-page resume is acceptable when the user's experience requires it.

## Common Failure Cases

- Large blank area after a section.
- One character or one word on a line.
- Contact block misaligned with name and title.
- A bullet wraps into an isolated short line.
- PDF export differs from browser preview.
- Tables or columns break across pages.
