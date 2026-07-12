# 侧边栏一级菜单图标更换

## 背景意图

产品希望侧边栏一级菜单使用更易辨识的彩色/语义化 Iconify 图标，与业务域名称对应，提升导航扫视效率。

## 核心逻辑变更

仅替换各路由模块 **父级** `meta.icon`，子菜单图标未改：

| 菜单 | 路由模块 | 新图标 |
| :-- | :-- | :-- |
| 费用管理 | `fee-management.ts` | `icon-park:finance` |
| 工作台 | `dashboard.ts`（Workspace） | `vscode-icons:file-type-go-work` |
| 航线管理 | `freight-rate.ts` | `emojione:ship` |
| 操作管理 | `operation-management.ts` | `streamline-freehand-color:office-work-wireless` |
| 审核审批 | `audit-approval.ts` | `streamline-freehand-color:security-phone-protection-approved` |
| 财务管理 | `settlement-management.ts` | `icon-park-solid:seal` |
| 客户管理 | `client.ts` | `openmoji:assembly-group` |
| 公告 | `announcement.ts` | `streamline-plump-color:announcement-megaphone-flat` |
| 基础数据 | `basic-data.ts` | `streamline-plump-color:horizontal-menu-circle` |
| 系统管理 | `system.ts` | `gcp:gce-systems-management` |

## 避坑指南

- 上述图标集依赖 Iconify 在线/已注册集合；若环境做了离线图标白名单，需确认对应 collection 已打包，否则侧栏可能空白。
- 分析页（Analytics）与 Dashboard 分组图标未在本次范围内，勿与「工作台」混淆。
