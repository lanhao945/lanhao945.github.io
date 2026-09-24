---
name: 微信端业务后台
start: 2022-06
end: 2024-04
role: 后端
summary: 面向微信端的纯接口后台服务，含鉴权、并发处理与证书运维。
stack: [Django, PostgreSQL, Docker, 微信生态]
repos:
  - label: wx_webbackend
    url: https://github.com/iblofcqu/wx_webbackend
---

## 背景

小程序端需要纯后台接口服务，不对外暴露管理界面。

## 负责内容

- 接口开发与查询调整（数据顺序、分页等）
- 并发场景下的重复创建问题修复
- 环境与配置：从环境变量读取数据库端口、微信 SSL 证书周期性更新
- 镜像构建时附带版本信息、发布流程

## 技术要点

- 并发写入的幂等处理
- 证书与密钥的更新机制
- 镜像版本与发布可追溯
