/**
 * 首页时间轴一屏最多展示的年度记录数。
 * 超出部分通过年度详情面板查看，避免主时间轴同时产生横向和纵向滚动。
 */
export const TIMELINE_PREVIEW_LIMIT = 4;

/**
 * 时间轴整体排序：年份从早到晚；同一年内数字越小越优先，未填写优先级的
 * 条目排在已填写条目之后，再沿用 month/title 作为稳定排序键。
 *
 * @template {{ data: {
 *   year: number,
 *   priority?: number,
 *   month?: number,
 *   title: string
 * } }} T
 * @param {T} a
 * @param {T} b
 */
const compareTimelineEntries = (a, b) => {
  if (a.data.year !== b.data.year) return a.data.year - b.data.year;

  const priorityA = a.data.priority ?? Number.POSITIVE_INFINITY;
  const priorityB = b.data.priority ?? Number.POSITIVE_INFINITY;
  if (priorityA !== priorityB) return priorityA - priorityB;

  const monthA = a.data.month ?? 0;
  const monthB = b.data.month ?? 0;
  if (monthA !== monthB) return monthA - monthB;

  return a.data.title.localeCompare(b.data.title, "zh-CN");
};

/**
 * 返回新的排序数组，不修改调用方传入的条目。
 *
 * @template {{ data: {
 *   year: number,
 *   priority?: number,
 *   month?: number,
 *   title: string
 * } }} T
 * @param {T[]} entries
 * @returns {T[]}
 */
export function sortTimelineEntries(entries) {
  return [...entries].sort(compareTimelineEntries);
}

/**
 * 为单个年份生成主时间轴预览。
 *
 * @template T
 * @param {{
 *   stacks: Array<{
 *     side: "top" | "bottom",
 *     items: T[]
 *   }>
 * }} column
 * @param {number} [limit]
 * @returns {{
 *   allItems: T[],
 *   previewItems: T[],
 *   previewStacks: Array<{
 *     side: "top" | "bottom",
 *     items: T[]
 *   }>,
 *   itemCount: number,
 *   hiddenCount: number,
 *   hasOverflow: boolean
 * }}
 */
export function buildTimelinePreview(column, limit = TIMELINE_PREVIEW_LIMIT) {
  const stacks = Array.isArray(column?.stacks) ? column.stacks : [];
  const allItems = stacks.flatMap(stack =>
    Array.isArray(stack?.items) ? stack.items : []
  );
  const normalizedLimit = Number.isFinite(Number(limit))
    ? Math.max(0, Math.floor(Number(limit)))
    : TIMELINE_PREVIEW_LIMIT;
  const previewItems = allItems.slice(0, normalizedLimit);
  const firstSide = stacks[0]?.side === "bottom" ? "bottom" : "top";
  const secondSide = firstSide === "top" ? "bottom" : "top";
  const splitAt = Math.ceil(previewItems.length / 2);
  const previewStacks = [
    { side: firstSide, items: previewItems.slice(0, splitAt) },
    { side: secondSide, items: previewItems.slice(splitAt) },
  ];

  return {
    allItems,
    previewItems,
    previewStacks,
    itemCount: allItems.length,
    hiddenCount: Math.max(0, allItems.length - previewItems.length),
    hasOverflow: allItems.length > normalizedLimit,
  };
}
