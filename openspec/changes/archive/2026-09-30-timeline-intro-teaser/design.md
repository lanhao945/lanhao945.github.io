# Design

## Context

- 现状（到站式）：`FLOW_START_DELAY=400ms` + 起手吸附 180ms + 2012/2016 两站停留（0.9s + 1.3s，且两站的居中目标都被夹到 `scrollLeft=0`）≈ 3.6s 死屏；之后全程约 16.4s、运动占空比 ≈38%、7–8 次停-启。
- 现有可复用件：轨迹点亮（`lightTrailUpTo`）、输入接管（滚轮瞬时吸附 / 其它输入 ≤180ms 吸附）、reduced-motion 与竖屏守卫、几何不可用降级、光带 `--tl-flow-x` 定位。
- 约束：竖屏不展示活动场、行为不变；无新增依赖；常量与规则写成显式代码并可单测。

## Goals / Non-Goals

**Goals:**

- 起始延迟 ≤0.2s；整段只有一次启动、一次停止；预告总时长固定 ≈2.75s，与内容总量无关。
- 落点构图完整（完整居中的卡片年），光带停在落点保持可见。
- 停住后有一次非文字的可继续提示（呼吸 + 一次 14px 轻推）。

**Non-Goals:**

- 访客侧引导文案、去重的播放策略（仍每次打开播放一次）、竖屏变化、纵列浏览。

## Decisions

### D1 预告计划：固定时长 + 固定落点规则

- 时长 `durationMs = 1800`；`startDelayMs = 150`；起步倍率 `approachEase = 1.45`（初速 = 该段平均 × 1.45，之后单调减速，无匀速段）；末段回弹占比 `settleRatio = 0.22`；过冲 `overshootPx = 16`。
- 落点 = **第一个满足「居中目标位移 ≥ 一个列距」的卡片年**（当前数据下是 2018；最左两站的居中目标被夹到 0，不适合做落点）。该规则由数据与几何推导，不硬编码年份。
- 速度由 `位移 ÷ (durationMs × (cruiseRatio + (1-cruiseRatio)/2))` 反推，因此时长恒定、速度自适应（当前 ≈176px/s）。

### D2 运动曲线：一次连续运动（含过冲回弹）

`teaserWalk(p)` 分两段：前 `1 − settleRatio` 用幂次缓出 `1 − (1−q)^approachEase` 从起点**单调减速**逼近 `distance + overshoot`（起步略快、没有匀速段）；末段用 smoothstep 从过冲点平滑回弹到 `distance`。折返点与终点速度都为 0（自然折返，而非"停一会儿再动一下"），并且折返点两侧速度连续，因此整段是**一次**运动。

### D3 提示：呼吸 + 一次轻推

- 呼吸：光带在落点处做 ±10% 亮度起伏（CSS 动画，周期 ≈2.6s），不产生位移。
- **提示就是呼吸本身**：不再有独立的"停稳 1.2s 后轻推"（实测那会读成"停了一会儿又动一下"）。可继续的位移暗示并入落定的过冲回弹（D2）。
- 呼吸只在自然落定状态（`data-flow="settled"`）生效；用户接管后进入 `manual` 状态，呼吸停止。
- 依据：动作启动（ideomotor / motor priming）——看到某方向的运动更容易做同方向的动作；用"动一下"替代箭头或文字。
- 任何输入立即取消轻推与呼吸（接管即静止）。

### D4 简化：站点机制退役

`TOUR_DEFAULTS`（停留预算）与 `planTour()` 的站点表删除，替换为 `TEASER_DEFAULTS` + `planTeaser({ stations })`；运行时的 dwell/finale 分支删除，只保留 move/settled 与提示计时。净减少代码与常量。

### D5 保留的既有约束

reduced-motion（含呼吸与轻推）、竖屏不启动、几何不可用安全终止、滚轮瞬时吸附、轨迹只画到落点为止。

## Affected Files

- `src/utils/timelineTour.mjs`：改为预告计划（`TEASER_DEFAULTS`、`planTeaser`），删除站点/停留常量与 `planTour`。
- `src/utils/timelineTour.test.mjs`：改写为预告计划测试（时长恒定、落点规则、速度反推、边界：站点不足/单站/空）。
- `src/components/Timeline.astro`：运行时改为预告（起笔 → 巡航 → 缓出落点 → 提示计时），删除 dwell/finale；新增光带呼吸的 CSS（settled 状态）。
- 不涉及：`src/pages/index.astro`、`githubActivity.mjs`、竖屏样式。

## Performance & Safety

- 预告只跑 1.8s（含过冲回弹），之后完全静止（比现状少 10s+ 的 rAF 工作）；呼吸是纯 CSS 动画（合成层，无 JS 开销）。
- 无网络请求、无 `innerHTML`、无用户输入解析；所有计时与几何计算为显式常量与纯函数，可单测。

## Risks / Trade-offs

- [过冲可能被感知为"弹一下"] → 过冲 16px（10px 时实测反馈「偏短」），回弹平滑（smoothstep，两端速度为 0）；如需更克制，把 `overshootPx` 调到 0 即可退化为纯减速落定。
- [固定时长意味着速度随落点距离变化] → 距离被"第一个可真正居中的卡片年"规则约束（≈1.2–2.2 个列距），速度落在 ≈150–330px/s 的合理区间。
- [落点不再是"最新一列"] → 有意为之：机器只负责开场，剩余旅程交给访客。

## Migration Plan

1. 提交 ①：`timelineTour.mjs` 改为预告计划 + 单测改写。
2. 提交 ②：`Timeline.astro` 运行时改为预告 + 提示（呼吸/轻推），浏览器验证 1 轮。
- 无数据迁移、无存储变化；两笔可独立 revert，回滚后回到"到站式巡航"。

## Open Questions

- 是否在后续版本把"每次打开都播放"改成"每次会话只播一次"（本版不做）。
