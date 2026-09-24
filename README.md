# lanhao945.github.io

个人主页：**一页时间轴** + 一个**分享（博客）**列表页。
基于 [Astro](https://astro.build/) 与 [AstroPaper v6](https://github.com/satnaing/astro-paper)，部署在 GitHub Pages。

## 本地预览

```bash
npm install          # 首次或依赖变化时执行
npm run dev          # 开发预览：http://localhost:4321
```

想验证"发布后的样子"（包含站内搜索索引）：

```bash
npm run build        # 类型检查 + 构建 + 生成 Pagefind 搜索索引
npm run preview      # 预览 dist/：http://localhost:4321
```

> 手机上预览：`npm run dev -- --host`，然后用同一局域网的手机访问终端里提示的地址，就可以转屏幕看横屏/竖屏两种时间轴。

## 页面结构

| 路径                          | 内容                                             |
| ----------------------------- | ------------------------------------------------ |
| `/`                           | 个人页：简介 + 时间轴（宽屏横排，窄屏/竖屏竖排） |
| `/posts`                      | 分享列表（分页）                                 |
| `/posts/<文件名>`             | 分享详情                                         |
| `/tags` `/archives` `/search` | 标签、归档、搜索                                 |

## 加一条时间轴记录

在 `src/content/timeline/` 新建一个 `.md` 文件即可，文件名随意（只用于锚点链接）：

```markdown
---
year: 2026
title: 换了个新东西
type: 项目 # 教育 | 证书 | 论文 | 专利 | 项目 | 工作 | 记录
meta: 2026.06 # 可选：副标题、专利号、会议名、时间段
summary: 一句话说明。 # 可选：front matter 里的一句话
tags: [标签A, 标签B] # 可选
links: # 可选：相关链接
  - label: 链接文字
    url: https://example.com
---

这里可以写正文（Markdown），会渲染在这条记录下面。
```

规则：

- 页面**只显示到年份**；同一年可以有多条，按 `month` 字段排序（没写 `month` 的排在该年最前），再按标题排序。
- 时间轴顺序是**从早到晚**：横屏时左 = 过去、右 = 现在；竖屏时上 = 过去、下 = 现在。
- **横屏时卡片分居轴线两侧**：同一年有多张卡片时，前半段在轴线上方、后半段在下方（从上往下读就是时间顺序）；
  只有一张卡片的年份按年份顺序轮流在轴上/轴下；年份标签始终贴在轴线上，竖屏则回到单列顺序展示。
- **宽屏横屏时首页是整屏的**：页面本身不滚动，鼠标滚轮（或触控板）直接驱动时间轴左右移动，底部有一条进度线。
  时间轴在可用区域里**上下居中**，并且不再和上面的文字左对齐，而是向两侧铺开（宽屏最大 96rem，超宽屏居中）。
  总宽度放得下时整体水平居中；放不下时从左侧排开、可滚动，被隐藏的部分滚出来看；窗口特别矮、一列内容放不下时，滚轮会先把这一列纵向看完，再继续往右。
  想反过来，把 `src/utils/getSortedTimeline.ts` 里 `a.data.year - b.data.year` 改成 `b.data.year - a.data.year` 即可。
- 横屏/竖屏的切换规则写死在 `src/components/Timeline.astro` 的媒体查询里：
  `@media (min-width: 900px) and (orientation: landscape)` → 横排；其余（含横屏手机）→ 竖排。

## 写一篇分享

在 `src/content/posts/` 新建 `.md` 或 `.mdx` 文件，文件名就是 URL（`/posts/<文件名>/`）：

```markdown
---
title: 标题
pubDatetime: 2026-03-07T22:31:24+08:00
description: 列表页和搜索结果里显示的摘要
tags: [标签A, 标签B]
draft: false # true 则不出现在列表里
featured: false # 可选
---

正文……
```

> 日期请带上 `+08:00` 时区偏移，否则在 CI（UTC 环境）构建时会差 8 小时。

## 换头像

把图片放到 **`src/assets/images/avatar.png`**（也支持 `jpg / jpeg / webp / avif / svg`，文件名必须是 `avatar`），页头就会用头像替换站名文字；
没有这个文件时自动退回显示站名文字，所以删掉图片也不会把站点弄坏。

- 建议是**正方形**图片，边长 ≥ 144px（页头显示 36×36，源图按 2 倍渲染，高清屏不糊）
- 默认圆形裁剪（`rounded-full`），想改成圆角方形就把 `src/components/Header.astro` 里的 `rounded-full` 换成 `rounded-md`
- 想让浏览器标签页图标也用这张图，替换 `public/favicon.svg` 或在 `src/layouts/Layout.astro` 里改 favicon 指向

## 项目经历页（/projects）

顶部导航「项目」进入，竖直左右交替的蛇形时间轴，hover / 键盘聚焦弹出详情。

在 `src/content/projects/` 新建一个 `.md` 就是一个项目：

```markdown
---
name: 项目名（不要写公司/甲方名）
start: 2025-03 # 起
end: 2025-10 # 止；进行中就不写，会显示「至今」
role: 数据 / 后端 # 弹窗顶部那行角色
summary: 一句话简介，显示在卡片上，建议 40–60 字
stack: [点云, 逆向建模, Python]
repos: # 参与过的仓库，可多条（私有仓库访客打不开是正常的）
  - label: points_20250325
    url: https://github.com/iblofcqu/points_20250325
---

## 背景

为什么做这个项目。

## 负责内容

- 具体做的事情（从提交记录归纳）
- …

## 技术要点

- 技术点、取舍
```

规则：

- 页面按 `start` **倒序**（最新在最上）；想手动调顺序用 `weight`（数字小的靠前）
- 首屏 6 个项目，往下滚接近底部时每次再追加 8 个
- 节点位置显示时间周期（`start – end`，进行中显示「至今」），单行不换行
- 详情弹窗向外侧展开（左项往左、右项往右），并限制在当前视口内：放不下会向上翻

## 想改样式

| 想改什么                                 | 改哪里                                                |
| ---------------------------------------- | ----------------------------------------------------- |
| 站点标题、描述、作者、社交链接、菜单开关 | `astro-paper.config.ts`                               |
| 界面文案（中文）                         | `src/i18n/lang/zh-CN.ts`                              |
| 颜色（明/暗主题）                        | `src/styles/theme.css`                                |
| 时间轴布局与滚动行为                     | `src/components/Timeline.astro`、`TimelineItem.astro` |

配色 token：`--background` `--foreground` `--accent` `--muted` `--muted-foreground` `--border`，改这一组就能换整体气质。

## 部署

推送到 `main` 后由 `.github/workflows/pages.yml` 自动构建并发布到 GitHub Pages。
仓库设置中 **Settings → Pages → Source** 需要是 **GitHub Actions**。

## 一些实现选择

- **字体**：没有使用 Google Fonts，`--font-app` 是"等宽优先 + 中文系统字体回退"的字体栈，构建过程不依赖外网。
  想换成自托管字体（例如 JetBrains Mono），把字体文件放进 `public/` 或 `src/assets/`，再用 `@font-face` 引入即可。
- **分享卡片（OG 图）**：`public/default-og.jpg` 是静态图，所有页面共用。想换就替换这个文件（1200×630 效果最好）。
  主题自带的"按文章动态生成 OG 图"已关闭：它依赖英文字体，中文标题会缺字。
- **vite 版本**：`package.json` 里固定了 `vite@^7`，与 astro 6 保持一致。
  不固定的话 `@tailwindcss/vite` 会装上 vite 8，`astro check` 会因两套 vite 类型冲突而报错。
- **时间轴横竖切换**用的是纯 CSS 媒体查询，禁用 JavaScript 也能正常阅读；只有底部的滚动提示和进度条依赖脚本。

## 遗留事项（可选）

- 旧 Hexo 链接形如 `/2026/01/19/标题/`，现在是 `/posts/标题/`；GitHub Pages 不支持 301，如需保留可以做跳转页。
- 原来的 `/about` 页面已并入时间轴，没有单独页面。
