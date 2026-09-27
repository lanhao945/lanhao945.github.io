import assert from "node:assert/strict";
import test from "node:test";

import {
  buildActivityField,
  buildActivitySegments,
  computeActivityViewBox,
  mergeActivitySources,
} from "./githubActivity.mjs";

test("sums nested activity source files by date", () => {
  const merged = mergeActivitySources({
    "github/auto.json": {
      source: "github",
      days: { "2024-01-01": 3, "2024-01-02": 1 },
    },
    "gitlab/2024.json": {
      source: "gitlab",
      days: { "2024-01-01": 4, "2024-01-03": 2 },
    },
    "private/git/2024.json": {
      source: "private-git",
      days: { "2024-01-02": 5, "2024-01-03": 7 },
    },
  });

  assert.deepEqual(merged, {
    "2024-01-01": 7,
    "2024-01-02": 6,
    "2024-01-03": 9,
  });
});

test("accepts a minimal activity source containing only days", () => {
  const merged = mergeActivitySources({
    "custom/2024.json": { days: { "2024-02-01": 2 } },
  });

  assert.deepEqual(merged, { "2024-02-01": 2 });
});

test("rejects invalid activity source values with the source path", () => {
  assert.throws(
    () =>
      mergeActivitySources({
        "gitlab/2024.json": {
          days: { "2024-13-01": 2 },
        },
      }),
    /gitlab\/2024\.json/
  );

  assert.throws(
    () =>
      mergeActivitySources({
        "gitlab/2025.json": {
          days: { "2025-01-01": -1 },
        },
      }),
    /gitlab\/2025\.json/
  );

  assert.throws(
    () =>
      mergeActivitySources({
        "gitlab/2026.json": {
          days: { "2026-01-01": 1.5 },
        },
      }),
    /gitlab\/2026\.json/
  );
});

test("maps anchored years to equal columns and missing years to the gap", () => {
  const segments = buildActivitySegments([2020, 2024]);

  assert.deepEqual(segments, [
    {
      kind: "year",
      year: 2020,
      years: [2020],
      startDate: "2020-01-01",
      endDate: "2020-12-31",
      xStart: 0,
      xEnd: 100,
    },
    {
      kind: "gap",
      year: null,
      years: [2021, 2022, 2023],
      startDate: "2021-01-01",
      endDate: "2023-12-31",
      xStart: 100,
      xEnd: 110,
    },
    {
      kind: "year",
      year: 2024,
      years: [2024],
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      xStart: 110,
      xEnd: 210,
    },
  ]);
});

test("does not create an empty gap for adjacent years", () => {
  const segments = buildActivitySegments([2024, 2025]);

  assert.equal(segments.length, 2);
  assert.deepEqual(
    segments.map(segment => [segment.kind, segment.xStart, segment.xEnd]),
    [
      ["year", 0, 100],
      ["year", 110, 210],
    ]
  );
});

test("builds asymmetric finite SVG fields with the stronger value above the axis", () => {
  const field = buildActivityField(
    {
      "2024-01-01": 0,
      "2024-06-01": 10,
      "2025-06-01": 5,
    },
    [2024, 2025]
  );

  assert.equal(field.width, 210);
  assert.equal(field.height, 200);
  assert.equal(field.baseline, 100);
  assert.equal(field.viewBox, "0 0 210 200");
  assert.equal(field.hasData, true);
  assert.match(field.upperPath, /^M /);
  assert.match(field.lowerPath, /^M /);
  assert.doesNotMatch(field.upperPath, /NaN/);
  assert.doesNotMatch(field.lowerPath, /NaN/);
  assert.ok(field.upperPath.split("M ").length - 1 >= 2);
  assert.ok(field.lowerPath.split("M ").length - 1 >= 2);

  const upperMax = Math.max(...field.segments.map(segment => segment.maxUpper));
  const lowerMax = Math.max(...field.segments.map(segment => segment.maxLower));
  assert.ok(upperMax > 0);
  assert.ok(lowerMax > 0);
  assert.ok(lowerMax <= upperMax * 0.4);

  const upperY = [...field.upperPath.matchAll(/[ML] [\d.]+ ([\d.]+)/g)].map(
    match => Number(match[1])
  );
  const lowerY = [...field.lowerPath.matchAll(/[ML] [\d.]+ ([\d.]+)/g)].map(
    match => Number(match[1])
  );
  assert.ok(upperY.every(value => value <= field.baseline));
  assert.ok(lowerY.every(value => value >= field.baseline));

  const numericTokens = [field.upperPath, field.lowerPath]
    .join(" ")
    .match(/-?\d+(?:\.\d+)?/g)
    ?.map(Number);
  assert.ok(numericTokens?.length);
  assert.ok(numericTokens.every(Number.isFinite));
});

test("compresses skipped years into a visible gap segment", () => {
  const field = buildActivityField(
    {
      "2021-03-01": 4,
      "2021-03-02": 5,
      "2022-06-01": 6,
      "2023-09-01": 7,
    },
    [2020, 2024]
  );
  const gap = field.segments.find(segment => segment.kind === "gap");

  assert.ok(gap);
  assert.ok(gap.maxUpper > 0);
  assert.equal(gap.years.join(","), "2021,2022,2023");
});

test("returns an empty field when no contribution days exist", () => {
  const field = buildActivityField({}, [2024, 2025]);

  assert.equal(field.hasData, false);
  assert.equal(field.upperPath, "");
  assert.equal(field.lowerPath, "");
});

test("shifts the activity baseline to the measured timeline axis", () => {
  assert.equal(computeActivityViewBox("0 0 870 200", 0.5), "0 0 870 200");
  assert.equal(computeActivityViewBox("0 0 870 200", 0.534), "0 -6.8 870 200");
  assert.equal(computeActivityViewBox("0 0 870 200", 0.99), "0 -80 870 200");
});
