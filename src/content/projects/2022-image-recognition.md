---
name: 图像识别系列
start: 2022-05
end: 2026-01
role: 模型训练 / 部署
summary: 裂缝、材质与场景分类等图像识别模型的训练、发布与部署探索。
stack: [PyTorch, YOLOv5, ResNet, K8s, Jupyter]
repos:
  - label: crack_classification_demo
    url: https://github.com/iblofcqu/crack_classification_demo
  - label: material_classification
    url: https://github.com/iblofcqu/material_classification
  - label: image_classification
    url: https://github.com/iblofcqu/image_classification
  - label: defect-detection-yolov5
    url: https://github.com/iblofcqu/defect-detection-yolov5
---

## 背景

工程质量与材料识别场景需要图像分类/检测能力，团队先做了一批模型与部署验证。

## 负责内容

- 分类模型训练流程整理（ResNet、多标签分类、数据集划分）
- 模型以 HTTP 方式发布（yolov5 裂缝检测等）
- 部署验证：K8s ingress 前缀匹配、日志与依赖整理

## 技术要点

- 分类/检测模型的数据准备与训练复现
- 模型服务化的接口与部署
- 多标签与单标签任务的区分
