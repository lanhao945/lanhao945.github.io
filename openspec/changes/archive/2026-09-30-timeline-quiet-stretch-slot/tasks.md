# Tasks

## 1. 列模型与均值带（提交 ①）

- [x] 1.1 `buildEvidenceSlots()` 改为列模型：卡片年 `kind: "cards"`；连续无卡片区间按"是否有贡献"产出 `kind: "stretch"`（含 `from/to/years/total/days/meanPerDay`，均值 = 总贡献 ÷ 天数，含 0 贡献的天）或 `gaps`（全零压缩区间）。验收：纯函数可被 Node 直接调用。
- [x] 1.2 `buildActivitySegments()` / `buildActivityField()` 接受列模型：`stretch` 产出一个 `COLUMN_WIDTH` 宽的段落并输出**常量 level 的水平带**（沿用 log1p 归一、p98 封顶与 upper/lower 振幅比例），`gaps` 保持 10 单位。验收：单测断言区间段宽度 = 一个整列、level 对应日均、且不再出现逐年峰形。
- [x] 1.3 更新 `src/utils/githubActivity.test.mjs`：区间一段一列、单年区间、全零压缩不产带、均值口径（含 0 天，对照 2020–2023 = 3.90）、`stretch` 段宽度与高度、区间边界随数据变化（首次出现卡片则拆开）。验收：`npm run test:unit` 全绿。
- [x] 1.4 以 `feat(timeline): collapse card-less spans into one mean band` 提交。验收：`git status` 仅含 `src/utils/githubActivity.mjs` 与 `src/utils/githubActivity.test.mjs`，`git show --stat` 只列这两个文件。

## 2. 组件接入与移除文字（提交 ②）

- [x] 2.1 `src/components/Timeline.astro` 按列模型渲染：卡片年渲染不变；区间列输出 `<li class="timeline-year" data-evidence="stretch" style="--tl-col: N">` + 轴线标记，并带 `aria-label` / `title` = `年份范围 · 日均 X 次 · 累计 Y`；压缩区间不生成 DOM 元素。验收：横屏列数与列模型一致（当前数据 = 9 列）。
- [x] 2.2 删除 `.timeline-span-hint` 的渲染、样式与 `--hint-*` 变量；确认页面 DOM 中不再存在跨度文字或 `…` 标记。
- [x] 2.3 浏览器验证（1 轮，1600×900）：轨道 ≈3136px；2020–2023 只占一列；该列画水平带（实测 0.48 场高，见 design.md 的口径说明）；页面无任何跨度文字；悬停/读屏可得"范围 + 日均 + 累计"；巡航 2019→2024 滑行 ≈2.9s 且区间列不停留；竖屏布局与行为不变。验收：采样数值 + 截图对比。
- [x] 2.4 以 `feat(timeline): render quiet spans as a single mean band` 提交。验收：`git status` 仅含 `src/components/Timeline.astro`。

## 3. 整体验收与预算收尾

- [x] 3.1 运行 `npx astro check`、`npx eslint .`、`npm run test:unit`、`npx astro build`，四项全部通过。验收：命令输出（0 errors）。
- [x] 3.2 对照 delta specs 逐条走查（证据占位规则 / 活动场与占位年份一一对应 / 区间跨度的无障碍表达三处改动各有测试或实测对应，并确认被 REMOVED 的跨度提示不再渲染）。验收：走查记录；缺口必须显式列出，不得默认通过。
- [x] 3.3 汇报预算使用情况（≤2 次提交、≤1 轮浏览器验证）；超预算立即停止并展示当前结果，不得重试已被否决的方案。

## 4. 修正：区间不占列（F1，2026-09-30 追加）

> 背景：第 1–2 组把区间实现成"整列宽的区间列"，导致 2019→2024 的卡片间距变成 2 倍（704px），
> 与"卡片间距必须处处一致"冲突。按 F1 修正：区间不占列，均值带落在标准间隙里。
> 追加预算（已获用户批准）：≤2 次提交、≤1 轮浏览器验证。

- [x] 4.1 工具层：`buildEvidenceSlots()` 只让卡片年占列，区间统计改挂 `gaps`；`buildActivitySegments({ slots, gaps })` 在标准间隙里产出 `stretch` 段（10 单位、常量高度）；单测按新口径重写。验收：`npm run test:unit` 36/36 通过。
- [x] 4.2 组件：删除区间列与 `.timeline-year-empty` 的元素/样式/轨迹分支；区间信息改为 `sr-only` 列表项。验收：`npx astro check` 0 错误、`npx eslint` 干净。
- [x] 4.3 浏览器验证（追加 1 轮）：轨道 2784px；列距处处 352px；均值带落在 32px 间隙里且等高（0.48 场幅）；承载范围文字的节点只有 1×1 的 `sr-only`；滑行段全部 352px；竖屏不变。
- [x] 4.4 以 `fix(timeline): keep card pitch fixed and draw spans in the gap` 与 `fix(timeline): render spans as screen-reader-only notes` 提交。验收：两笔提交分别只含工具层文件与 `Timeline.astro`。
