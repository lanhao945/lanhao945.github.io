# Tasks

## 1. 巡航节奏策略（提交 ①）

- [x] 1.1 新建 `src/utils/timelineTour.mjs`，实现纯函数 `planTour(stations, options)`：输入按时间排序的站点（`year` / `items` / `gapYears`），输出每站 `dwellMs`、滑行速度与终章定格时长；常量集中导出（`BASE` / `ITEM_STEP` / `EXTRA_CAP` / `QUIET_GAP` / `QUIET_BONUS` / `MIN` / `MAX` / 终章加成）。验收：函数可直接被 Node 调用且不依赖 DOM。
- [x] 1.2 新建 `src/utils/timelineTour.test.mjs`，覆盖：密集年份停留 > 稀疏年份；间隔 ≥ `QUIET_GAP` 时获得静默拍；条目数超过 `EXTRA_CAP` 后停留不再增长；新增一年只追加一站、既有站停留与滑行速度不变；空站点与单站点不报错。验收：`npm run test:unit` 全绿。
- [x] 1.3 将新测试文件加入 `package.json` 的 `test:unit` 脚本。验收：`npm run test:unit` 输出包含新增用例数量。
- [x] 1.4 以 `feat(timeline): add data-driven tour pacing planner` 提交。验收：`git status` 仅含本次相关文件，`git show --stat` 只列出 `timelineTour.mjs`、`timelineTour.test.mjs`、`package.json`。

## 2. 运行时接入：逐站巡航、终章定格、轨迹（提交 ②）

- [x] 2.1 在 `src/components/Timeline.astro` 用巡航计划替换现有固定进度巡航：站点 = 有卡片的年份，站间按实际几何匀速滑行（默认 240px/s），到站停留 `dwellMs`；无卡片年份只穿过、不停留（滑行按实测几何推进，不假设站距恒定，以便第 3 组改布局后无需改动运行时）。
- [x] 2.2 终章：抵达最后一站后停止位移，并把光带收敛到该站节点位置保持可见；移除"扫出屏幕 + 淡出"的收尾。
- [x] 2.3 轨迹：为已通过的年份写入状态（如 `data-tour="passed"`），用 CSS 变量/属性呈现暖色渐亮效果，且不随时间衰减。
- [x] 2.4 输入交接：滚轮 / 触摸 / 指针按下 / 键盘 / 焦点进入时间轴时立即停止巡航，并吸附到最近站点（过渡 ≤200ms）；保持既有滚轮接管方向语义。
- [x] 2.5 约束与退化：`prefers-reduced-motion: reduce` 不启动；竖屏/窄屏不启动；不播放音频；几何不可测量（宽度为 0、元素移除）时安全终止且手动滚动仍可用。
- [x] 2.6 浏览器验证（第 1 轮）：1600×900 横屏实测逐站停留、景观年不停留、终章定格、滚轮接管停在整站、reduced-motion 不启动。验收：采样记录显示 `scrollLeft` 呈"滑行-停-滑行"台阶并最终停住，光带在最后节点保持可见。
- [x] 2.7 以 `feat(timeline): cruise the homepage timeline station by station` 提交。验收：`git status` 仅含 `Timeline.astro`。

## 3. 证据占位与活动场映射（提交 ③）

- [x] 3.1 在 `src/utils/githubActivity.mjs` 新增 `buildEvidenceSlots(cardYears, dayCounts)`：占位 = 有卡片 或 贡献 > 0；连续"两者皆无"的年份合并为压缩区间。验收：纯函数可被 Node 直接调用。
- [x] 3.2 `buildActivitySegments` 改为按占位年份生成段落（每个占位年 `COLUMN_WIDTH`，压缩区间 `GAP_WIDTH`），采样 bin 数仍由列宽推导。验收：单测断言一年数据的绘制宽度等于整列宽，压缩区间保持最短宽度。
- [x] 3.3 `src/components/Timeline.astro` 按占位年份渲染列：无卡片年份渲染为空列（不显示年份标签与节点），`--tl-columns` 使用占位列数；活动场改为传入占位年份。验收：横屏渲染的列数与占位集合一致。
- [x] 3.4 跨度提示：连续无卡片年份区间在轴线上显示淡色年份范围（如 `2020–2023`）；宽度不足时退化为短标记，完整范围通过 `title` / `aria-label` 提供。
- [x] 3.5 增补 `src/utils/githubActivity.test.mjs`：空段压缩、贡献年展开、贡献归零塌缩、映射与占位一一对应、活动数据缺失时仍按卡片年份正常渲染。验收：`npm run test:unit` 全绿。
- [x] 3.6 浏览器验证（第 2 轮）：1600×900 横屏实测 2020–2023 各占一整列、活动场不再出现多年挤压的锯齿；竖屏布局与行为无变化。验收：截图对比 + 采样数值（列宽、段落 x 范围）。
- [x] 3.7 以 `feat(timeline): lay out timeline years by evidence` 提交。验收：`git status` 仅含 `Timeline.astro`、`githubActivity.mjs`、`githubActivity.test.mjs`。

## 4. 整体验收与预算收尾

- [x] 4.1 运行 `npx astro check`、`npx eslint .`、`npm run test:unit`、`npx astro build`，四项全部通过。验收：命令输出（0 errors）。
- [x] 4.2 对照 `specs/` 逐条走查：`timeline-tour` 与 `timeline-evidence-layout` 的每条 Requirement 至少有一个场景可由测试或实测行为对应。验收：走查记录（缺口必须显式列出，不得默认通过）。
- [x] 4.3 汇报预算使用情况（≤3 次提交、≤2 轮浏览器验证）；若超预算立即停止并展示当前结果，不得继续尝试已被否决的方案。
