/**
 * 首页时间轴巡航的节奏策略（纯函数，不依赖 DOM）。
 *
 * 巡航 = 匀速滑行 + 每站停留：
 * - 站点由"有卡片的年份"决定；只有贡献、没有卡片的年份只作为滑行区间；
 * - 每站停留由该站自身数据推出：条目越多停越久（收益递减并封顶），
 *   与上一站的真实年份间隔达到阈值时额外给一个"静默拍"；
 * - 滑行速度与内容总量无关：新增内容只增加总时长，不会提高速度。
 */

export const TOUR_DEFAULTS = Object.freeze({
  /** 每站基础停留（ms） */
  baseDwellMs: 900,
  /** 每多一条记录增加的停留（ms） */
  itemStepMs: 450,
  /** 条目加成封顶（条） */
  extraItemCap: 3,
  /** 真实年份间隔达到该值时给一个静默拍（年） */
  quietGapYears: 4,
  /** 静默拍时长（ms） */
  quietBonusMs: 400,
  /** 单站数据停留的下限 / 上限（ms） */
  minDwellMs: 800,
  maxDwellMs: 2600,
  /** 终章在最后一站额外定格（ms） */
  finaleHoldMs: 600,
  /** 站间滑行速度（px/s） */
  glideSpeed: 240,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** 归一化站点：保留可用的 year/items，按年份升序排列。 */
function normalizeStations(stations) {
  if (!Array.isArray(stations)) return [];
  return stations
    .map(station => ({
      year: Number(station?.year),
      items: Math.max(0, Math.round(Number(station?.items) || 0)),
    }))
    .filter(station => Number.isFinite(station.year))
    .sort((left, right) => left.year - right.year);
}

/**
 * 生成巡航计划。
 *
 * @param {{ year: number, items: number }[]} stations 有卡片的年份（按时间顺序）
 * @param {Partial<typeof TOUR_DEFAULTS>} [options] 覆盖默认常量（便于实测调参）
 * @returns {{ glideSpeed: number, stations: object[], totalDwellMs: number }}
 */
export function planTour(stations, options = {}) {
  const config = { ...TOUR_DEFAULTS, ...options };
  const list = normalizeStations(stations);

  const planned = list.map((station, index) => {
    const gapYears = index === 0 ? 0 : station.year - list[index - 1].year;
    const itemBonus =
      config.itemStepMs *
      Math.min(Math.max(station.items - 1, 0), config.extraItemCap);
    const quietBonus =
      gapYears >= config.quietGapYears ? config.quietBonusMs : 0;
    const dwellMs = clamp(
      config.baseDwellMs + itemBonus + quietBonus,
      config.minDwellMs,
      config.maxDwellMs
    );
    const finale = index === list.length - 1;

    return {
      year: station.year,
      items: station.items,
      gapYears,
      finale,
      /** 由数据推导的停留；不随"是否最后一站"变化 */
      dwellMs,
      /** 终章定格：只属于最后一站 */
      finaleHoldMs: finale ? config.finaleHoldMs : 0,
    };
  });

  return {
    glideSpeed: config.glideSpeed,
    stations: planned,
    totalDwellMs: planned.reduce(
      (sum, station) => sum + station.dwellMs + station.finaleHoldMs,
      0
    ),
  };
}
