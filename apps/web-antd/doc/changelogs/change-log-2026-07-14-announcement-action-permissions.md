# 公告管理操作按钮按权限显示

## 背景意图

公告管理页面在用户未获得新增或删除权限时仍展示对应操作按钮，导致页面操作入口与角色权限配置不一致。

## 核心逻辑变更

- 公告列表统一使用 `Admin.Announcement` 权限对象。
- 【新增】按钮仅在拥有 `Admin.Announcement.Add` 权限时显示。
- 【批量删除】按钮仅在拥有 `Admin.Announcement.Delete` 权限时显示。

## 避坑指南

- 页面访问权限与按钮操作权限需分别控制，拥有公告查看权限不代表拥有新增或删除权限。
- 后续新增公告操作入口时，应继续使用 `createAbpPermission('Admin.Announcement')` 生成的动作权限码。
