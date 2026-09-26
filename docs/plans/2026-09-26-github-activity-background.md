# GitHub Activity Background Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a wide-screen-only GitHub contribution field behind the existing homepage timeline, refresh it weekly through GitHub Actions, and verify it locally.

**Architecture:** A Python standard-library data job reads daily contribution counts from GitHub GraphQL or the public contribution calendar fallback and writes a static JSON snapshot. A pure Node utility converts that snapshot plus existing timeline years into two SVG paths; the Astro timeline renders it as an aria-hidden background layer only in the existing landscape breakpoint. A scheduled workflow commits changed data to main and dispatches the existing Pages workflow.

**Tech Stack:** Astro 6, Node 22 test runner, Python 3 standard library, GitHub Actions, inline SVG.

---

### Task 1: GitHub activity data job

**Files:**
- Create: `scripts/fetch_github_activity.py`
- Test: `scripts/tests/test_fetch_github_activity.py`

**Step 1: Write failing tests** for calendar completion, public HTML parsing, GraphQL normalization, and annual range generation.

**Step 2: Run tests and verify failure**

Run: `python -m unittest discover -s scripts/tests -v`

**Step 3: Implement the smallest working fetcher**

- GraphQL first when a token is available.
- Public contribution calendar fallback when no token is available or GraphQL fails.
- Stable JSON output with no generated timestamp.
- Write only when data changes.

**Step 4: Run tests and verify pass**

Run: `python -m unittest discover -s scripts/tests -v`

**Step 5: Commit**

`feat(data): add GitHub activity fetcher`

### Task 2: Activity field geometry

**Files:**
- Create: `src/utils/githubActivity.mjs`
- Test: `src/utils/githubActivity.test.mjs`
- Modify: `package.json`

**Step 1: Write failing tests** for timeline anchors, skipped-year compression, finite/capped paths, and asymmetric upper/lower envelopes.

**Step 2: Run tests and verify failure**

Run: `npm test`

**Step 3: Implement the pure geometry builder**

Return unit-space SVG paths and dimensions from daily counts and timeline years.

**Step 4: Run tests and verify pass**

Run: `npm test`

**Step 5: Commit**

`feat(timeline): add GitHub activity field geometry`

### Task 3: Timeline rendering

**Files:**
- Modify: `src/components/Timeline.astro`
- Create: `src/data/github-activity.json` by running the fetcher

**Step 1: Add the decorative SVG layer** inside `timeline-track`, hidden by default and displayed only in the existing landscape media query.

**Step 2: Style the field** with theme-aware fills, a strong upper envelope, a weaker lower echo, and masks that protect card text.

**Step 3: Verify static checks and build**

Run: `npm run build`

**Step 4: Commit**

`feat(timeline): render GitHub activity background`

### Task 4: Weekly refresh workflow

**Files:**
- Create: `.github/workflows/refresh-activity.yml`
- Modify: `README.md`

**Step 1: Add the scheduled/manual workflow** with `contents: write` and `actions: write`, fetch data on `main`, commit only when changed, and dispatch `pages.yml`.

**Step 2: Document optional `GH_ACTIVITY_TOKEN` and its `read:user` scope.**

**Step 3: Validate YAML and run formatting/lint checks.**

Run: `npm run format:check` and `npm run lint`

**Step 4: Commit**

`ci(activity): refresh GitHub contribution data weekly`

### Task 5: Seed and local preview

**Step 1: Generate local data**

Run: `python scripts/fetch_github_activity.py --username lanhao945 --output src/data/github-activity.json --start-year 2017`

**Step 2: Run the site**

Run: `npm run dev -- --host 127.0.0.1`

**Step 3: Inspect the homepage in a 1440x900 landscape viewport** and confirm the background is absent below the landscape breakpoint.

**Step 4: Run final verification**

Run: `npm test`, `python -m unittest discover -s scripts/tests -v`, `npm run build`
