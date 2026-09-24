---
name: 幕墙龙骨逆向建模
start: 2025-03
end: 2025-10
role: 数据 / 后端
summary: 从扫描点云拟合幕墙龙骨的尺寸与位置，重建可用于改造与加工的三维模型。
stack: [点云, 逆向建模, 数据转换, 数据库设计]
repos:
  - label: points_20250325
    url: https://github.com/iblofcqu/points_20250325
  - label: reverse_modeling_of_curtain_wall_keel
    url: https://github.com/iblofcqu/reverse_modeling_of_curtain_wall_keel
---

## 背景

既有幕墙龙骨缺少图纸依据，用扫描点云逆向重建模型，为改造与加工提供数据。

## 负责内容

- 数据与文件流转：多格式转换、工具链配置
- 数据库表结构设计与接口拆分，补充单元测试
- 点云到模型的算法调用链路与产出约定

## 技术要点

- 点云拟合与构件重建流程
- 多格式文件与中间产物管理
- 结构化存储与可测试的模块边界
