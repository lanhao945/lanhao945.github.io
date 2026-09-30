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
占位 = 有卡片的年份           -> 各占一列，间距处处一致（列宽 + 标准间隙）
连续无卡片年份区间            -> 不占任何列宽
   ├─ 区间内存在贡献>0  -> 在卡片年之间的那条标准间隙里画水平均值带
   └─ 全部为 0 贡献     -> 什么也不画（纯间隔）
```

*备选与演进*：逐年一列（第一版，轨道 4192px，被否）；区间占一整列（第二版 F 前身，卡片间距被撑成 2 倍 704px，被否）；**最终 F1 = 区间不占列、均值带画在标准间隙里**（卡片间距回到处处 352px）。

### D2 均值口径：区间日均（含 0 贡献的天）

`meanPerDay = 区间总贡献 ÷ 区间天数`。当前数据下三种口径等价：按天 3.90、按周折算 3.90、按月等权 3.90（差 0.1%）；中位数会因 63% 的天为 0 而退化成 0，不可用。因此采用按天均值，并把 `total` 一并保留供提示文本使用。

### D3 绘制模型：新增 "stretch" 段，恒定高度水平带

- `buildEvidenceSlots()` 输出列模型（**只有卡片年占列**）：

  ```
  { slots: [ { kind: "cards", year } ],
    gaps:  [ { from, to, years, total, days, meanPerDay } ]  // 区间：不占列
  }
  ```

- `buildActivitySegments({ slots, gaps })` 产出段落：卡片年 → `year` 段（`COLUMN_WIDTH`）；相邻卡片年之间统一是 `GAP_WIDTH`（10 单位）的间隙 —— 相邻年 `bridge`、有贡献区间 `stretch`（带 `meanPerDay`）、无贡献区间 `gap`。
- `stretch` 段的点集为**常量 level**（约 8 个点，level = `log1p(meanPerDay)` 归一化后的强度），沿用现有 upper/lower 振幅比例与渐变填充；首尾点到基线的过渡自然形成轻微收口，不需要额外的圆角处理。
- 强度换算沿用现有 `log1p` 归一与 p98 封顶。p98 封顶取的是**分箱后**的 level，实测该带 = **0.48 场高**（同一张图里 2019 均值 0.36 / 2024 均值 0.52 / 2025 与 2026 峰值 1.00），落在「高于 2019、与 2024 齐平、明显低于 2025/2026」的中位台阶上；带子的屏幕宽度 = 标准间隙 ≈32px。

### D4 文字：零可见文本

移除 `.timeline-span-hint` 的渲染与样式（含 `…`）；区间信息改由 track 内的 `<li class="sr-only">` 承载（1×1 + `clip-path: inset(50%)`，悬停不可见），内容为"年份范围 · 日均 · 累计"（例：`2020–2023 · 日均 3.9 次 · 累计 5700`），只对读屏可见。

### D5 组件渲染与轨迹

- 卡片年：现有渲染不变（`data-station`）。
- 区间：不生成任何可视 DOM —— 由相邻列的 `--tl-gap` 承担；轴线的连续性来自上一个卡片年 `.timeline-year-dot::after`（宽度 = 列宽 + 间隙）本身就跨过间隙，无需额外标记；`.timeline-year-empty` 因此整体删除。
- 轨迹：`lightTrailUpTo()` 按 DOM 顺序标记 `.timeline-year`，现在只覆盖卡片年，语义更准确。

### D6 巡航不改代码

站点选择器是 `.timeline-year[data-station]`，区间列天然不是站点；轨道变窄后滑行时长按 `distance / 240px/s` 自动缩短（7.3s → ≈2.9s），无需改动运行时。

## Risks / Trade-offs

- [均值带抹掉段内起伏，且 63% 的天为 0 这一事实不可见] → 数字进 `title` / `aria-label`（日均 + 累计），本版不做逐年细分。
- [带子只有 ≈32px 宽，信息量有限] → 年份跨度由轴上的 `2019 → 2024` 标签给出，数字走读屏文本；如果将来想要更宽的带，只能放宽全局间隙（会一并改变所有相邻年份的节奏），按需另立变更。
- [数据刷新改变区间边界（某年首次出现卡片会拆开区间）] → 规则完全由数据推导，自动适应，无需额外处理。

## Migration Plan

1. 提交 ①：`buildEvidenceSlots` / `buildActivitySegments` / `buildActivityField` 改为列模型 + `stretch` 段，并更新单测。
2. 提交 ②：`Timeline.astro` 渲染区间、移除跨度提示元素与样式；浏览器验证 1 轮。
3. 提交 ③④（F1 修正）：区间不占列、均值带落到标准间隙里、区间信息改读屏文本；追加 1 轮浏览器验证。
- 无数据迁移、无存储变化；两笔提交可独立 revert，回滚后回到"4 列整宽 + 可见跨度提示"的上一版。

## Affected Files

- `src/utils/githubActivity.mjs`：`buildEvidenceSlots()` 输出列模型（cards / stretch / gaps）；新增 `stretch` 段与其常量高度点集；`buildActivitySegments()` 与 `buildActivityField()` 的输入改为列模型。
- `src/utils/githubActivity.test.mjs`：区间一段一列、单年区间、全零压缩、均值口径（含 0 天）、`stretch` 段宽度与高度。
- `src/components/Timeline.astro`：只渲染卡片年列；删除 `.timeline-span-hint` 与 `.timeline-year-empty` 的元素与样式；区间信息改为 `sr-only` 列表项；活动场改为接收 `{ slots, gaps }`。
- 不涉及：`src/pages/index.astro`、巡航运行时、竖屏样式。

## Performance & Safety

- 渲染期计算仍是 O(年份数)，且区间段只产出约 8 个点（逐年段落约 74 个），SVG 更小。
- 运行时无新增开销：删除提示元素后 DOM 更少，巡航逻辑未改。
- 无网络请求、无 `innerHTML`、无用户输入解析；区间统计只读活动数据（纯函数，可单测）。

## Open Questions

- 区间列是否要窄于标准列（例如半列）：需要混合列宽与按比例对齐，本版不做，后续独立评估。
