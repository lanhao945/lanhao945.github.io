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
    if (nextYear && nextYear > year + 1) {
      segments.push({
        kind: "gap",
        year: null,
        years: Array.from(
          { length: nextYear - year - 1 },
          (_value, offset) => year + offset + 1
        ),
        startDate: `${year + 1}-01-01`,
        endDate: `${nextYear - 1}-12-31`,
        xStart: xEnd,
        xEnd: xEnd + GAP_WIDTH,
      });
    }
  }

  return segments;
}

function normalizeDays(dayCounts) {
  if (!dayCounts || typeof dayCounts !== "object") return new Map();
  return new Map(
    Object.entries(dayCounts)
      .filter(
        ([day, count]) =>
          DATE_PATTERN.test(day) && Number.isFinite(Number(count))
      )
      .map(([day, count]) => [day, Math.max(0, Math.round(Number(count)))])
  );
}

function sampleSegment(segment, dayCounts) {
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

function pathFor(points, amplitude, baseline, xStart, xEnd) {
  const commands = [
    `M ${formatNumber(xStart)} ${formatNumber(baseline)}`,
    ...points.map(
      point =>
        `L ${formatNumber(point.x)} ${formatNumber(
          baseline - point.intensity * amplitude
        )}`
    ),
    `L ${formatNumber(xEnd)} ${formatNumber(baseline)}`,
    "Z",
  ];
  return commands.join(" ");
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

  const upperPath = segments
    .filter(segment => segment.maxUpper > 0)
    .map(segment =>
      pathFor(
        segment.points,
        UPPER_AMPLITUDE,
        BASELINE,
        segment.xStart,
        segment.xEnd
      )
    )
    .join(" ");
  const lowerPath = segments
    .filter(segment => segment.maxLower > 0)
    .map(segment =>
      pathFor(
        segment.points,
        UPPER_AMPLITUDE * LOWER_RATIO,
        BASELINE,
        segment.xStart,
        segment.xEnd
      )
    )
    .join(" ");

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
