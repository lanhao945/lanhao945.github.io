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
      teaserProgress(0.3, after.approachEase),
      teaserProgress(0.85, after.approachEase),
    ],
    [
      teaserProgress(0.3, before.approachEase),
      teaserProgress(0.85, before.approachEase),
    ]
  );
});

test("起步略快：初速约为该段平均速度的 approachEase 倍", () => {
  const plan = planTeaser({
    stations: stations([
      [2012, 0],
      [2018, 412],
    ]),
    columnPitch: 352,
  });
  const approachMs = plan.durationMs * (1 - plan.settleRatio);
  const average = plan.apexScroll / (approachMs / 1000);
  const initial = average * plan.approachEase;

  assert.ok(initial > average);
  assert.ok(initial < average * 2); // 略快，不是弹射
});

test("位移曲线：起步略快、全程单调减速、终点归一", () => {
  const ease = TEASER_DEFAULTS.approachEase;
  const step = (a, b) => teaserProgress(b, ease) - teaserProgress(a, ease);

  assert.equal(teaserProgress(0, ease), 0);
  assert.equal(teaserProgress(1, ease), 1);

  const speeds = [];
  for (let i = 0; i < 20; i += 1) speeds.push(step(i / 20, (i + 1) / 20));
  for (let i = 1; i < speeds.length; i += 1) {
    assert.ok(speeds[i] < speeds[i - 1]); // 单调减速，没有匀速段
  }
  assert.ok(speeds[0] > speeds.at(-1) * 3);
});

test("预告位移：过冲后回弹落定，全程没有停顿段", () => {
  const options = {
    distance: 412,
    overshoot: 16,
    approachEase: TEASER_DEFAULTS.approachEase,
    settleRatio: TEASER_DEFAULTS.settleRatio,
  };
  const at = p => teaserWalk(p, options);

  assert.equal(at(0), 0);
  assert.equal(at(1), 412);

  const samples = Array.from({ length: 101 }, (_, i) => at(i / 100));
  const apex = Math.max(...samples);
  assert.ok(Math.abs(apex - 428) < 1.5);

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

test("预告位移：折返点与终点速度为 0", () => {
  const options = { distance: 412, overshoot: 16 };
  const at = p => teaserWalk(p, options);
  const step = (a, b) => at(b) - at(a);

  const startStep = Math.abs(step(0, 0.01)); // 起步（设计上略快）
  const midStep = Math.abs(step(0.4, 0.41)); // 中段
  const intoApex = Math.abs(step(0.75, 0.77)); // 逼近折返点
  const outOfApex = Math.abs(step(0.79, 0.81)); // 回弹起步
  const endStep = Math.abs(step(0.99, 1)); // 落定

  assert.ok(startStep > midStep); // 起步略快
  assert.ok(midStep > intoApex); // 单调减速
  assert.ok(outOfApex < midStep); // 折返处速度小
  assert.ok(endStep < midStep / 2); // 终点速度趋近 0
});

test("站点不足或没有可用落点时退化为最后一站，不报错", () => {
  const single = planTeaser({
    stations: stations([[2013, 40]]),
    columnPitch: 352,
  });
  assert.equal(single.landingIndex, 0);
  assert.equal(single.landingScroll, 40);

  const empty = planTeaser({ stations: [], columnPitch: 352 });
  assert.equal(empty.landingIndex, -1);
  assert.equal(empty.distance, 0);
  assert.equal(empty.durationMs, TEASER_DEFAULTS.durationMs);
});

test("预告自带过冲参数，时长固定 1.8s", () => {
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
