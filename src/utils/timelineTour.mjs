/**
 * 首页时间轴"开场预告"的节奏策略（纯函数，不依赖 DOM）。
 *
 * 一次连续滑行：起步略快，沿曲线单调减速，落点前小幅过冲后平滑回弹，
 * 随后交还控制权。时长固定，与内容总量无关。
 */

export const TEASER_DEFAULTS = Object.freeze({
  /** 起笔延迟（ms）：等首屏入场动画起势，但不制造数秒死屏 */
  startDelayMs: 150,
  /** 预告总时长（ms）：固定值，与内容总量无关 */
  durationMs: 1800,
  /** 起步倍率：初速 = approachEase × 该段平均速度（>1 即起步略快，之后单调减速） */
  approachEase: 1.45,
  /** 落点前的过冲量（px）：回弹并入同一次运动，避免"停住后再来一下" */
  overshootPx: 16,
  /** 末段用于回弹落定的时长占比（过冲变大时略放宽，保持回弹柔和） */
  settleRatio: 0.22,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** 归一化站点：保留可用的 year/targetScroll，按年份升序。 */
function normalizeStations(stations) {
  if (!Array.isArray(stations)) return [];
  return stations
    .map(station => ({
      year: Number(station?.year),
      targetScroll: Number(station?.targetScroll) || 0,
    }))
    .filter(station => Number.isFinite(station.year))
    .sort((left, right) => left.year - right.year);
}

/**
 * 预告的位移曲线：把线性进度 p 映射成"已走过的距离占比"。
 * 幂次缓出 `1 − (1−p)^ease`：起步比平均快约 `ease` 倍，之后**单调减速**到 0，
 * 没有匀速段（`ease = 1` 退化为匀速）。`d(0) = 0`、`d(1) = 1`。
 */
export function teaserProgress(p, ease) {
  const power = clamp(Number(ease) || 1, 1, 4);
  const progress = clamp(Number(p) || 0, 0, 1);
  return clamp(1 - Math.pow(1 - progress, power), 0, 1);
}

/**
 * 预告的完整位移（px）：沿缓出曲线滑向过冲点 `distance + overshoot`，
 * 再用 smoothstep 平滑回弹落定到 `distance`。
 *
 * - 起点速度按 `approachEase` 略快，之后单调衰减（无匀速段）；
 * - 折返点与终点速度为 0（自然折返，不是"停一会儿再动一下"）；
 * - 回弹与滑行属于同一次运动。
 */
export function teaserWalk(
  progress,
  { distance, overshoot = 0, approachEase = 1.45, settleRatio = 0.22 }
) {
  const total = Math.max(0, Number(distance) || 0);
  const extra = Math.max(0, Number(overshoot) || 0);
  const approachEnd = 1 - clamp(Number(settleRatio) || 0.22, 0.05, 0.5);
  const p = clamp(Number(progress) || 0, 0, 1);
  const apex = total + extra;

  if (p < approachEnd) {
    return apex * teaserProgress(p / approachEnd, approachEase);
  }

  const q = clamp((p - approachEnd) / (1 - approachEnd), 0, 1);
  const eased = q * q * (3 - 2 * q); // smoothstep：两端速度为 0
  return apex + (total - apex) * eased;
}

/**
 * 生成开场预告计划。
 *
 * @param {{
 *   stations: Array<{ year: number, targetScroll: number }>,
 *   columnPitch: number,
 *   fromScroll?: number
 * }} input stations 为卡片年及其"居中所需 scrollLeft"，columnPitch 为一个列距
 * @param {Partial<typeof TEASER_DEFAULTS>} [options] 覆盖默认常量（便于实测调参）
 */
export function planTeaser(
  { stations, columnPitch, fromScroll = 0 },
  options = {}
) {
  const config = { ...TEASER_DEFAULTS, ...options };
  const list = normalizeStations(stations);
  const pitch = Math.max(1, Number(columnPitch) || 0);
  const start = Number(fromScroll) || 0;

  const base = {
    startDelayMs: config.startDelayMs,
    durationMs: config.durationMs,
    approachEase: config.approachEase,
    overshootPx: config.overshootPx,
    settleRatio: config.settleRatio,
  };

  if (list.length === 0) {
    return { ...base, landingIndex: -1, landingScroll: start, distance: 0 };
  }

  // 落点：第一个"居中位移至少一个列距"的卡片年（最左几站常被夹到 0，不适合当落点）
  let landingIndex = list.length - 1;
  for (let index = 0; index < list.length; index += 1) {
    if (Math.abs(list[index].targetScroll - start) >= pitch) {
      landingIndex = index;
      break;
    }
  }

  const landingScroll = list[landingIndex].targetScroll;
  const distance = Math.abs(landingScroll - start);

  return {
    ...base,
    landingIndex,
    landingScroll,
    distance,
    apexScroll:
      landingScroll +
      Math.sign(landingScroll - start || 1) * config.overshootPx,
  };
}
