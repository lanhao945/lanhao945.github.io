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

/** 卡片年列模型：没有跨年区间时的最小形态（区间不占列）。 */
const cardModel = (...years) => ({
  slots: years.map(year => ({ kind: "cards", year })),
  gaps: [],
});

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
  const segments = buildActivitySegments(cardModel(2020, 2024));

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
  const segments = buildActivitySegments(cardModel(2024, 2025));

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
    cardModel(2024, 2025)
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
    cardModel(2024, 2025)
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
    cardModel(2020, 2024)
  );
  const gap = field.segments.find(segment => segment.kind === "gap");

  assert.ok(gap);
  assert.ok(gap.maxUpper > 0);
  assert.equal(gap.years.join(","), "2021,2022,2023");
});

test("returns an empty field when no contribution days exist", () => {
  const field = buildActivityField({}, cardModel(2024, 2025));

  assert.equal(field.hasData, false);
  assert.equal(field.upperPath, "");
  assert.equal(field.lowerPath, "");
});

test("shifts the activity baseline to the measured timeline axis", () => {
  assert.equal(computeActivityViewBox("0 0 870 200", 0.5), "0 0 870 200");
  assert.equal(computeActivityViewBox("0 0 870 200", 0.534), "0 -6.8 870 200");
  assert.equal(computeActivityViewBox("0 0 870 200", 0.99), "0 -80 870 200");
});

test("证据占位：区间不占列，卡片间距保持固定", () => {
  const cardYears = [2012, 2016, 2017, 2018, 2019, 2024, 2025, 2026];
  const days = {};
  for (let year = 2017; year <= 2026; year += 1) days[`${year}-03-01`] = 3;

  const { slots, gaps } = buildEvidenceSlots(cardYears, days);

  assert.deepEqual(
    slots.map(slot => slot.year),
    cardYears
  );
  assert.deepEqual(
    gaps.map(gap => [gap.from, gap.to, gap.total, gap.days, gap.meanPerDay]),
    [
      [2013, 2015, 0, 0, 0],
      [2020, 2023, 12, 4, 3],
    ]
  );
});

test("证据占位：有贡献的区间在活动场里是间隙内的水平带，无贡献的区间只是间隔", () => {
  const cardYears = [2012, 2016, 2017, 2018, 2019, 2024, 2025, 2026];
  const days = {};
  for (let year = 2017; year <= 2026; year += 1) days[`${year}-03-01`] = 3;

  const model = buildEvidenceSlots(cardYears, days);
  const spanSegments = buildActivitySegments(model).filter(
    segment => segment.kind === "stretch" || segment.kind === "gap"
  );

  assert.deepEqual(
    spanSegments.map(segment => [
      segment.kind,
      segment.xEnd - segment.xStart,
      segment.meanPerDay ?? null,
    ]),
    [
      ["gap", 10, null],
      ["stretch", 10, 3],
    ]
  );
});

test("证据占位：区间只包含一年时同样落在间隙里", () => {
  const model = buildEvidenceSlots([2019, 2021], {
    "2020-06-01": 2,
    "2020-06-02": 2,
  });
  const [gap] = model.gaps;

  assert.deepEqual(
    [gap.from, gap.to, gap.total, gap.days, gap.meanPerDay],
    [2020, 2020, 4, 2, 2]
  );
  const segment = buildActivitySegments(model).find(
    item => item.kind === "stretch"
  );
  assert.equal(segment.xEnd - segment.xStart, 10);
});

test("证据占位：活动场用常量高度画出区间均值", () => {
  const days = {};
  for (const year of [2020, 2021]) {
    days[`${year}-01-01`] = 4;
    days[`${year}-01-02`] = 4;
  }

  const model = buildEvidenceSlots([2019, 2024], days);
  const field = buildActivityField(days, model);
  const stretch = field.segments.find(segment => segment.kind === "stretch");
  const levels = stretch.points.map(point => point.intensity);

  assert.equal(stretch.xEnd - stretch.xStart, 10);
  assert.equal(stretch.meanPerDay, 4);
  assert.ok(levels.length > 0);
  assert.ok(levels.every(level => level === levels[0]));
  assert.ok(levels[0] > 0);
});

test("证据占位：新增卡片会把区间拆开，剩余年份按新规则重算", () => {
  const days = { "2020-01-01": 1, "2021-01-01": 1 };
  const before = buildEvidenceSlots([2019, 2024], days);
  const after = buildEvidenceSlots([2019, 2022, 2024], days);

  assert.deepEqual(
    before.gaps.map(gap => [gap.from, gap.to, gap.meanPerDay]),
    [[2020, 2023, 1]]
  );
  assert.deepEqual(
    after.gaps.map(gap => [gap.from, gap.to, gap.meanPerDay]),
    [
      [2020, 2021, 1],
      [2023, 2023, 0],
    ]
  );
  assert.deepEqual(
    buildActivitySegments(after)
      .filter(segment => segment.kind === "stretch")
      .map(segment => segment.meanPerDay),
    [1]
  );
});

test("证据占位：占位只由卡片年决定，贡献变化不改变列数", () => {
  const quiet = buildEvidenceSlots([2019, 2024], {});
  const busy = buildEvidenceSlots([2019, 2024], { "2021-01-01": 9 });

  assert.deepEqual(
    quiet.slots.map(slot => slot.year),
    busy.slots.map(slot => slot.year)
  );
  assert.equal(quiet.gaps[0].meanPerDay, 0);
  assert.equal(busy.gaps[0].meanPerDay, 9);
});

test("证据占位：非法日期与 0 值不参与区间统计", () => {
  const { slots, gaps } = buildEvidenceSlots([2018, 2020], {
    "not-a-date": 5,
    "2019-13-01": 9,
    "2019-01-01": 0,
  });

  assert.deepEqual(
    slots.map(slot => slot.year),
    [2018, 2020]
  );
  assert.deepEqual(
    gaps.map(gap => [gap.from, gap.to, gap.total, gap.days, gap.meanPerDay]),
    [[2019, 2019, 0, 1, 0]]
  );
});

test("证据占位：空输入返回空列模型", () => {
  assert.deepEqual(buildEvidenceSlots([], {}), { slots: [], gaps: [] });
  assert.deepEqual(buildEvidenceSlots(undefined, undefined), {
    slots: [],
    gaps: [],
  });
});
