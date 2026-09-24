---
name: gRPC 算法封装
start: 2021-02
end: 2023-06
role: 服务封装
summary: 把空洞排布、逆向建模、钢筋识别、三角剖分、有限元等算法封装成可调用的服务。
stack: [gRPC, nameko, HTTP RPC, C++, Docker]
repos:
  - label: hole_avoidance
    url: https://github.com/iblofcqu/hole_avoidance
  - label: alogrithm_call
    url: https://github.com/iblofcqu/alogrithm_call
  - label: rcp_rebar_number_v1
    url: https://github.com/iblofcqu/rcp_rebar_number_v1
  - label: stairs_mould_finite_rpc
    url: https://github.com/iblofcqu/stairs_mould_finite_rpc
---

## 背景

各类专业算法需要被上位系统调用，团队集中做了一批服务化封装与调度试验。

## 负责内容

- 空洞排布等算法做成 gRPC 服务并接入 CI
- 逆向建模、钢筋识别、三角剖分（过耳裁法）的 RPC 调用封装
- 楼梯模具有限元 RPC（C++）与 Docker 依赖整理

## 技术要点

- gRPC / HTTP RPC / nameko 几种调用方式的取舍
- 容器内第三方依赖与镜像构建
- 服务接口与上层调用的解耦
