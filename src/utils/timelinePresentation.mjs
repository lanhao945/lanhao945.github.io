/**
 * 首页时间轴一屏最多展示的年度记录数。
 * 超出部分通过年度详情面板查看，避免主时间轴同时产生横向和纵向滚动。
 */
export const TIMELINE_PREVIEW_LIMIT = 4;

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
