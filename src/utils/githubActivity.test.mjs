import assert from "node:assert/strict";
import test from "node:test";

import {
  buildActivityField,
  bindActivityAlignmentRefresh,
  buildActivitySegments,
  buildEvidenceSlots,
  computeActivityAxisRatio,
  computeActivityViewBox,
  computeAlignedActivityViewBox,
  mergeActivitySources,
  parseTranslateY,
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

test("refreshes activity alignment after load and font readiness", async () => {
  let loadHandler;
  let resolveFonts;
  let removedLoadHandler = false;
  const fontsReady = new Promise(resolve => {
    resolveFonts = resolve;
  });
  const windowObject = {
    addEventListener(name, handler) {
      if (name === "load") loadHandler = handler;
    },
    removeEventListener(name, handler) {
      if (name === "load" && handler === loadHandler) removedLoadHandler = true;
    },
  };
  const documentObject = {
    readyState: "loading",
    fonts: { ready: fontsReady },
  };
  let updates = 0;

  const cleanup = bindActivityAlignmentRefresh({
    scheduleUpdate: () => {
      updates += 1;
    },
    windowObject,
    documentObject,
    requestFrame: callback => callback(),
  });

  assert.equal(updates, 0);
  loadHandler();
  assert.equal(updates, 1);

  resolveFonts();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(updates, 2);

  cleanup();
  assert.equal(removedLoadHandler, true);
});

test("computes the timeline axis after subtracting animated translateY", () => {
  const trackBox = { top: 100, height: 600 };
  const axisBox = { top: 400, height: 8 };

  assert.equal(computeActivityAxisRatio(trackBox, axisBox, 0), 304 / 600);
  assert.equal(computeActivityAxisRatio(trackBox, axisBox, 6), 298 / 600);
  assert.equal(
    computeActivityAxisRatio({ top: 0, height: 0 }, axisBox, 0),
    null
  );
});

test("parses translateY from CSS transform matrices", () => {
  assert.equal(parseTranslateY("none"), 0);
  assert.equal(parseTranslateY("matrix(1, 0, 0, 1, 0, 6)"), 6);
  assert.equal(
    parseTranslateY("matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 6, 0, 1)"),
    6
  );
  assert.equal(parseTranslateY("bad-transform"), 0);
});

test("only produces an aligned viewBox when the layout can be measured", () => {
  assert.equal(
    computeAlignedActivityViewBox(
      "0 0 870 200",
      { top: 100, height: 600 },
      { top: 400, height: 8 },
      6
    ),
    "0 0.667 870 200"
  );
  assert.equal(
    computeAlignedActivityViewBox(
      "0 0 870 200",
      { top: 0, height: 0 },
      { top: 400, height: 8 },
      0
    ),
    null
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

test("inserts a bridge segment for adjacent years", () => {
  const segments = buildActivitySegments([2024, 2025]);

  assert.equal(segments.length, 3);
  assert.deepEqual(
    segments.map(segment => [segment.kind, segment.xStart, segment.xEnd]),
    [
      ["year", 0, 100],
      ["bridge", 100, 110],
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
  assert.equal((field.upperPath.match(/M /g) ?? []).length, 1);
  assert.equal((field.lowerPath.match(/M /g) ?? []).length, 1);

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

test("keeps adjacent year boundaries continuous across the visual gap", () => {
  const field = buildActivityField(
    {
      "2024-12-31": 10,
      "2025-01-01": 10,
    },
    [2024, 2025]
  );
  const commands = [...field.upperPath.matchAll(/[ML] ([\d.]+) ([\d.]+)/g)].map(
    match => ({ x: Number(match[1]), y: Number(match[2]) })
  );
  const crossesBoundary = commands.some(
    (point, index) =>
      index > 0 &&
      commands[index - 1].x < 100 &&
      point.x > 110 &&
      commands[index - 1].y < field.baseline &&
      point.y < field.baseline
  );

  assert.equal((field.upperPath.match(/M /g) ?? []).length, 1);
  assert.ok(crossesBoundary);
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

test("证据占位：有贡献的无卡片年份各占一列，只有真空白才压缩", () => {
  const cardYears = [2012, 2016, 2017, 2018, 2019, 2024, 2025, 2026];
  const days = {};
  for (let year = 2017; year <= 2026; year += 1) days[`${year}-03-01`] = 3;

  const { slots, runs } = buildEvidenceSlots(cardYears, days);

  assert.deepEqual(
    slots,
    [2012, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]
  );
  assert.deepEqual(
    runs.map(run => [
      run.from,
      run.to,
      run.compressed,
      run.slotStart,
      run.slotCount,
    ]),
    [
      [2013, 2015, true, 0, 0],
      [2020, 2023, false, 5, 4],
    ]
  );
});

test("证据占位：某年贡献归零后重新塌缩进压缩区间", () => {
  const cardYears = [2016, 2024];
  const withActivity = buildEvidenceSlots(cardYears, {
    "2021-05-05": 4,
    "2022-05-05": 2,
  });
  const withoutActivity = buildEvidenceSlots(cardYears, {});

  assert.deepEqual(withActivity.slots, [2016, 2021, 2022, 2024]);
  assert.deepEqual(withoutActivity.slots, [2016, 2024]);
  assert.deepEqual(
    withoutActivity.runs.map(run => [run.from, run.to, run.compressed]),
    [[2017, 2023, true]]
  );
});

test("证据占位：活动数据缺失时退回卡片年份，且不吃掉非法日期", () => {
  const { slots, runs } = buildEvidenceSlots([2018, 2019], {
    "not-a-date": 5,
    "2020-13-01": 9,
    "2020-01-01": 0,
  });

  assert.deepEqual(slots, [2018, 2019]);
  assert.deepEqual(runs, []);
});

test("证据占位：首次出现贡献的年份自动展开为整列", () => {
  const { slots, runs } = buildEvidenceSlots([2012, 2016], {
    "2014-07-01": 2,
  });

  assert.deepEqual(slots, [2012, 2014, 2016]);
  // 2013–2015 整体没有卡片，仍是一个跨度；其中 2014 有贡献，因此占一整列
  assert.deepEqual(
    runs.map(run => [
      run.from,
      run.to,
      run.compressed,
      run.slotStart,
      run.slotCount,
    ]),
    [[2013, 2015, false, 1, 1]]
  );
});

test("证据占位：占据整列的年份在活动场里拿到整列宽度", () => {
  const cardYears = [2019, 2024];
  const days = { "2021-04-01": 6 };
  const { slots } = buildEvidenceSlots(cardYears, days);
  const segments = buildActivitySegments(slots);
  const yearSegments = segments.filter(segment => segment.kind === "year");

  assert.deepEqual(
    yearSegments.map(segment => [segment.year, segment.xEnd - segment.xStart]),
    [
      [2019, 100],
      [2021, 100],
      [2024, 100],
    ]
  );
  const gap = segments.find(segment => segment.kind === "gap");
  assert.equal(gap.xEnd - gap.xStart, 10);
  assert.deepEqual(gap.years, [2020]);
});

test("证据占位：空输入返回空结果", () => {
  assert.deepEqual(buildEvidenceSlots([], {}), { slots: [], runs: [] });
  assert.deepEqual(buildEvidenceSlots(undefined, undefined), {
    slots: [],
    runs: [],
  });
});
