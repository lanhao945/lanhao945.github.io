---
name: 数据标注平台改造
start: 2025-11
end: 2026-01
role: 开源项目二次开发
summary: 在开源标注平台上做二次开发与认证接入，适配团队的数据标注流程。
stack: [开源改造, 认证对接, Docker]
repos:
  - label: label-studio
    url: https://github.com/iblofcqu/label-studio
---

## 背景

标注环节需要与团队既有账号体系、部署方式对接，于是基于开源标注平台做改造。

## 负责内容

- 平台二次开发与功能调整
- 认证/登录相关改造（label-studio-auth）
- 部署与配置适配

## 技术要点

- 开源项目的二次开发边界与升级成本
- 认证链路接入
- 容器化部署
