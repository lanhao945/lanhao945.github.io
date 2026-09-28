/**
 * 项目页"滚到底部继续加载"的纯逻辑，供浏览器端和单测共用。
 *
 * 判定只看"视口底部是否进入文档末尾的预载区"：
 * 不再要求 scrollY 超过某个阈值——首屏内容不足一屏、文档根本滚不动时，
 * 同样算作已到底部，否则既不会有 scroll 事件，条件也永远无法成立。
 */

/** 视口底部距文档底部小于 slack 像素时，认为已进入加载区。 */
export function isInLoadZone({
  scrollY,
  viewportHeight,
  scrollHeight,
  slack = 300,
}) {
  return scrollY + viewportHeight >= scrollHeight - slack;
}

/**
 * 反复"测量 → 加载一批"，直到离开加载区或没有更多内容可加载。
 * 每加载一批后重新测量，因此首屏不够高、窗口变大等情况会连续补足。
 * maxBatches 只是防御性上限，避免调用方异常时死循环。
 */
export function drainLoadZone({
  hasMore,
  measure,
  loadNextBatch,
  maxBatches = 64,
}) {
  let batches = 0;
  while (batches < maxBatches && hasMore() && measure()) {
    loadNextBatch();
    batches += 1;
  }
  return batches;
}
