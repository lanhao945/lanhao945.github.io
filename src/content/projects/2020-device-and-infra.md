---
name: 设备与长连接服务
start: 2020-04
end: 2022-07
role: 服务端 / 工具
summary: 设备长连接、钢筋加工机客户端、日志服务与 BIM 文件服务等基础组件。
stack: [WebSocket, Python, Node, Docker, Jenkins]
repos:
  - label: micro_device_conneciton
    url: https://github.com/iblofcqu/micro_device_conneciton
  - label: desktop_device_client
    url: https://github.com/iblofcqu/desktop_device_client
  - label: pyloggerserver
    url: https://github.com/iblofcqu/pyloggerserver
  - label: bimfile
    url: https://github.com/iblofcqu/bimfile
---

## 背景

设备与系统之间需要稳定的长连接与消息通道，另有日志、BIM 文件等基础设施需求。

## 负责内容

- WebSocket 长连接服务：任务下发与接收、队列触发主动查询
- 钢筋加工机客户端脚本与调用接口预研
- Python HTTP 日志服务、BIM 文件/中心服务接口
- 统一用户管理后端的部署与 CI 对接

## 技术要点

- 长连接下的消息可靠性与触发机制
- 服务端与桌面客户端的协议约定
- 容器化部署与持续集成
