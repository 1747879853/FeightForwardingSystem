# 系统用户接口待支持字段对接说明（后端 Agent 可执行）

## 解析目标

- 明确前端在 `用户管理` 页面中已预留但后端接口未支持的 2 个字段。
- 输出后端可直接按步骤实施的接口契约变更说明。
- 给出前后端联调验收口径，减少二次沟通成本。

## 现状结论（前端侧）

- 页面：`/system/user`
- 源码：`apps/web-antd/src/views/system/user/data.ts`
- 当前被标记为“待后端接口支持”的字段有 2 个：
  - `officeTel`（办公电话）
  - `senderDisplayName`（发件显示名）
- 两字段目前在前端表单中为 `disabled: true`，占位文案为“待后端接口支持”。

## 后端需要补齐的接口契约

### 1) 读取接口（回显）

- 接口：`GET /services/app/UserAdmin/GetUserForEditAsync`
- 目标：返回用户编辑详情时，补充以下字段：
  - `officeTel?: string`
  - `senderDisplayName?: string`

### 2) 保存接口（新增/编辑）

- 接口：`POST /services/app/UserAdmin/CreateOrUpdateUserAsync`
- 目标：接收并持久化以下字段：
  - `officeTel?: string`
  - `senderDisplayName?: string`

### 3)（如走管理端增强保存）含数据权限保存接口

- 接口：`POST /services/app/UserAdmin/CreateOrUpdateUserInAdminAsync`
- 目标：同样接收并持久化：
  - `officeTel?: string`
  - `senderDisplayName?: string`

## DTO/模型建议（后端 Agent 执行清单）

- 在用户详情 DTO（编辑回显）中新增：
  - `OfficeTel`
  - `SenderDisplayName`
- 在用户输入 DTO（保存入参）中新增：
  - `OfficeTel`
  - `SenderDisplayName`
- 在领域实体与数据库映射中新增对应字段（若未存在）：
  - `OfficeTel`（建议 `nvarchar(32)`）
  - `SenderDisplayName`（建议 `nvarchar(64)`）
- 在对象映射（Entity <-> DTO）中补充双向映射。

## 字段语义与校验建议

| 字段 | 含义 | 建议长度 | 必填 | 备注 |
| :-- | :-- | :-- | :-- | :-- |
| `officeTel` | 办公电话 | `<= 32` | 否 | 可为空，建议允许分机符号（如 `-`） |
| `senderDisplayName` | 发件显示名（邮件发件人显示名称） | `<= 64` | 否 | 可为空，作为邮件显示名优先值 |

## 前端联调验收口径

- 编辑页打开时，后端返回的 `officeTel`、`senderDisplayName` 能正确回显。
- 点击保存后，两字段能随用户信息一起提交并持久化。
- 再次进入编辑页时，两字段值与上次保存一致。
- 字段为空时不报错，不影响原有用户保存流程。

## 影响范围

- 前端接口类型定义文件：`apps/web-antd/src/api/system/user-admin.ts`
- 前端表单配置文件：`apps/web-antd/src/views/system/user/data.ts`
- 后端服务：`UserAdmin` 相关查询与保存链路。

## 给后端 Agent 的一句话任务指令

请在 `UserAdmin` 的用户详情与保存相关 DTO、应用服务、实体映射及持久化层中补齐 `OfficeTel` 和 `SenderDisplayName` 两个字段，并确保 `GetUserForEditAsync` 回显、`CreateOrUpdateUserAsync`/`CreateOrUpdateUserInAdminAsync` 可保存。
