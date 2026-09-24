---
name: 图纸正向设计
start: 2023-02
end: 2023-12
role: 前端交互 / 后端 / 算法接入
summary: 把方案初期的功能气泡图变成户型方案：前端可增删节点与连线，后端调用生成算法出图。
stack: [Vue, Flask, HouseGAN++, 图数据, 交互设计]
repos:
  - label: forward-generation-ui
    url: https://github.com/iblofcqu/forward-generation-ui
  - label: forward-generation-backend
    url: https://github.com/iblofcqu/forward-generation-backend
  - label: housegan_pp
    url: https://github.com/iblofcqu/housegan_pp
---

## 背景

建筑方案初期常以气泡图表达功能关系，项目把"气泡图 → 户型图"做成可交互工具。

## 负责内容

- 前端交互：气泡图节点/边增删改，边随节点联动
- 后端（Flask）接口与前端的数据约定
- HouseGAN++ 与图神经网络方案的调用封装、文档与会议记录
- 交付版本（webviewer 客户端）的定制与打包

## 技术要点

- 图数据结构在前端与算法之间的约定
- 生成结果的可视化与评估
- 前后端分离下的接口设计
