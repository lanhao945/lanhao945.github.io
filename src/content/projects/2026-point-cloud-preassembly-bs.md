---
name: 点云预拼装质量评定系统 B/S 化
start: 2026-09
end: 2026-09
role: 验收期临时支援 / B/S 化改造
summary: 临近验收的 Streamlit 演示改为 B/S 交付；1 天完成主体改造，打通 7 个工具页面。
stack: [Vue 3, FastAPI, ProcessPool, 断点续传, OpenSpec]
repos:
  - label: Wuye_VTASoftware
    url: https://github.com/iblofcqu/Wuye_VTASoftware
---

## 项目要点

- 交付：验收前临时支援；为接入既有系统，1 天内把临近验收的 Streamlit 演示改为 B/S，Vue 3 + FastAPI 同源部署，打通 7 个工具页面。
- 一致性：原算法、输入输出、命名与报告口径保持不变，用 golden 基线验证迁移前后一致。
- 架构与链路：无数据库，按会话目录隔离，`session.json` 登记产物、任务与上传；重计算进入进程池，进度与失败显式返回；分片上传支持断点续传与 SHA-256 校验。
- 工程方式：Codex、DeepSeek Flash、CodeGraph、OpenSpec 等 Agent 链路承担规模化改造，人工负责边界、取舍与最终验收。
- 边界：单机可信内网验收，不引入数据库、登录与多实例；算法已知缺陷保留，横向扩展留待后续。
