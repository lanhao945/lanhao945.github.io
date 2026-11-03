import assert from "node:assert/strict";
import test from "node:test";

import {
  TIMELINE_PREVIEW_LIMIT,
  buildTimelinePreview,
  sortTimelineEntries,
} from "./timelinePresentation.mjs";

const makeItems = count =>
  Array.from({ length: count }, (_, index) => ({ id: `item-${index + 1}` }));

const makeTimelineEntry = ({
  id,
  year = 2026,
  month,
  priority,
  title = id,
}) => ({
  id,
  data: { year, month, priority, title },
});

const entryIds = entries => entries.map(entry => entry.id);

test("同一年按 priority 升序，不同年份仍按 year 升序", () => {
  const sorted = sortTimelineEntries([
    makeTimelineEntry({ id: "2026-later", priority: 9 }),
    makeTimelineEntry({ id: "2025-earlier", year: 2025, priority: 9 }),
    makeTimelineEntry({ id: "2026-first", priority: 1 }),
  ]);

  assert.deepEqual(entryIds(sorted), [
    "2025-earlier",
    "2026-first",
    "2026-later",
  ]);
});

test("未填写 priority 的条目排在有 priority 的条目之后", () => {
  const sorted = sortTimelineEntries([
    makeTimelineEntry({ id: "unranked-no-month", title: "A" }),
    makeTimelineEntry({ id: "ranked-low", month: 12, priority: 2 }),
    makeTimelineEntry({ id: "unranked-month", month: 2, title: "A" }),
    makeTimelineEntry({ id: "ranked-high", month: 12, priority: 1 }),
  ]);

  assert.deepEqual(entryIds(sorted), [
    "ranked-high",
    "ranked-low",
    "unranked-no-month",
    "unranked-month",
  ]);
});

test("priority 相同时按 month、title 稳定排序", () => {
  const sorted = sortTimelineEntries([
    makeTimelineEntry({ id: "sep-b", month: 9, priority: 1, title: "B" }),
    makeTimelineEntry({ id: "sep-a", month: 9, priority: 1, title: "A" }),
    makeTimelineEntry({ id: "jul-z", month: 7, priority: 1, title: "Z" }),
    makeTimelineEntry({ id: "no-month", priority: 1, title: "Z" }),
  ]);

  assert.deepEqual(entryIds(sorted), [
    "no-month",
    "jul-z",
    "sep-a",
    "sep-b",
  ]);
});

test("全部省略 priority 时保持原有 month、title 顺序", () => {
  const sorted = sortTimelineEntries([
    makeTimelineEntry({ id: "sep-b", month: 9, title: "B" }),
    makeTimelineEntry({ id: "sep-a", month: 9, title: "A" }),
    makeTimelineEntry({ id: "jul-z", month: 7, title: "Z" }),
    makeTimelineEntry({ id: "no-month", title: "Z" }),
  ]);

  assert.deepEqual(entryIds(sorted), [
    "no-month",
    "jul-z",
    "sep-a",
    "sep-b",
  ]);
});

test("排序不修改输入数组", () => {
  const entries = [
    makeTimelineEntry({ id: "later", priority: 2 }),
    makeTimelineEntry({ id: "first", priority: 1 }),
  ];

  const sorted = sortTimelineEntries(entries);

  assert.deepEqual(entryIds(entries), ["later", "first"]);
  assert.deepEqual(entryIds(sorted), ["first", "later"]);
});

test("年度预览是完整详情顺序的前四条", () => {
  const entries = [4, 1, 6, 3, 2, 5].map(priority =>
    makeTimelineEntry({ id: `priority-${priority}`, priority })
  );
  const sorted = sortTimelineEntries(entries);
  const preview = buildTimelinePreview({
    year: 2026,
    stacks: [
      { side: "top", items: sorted.slice(0, 3) },
      { side: "bottom", items: sorted.slice(3) },
    ],
  });

  assert.deepEqual(entryIds(preview.allItems), [
    "priority-1",
    "priority-2",
    "priority-3",
    "priority-4",
    "priority-5",
    "priority-6",
  ]);
  assert.deepEqual(preview.previewItems, preview.allItems.slice(0, 4));
  assert.equal(preview.itemCount, 6);
  assert.equal(preview.hasOverflow, true);
});

test("年度预览按时间顺序截取，并报告隐藏数量", () => {
  const items = makeItems(8);
  const preview = buildTimelinePreview({
    year: 2026,
    stacks: [
      { side: "top", items: items.slice(0, 4) },
      { side: "bottom", items: items.slice(4) },
    ],
  });

  assert.equal(TIMELINE_PREVIEW_LIMIT, 4);
  assert.deepEqual(
    preview.previewItems.map(item => item.id),
    ["item-1", "item-2", "item-3", "item-4"]
  );
  assert.equal(preview.itemCount, 8);
  assert.equal(preview.hiddenCount, 4);
  assert.equal(preview.hasOverflow, true);
});

test("预览保持原列的首侧，并将截取结果重新均分到轴线两侧", () => {
  const items = makeItems(7);
  const preview = buildTimelinePreview({
    year: 2026,
    stacks: [
      { side: "bottom", items: items.slice(0, 4) },
      { side: "top", items: items.slice(4) },
    ],
  });

  assert.deepEqual(
    preview.previewStacks.map(stack => ({
      side: stack.side,
      ids: stack.items.map(item => item.id),
    })),
    [
      { side: "bottom", ids: ["item-1", "item-2"] },
      { side: "top", ids: ["item-3", "item-4"] },
    ]
  );
});

test("未超过上限时展示全部记录且不标记溢出", () => {
  const items = makeItems(4);
  const preview = buildTimelinePreview({
    year: 2025,
    stacks: [
      { side: "top", items: items.slice(0, 2) },
      { side: "bottom", items: items.slice(2) },
    ],
  });

  assert.deepEqual(preview.previewItems, items);
  assert.equal(preview.itemCount, 4);
  assert.equal(preview.hiddenCount, 0);
  assert.equal(preview.hasOverflow, false);
});
