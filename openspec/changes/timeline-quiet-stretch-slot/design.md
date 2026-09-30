# Design

## Context

- 现状（上一版）：`buildEvidenceSlots()` 把"有卡片 或 当年有贡献"的每个年份都当作占位列，活动场 `buildActivitySegments()` 按"一列 = 一年"映射（`COLUMN_WIDTH=100` / `GAP_WIDTH=10`），组件还会渲染 `.timeline-span-hint` 的可见跨度文字。2020–2023 因此占 4 列 = 1376px，轨道 4192px，巡航 2019→2024 一跳 1760px ≈ 7.3s。
- 约束：竖屏不展示活动场、行为不变；巡航（`timeline-tour`）规则不变；无新增依赖；确定性策略写成显式公式与常量。

## Goals / Non-Goals

**Goals:**

- 连续无卡片区间在时间轴上只占**一个**标准列宽，并用**水平均值带**表达其水位。
- 页面上完全移除跨度文字；年份范围与数字只走 `title` / `aria-label`。
- 保持"由数据推导"：不硬编码年份，数据变化时区间自动展开/收缩。

**Non-Goals:**

- 区间列的半列宽度、区间内逐年细分、年份标签的其它形态。
- 巡航节奏与站点规则的改动（区间列不是站点，天然不参与停留）。

## Decisions

### D1 占位规则：卡片年逐列，区间一段一列

```
有卡片的年份           -> 一列（卡片年）
连续无卡片年份区间
   ├─ 区间内存在贡献>0  -> 一个整列宽的"区间列"
   └─ 全部为 0 贡献     -> 最短宽度的压缩区间（不占列）
```

*备选*：逐年一列（上一版，109 行轨道 4192px，被否）；全零区间也占一列（用一列画 0 值带，浪费空间，否）。

### D2 均值口径：区间日均（含 0 贡献的天）

`meanPerDay = 区间总贡献 ÷ 区间天数`。当前数据下三种口径等价：按天 3.90、按周折算 3.90、按月等权 3.90（差 0.1%）；中位数会因 63% 的天为 0 而退化成 0，不可用。因此采用按天均值，并把 `total` 一并保留供提示文本使用。

### D3 绘制模型：新增 "stretch" 段，恒定高度水平带

- `buildEvidenceSlots()` 输出改为列模型：

  ```
  { slots: [ { kind: "cards", year }, { kind: "stretch", from, to, years, total, days, meanPerDay } ],
    gaps: [ { from, to } ]  // 全零压缩区间
  }
  ```

- `buildActivitySegments(slots)` 产出段落：`cards` → `year` 段（不变）；`stretch` → `stretch` 段，`xStart..xEnd` 占 `COLUMN_WIDTH`（100 单位 = 一个整列）；`gaps` → `gap` 段（10 单位）。
- `stretch` 段的点集为**常量 level**（约 8 个点，level = `log1p(meanPerDay)` 归一化后的强度），沿用现有 upper/lower 振幅比例与渐变填充；首尾点到基线的过渡自然形成轻微收口，不需要额外的圆角处理。
- 强度换算沿用现有 `log1p` 归一与 p98 封顶；当前数据下该带 ≈ 0.42 场高（2019 0.28 / 2024 0.42 / 2025 0.58 / 2026 0.60）。

### D4 文字：零可见文本

移除 `.timeline-span-hint` 的渲染与样式（含 `…`）；区间列自身带 `aria-label` 与 `title`，内容为"年份范围 · 日均 · 累计"（例：`2020–2023 · 日均 3.9 次 · 累计 5700`）。

### D5 组件渲染与轨迹

- 卡片年：现有渲染不变（`data-station`）。
- 区间列：`<li class="timeline-year" data-evidence="stretch">` + 复用现有"只画轴线"标记（`.timeline-year-empty`），因此轴线连续、且随巡航轨迹一起点亮（`lightTrailUpTo()` 按 DOM 顺序标记，无需改动）。
- 压缩区间：不生成 DOM（由相邻列的 `--tl-gap` 承担），与现状一致。

### D6 巡航不改代码

站点选择器是 `.timeline-year[data-station]`，区间列天然不是站点；轨道变窄后滑行时长按 `distance / 240px/s` 自动缩短（7.3s → ≈2.9s），无需改动运行时。

## Risks / Trade-offs

- [均值带抹掉段内起伏，且 63% 的天为 0 这一事实不可见] → 数字进 `title` / `aria-label`（日均 + 累计），本版不做逐年细分。
- [区间列与卡片年同宽，可能被读成"某一年"] → 区间列不渲染年份标签与节点，只有轴线；悬停给出年份范围。已接受。
- [数据刷新改变区间边界（某年首次出现卡片会拆开区间）] → 规则完全由数据推导，自动适应，无需额外处理。

## Migration Plan

1. 提交 ①：`buildEvidenceSlots` / `buildActivitySegments` / `buildActivityField` 改为列模型 + `stretch` 段，并更新单测。
2. 提交 ②：`Timeline.astro` 渲染区间列、移除跨度提示元素与样式；浏览器验证 1 轮。
- 无数据迁移、无存储变化；两笔提交可独立 revert，回滚后回到"4 列整宽 + 可见跨度提示"的上一版。

## Affected Files

- `src/utils/githubActivity.mjs`：`buildEvidenceSlots()` 输出列模型（cards / stretch / gaps）；新增 `stretch` 段与其常量高度点集；`buildActivitySegments()` 与 `buildActivityField()` 的输入改为列模型。
- `src/utils/githubActivity.test.mjs`：区间一段一列、单年区间、全零压缩、均值口径（含 0 天）、`stretch` 段宽度与高度。
- `src/components/Timeline.astro`：渲染区间列（`data-evidence="stretch"` + 轴线标记 + `title`/`aria-label`）；删除 `.timeline-span-hint` 元素与样式；`slotColumns` / `--tl-columns` 改为列模型。
- 不涉及：`src/pages/index.astro`、巡航运行时、竖屏样式。

## Performance & Safety

- 渲染期计算仍是 O(年份数)，且区间段只产出约 8 个点（逐年段落约 74 个），SVG 更小。
- 运行时无新增开销：删除提示元素后 DOM 更少，巡航逻辑未改。
- 无网络请求、无 `innerHTML`、无用户输入解析；区间统计只读活动数据（纯函数，可单测）。

## Open Questions

- 区间列是否要窄于标准列（例如半列）：需要混合列宽与按比例对齐，本版不做，后续独立评估。
