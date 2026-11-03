# Proposal

## Why

首页每年只展示年度排序后的前 4 条，但目前同一年内仅按 `month` 和标题排序，无法表达“哪些记录更重要”。例如 2026 年已有 8 条记录，当前只能由月份决定哪 4 条进入主时间轴，而不是由内容价值决定。需要增加一个可选的精确数字优先级，并让主时间轴与年度详情共享同一排序结果。

## What Changes

- 为时间轴条目增加可选的正整数 `priority` 字段；数字越小，优先级越高。
- 同一年内先按 `priority` 升序排序；未填写 `priority` 的条目排在已填写条目之后，再按现有的 `month`、`title` 规则稳定排序。
- 跨年份仍按 `year` 升序排列；`priority` 只在同一年内比较。
- 主时间轴取年度排序后的前 4 条，年度详情展示该年全部条目，并沿用同一排序。
- 优先级只影响顺序，不过滤任何记录；只有年度条目数超过 4 时，才显示“全部 N 项”。
- 现有未填写 `priority` 的内容无需迁移，继续按 `month`、`title` 排序。

## Capabilities

### New Capabilities

- `timeline-priority`: 定义时间轴条目的可选数字优先级、同年排序规则，以及主时间轴预览与年度详情的一致性。

### Modified Capabilities

None.

## Impact

- 受影响代码：`src/content.config.ts`、`src/utils/getSortedTimeline.ts`、`src/utils/timelinePresentation.mjs` 及其单元测试；`src/components/Timeline.astro` 继续消费已排序结果，预期无需改变交互结构。
- 受影响内容：`src/content/timeline/` 中的条目可按需增加 `priority`，但不强制回填。
- 受影响文档：README 中的时间轴字段说明和同年排序规则。
- 兼容性：现有无优先级内容的行为保持稳定；新增字段不改变年份分组、活动场、年度详情入口或滚动结构。
- 依赖与系统：无新增依赖，无外部 API 或数据迁移。
- 需要协调的团队：个人站点无跨团队依赖；需要内容维护者理解“数字越小越靠前”及缺省值排在最后。

## Rollback

回滚时恢复同年 `month`、`title` 的排序逻辑，并移除 schema、测试和文档中的 `priority` 说明；已写入的 `priority` frontmatter 在 schema 移除后会被忽略，再按需清理。该回滚不涉及数据迁移，也不会改变时间轴年份列或年度详情结构。
