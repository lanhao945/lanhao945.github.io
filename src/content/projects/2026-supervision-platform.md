---
name: 数据集管理督办平台
start: 2026-04
end: 2026-09
role: 后端 / 部署
summary: 面向多单位数据上报的督办平台：数据、语料与成果统一入库，按单位统计进度并用看板呈现卡点。
stack: [Django, Celery, RabbitMQ, Docker, 看板]
repos:
  - label: supervision_platfrom_v2
    url: https://github.com/iblofcqu/supervision_platfrom_v2
---

## 背景

多家合作单位分批上报数据与处理成果，需要看清"谁没交、交了多少、卡在哪一步"。

## 负责内容

- 后端与部署链路：Docker 构建缓存治理（依赖层顺序、版本注入位置）
- 队列稳定性：显式声明 Celery 默认队列、长任务确认超时、任务结果不落 RPC 队列避免 RabbitMQ 残留

## 技术要点

- Celery + RabbitMQ 在多长任务场景下的队列隔离
- 文档解析任务的串行化与资源限制
- 镜像构建缓存与版本注入的相互影响
