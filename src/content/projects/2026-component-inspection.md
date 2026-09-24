---
name: 构件外观质量检测
start: 2026-08
role: 机械臂扫描集成
summary: 以 PLC 移动底座搭载机械臂与结构光扫描仪，实现构件外观质量的多工位自动扫描与判定。
stack: [机械臂, 结构光扫描, PLC, Modbus, 多工位]
repos:
  - label: wuyi_mechanical_arm
    url: https://github.com/iblofcqu/wuyi_mechanical_arm
---

## 背景

构件外观质检原本依赖人工，项目用移动底座 + 机械臂 + 结构光扫描仪自动完成多工位扫描。

## 负责内容

- 机械臂扫描流程集成：多工位扫描、适配新版扫描仪 API、同步扫描控制
- 到位判定改用目标回波判断，修正 Modbus 写地址
- 现场对接文档与扫描流程设计说明

## 技术要点

- 机械臂 / 扫描仪 / PLC 三方时序与同步
- Modbus 寄存器读写与到位信号判定
- 多工位批量扫描的流程编排
