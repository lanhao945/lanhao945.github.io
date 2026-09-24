---
name: 施工方案平台
start: 2025-08
end: 2025-09
role: 后端 / 部署
summary: 施工方案的生成、比对与审查平台，支持 PDF 分析与异步任务处理。
stack: [TypeScript, Python, PDF 解析, 异步任务, Helm]
repos:
  - label: construction-scheme
    url: https://github.com/iblofcqu/construction-scheme
  - label: construction-scheme-b
    url: https://github.com/iblofcqu/construction-scheme-b
  - label: scheme_review
    url: https://github.com/iblofcqu/scheme_review
---

## 背景

施工方案编制与审查重复度高，需要把方案生成、PDF 比对与审查流程工具化。

## 负责内容

- 后端服务：PDF 分析与比对接口及处理逻辑
- 服务参数与体量配置（max body size / buffer size）、生产环境超时调整
- 异步处理改造（ProcessPoolExecutor）、日志与 Helm chart 名称一致性

## 技术要点

- 大文件上传与超时控制
- 异步任务的进程池与资源占用
- 部署配置与生产环境差异
