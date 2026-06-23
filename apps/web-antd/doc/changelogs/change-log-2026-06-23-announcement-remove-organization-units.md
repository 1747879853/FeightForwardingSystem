# 公告移除适用部门字段

## 背景意图

公告不再按部门定向投放，适用部门配置与登录弹窗组织过滤一并下线。

## 核心逻辑变更

- 表单删除 `organizationUnitIds`（ApiTreeSelect）及提交/回填逻辑。
- API 类型移除 `OrganizationUnitDto`、`organizationUnitIds`、`organizationUnits`。
- 登录弹窗不再调用 `getMyInfoApi` 与 `matchesAnnouncementOrganization`，有效且未读公告对具备 `Admin.Announcement.Get` 权限用户全员展示。
- 清理中英文 `organizationUnits` 相关文案。

## 避坑指南

- 后端若仍返回 `organizationUnits` 字段，前端已忽略，不影响展示。
- 已存公告的历史部门数据不再参与前端过滤。
