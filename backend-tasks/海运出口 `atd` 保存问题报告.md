这里为您准备了一份发给后端开发人员（或后端 Agent）的 Bug 修复/修改文档。内容结构清晰，直接指明了问题所在、复现路径以及排查建议。

### 【Bug 报告 / 后端修改文档】海运出口编辑接口未成功保存 `atd` 字段

---

#### 1. 问题描述

在调用海运出口的编辑接口 (`SeaExportAdmin/EditAsync`) 更新订单数据时，前端已在 Payload 中正确传递了 `transportOrder.atd`（实际离港时间）字段，但数据未成功持久化到数据库。调用详情接口 (`SeaExportAdmin/DetailAsync`) 时，发现该字段的值未能正确更新（为空或仍为旧值）。

#### 2. 涉及接口

- **编辑接口 (PUT)**: `/api/services/app/SeaExportAdmin/EditAsync`
- **详情接口 (GET)**: `/api/services/app/SeaExportAdmin/DetailAsync`

#### 3. 请求数据上下文

**目标记录 ID**: `96b637e0-6441-417d-9de5-fa4421033cf1`

在执行 `PUT` 请求编辑时，前端发送的 JSON Payload (部分节选) 如下，已明确包含 `atd` 字段：

```json
{
  "id": "96b637e0-6441-417d-9de5-fa4421033cf1",
  "blType": 0,
  "billType": 0,
  "transportOrder": {
    "commissionNum": "0001",
    "atd": "2026-05-30T04:19:57.406Z", // <--- 此字段未成功保存
    "etd": "2026-03-01T07:52:34.817Z",
    "clientId": "9f97d49c-050b-40c7-9f2b-ca739c674b9f",
    "id": "96b637e0-6441-417d-9de5-fa4421033cf1"
    // ... 其他字段
  }
}
```

#### 4. 期望结果 vs 实际结果

- **期望结果**：调用 `EditAsync` 接口后，数据库中的 `atd` 字段应更新为前端传入的值（如：`2026-05-30T04:19:57.406Z`），且再次调用 `DetailAsync` 接口时，应能正确返回该 `atd` 时间。
- **实际结果**：接口 HTTP 状态返回正常，但 `atd` 的修改被丢弃或忽略，`DetailAsync` 无法查到最新修改的 `atd` 数据。

#### 5. 后端排查建议 (To Backend Developer)

请协助排查以下几个可能导致此问题的原因：

1. **DTO 映射问题**：检查 `EditAsync` 对应的入参 DTO（如 `TransportOrderEditDto`）中是否遗漏了 `Atd` 字段的定义，导致反序列化时被忽略。
2. **AutoMapper / 实体映射忽略**：检查在将 DTO 映射到 Entity 时，`Atd` 字段是否被配置为忽略映射（Ignore），或者赋值逻辑缺失。
3. **权限或业务逻辑拦截**：检查该字段的修改是否被某些领域服务层（Domain Service）的业务逻辑拦截（例如：只有特定状态下允许修改 `atd`，否则默默丢弃）。
4. **EF Core 追踪问题**：如果是直接更新子实体 (`transportOrder`)，请确认 EF Core 的上下文中是否正确追踪并标记了 `Atd` 属性为 `Modified`。
