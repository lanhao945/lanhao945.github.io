# Tasks

## 1. 预告计划（提交 ①）

- [x] 1.1 `src/utils/timelineTour.mjs`：删除 `TOUR_DEFAULTS` / `planTour()`；新增 `TEASER_DEFAULTS`（startDelayMs 150 / durationMs 2750 / cruiseRatio 0.7 / nudgeDelayMs 1200 / nudgeDistancePx 14 / nudgeHalfMs 250）与 `planTeaser({ stations, viewport })`：按"第一个居中位移 ≥ 一个列距"选落点、按时长反推恒速、给出轻推参数。验收：纯函数可被 Node 直接调用。
- [x] 1.2 `src/utils/timelineTour.test.mjs` 改写：落点规则（含最左两站被夹到 0 的情形）、时长恒定（新增年份不改变 durationMs）、速度 = 位移 ÷ 有效时长、站点不足 2 个/空站点不报错、轻推参数只出现一次。验收：`npm run test:unit` 全绿。
- [x] 1.3 以 `feat(timeline): replace station tour with a fixed-length intro teaser` 提交。验收：`git status` 仅含两个工具文件。

## 2. 运行时与提示（提交 ②）

- [x] 2.1 `src/components/Timeline.astro`：运行时改为预告 —— 0.15s 起笔 → 恒速 → 末段缓出落点 → 停稳；删除 dwell/finale 与站点计划；保留轨迹、输入接管（滚轮瞬时吸附）、reduced-motion/竖屏守卫与几何降级。
- [x] 2.2 停住后的提示：settled 状态给光带加低幅度呼吸（CSS 动画，±10%、≈2.6s 周期）；停稳 1.2s 后执行一次 14px 右移并落回（≈0.5s），任何输入立即取消；reduced-motion 下两者都不启用。
- [x] 2.3 浏览器验证（1 轮，1600×900）：首次移动 ≤0.2s；全程 2.75s±0.15s 内只有一次运动、无中途停留；落点 ≈412px 且构图完整；停稳 1.2s 后出现一次 ≈14px 轻推并复位；呼吸存在（computed animation）且在 reduced-motion 下关闭；滚轮接管能取消轻推；竖屏不变。验收：rAF 采样记录 + 截图。
- [x] 2.4 以 `feat(timeline): glide the homepage intro once and hand over control` 提交。验收：`git status` 仅含 `Timeline.astro`。

## 3. 整体验收与预算

- [x] 3.1 运行 `npx astro check`、`npx eslint .`、`npm run test:unit`、`npx astro build`，四项全部通过。
- [x] 3.2 对照 delta specs 逐条走查（开场预告 / 可继续提示 / 内容增长 / 终章定格 / 输入交接 / 动效约束各有测试或实测对应；两条 REMOVED 确认代码中已无站点与停留机制）。验收：走查记录，缺口显式列出。
- [x] 3.3 汇报预算（≤2 提交、≤1 轮浏览器验证）；超预算立即停止并展示当前结果。

## 4. 修正：轻推的动效物理（追加提交）

> 背景：首版轻推是「去 250ms + 回 250ms，各自 ease-out」—— 从静止瞬时到达峰值速度
> （≈112px/s），紧跟在预告末段 0.8s 缓减到 0 之后，速度不连续，观感生硬。

- [x] 4.1 `timelineTour.mjs`：`nudgeHalfMs` → `nudgeDurationMs = 650`，新增导出 `nudgeOffset(progress, distance)`（单次余弦摆动，起/折返/止速度为 0）；单测补「两端与折返点速度为 0」。
- [x] 4.2 `Timeline.astro`：nudge 相位改用 `nudgeOffset`，去掉两段 ease-out。
- [x] 4.3 验证：单测 37/37；浏览器实测起步速度 0px/s（旧版 112）、幅度 13-14px、停稳 1.25s 后触发、起止速度 < 峰值一半。
- [x] 4.4 以 `fix(timeline): ease the nudge with a single cosine sway` 提交。

## 5. 修正：把轻推并入落定、缩短时长（追加提交）

> 反馈：落定后"停一会儿再来一次轻推"很像两段式；且主运动 2.75s 偏长。

- [x] 5.1 `TEASER_DEFAULTS`：时长 2750 → **1800ms**；删除 nudge* 常量，新增 `overshootPx = 10`、`settleRatio = 0.18`。
- [x] 5.2 新增 `teaserWalk()`：前段恒速+减速到 `distance + overshoot`，末段 smoothstep 回弹到 `distance`，折返与终点速度为 0；删除 `nudgeOffset()`。
- [x] 5.3 `Timeline.astro`：move 相位直接用 `teaserWalk`；删除 nudge 相位/定时器；接管后进入 `manual` 状态（不呼吸），自然落定为 `settled`（呼吸）。
- [x] 5.4 验证：单测 38/38；浏览器实测**只有一段运动**（0 → 421 过冲 → 回落 412，1.90s）、应用层起笔 185ms、接管后 `manual` 且无呼吸、自然落定 `settled` 且呼吸。

## 6. 微调：过冲幅度（追加提交）

> 反馈：过冲 10px 看起来偏短。

- [x] 6.1 `TEASER_DEFAULTS.overshootPx` 10 → **16px**；`settleRatio` 0.18 → 0.22（幅度变大时给回弹更多时间，保持柔和）。
- [x] 6.2 验证：单测 38/38（曲线用例本就参数化）；浏览器实测过冲峰值 ≈ 412 + 16，仍为单段运动、≈1.8s。

## 7. 微调：起步略快 + 单调减速（追加提交）

> 反馈：右移过程中原来有一段匀速，希望"一开始略快，然后速度以曲线降低"。

- [x] 7.1 `teaserProgress()` 由"匀速 + 匀减速"改为幂次缓出 `1 − (1−p)^ease`；`TEASER_DEFAULTS.cruiseRatio 0.7` → `approachEase 1.45`；删除不再使用的 `cruiseSpeed`。
- [x] 7.2 `Timeline.astro` 相应改用 `approachEase`（接管吸附仍为线性）。
- [x] 7.3 验证：单测 38/38（新增"单调减速、无匀速段"与"起步略快"用例）；浏览器实测主段 1.88s、0 → 427 → 412，前 25% 时间走完 38% 距离、末段已在回弹。
