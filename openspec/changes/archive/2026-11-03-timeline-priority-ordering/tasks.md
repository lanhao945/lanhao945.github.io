# Tasks

## 1. 同年排序与单元测试

- [x] 1.1 在 `src/utils/timelinePresentation.test.mjs` 先添加失败测试，覆盖优先级升序、未填优先级排最后、同优先级按 `month/title`、不同年份互不影响，以及预览为完整详情顺序前四条；运行 `node --test src/utils/timelinePresentation.test.mjs` 并确认新测试因功能缺失而失败。
- [x] 1.2 在 `src/utils/timelinePresentation.mjs` 实现非破坏性的同年比较与排序函数，按 `year`、`priority`、`month`、`title` 排序并正确处理两个未填优先级值；运行上述单元测试确认全部通过。
- [x] 1.3 修改 `src/utils/getSortedTimeline.ts`，让 `getSortedTimeline()` 复用共享排序函数并更新排序注释；运行 `npm run test:unit` 确认现有无优先级内容与新优先级内容均符合契约。
- [x] 1.4 复核 `git diff` 仅包含排序实现与测试，使用 git-commit 流程提交为 `feat(timeline): order same-year entries by priority`。

## 2. 内容字段校验

- [x] 2.1 在 `src/content.config.ts` 为 timeline schema 增加可选正整数 `priority` 字段，并注明“数字越小越靠前”；运行 `npm run sync` 确认类型生成成功。
- [x] 2.2 临时给一条 timeline 内容填写 `priority: 0`，运行 `npm run build` 确认构建因校验失败而显式报错；再分别检查负数和小数会被拒绝，最后移除临时值并确认工作区无测试残留。
- [x] 2.3 运行 `npm run build` 确认现有未填写 `priority` 的内容全部通过校验，且首页可正常生成；复核暂存内容后提交为 `feat(content): validate optional timeline priority`。

## 3. 内容维护文档

- [x] 3.1 更新 `README.md` 的 timeline frontmatter 示例，加入可选 `priority`，并说明数字越小越靠前、缺省值排最后、优先级只影响同年排序。
- [x] 3.2 更新 README 的时间轴规则，说明主时间轴展示排序后的前四条，“全部 N 项”年度详情沿用同一完整顺序且不按优先级过滤。
- [x] 3.3 运行 `npm run format:check`，复核文档改动后提交为 `docs(timeline): document priority ordering`。

## 4. 集成验证

- [x] 4.1 检查 `getSortedTimeline() -> buildTimelineColumns() -> buildTimelinePreview()` 的数据链，确认组件没有另行排序，并验证主时间轴四条与 `allItems` 前四条一致。
- [x] 4.2 依次运行 `npm run test:unit`、`npm run test:data`、`npm run lint`、`npm run format:check` 和 `npm run build`，确认全部命令成功且没有吞掉错误。
- [x] 4.3 运行 `git status --short` 与 `git diff --stat`，确认仅包含本 change 的规划和实现相关文件，且没有临时校验内容、生成产物或无关改动残留。
