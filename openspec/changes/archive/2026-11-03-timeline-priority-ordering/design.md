# Design

## Context

See `proposal.md` for motivation and `specs/timeline-priority/spec.md` for the behavioral contract.

The current sort lives in `src/utils/getSortedTimeline.ts`, while preview selection and the annual-detail source live in `src/utils/timelinePresentation.mjs`. Both already consume the same year-grouped, ordered list, so the implementation should preserve that single ordering source instead of sorting again in the component. The repository unit tests run pure `.mjs` files directly with Node's built-in test runner; there is no Vitest or TypeScript test runner.

## Goals / Non-Goals

**Goals:**

- Add an optional, validated numeric priority to timeline content.
- Make same-year ordering deterministic and unit-testable with the existing Node test runner.
- Keep the main timeline preview and annual detail derived from the same complete ordering.
- Preserve all existing records and all existing year/column behavior.

**Non-Goals:**

- Assigning priority values to existing timeline entries; this change provides the capability and documentation, not editorial decisions.
- Filtering records by priority or changing the “全部 N 项” interaction.
- Changing year order, activity-field geometry, horizontal scrolling, or the timeline tour.
- Introducing a new test framework or dependency.

## Decisions

### Optional positive integer with “smaller is earlier”

The timeline schema will accept `priority` as an optional positive integer. Smaller values sort first, matching the existing `projects.weight` convention. Missing priority is represented during comparison as positive infinity so ranked entries appear first and unranked entries retain the existing `month`/`title` order among themselves.

Alternative considered: a `high | normal | low` enum. Rejected because the requested behavior is exact numeric ordering, and tiers cannot express a precise 1..N sequence.

Alternative considered: a required integer. Rejected to avoid a 17-entry migration and to keep omission backward-compatible.

### Put the pure ordering function in the existing tested utility

The same-year comparator and non-mutating sort helper will live in `src/utils/timelinePresentation.mjs`, which is already covered by `src/utils/timelinePresentation.test.mjs`. `getSortedTimeline()` will delegate to that helper while retaining its typed Astro wrapper and existing grouping/column exports.

This avoids duplicating sorting logic and avoids adding a TypeScript test runner. The alternative—testing `getSortedTimeline.ts` directly—would require changing the project's test tooling or relying on Node's experimental/version-dependent TypeScript execution.

### Preserve the existing preview/detail data flow

`buildTimelineColumns()` will continue to split already-sorted entries into top and bottom stacks. `buildTimelinePreview()` flattens those stacks in order and exposes both `previewItems` and `allItems`; `Timeline.astro` already renders the former on the main timeline and the latter in the annual dialog. Therefore no component-level re-sorting is needed, and the first four detail items remain identical to the preview.

Alternative considered: sorting separately in the component for the dialog. Rejected because two independent sorts can drift and violate the shared-order requirement.

### Keep validation at the content boundary

The Astro content schema will reject zero, negative, and non-integer priority values. Invalid editorial input should fail the build explicitly rather than being silently coerced.

## Risks / Trade-offs

- **Ranked entries can displace unranked entries from the four-item preview** → This is intended; unranked entries remain available in the annual detail. Documentation will make the omission rule explicit.
- **Duplicate priority values have no exact order** → Deterministic `month`/`title` tie-breaking resolves them; content authors can assign distinct integers when exact order matters.
- **Moving the comparator into a `.mjs` utility changes module ownership** → Keep it in the existing presentation utility and test both priority and legacy ordering paths; `getSortedTimeline.ts` remains the typed entry point.
- **Infinity comparison can produce `NaN` if implemented by subtraction alone** → Compare the two priority values before subtracting so two unranked entries fall through to the existing tie-breakers.
- **Sorting adds work during static generation** → The collection is small and sorting is `O(n log n)` per build; no runtime or meaningful performance impact.
- **New schema input could be malformed** → Content validation fails the build with a clear field-level error; no external or untrusted input is introduced.

## Affected Files

- `src/content.config.ts`: add optional positive-integer `priority` validation.
- `src/utils/timelinePresentation.mjs`: add the pure comparator and non-mutating sort helper.
- `src/utils/getSortedTimeline.ts`: delegate entry ordering to the shared helper and update ordering documentation.
- `src/utils/timelinePresentation.test.mjs`: cover ranked, unranked, tie, cross-year, and preview/detail consistency behavior.
- `README.md`: document the optional field, ordering direction, omission rule, and preview behavior.

## Migration Plan

1. Add the schema field and shared sorter without modifying existing content.
2. Add tests and confirm existing entries with no `priority` retain their current order.
3. Document how to assign priorities; authors can then add integers only to entries where explicit ordering is needed.
4. Roll back by restoring the prior `month`/`title` comparator and removing the schema, tests, and documentation. Existing `priority` frontmatter can remain temporarily because it becomes ignored after schema removal, then be cleaned separately.

## Open Questions

None.
