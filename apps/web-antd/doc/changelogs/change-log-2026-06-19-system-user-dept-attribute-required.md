# 用户管理：所属部门与用户属性设为必填

## 背景意图

业务要求新建/编辑用户时必须指定所属部门与用户属性，避免无组织归属或未定义业务角色的账号进入系统。

## 核心逻辑变更

- 调整 `src/views/system/user/data.ts` 用户表单 Schema：
  - `organizationId`（所属部门）：增加 `selectRequired` 校验
  - `userAttributeFlags`（用户属性）：增加 `required` 校验（CheckboxGroup 至少勾选一项）

## 避坑指南

- 用户属性为位标志多选，`userAttributeFlags` 提交前由 `combineUserAttribute` 合并为整型掩码；校验在表单层针对数组非空即可。
- 系统用户管理仍使用全量 8 项用户属性选项，与海运出口专用 6 项角色选项勿混用。
