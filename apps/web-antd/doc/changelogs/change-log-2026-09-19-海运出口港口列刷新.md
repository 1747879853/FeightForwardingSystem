---
title: 海运出口批量修改后港口列显示旧值修复
date: 2026-09-19
module: sea-exports
---

# 背景意图

批量修改起运港后，搜索接口的 `polRemark` 已返回新值，列表却显示旧港口。旧列绑定 `polName`，通过 formatter 读取 `polRemark`；VXE 按绑定字段值缓存格式化文本，绑定字段不变时会复用旧文本。

# 核心逻辑变更

- 六段港口列直接绑定 `receivePortRemark`、`polRemark`、`poT1Remark`、`poT2Remark`、`podRemark`、`deliverPortRemark`，移除跨字段取值的 formatter。
- 新列键仍通过 `fieldMap` 按各自港口的 `PortName` 排序，兼容旧排序键。
- 默认列配置同步新键；加载个人配置时迁移旧港口键，保留顺序、显隐、固定和宽度，兼容旧下标键。已有新键优先，不修改服务端配置。

# 避坑指南

- 列的 field 应绑定实际显示的数据，避免格式化缓存依赖错误字段。
- 验证使用当前安装的 VXE `getCellLabel` 源码：复现旧绑定的陈旧文本，验证六列新绑定和清空值均立即更新；验证列设置迁移及幂等性。
- 尚未在浏览器执行真实业务批量修改；本次不改后端、不部署。
