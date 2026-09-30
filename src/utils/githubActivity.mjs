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

export function buildActivitySegments(anchorYears) {
  const years = [
    ...new Set(
      (Array.isArray(anchorYears) ? anchorYears : [])
        .map(Number)
        .filter(Number.isInteger)
    ),
  ].sort((a, b) => a - b);

  const segments = [];
  for (let index = 0; index < years.length; index += 1) {
    const year = years[index];
    const xStart = index * (COLUMN_WIDTH + GAP_WIDTH);
    const xEnd = xStart + COLUMN_WIDTH;
    segments.push({
      kind: "year",
      year,
      years: [year],
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      xStart,
      xEnd,
    });

    const nextYear = years[index + 1];
    if (nextYear) {
      segments.push({
        kind: nextYear === year + 1 ? "bridge" : "gap",
        year: null,
        years:
          nextYear === year + 1
            ? []
            : Array.from(
                { length: nextYear - year - 1 },
                (_value, offset) => year + offset + 1
              ),
        startDate:
          nextYear === year + 1 ? `${year}-12-31` : `${year + 1}-01-01`,
        endDate:
          nextYear === year + 1 ? `${nextYear}-01-01` : `${nextYear - 1}-12-31`,
        xStart: xEnd,
        xEnd: xEnd + GAP_WIDTH,
      });
    }
  }

  return segments;
}

/**
 * 证据占位：有卡片、或当年贡献大于 0 的年份各占一整列；两者都没有的连续
 * 年份合并为压缩区间。占位完全由数据推导（不硬编码年份）。
 *
 * @param {number[]} cardYears 有卡片的年份
 * @param {Record<string, number>} dayCounts 每日贡献（ISO 日期 → 次数）
 * @returns {{
 *   slots: number[],
 *   runs: {
 *     from: number,
 *     to: number,
 *     compressed: boolean,
 *     slotStart: number,
 *     slotCount: number
 *   }[]
 * }} runs 为连续"无卡片"年份区间：compressed 表示该段完全没有证据（窄区间）；
 *   否则 slotStart/slotCount 指出它占据的整列范围（索引对应 slots）。
 */
export function buildEvidenceSlots(cardYears, dayCounts) {
  const cards = new Set(
    (Array.isArray(cardYears) ? cardYears : [])
      .map(Number)
      .filter(Number.isInteger)
  );

  const totals = new Map();
  if (dayCounts && typeof dayCounts === "object" && !Array.isArray(dayCounts)) {
    for (const [day, rawValue] of Object.entries(dayCounts)) {
      if (!isValidIsoDate(day)) continue;
      const value = Number(rawValue);
      if (!Number.isFinite(value) || value <= 0) continue;
      const year = Number(day.slice(0, 4));
      totals.set(year, (totals.get(year) ?? 0) + value);
    }
  }

  const evidenceYears = new Set(cards);
  for (const year of totals.keys()) evidenceYears.add(year);

  const slots = [...evidenceYears].sort((left, right) => left - right);
  if (slots.length === 0) return { slots: [], runs: [] };

  const slotIndex = new Map(slots.map((year, index) => [year, index]));
  const stretches = [];
  let current = null;

  for (let year = slots[0]; year <= slots[slots.length - 1]; year += 1) {
    if (cards.has(year)) {
      current = null;
      continue;
    }
    if (current && current.to === year - 1) {
      current.to = year;
    } else {
      current = { from: year, to: year };
      stretches.push(current);
    }
  }

  const runs = stretches.map(stretch => {
    const runSlots = [];
    for (let year = stretch.from; year <= stretch.to; year += 1) {
      if (slotIndex.has(year)) runSlots.push(year);
    }

    if (runSlots.length === 0) {
      // 整段都没有证据：压缩成窄区间，提示挂在它前面那一列之后
      return {
        ...stretch,
        compressed: true,
        slotStart: slotIndex.get(stretch.from - 1) ?? -1,
        slotCount: 0,
      };
    }

    return {
      ...stretch,
      compressed: false,
      slotStart: slotIndex.get(runSlots[0]),
      slotCount: runSlots.length,
    };
  });

  return { slots, runs };
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

export function buildActivityField(dayCounts, anchorYears) {
  const dayMap = normalizeDays(dayCounts);
  const rawSegments = buildActivitySegments(anchorYears);
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
