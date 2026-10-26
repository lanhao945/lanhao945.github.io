import assert from "node:assert/strict";
import test from "node:test";

import {
  TIMELINE_PREVIEW_LIMIT,
  buildTimelinePreview,
} from "./timelinePresentation.mjs";

const makeItems = count =>
  Array.from({ length: count }, (_, index) => ({ id: `item-${index + 1}` }));

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
