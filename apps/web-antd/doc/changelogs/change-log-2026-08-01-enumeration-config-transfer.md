# 2026-08-01 枚举管理支持导入/导出配置跨公司迁移

## 背景意图

不同公司租户系统需要快速同步枚举配置（如 `ServiceType`、干系人角色枚举等），原先只能手工逐条录入。本次在「系统管理 → 枚举管理」增加**导出配置 / 导入配置**，用 JSON 文件在系统间移植，不依赖后端新增专用 Import/Export 接口。

## 核心逻辑变更

### 导出

- 列表工具栏「导出配置」（权限 `Admin.Enumeration.Get`）打开弹窗，拉取全量枚举列表供勾选（支持搜索、全选）。
- 确认后并发（上限 5）拉各枚举详情，组装 `EnumConfigFile`（`version` / `exportedAt` / `enumerations`），下载为 `enumeration-config-YYYYMMDDHHmm.json`。
- 文件**不含**主键、租户、审计字段，只保留业务语义字段：`name`、`description`、`remark` 及子项 `value` / `displayName` / `description` / `remark` / `enable` / `extra1`。

### 导入

- 「导入配置」（权限 `Admin.Enumeration.Add`）上传 JSON，解析校验后预览：按名称匹配目标系统，标注「新增 / 已存在」与子项数量，可再勾选子集。
- 同名冲突策略：
  - **覆盖**：将该枚举同步为文件内容；按子项 `value` 复用目标系统已有子项 Id（走 `EditAsync` 更新而非先删后建）；文件中没有的子项会被后端删除。**只影响勾选的那几条枚举，不会清空整张枚举表。**
  - **跳过**：同名保留目标现状，仅新增不存在的枚举。
- 串行导入，单条失败不影响其他；结束后汇总新增/覆盖/跳过/失败，并 `clearEnumCache()` 刷新列表。

### 关键文件

| 路径 | 说明 |
| :-- | :-- |
| `src/views/system/enumeration/config-transfer.ts` | 格式定义、拉全量、导出组装、解析校验、导入执行 |
| `src/views/system/enumeration/modules/export-modal.vue` | 导出弹窗 |
| `src/views/system/enumeration/modules/import-modal.vue` | 导入弹窗 |
| `src/views/system/enumeration/list.vue` | 工具栏接入 |
| `locales/.../system.json` | 中英文文案 |

## 避坑指南

> [!IMPORTANT] **覆盖 ≠ 清空全库** 覆盖只作用于本次勾选导入的枚举名；其他枚举不动。但该枚举下「文件里没有的子项」会被删掉——若目标系统多配了子项且业务已引用，先选「跳过」或先核对文件内容。

> [!IMPORTANT] **按 name 匹配，大小写不敏感做冲突检测** 导入侧用小写 key 查已有枚举；落库仍用文件里的 `name` 原文。源/目标名称大小写习惯不一致时需人工确认不会误匹配。

> [!IMPORTANT] **无专用后端接口** 导入复用 `AddAsync` / `EditAsync` / `DetailAsync`；覆盖会调编辑接口，但按钮权限目前只校验 `Add`。若需更严，可改为同时要求 Edit。

> [!IMPORTANT] **导入成功必清缓存** 与手工增删改一致，走列表页 `handleFormSuccess` → `clearEnumCache()`，否则业务页可能仍读到 localStorage 旧枚举。
