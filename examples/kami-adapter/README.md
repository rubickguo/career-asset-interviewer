# Kami Adapter Example

Generate this example from the bundled sample assets:

```bash
node scripts/export-kami-resume.mjs ./career-assets.sample --out ./examples/kami-adapter
```

Outputs:

- `kami-resume-data.json`: structured payload for a future Kami adapter.
- `kami-resume-brief.md`: human-readable brief for an agent filling Kami's resume template.

This example is intentionally light. It proves the boundary first:

```text
career-assets -> adapter payload -> Kami template fill -> Kami PDF checks
```

The generated brief should not be treated as final resume copy. It still carries evidence warnings and public/private boundaries from `career-assets/`.
