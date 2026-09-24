---
name: PC 构件深化设计
start: 2022-08
end: 2025-04
role: 计算模块 / 后端
summary: 预制混凝土构件的参数化配筋与深化计算，从输入参数一路产出可交付的深化设计文件。
stack: [Python, 配筋, 深化设计, API, 文件产出]
repos:
  - label: PC_detailed_design
    url: https://github.com/iblofcqu/PC_detailed_design
  - label: PC_Design_System
    url: https://github.com/iblofcqu/PC_Design_System
  - label: dieheban_250414_backend
    url: https://github.com/iblofcqu/dieheban_250414_backend
---

## 背景

预制混凝土构件（叠合板等）的深化设计重复计算多，项目把参数化计算与出图流程自动化。

## 负责内容

- 计算与接口：深化计算封装为可调用 API，统一脚本入口与运行环境
- 文件产出：结果文件保存路径与返回方式
- 后端与前端约定的参数结构维护

## 技术要点

- 参数化配筋与深化计算的模块化封装
- 计算结果落盘与版本管理
- 服务化接口与本地脚本共用计算核心
