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
  durationMs: 2750,
  /** 巡航占比：前 70% 恒速，后 30% 匀减速到 0 */
  cruiseRatio: 0.7,
  /** 停稳后多久轻推一次（ms） */
  nudgeDelayMs: 1200,
  /** 轻推幅度（px） */
  nudgeDistancePx: 14,
  /** 轻推往返总时长（ms）：余弦摆动一次，起/折返/止速度都为 0 */
  nudgeDurationMs: 650,
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
 * 轻推的位移：一次余弦摆动 `A·(1−cos 2πp)/2`。
 * p=0 与 p=1 时位移为 0、速度为 0；p=0.5 到达最远点（同样速度为 0），
 * 因此起点与终点都不存在速度突变（这正是"生硬"的来源）。
 */
export function nudgeOffset(progress, distance) {
  const p = clamp(Number(progress) || 0, 0, 1);
  const amplitude = Number(distance) || 0;
  return amplitude * (1 - Math.cos(2 * Math.PI * p)) * 0.5;
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
    nudgeDelayMs: config.nudgeDelayMs,
    nudgeDistancePx: config.nudgeDistancePx,
    nudgeDurationMs: config.nudgeDurationMs,
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

  return { ...base, landingIndex, landingScroll, distance, cruiseSpeed };
}
