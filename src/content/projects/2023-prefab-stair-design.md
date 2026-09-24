---
name: 预制楼梯智能设计
start: 2022-08
end: 2025-12
role: 结构计算 / 深化 / 出图
summary: 预制楼梯从结构计算、配筋深化到 IFC/DXF/BVBS 加工数据的全链路自动化，模块化打包复用。
stack: [Python, 结构计算, 钢筋排布, IFC, DXF, BVBS]
repos:
  - label: stair_web_backend
    url: https://github.com/iblofcqu/stair_web_backend
  - label: stair_structure_calculation
    url: https://github.com/iblofcqu/stair_structure_calculation
  - label: Stair_rebar_layout
    url: https://github.com/iblofcqu/Stair_rebar_layout
  - label: stair_ifc
    url: https://github.com/iblofcqu/stair_ifc
  - label: stair_dxf
    url: https://github.com/iblofcqu/stair_dxf
---

## 背景

预制楼梯从结构计算、配筋深化到加工数据链条长、重复度高，逐步拆成一组可复用计算模块。

## 负责内容

- 结构计算模块：荷载与材料参数过滤、构件配置
- 钢筋智能排布计算模块
- 出图与加工数据：IFC 生成、DXF 图纸、BVBS 数据生成
- 模块打包、依赖声明与版本管理，后端服务对接

## 技术要点

- 计算模块的包化与可安装（内部 pypi）
- IFC / DXF / BVBS 多格式产出的数据一致性
- 模块间版本兼容
