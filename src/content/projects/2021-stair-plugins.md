---
name: 楼梯深化插件（早期）
start: 2020-09
end: 2023-11
role: 插件 / 前端 / 后端
summary: 楼梯深化设计的早期插件与前后端工程：建模辅助、参数列表与设备接口。
stack: [Revit 插件, Vue, Python, 多端]
repos:
  - label: djstairs
    url: https://github.com/iblofcqu/djstairs
  - label: stairsui
    url: https://github.com/iblofcqu/stairsui
  - label: stair_frontend
    url: https://github.com/iblofcqu/stair_frontend
---

## 背景

更早一代楼梯深化设计工具：把重复的建模、参数配置与出图工作做成插件与配套前端。

## 负责内容

- 前端与插件功能开发（结构参数列表、界面交互）
- 后端调用与设备接口逻辑修正

## 技术要点

- 插件界面与服务端的分层
- 参数列表与建模数据的同步
- 跨端工程的可维护性
