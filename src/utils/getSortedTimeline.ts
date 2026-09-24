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

export type TimelineSide = "top" | "bottom";

export type TimelineStack = {
  side: TimelineSide;
  items: TimelineEntry[];
};

export type TimelineColumn = {
  year: number;
  /** 顺序即时间顺序，竖屏按此顺序渲染 */
  stacks: TimelineStack[];
};

/**
 * 把每年的卡片拆成两段，横屏时分别挂在轴线上/轴线下：
 * - 一年多张卡片：前半段在轴线上方、后半段在下方（从上往下即时间顺序）；
 * - 一年只有一张卡片：按年份顺序轮流上下。
 */
export function buildTimelineColumns(
  groups: TimelineGroup[]
): TimelineColumn[] {
  return groups.map((group, index) => {
    const firstOnTop = group.items.length > 1 || index % 2 === 0;
    const splitAt = Math.ceil(group.items.length / 2);

    return {
      year: group.year,
      stacks: [
        {
          side: firstOnTop ? "top" : "bottom",
          items: group.items.slice(0, splitAt),
        },
        {
          side: firstOnTop ? "bottom" : "top",
          items: group.items.slice(splitAt),
        },
      ],
    };
  });
}
