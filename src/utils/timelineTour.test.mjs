import assert from "node:assert/strict";
import test from "node:test";

import {
  TEASER_DEFAULTS,
  nudgeOffset,
  planTeaser,
  teaserProgress,
} from "./timelineTour.mjs";

const stations = list =>
  list.map(([year, targetScroll]) => ({ year, targetScroll }));

test("落点取第一个居中位移至少一个列距的卡片年", () => {
  // 最左两站的居中目标被夹到 0（无法真正居中），应跳过
  const plan = planTeaser({
    stations: stations([
      [2012, 0],
      [2016, 0],
      [2017, 60],
      [2018, 412],
      [2019, 764],
    ]),
    columnPitch: 352,
  });

  assert.equal(plan.landingIndex, 3);
  assert.equal(plan.landingScroll, 412);
  assert.equal(plan.distance, 412);
});

test("预告时长固定：新增内容不改变时长、落点与曲线", () => {
  const before = planTeaser({
    stations: stations([
      [2017, 60],
      [2018, 412],
    ]),
    columnPitch: 352,
  });
  const after = planTeaser({
    stations: stations([
      [2017, 60],
      [2018, 412],
      [2026, 1487],
    ]),
    columnPitch: 352,
  });

  assert.equal(before.durationMs, TEASER_DEFAULTS.durationMs);
  assert.equal(after.durationMs, before.durationMs);
  assert.equal(after.landingScroll, before.landingScroll);
  assert.deepEqual(
    [
      teaserProgress(0.3, after.cruiseRatio),
      teaserProgress(0.85, after.cruiseRatio),
    ],
    [
      teaserProgress(0.3, before.cruiseRatio),
      teaserProgress(0.85, before.cruiseRatio),
    ]
  );
});

test("恒速段速度 = 位移 ÷ 有效时长", () => {
  const plan = planTeaser({
    stations: stations([
      [2012, 0],
      [2018, 412],
    ]),
    columnPitch: 352,
  });
  const effectiveMs =
    plan.durationMs * (plan.cruiseRatio + (1 - plan.cruiseRatio) / 2);

  assert.ok(
    Math.abs(plan.cruiseSpeed - plan.distance / (effectiveMs / 1000)) < 1e-9
  );
  // 当前数据下的量级：约 150-350 px/s
  assert.ok(plan.cruiseSpeed > 100 && plan.cruiseSpeed < 400);
});

test("位移曲线：恒速段线性、末段减速、终点归一", () => {
  const ratio = TEASER_DEFAULTS.cruiseRatio;
  const quarterSpeed = teaserProgress(0.25, ratio) / 0.25;
  const halfSpeed = teaserProgress(0.45, ratio) / 0.45;

  assert.ok(Math.abs(quarterSpeed - halfSpeed) < 1e-9); // 恒速段：单位进度位移相同
  assert.equal(teaserProgress(0, ratio), 0);
  assert.equal(teaserProgress(1, ratio), 1);
  assert.ok(teaserProgress(0.9, ratio) < teaserProgress(1, ratio));
  const tailSpeed =
    (teaserProgress(1, ratio) - teaserProgress(0.95, ratio)) / 0.05;
  assert.ok(tailSpeed < halfSpeed); // 末段比恒速段慢
});

test("站点不足或没有可用落点时退化为最后一站，不报错", () => {
  const single = planTeaser({
    stations: stations([[2013, 40]]),
    columnPitch: 352,
  });
  assert.equal(single.landingIndex, 0);
  assert.equal(single.landingScroll, 40);
  assert.ok(single.cruiseSpeed > 0);

  const empty = planTeaser({ stations: [], columnPitch: 352 });
  assert.equal(empty.landingIndex, -1);
  assert.equal(empty.distance, 0);
  assert.equal(empty.cruiseSpeed, 0);
  assert.equal(empty.durationMs, TEASER_DEFAULTS.durationMs);
});

test("预告包含一次性轻推参数，且只有一组", () => {
  const plan = planTeaser({
    stations: stations([[2018, 412]]),
    columnPitch: 352,
  });

  assert.equal(plan.nudgeDelayMs, TEASER_DEFAULTS.nudgeDelayMs);
  assert.equal(plan.nudgeDistancePx, TEASER_DEFAULTS.nudgeDistancePx);
  assert.equal(plan.nudgeDurationMs, TEASER_DEFAULTS.nudgeDurationMs);
  assert.equal(typeof plan.nudgeDistancePx, "number");
});

test("脏输入被归一化，不抛错", () => {
  const plan = planTeaser({
    stations: [
      { year: 2018, targetScroll: "412" },
      { year: Number.NaN, targetScroll: 10 },
      { year: 2017, targetScroll: -5 },
    ],
    columnPitch: "352",
  });

  assert.equal(plan.landingIndex, 1);
  assert.equal(plan.landingScroll, 412);
});

test("轻推曲线：两端与折返点速度为 0（不产生速度突变）", () => {
  const distance = 14;
  const at = p => nudgeOffset(p, distance);

  assert.equal(at(0), 0);
  assert.ok(Math.abs(at(0.5) - distance) < 1e-9); // 折返到最远点
  assert.ok(Math.abs(at(1)) < 1e-9);

  // 起步/收尾的位移增量远小于最快段（p≈0.25 附近），说明两端平滑
  const fastestStep = Math.abs(at(0.27) - at(0.25));
  const startStep = Math.abs(at(0.02) - at(0));
  const endStep = Math.abs(at(1) - at(0.98));
  assert.ok(startStep < fastestStep / 5);
  assert.ok(endStep < fastestStep / 5);
});
