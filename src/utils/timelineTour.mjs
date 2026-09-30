/**
 * 首页时间轴"开场预告"的节奏策略（纯函数，不依赖 DOM）。
 *
 * 与上一版"到站式巡航"的区别：不再有站点与停留 —— 只有一次连续滑行
 * （前段恒速、末段缓出）落在一个构图完整的列上，随后交还控制权；
 * 预告时长固定，与内容总量无关。
 */

export const TEASER_DEFAULTS = Object.freeze({
  /** 起笔延迟（ms）：等首屏入场动画起势，但不再制造数秒死屏 */
  startDelayMs: 150,
  /** 预告总时长（ms）：固定值，与内容总量无关 */
  durationMs: 1800,
  /** 巡航占比：前 70% 恒速，其余减速 */
  cruiseRatio: 0.7,
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
 * 前 `cruiseRatio` 恒速，之后匀减速到 0；`d(1) === 1`。
 */
/**
 * 预告的完整位移（px）：巡航 + 减速 → 过冲到 `distance + overshoot`
 * → 末段平滑回弹落定到 `distance`。
 *
 * - 起、折返（过冲最远处）、止三处速度为 0，全段速度连续；
 * - 回弹与滑行是同一次运动，不会出现"停住之后再动一下"。
 */
export function teaserWalk(
  progress,
  { distance, overshoot = 0, cruiseRatio = 0.7, settleRatio = 0.18 }
) {
  const total = Math.max(0, Number(distance) || 0);
  const extra = Math.max(0, Number(overshoot) || 0);
  const approachEnd = 1 - clamp(Number(settleRatio) || 0.18, 0.05, 0.5);
  const p = clamp(Number(progress) || 0, 0, 1);
  const apex = total + extra;

  if (p < approachEnd) {
    return apex * teaserProgress(p / approachEnd, cruiseRatio);
  }

  const q = clamp((p - approachEnd) / (1 - approachEnd), 0, 1);
  const eased = q * q * (3 - 2 * q); // smoothstep：两端速度为 0
  return apex + (total - apex) * eased;
}

export function teaserProgress(p, cruiseRatio) {
  const ratio = clamp(Number(cruiseRatio) || 0, 0.05, 0.95);
  const progress = clamp(Number(p) || 0, 0, 1);
  const speed = 1 / (ratio + (1 - ratio) / 2); // 归一化后恒速段的相对速度
  if (progress <= ratio) return speed * progress;
  const tail = (progress - ratio) / (1 - ratio);
  return clamp(
    speed * (ratio + (1 - ratio) * (tail - tail * tail * 0.5)),
    0,
    1
  );
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
    cruiseRatio: config.cruiseRatio,
    overshootPx: config.overshootPx,
    settleRatio: config.settleRatio,
  };

  if (list.length === 0) {
    return {
      ...base,
      landingIndex: -1,
      landingScroll: start,
      distance: 0,
      cruiseSpeed: 0,
    };
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
  // 位移 = v·T·(r + (1-r)/2)  ⇒  v = 位移 / 有效时长
  const effectiveMs =
    config.durationMs * (config.cruiseRatio + (1 - config.cruiseRatio) / 2);
  const cruiseSpeed = effectiveMs > 0 ? distance / (effectiveMs / 1000) : 0;

  return {
    ...base,
    landingIndex,
    landingScroll,
    distance,
    apexScroll:
      landingScroll +
      Math.sign(landingScroll - start || 1) * config.overshootPx,
    cruiseSpeed,
  };
}
