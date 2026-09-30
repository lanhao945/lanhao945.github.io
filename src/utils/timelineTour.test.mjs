import assert from "node:assert/strict";
import test from "node:test";

import {
  TEASER_DEFAULTS,
  planTeaser,
  teaserProgress,
  teaserWalk,
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

test("预告自带过冲与回弹参数，时长为固定 1.8s", () => {
  const plan = planTeaser({
    stations: stations([[2018, 412]]),
    columnPitch: 352,
  });

  assert.equal(plan.durationMs, 1800);
  assert.equal(plan.overshootPx, TEASER_DEFAULTS.overshootPx);
  assert.equal(plan.settleRatio, TEASER_DEFAULTS.settleRatio);
  assert.ok(plan.apexScroll > plan.landingScroll);
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

test("预告位移：过冲后回弹落定，全程没有停顿段", () => {
  const options = {
    distance: 412,
    overshoot: 10,
    cruiseRatio: TEASER_DEFAULTS.cruiseRatio,
    settleRatio: TEASER_DEFAULTS.settleRatio,
  };
  const at = p => teaserWalk(p, options);

  assert.equal(at(0), 0);
  assert.equal(at(1), 412);

  // 采样：先增后减，且峰值 ≈ distance + overshoot
  const samples = Array.from({ length: 101 }, (_, i) => at(i / 100));
  const apex = Math.max(...samples);
  assert.ok(Math.abs(apex - 422) < 1.5);

  const apexIndex = samples.indexOf(apex);
  for (let i = 1; i <= apexIndex; i += 1) {
    assert.ok(samples[i] >= samples[i - 1]); // 单调逼近
  }
  for (let i = apexIndex + 1; i < samples.length; i += 1) {
    assert.ok(samples[i] <= samples[i - 1]); // 单调回弹
  }

  // 没有任何"静止段"：每 1% 进度的位移都大于 0（不会停一下再动）
  for (let i = 1; i < samples.length; i += 1) {
    assert.ok(Math.abs(samples[i] - samples[i - 1]) > 0.02);
  }
});

test("预告位移：过冲折返点与终点速度为 0（起点是设计上的立即起笔）", () => {
  const options = { distance: 412, overshoot: 10 };
  const at = p => teaserWalk(p, options);
  const step = (a, b) => at(b) - at(a);

  const cruiseStep = Math.abs(step(0.2, 0.21)); // 恒速段步长
  const intoApex = Math.abs(step(0.79, 0.81)); // 逼近过冲点
  const outOfApex = Math.abs(step(0.83, 0.85)); // 回弹起步
  const endStep = Math.abs(step(0.99, 1));

  assert.ok(intoApex < cruiseStep / 2);
  assert.ok(outOfApex < cruiseStep / 2);
  assert.ok(endStep < cruiseStep / 2);

  // 起点立即起笔：首段已是恒速（与恒速段步长同量级）
  const startStep = Math.abs(step(0, 0.01));
  assert.ok(startStep > cruiseStep / 3);
});
