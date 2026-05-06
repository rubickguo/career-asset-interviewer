# Career Asset Protocol Version

Current protocol version: `0.2.0`

All skills in this pack should read and write the `career-assets/` files according to `shared/career_asset_schema.md`.

## Compatibility Rules

- A minor version change may add optional fields.
- A major version change may rename or remove fields.
- Skills should preserve unknown fields instead of deleting them.
- If a skill needs a field that is missing, ask or mark it as `待确认`; do not infer silently.
- When updating `career_asset_schema.md`, update this file and check all downstream skills.

## Skill Compatibility

| Skill | Compatible Protocol |
|---|---|
| career-direction-interviewer | 0.2.x |
| resume-story-builder | 0.2.x |
| jd-fit-strategist | 0.2.x |
| personal-site-builder | 0.2.x |

## Change Log

### 0.2.0

- Added current-career continuity fields.
- Added keyword roles and evidence strength.
- Added project priority, portfolio priority, public-display suitability, sensitivity risk, metric confidence, and output mappings.
- Added JD fit recommendation and resume adjustment brief.
- Added resume layout/PDF notes.
- Added website brief preferences, dislikes, identity, and display rules.
