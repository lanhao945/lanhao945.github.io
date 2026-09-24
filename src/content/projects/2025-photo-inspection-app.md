---
name: 现场拍照质检
start: 2023-12
end: 2026-05
role: 后端 / 实时通讯 / 部署
summary: 工程现场随手拍照、标注位置并回传的质检应用，后台按项目组织数据并支持实时消息。
stack: [Django, Socket.IO, uni-app, Vue 3, Docker, nginx]
repos:
  - label: PicCheck
    url: https://github.com/iblofcqu/PicCheck
  - label: photo-inspection
    url: https://github.com/iblofcqu/photo-inspection
  - label: PaiKeCeBusiness
    url: https://github.com/iblofcqu/PaiKeCeBusiness
  - label: pkc_py_backend
    url: https://github.com/iblofcqu/pkc_py_backend
---

## 背景

现场巡检与质量检查需要随手拍照、标注位置并回传，后台按项目组织数据。

## 负责内容

- 实时通讯：把独立 Tornado websocket 合并进 socket.io，完成会话、消息收发与离线消息拉取
- 业务修复：好友请求与列表、私聊单发、消息列表更新、联系人 404 处理
- 移动端问题：位置图片标注与详情错位、项目成员与详情分页加载不全
- 发布与合规：Docker 镜像、nginx 端口冲突、静态路径配置、隐私政策与备案信息位置

## 技术要点

- socket.io 与既有 websocket 的合并与事件清理
- 移动端（uni-app / Vue 3）定位与标注时序
- 多端共用后端接口
