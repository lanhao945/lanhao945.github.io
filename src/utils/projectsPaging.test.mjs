import assert from "node:assert/strict";
import test from "node:test";

import { drainLoadZone, isInLoadZone } from "./projectsPaging.mjs";

test("内容不足一屏、文档滚不动时也算到达加载区", () => {
  // 回归：旧逻辑要求 scrollY > 20，导致高分辨率首屏永远无法触发加载
  assert.equal(
    isInLoadZone({ scrollY: 0, viewportHeight: 1500, scrollHeight: 1500 }),
    true
  );
  assert.equal(
    isInLoadZone({ scrollY: 15, viewportHeight: 1485, scrollHeight: 1500 }),
    true
  );
});

test("距离底部超过预载范围时不算到达加载区", () => {
  assert.equal(
    isInLoadZone({ scrollY: 0, viewportHeight: 800, scrollHeight: 3000 }),
    false
  );
  assert.equal(
    isInLoadZone({ scrollY: 1899, viewportHeight: 800, scrollHeight: 3000 }),
    false
  );
});

test("视口底部进入最后 300px 时算到达加载区", () => {
  assert.equal(
    isInLoadZone({ scrollY: 1900, viewportHeight: 800, scrollHeight: 3000 }),
    true
  );
});

test("首屏自检会连续补足，直到内容超出或全部加载", () => {
  // 超高屏：视口 3000px，初始 6 条只有 1500px，加载一批后仍不足一屏
  let loaded = 6;
  const total = 25;
  const heightOf = n => 1500 + (n - 6) * 130;
  const batches = drainLoadZone({
    hasMore: () => loaded < total,
    measure: () =>
      isInLoadZone({
        scrollY: 0,
        viewportHeight: 3000,
        scrollHeight: heightOf(loaded),
      }),
    loadNextBatch: () => {
      loaded = Math.min(loaded + 8, total);
    },
  });

  assert.equal(batches, 2);
  assert.equal(loaded, 22);
});

test("不在加载区内时一批都不加载", () => {
  let loads = 0;
  const batches = drainLoadZone({
    hasMore: () => true,
    measure: () => false,
    loadNextBatch: () => {
      loads += 1;
    },
  });

  assert.equal(batches, 0);
  assert.equal(loads, 0);
});

test("内容全部加载完后停止", () => {
  let loads = 0;
  const batches = drainLoadZone({
    hasMore: () => false,
    measure: () => true,
    loadNextBatch: () => {
      loads += 1;
    },
  });

  assert.equal(batches, 0);
  assert.equal(loads, 0);
});

test("加载后布局没有变化时不会死循环", () => {
  const batches = drainLoadZone({
    hasMore: () => true,
    measure: () => true,
    loadNextBatch: () => {},
    maxBatches: 3,
  });

  assert.equal(batches, 3);
});
