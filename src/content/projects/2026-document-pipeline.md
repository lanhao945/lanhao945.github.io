---
name: 文档转换服务
start: 2026-01
end: 2026-07
role: 服务化 / 部署
summary: 把 PDF 与扫描件经 OCR、MinerU 转成 Markdown/JSON，并为下游抽取提供统一入口与产物管理。
stack: [MinerU, OCR, FastAPI, Kubernetes, Helm]
repos:
  - label: Mineru-changed
    url: https://github.com/iblofcqu/Mineru-changed
  - label: Corpus-automation-and-conversion
    url: https://github.com/iblofcqu/Corpus-automation-and-conversion
---

## 背景

法规、事故报告等资料以 PDF/扫描件为主，需要先稳定地转成结构化文本。

## 负责内容

- MinerU 服务化：Helm 化部署、k8s 环境、镜像与密钥（git-crypt）管理
- 转换服务能力：强制 OCR 模式、pdf 预览、文件删除 API、结果修改 API
- 本地多服务调试用的 docker-compose 与目录规范

## 技术要点

- 扫描件 OCR 与解析质量的取舍
- 长文档任务的排队、缓存与产物落盘约定
- 多服务本地联调的编排
