---
name: 塔架优化设计
start: 2024-07
end: 2026-03
role: Web 端 / 计算对接
summary: 钢塔结构在多组设计条件下的参数化建模与优化比选，配 Web 端输入条件与查看结果。
stack: [优化算法, 参数化建模, Web 后端, 前端交互]
repos:
  - label: Optimization-design-of-steel-towers
    url: https://github.com/iblofcqu/Optimization-design-of-steel-towers
---

## 背景

钢塔方案需要在多种设计条件下反复优化比选，人工试算效率低。

## 负责内容

- Web 端整体搭建：后端接口、首页与设计条件子页面
- 设计参数表单与计算结果展示的交互
- 与优化计算模块的对接与结果回传

## 技术要点

- 设计条件 → 优化计算 → 结果评估的闭环
- 参数表单与校验
- 计算耗时的异步处理与结果呈现
