import assert from "node:assert/strict";
import test from "node:test";

import { TOUR_DEFAULTS, planTour } from "./timelineTour.mjs";

const dwellOf = (plan, year) =>
  plan.stations.find(station => station.year === year).dwellMs;

test("条目更多的年份停留更久", () => {
  const plan = planTour([
    { year: 2017, items: 1 },
    { year: 2018, items: 3 },
  ]);

  assert.ok(dwellOf(plan, 2018) > dwellOf(plan, 2017));
});

test("条目加成封顶：超过上限后停留不再增长", () => {
  const atCap = planTour([
    { year: 2024, items: 1 + TOUR_DEFAULTS.extraItemCap },
  ]);
  const overflowing = planTour([{ year: 2024, items: 30 }]);

  assert.equal(atCap.stations[0].dwellMs, overflowing.stations[0].dwellMs);
});

test("单站停留不超过上限", () => {
  const plan = planTour([
    { year: 2019, items: 1 },
    { year: 2024, items: 3 },
  ]);

  for (const station of plan.stations) {
    assert.ok(station.dwellMs <= TOUR_DEFAULTS.maxDwellMs);
    assert.ok(station.dwellMs >= TOUR_DEFAULTS.minDwellMs);
  }
});

test("真实年份间隔达到阈值时获得静默拍", () => {
  const continuous = planTour([
    { year: 2018, items: 1 },
    { year: 2019, items: 1 },
  ]);
  const quiet = planTour([
    { year: 2018, items: 1 },
    { year: 2022, items: 1 },
  ]);

  assert.equal(continuous.stations[1].gapYears, 1);
  assert.equal(quiet.stations[1].gapYears, TOUR_DEFAULTS.quietGapYears);
  assert.equal(
    dwellOf(quiet, 2022) - dwellOf(continuous, 2019),
    TOUR_DEFAULTS.quietBonusMs
  );
});

test("新增一年只追加站点：既有停留与滑行速度不变、总时长增加", () => {
  const before = planTour([
    { year: 2024, items: 3 },
    { year: 2025, items: 1 },
  ]);
  const after = planTour([
    { year: 2024, items: 3 },
    { year: 2025, items: 1 },
    { year: 2026, items: 1 },
  ]);

  assert.equal(after.glideSpeed, before.glideSpeed);
  assert.equal(after.stations.length, before.stations.length + 1);
  assert.equal(dwellOf(after, 2024), dwellOf(before, 2024));
  assert.equal(dwellOf(after, 2025), dwellOf(before, 2025));
  assert.ok(after.totalDwellMs > before.totalDwellMs);
});

test("终章定格只属于最后一站", () => {
  const plan = planTour([
    { year: 2025, items: 1 },
    { year: 2026, items: 1 },
  ]);

  assert.equal(plan.stations[0].finaleHoldMs, 0);
  assert.equal(plan.stations[0].finale, false);
  assert.equal(plan.stations[1].finaleHoldMs, TOUR_DEFAULTS.finaleHoldMs);
  assert.equal(plan.stations[1].finale, true);
});

test("空站点与单站点都能安全生成计划", () => {
  const empty = planTour([]);
  assert.deepEqual(empty.stations, []);
  assert.equal(empty.totalDwellMs, 0);
  assert.equal(empty.glideSpeed, TOUR_DEFAULTS.glideSpeed);

  const single = planTour([{ year: 2012, items: 1 }]);
  assert.equal(single.stations.length, 1);
  assert.equal(single.stations[0].gapYears, 0);
  assert.equal(single.stations[0].dwellMs, TOUR_DEFAULTS.baseDwellMs);
  assert.equal(single.stations[0].finaleHoldMs, TOUR_DEFAULTS.finaleHoldMs);
  assert.equal(
    single.totalDwellMs,
    TOUR_DEFAULTS.baseDwellMs + TOUR_DEFAULTS.finaleHoldMs
  );
});

test("乱序与脏输入被归一化，不抛错", () => {
  const plan = planTour([
    { year: 2024, items: 3 },
    { year: "2019", items: "1" },
    { year: Number.NaN, items: 2 },
    { year: 2018, items: -5 },
  ]);

  assert.deepEqual(
    plan.stations.map(station => station.year),
    [2018, 2019, 2024]
  );
  assert.equal(plan.stations[0].items, 0);
  assert.equal(plan.stations[1].items, 1);
});
