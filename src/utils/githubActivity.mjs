const COLUMN_WIDTH = 100;
const GAP_WIDTH = 10;
const FIELD_HEIGHT = 200;
const BASELINE = FIELD_HEIGHT / 2;
const UPPER_AMPLITUDE = 88;
const LOWER_RATIO = 0.34;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function formatNumber(value) {
  return Number(value.toFixed(3)).toString();
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function toIsoDate(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function isValidIsoDate(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function parseIsoDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function eachDay(startDate, endDate) {
  const days = [];
  const end = parseIsoDate(endDate);
  for (let cursor = parseIsoDate(startDate); cursor <= end; cursor += DAY_MS) {
    const value = new Date(cursor);
    days.push(
      toIsoDate(
        value.getUTCFullYear(),
        value.getUTCMonth() + 1,
        value.getUTCDate()
      )
    );
  }
  return days;
}

function quantile(values, ratio) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round((sorted.length - 1) * ratio))
  );
  return sorted[index];
}

function summarize(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return mean * 0.45 + quantile(values, 0.9) * 0.35 + Math.max(...values) * 0.2;
}

function movingAverage(values, windowSize = 7) {
  return values.map((_value, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const slice = values.slice(start, index + 1);
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  });
}

/** 生成 [from, to] 的年份数组（to < from 时为空）。 */
function rangeYears(from, to) {
  const years = [];
  for (let year = from; year <= to; year += 1) years.push(year);
  return years;
}

/**
 * 把列模型铺成活动场段落（内部 x 单位）：
 * - 卡片年 = 一年一段，占 COLUMN_WIDTH；
 * - 区间列（stretch）= 一段，同样占 COLUMN_WIDTH，并携带区间日均供水平带使用；
 * - 相邻列之间 = 一个最短宽度（GAP_WIDTH）的 bridge / gap 段。
 *
 * 无效条目会被过滤（调用方只传列模型；不做兜底猜测）。
 *
 * @param {Array<{kind: "cards", year: number} | {
 *   kind: "stretch", from: number, to: number, years?: number[], meanPerDay?: number
 * }>} slots
 */
export function buildActivitySegments(slots) {
  const list = (Array.isArray(slots) ? slots : [])
    .map(slot => {
      if (slot && slot.kind === "stretch") {
        const from = Number(slot.from);
        const to = Number(slot.to ?? from);
        if (!Number.isInteger(from) || !Number.isInteger(to) || to < from) {
          return null;
        }
        return {
          kind: "stretch",
          from,
          to,
          years:
            Array.isArray(slot.years) && slot.years.length > 0
              ? slot.years.map(Number)
              : rangeYears(from, to),
          meanPerDay: Number(slot.meanPerDay) || 0,
        };
      }

      const year = Number(slot && slot.year);
      if (!Number.isInteger(year)) return null;
      return { kind: "cards", year, years: [year] };
    })
    .filter(Boolean)
    .sort(
      (left, right) =>
        (left.kind === "stretch" ? left.from : left.year) -
        (right.kind === "stretch" ? right.from : right.year)
    );

  const segments = [];
  let x = 0;

  list.forEach((slot, index) => {
    const startYear = slot.kind === "stretch" ? slot.from : slot.year;
    const endYear = slot.kind === "stretch" ? slot.to : slot.year;
    const xStart = x;
    const xEnd = x + COLUMN_WIDTH;

    segments.push(
      slot.kind === "stretch"
        ? {
            kind: "stretch",
            year: null,
            years: slot.years,
            startDate: `${startYear}-01-01`,
            endDate: `${endYear}-12-31`,
            meanPerDay: slot.meanPerDay,
            xStart,
            xEnd,
          }
        : {
            kind: "year",
            year: startYear,
            years: [startYear],
            startDate: `${startYear}-01-01`,
            endDate: `${endYear}-12-31`,
            xStart,
            xEnd,
          }
    );
    x = xEnd;

    const next = list[index + 1];
    if (!next) return;

    const nextStart = next.kind === "stretch" ? next.from : next.year;
    const bridge = nextStart === endYear + 1;
    segments.push({
      kind: bridge ? "bridge" : "gap",
      year: null,
      years: bridge ? [] : rangeYears(endYear + 1, nextStart - 1),
      startDate: bridge ? `${endYear}-12-31` : `${endYear + 1}-01-01`,
      endDate: bridge ? `${nextStart}-01-01` : `${nextStart - 1}-12-31`,
      xStart: x,
      xEnd: x + GAP_WIDTH,
    });
    x += GAP_WIDTH;
  });

  return segments;
}

/**
 * 列模型（证据占位）：
 * - 有卡片的年份各占一整列（kind: "cards"）；
 * - 连续"无卡片"的年份按区间处理：区间内任一年贡献大于 0 → 一个整列宽的区间列
 *   （kind: "stretch"，带 total / days / meanPerDay）；区间内全部为 0 → 压缩区间
 *   （gaps，只占最短宽度，不产列）。
 *
 * 均值 = 区间总贡献 ÷ 区间在数据里覆盖到的天数（含 0 贡献的天），所以尚未到来的
 * 日期不会被算进分母。占位完全由数据推导，不硬编码年份。
 *
 * @param {number[]} cardYears 有卡片的年份
 * @param {Record<string, number>} dayCounts 每日贡献（ISO 日期 → 次数）
 * @returns {{
 *   slots: Array<{kind: "cards", year: number} | {
 *     kind: "stretch", from: number, to: number, years: number[],
 *     total: number, days: number, meanPerDay: number
 *   }>,
 *   gaps: Array<{ from: number, to: number, years: number[] }>
 * }}
 */
export function buildEvidenceSlots(cardYears, dayCounts) {
  const cards = new Set(
    (Array.isArray(cardYears) ? cardYears : [])
      .map(Number)
      .filter(Number.isInteger)
  );

  const yearly = new Map();
  if (dayCounts && typeof dayCounts === "object" && !Array.isArray(dayCounts)) {
    for (const [day, rawValue] of Object.entries(dayCounts)) {
      if (!isValidIsoDate(day)) continue;
      const value = Number(rawValue);
      if (!Number.isFinite(value) || value < 0) continue;
      const year = Number(day.slice(0, 4));
      const entry = yearly.get(year) ?? { total: 0, days: 0 };
      entry.days += 1;
      entry.total += value;
      yearly.set(year, entry);
    }
  }

  const evidenceYears = new Set(cards);
  for (const [year, entry] of yearly) {
    if (entry.total > 0) evidenceYears.add(year);
  }
  if (evidenceYears.size === 0) return { slots: [], gaps: [] };

  const first = Math.min(...evidenceYears);
  const last = Math.max(...evidenceYears);
  const slots = [];
  const gaps = [];

  let year = first;
  while (year <= last) {
    if (cards.has(year)) {
      slots.push({ kind: "cards", year });
      year += 1;
      continue;
    }

    const from = year;
    const years = [];
    while (year <= last && !cards.has(year)) {
      years.push(year);
      year += 1;
    }

    const total = years.reduce(
      (sum, item) => sum + (yearly.get(item)?.total ?? 0),
      0
    );
    const days = years.reduce(
      (sum, item) => sum + (yearly.get(item)?.days ?? 0),
      0
    );

    if (total > 0 && days > 0) {
      slots.push({
        kind: "stretch",
        from,
        to: year - 1,
        years,
        total,
        days,
        meanPerDay: total / days,
      });
    } else {
      gaps.push({ from, to: year - 1, years });
    }
  }

  return { slots, gaps };
}

function normalizeDays(dayCounts) {
  if (!dayCounts || typeof dayCounts !== "object") return new Map();
  return new Map(
    Object.entries(dayCounts)
      .filter(
        ([day, count]) => isValidIsoDate(day) && Number.isFinite(Number(count))
      )
      .map(([day, count]) => [day, Math.max(0, Math.round(Number(count)))])
  );
}

function sampleSegment(segment, dayCounts) {
  if (segment.kind === "bridge") return [];

  // 区间列：水平均值带（常量 level），不逐年细分
  if (segment.kind === "stretch") {
    const binCount = 8;
    const points = [];
    for (let index = 0; index < binCount; index += 1) {
      points.push({
        x:
          segment.xStart +
          ((index + 0.5) * (segment.xEnd - segment.xStart)) / binCount,
        level: segment.meanPerDay,
        dateStart: segment.startDate,
        dateEnd: segment.endDate,
      });
    }
    return points;
  }

  const dates = eachDay(segment.startDate, segment.endDate);
  const rawValues = dates.map(day => dayCounts.get(day) ?? 0);
  const smoothedValues = movingAverage(rawValues, 7);
  const binCount = Math.max(
    8,
    Math.ceil((segment.xEnd - segment.xStart) / 1.35)
  );
  const points = [];

  for (let index = 0; index < binCount; index += 1) {
    const start = Math.floor((index * dates.length) / binCount);
    const end = Math.max(
      start + 1,
      Math.floor(((index + 1) * dates.length) / binCount)
    );
    const rawWindow = rawValues.slice(start, end);
    const smoothedWindow = smoothedValues.slice(start, end);
    const level =
      summarize(rawWindow) * 0.46 + summarize(smoothedWindow) * 0.54;

    points.push({
      x:
        segment.xStart +
        ((index + 0.5) * (segment.xEnd - segment.xStart)) / binCount,
      level,
      dateStart: dates[start],
      dateEnd: dates[Math.min(dates.length - 1, end - 1)],
    });
  }

  return points;
}

function pathForSeries(points, amplitude, baseline, direction, width) {
  const commands = [
    `M 0 ${formatNumber(baseline)}`,
    ...points.map(
      point =>
        `L ${formatNumber(point.x)} ${formatNumber(
          baseline + direction * point.intensity * amplitude
        )}`
    ),
    `L ${formatNumber(width)} ${formatNumber(baseline)}`,
    "Z",
  ];
  return commands.join(" ");
}

export function mergeActivitySources(sources) {
  if (!sources || typeof sources !== "object") return {};

  const merged = new Map();
  for (const [sourcePath, source] of Object.entries(sources)) {
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      throw new TypeError(`${sourcePath}: activity source must be an object`);
    }

    const days = source.days ?? {};
    if (!days || typeof days !== "object" || Array.isArray(days)) {
      throw new TypeError(`${sourcePath}: "days" must be an object`);
    }

    for (const [date, rawValue] of Object.entries(days)) {
      if (!isValidIsoDate(date)) {
        throw new TypeError(`${sourcePath}: invalid activity date "${date}"`);
      }

      const value = Number(rawValue);
      if (!Number.isInteger(value) || value < 0) {
        throw new TypeError(
          `${sourcePath}: invalid activity value "${rawValue}" for ${date}`
        );
      }

      merged.set(date, (merged.get(date) ?? 0) + value);
    }
  }

  return Object.fromEntries(
    [...merged.entries()].sort(([left], [right]) => left.localeCompare(right))
  );
}

export function buildActivityField(dayCounts, slots) {
  const dayMap = normalizeDays(dayCounts);
  const rawSegments = buildActivitySegments(slots);
  const width =
    rawSegments.length > 0 ? rawSegments[rawSegments.length - 1].xEnd : 0;
  const sampledSegments = rawSegments.map(segment => ({
    ...segment,
    points: sampleSegment(segment, dayMap),
  }));
  const positiveLevels = sampledSegments
    .flatMap(segment => segment.points.map(point => point.level))
    .filter(level => level > 0);
  const cap = quantile(positiveLevels, 0.98);
  const hasData = cap > 0;
  const scale = hasData ? Math.log1p(cap) : 1;

  const segments = sampledSegments.map(segment => {
    const points = segment.points.map(point => ({
      ...point,
      intensity: Math.min(1, Math.log1p(point.level) / scale),
    }));
    const maxUpper = Math.max(
      0,
      ...points.map(point => point.intensity * UPPER_AMPLITUDE)
    );
    const maxLower = maxUpper * LOWER_RATIO;

    return {
      ...segment,
      points,
      maxUpper,
      maxLower,
    };
  });

  if (!hasData) {
    return {
      width,
      height: FIELD_HEIGHT,
      baseline: BASELINE,
      viewBox: `0 0 ${width} ${FIELD_HEIGHT}`,
      upperPath: "",
      lowerPath: "",
      hasData: false,
      segments,
    };
  }

  const seriesPoints = segments
    .flatMap(segment => segment.points)
    .sort((left, right) => left.x - right.x);
  const upperPath = pathForSeries(
    seriesPoints,
    UPPER_AMPLITUDE,
    BASELINE,
    -1,
    width
  );
  const lowerPath = pathForSeries(
    seriesPoints,
    UPPER_AMPLITUDE * LOWER_RATIO,
    BASELINE,
    1,
    width
  );

  return {
    width,
    height: FIELD_HEIGHT,
    baseline: BASELINE,
    viewBox: `0 0 ${width} ${FIELD_HEIGHT}`,
    upperPath,
    lowerPath,
    hasData,
    segments,
  };
}
export function bindActivityAlignmentRefresh({
  scheduleUpdate,
  windowObject,
  documentObject,
  requestFrame,
}) {
  let disposed = false;
  const refresh = () => {
    if (!disposed) requestFrame(scheduleUpdate);
  };
  const onLoad = () => refresh();

  if (documentObject.readyState === "complete") {
    refresh();
  } else {
    windowObject.addEventListener("load", onLoad, { once: true });
  }

  const fontsReady = documentObject.fonts?.ready;
  if (fontsReady?.then) {
    fontsReady.then(refresh).catch(() => {});
  }

  return () => {
    disposed = true;
    windowObject.removeEventListener("load", onLoad);
  };
}

export function parseTranslateY(transform) {
  if (!transform || transform === "none") return 0;

  const matrix3d = transform.match(/^matrix3d\((.+)\)$/);
  if (matrix3d) {
    const values = matrix3d[1].split(",").map(Number);
    return Number.isFinite(values[13]) ? values[13] : 0;
  }

  const matrix = transform.match(/^matrix\((.+)\)$/);
  if (matrix) {
    const values = matrix[1].split(",").map(Number);
    return Number.isFinite(values[5]) ? values[5] : 0;
  }

  return 0;
}

export function computeActivityAxisRatio(trackBox, axisBox, translateY = 0) {
  if (
    !trackBox ||
    !axisBox ||
    !Number.isFinite(trackBox.height) ||
    trackBox.height <= 0 ||
    !Number.isFinite(trackBox.top) ||
    !Number.isFinite(axisBox.top) ||
    !Number.isFinite(axisBox.height)
  ) {
    return null;
  }

  const axisCenter = axisBox.top + axisBox.height / 2 - translateY;
  return (axisCenter - trackBox.top) / trackBox.height;
}

export function computeActivityViewBox(viewBox, axisRatio) {
  const [minX, minY, width, height] = String(viewBox)
    .trim()
    .split(/\s+/)
    .map(Number);
  if (![minX, minY, width, height].every(Number.isFinite)) {
    throw new TypeError(`Invalid SVG viewBox: ${viewBox}`);
  }
  const clampedRatio = Math.min(0.9, Math.max(0.1, Number(axisRatio)));
  const offset = (0.5 - clampedRatio) * height;
  return `${formatNumber(minX)} ${formatNumber(minY + offset)} ${formatNumber(
    width
  )} ${formatNumber(height)}`;
}

export function computeAlignedActivityViewBox(
  baseViewBox,
  trackBox,
  axisBox,
  translateY = 0
) {
  const axisRatio = computeActivityAxisRatio(trackBox, axisBox, translateY);
  return axisRatio === null
    ? null
    : computeActivityViewBox(baseViewBox, axisRatio);
}
