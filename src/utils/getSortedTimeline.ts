import type { CollectionEntry } from "astro:content";

export type TimelineEntry = CollectionEntry<"timeline">;

export type TimelineGroup = {
  year: number;
  items: TimelineEntry[];
};

/**
 * 时间轴排序：从早到晚（横屏时左 = 过去，竖屏时上 = 过去）。
 * 同一年内先按 month，再按标题，保证顺序稳定。
 */
export function getSortedTimeline(entries: TimelineEntry[]): TimelineEntry[] {
  return [...entries].sort((a, b) => {
    if (a.data.year !== b.data.year) return a.data.year - b.data.year;

    const monthA = a.data.month ?? 0;
    const monthB = b.data.month ?? 0;
    if (monthA !== monthB) return monthA - monthB;

    return a.data.title.localeCompare(b.data.title, "zh-CN");
  });
}

/** 按年份分组，保留排序结果。 */
export function groupTimelineByYear(entries: TimelineEntry[]): TimelineGroup[] {
  const groups = new Map<number, TimelineEntry[]>();

  for (const entry of entries) {
    const items = groups.get(entry.data.year);
    if (items) {
      items.push(entry);
    } else {
      groups.set(entry.data.year, [entry]);
    }
  }

  return [...groups.entries()].map(([year, items]) => ({ year, items }));
}
