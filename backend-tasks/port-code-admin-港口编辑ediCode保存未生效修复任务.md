# PortCodeAdmin 后端修复任务（港口编辑 `ediCode` 保存未生效）

> **面向**：后端开发 / 后端 Agent  
> **来源**：前端页面实机操作 + Chrome DevTools MCP 网络抓包（2026-05-21）  
> **前端结论**：请求已正确携带 `ediCode`，接口返回成功，但详情/列表读回仍为 `null` —— **问题在后端持久化或读回映射，非前端漏传。**

---

## 1. 问题描述

在 **基础数据 → 港口代码**（`/basic-data/port-code`）编辑港口时，修改 **EDI 代码**（字段名 `ediCode`）并保存：

- 前端提示保存成功；
- `EditAsync` HTTP 200 且 `success: true`；
- 再次打开编辑弹窗或刷新列表后，`ediCode` 仍为 `null`，表现为「保存没生效」。

同期其他字段（如 `portName`、`cnName`、`countryId`、`laneId`、`status`）是否已正确落库需一并核对；抓包显示该记录在编辑后 **`lastModificationTime` 仍为 `null`**，需怀疑 `EditAsync` 对实体更新不完整。

---

## 2. 涉及接口

| 方法  | 路径                                                  | 说明     |
| ----- | ----------------------------------------------------- | -------- |
| `PUT` | `/api/services/app/PortCodeAdmin/EditAsync`           | 编辑保存 |
| `GET` | `/api/services/app/PortCodeAdmin/DetailAsync?Id={id}` | 详情读回 |
| `GET` | `/api/services/app/PortCodeAdmin/GetPagedListAsync`   | 列表读回 |

**环境**：`http://localhost:5010`  
**页面**：`http://localhost:5010/basic-data/port-code`

---

## 3. 复现路径

1. 登录租户（抓包中为 `admin` / `tenantId=1`）。
2. 打开港口列表，编辑记录 **IZMIR / 伊兹密尔**。
3. 在表单中将 **EDI 代码** 改为 `123123`，点击保存。
4. 列表刷新或再次打开编辑：EDI 列为空 / 表单中 `ediCode` 为空。

---

## 4. 抓包证据（关键）

### 4.1 编辑请求 — 已传 `ediCode`

**`PUT PortCodeAdmin/EditAsync`**（reqid=1033，200）

请求体：

```json
{
  "id": "1942403213076598796",
  "portName": "IZMIR",
  "cnName": "伊兹密尔",
  "countryId": "1816307258519326943",
  "laneId": "1826509716952584207",
  "ediCode": "123123",
  "status": 0
}
```

响应体：

```json
{
  "result": true,
  "success": true,
  "error": null,
  "__abp": true
}
```

### 4.2 保存前详情 — `ediCode` 已为 null

**`GET DetailAsync?Id=1942403213076598796`**（reqid=1028，保存前）

```json
{
  "result": {
    "portName": "IZMIR",
    "cnName": "伊兹密尔",
    "countryId": 1816307258519326943,
    "laneId": 1826509716952584207,
    "ediCode": null,
    "status": 0,
    "lastModificationTime": null,
    "creationTime": "2026-05-21T17:14:51.1045967+08:00",
    "creatorUserId": 9,
    "id": 1942403213076598796
  },
  "success": true
}
```

### 4.3 保存后详情 — `ediCode` 仍为 null（未生效）

**`GET DetailAsync?Id=1942403213076598796`**（reqid=1035，保存后约 1s）

```json
{
  "result": {
    "portName": "IZMIR",
    "cnName": "伊兹密尔",
    "countryId": 1816307258519326943,
    "laneId": 1826509716952584207,
    "ediCode": null,
    "status": 0,
    "lastModificationTime": null,
    "creationTime": "2026-05-21T17:14:51.1045967+08:00",
    "creatorUserId": 9,
    "id": 1942403213076598796
  },
  "success": true
}
```

### 4.4 保存后列表 — 目标行 `ediCode` 仍为 null

**`GET GetPagedListAsync?PageIndex=1&PageSize=20`**（reqid=1034）

目标行（节选）：

```json
{
  "portName": "IZMIR",
  "cnName": "伊兹密尔",
  "countryName": "土耳其",
  "laneCode": "EMS",
  "laneName": "地东线",
  "ediCode": null,
  "id": 1942403213076598796
}
```

### 4.5 对照：列表读回能力正常

同一次列表响应中，**其他历史记录** 能正确返回 `ediCode`，例如：

- `PHILIPSBURG` → `"ediCode": "ANPHI"`
- `LANDMARK` → `"ediCode": "CALMK"`

说明 **`DetailAsync` / `GetPagedListAsync` 的 DTO 映射并非整体缺失 `EdiCode`**，更可能是 **`EditAsync`（及可能的 `AddAsync`）未写入该字段**，或写入了错误列/未提交。

### 4.6 关联现象（同日新建的一批土耳其港口）

列表中 `creationTime` 为 `2026-05-21` 的多条土耳其港口（IZMIR、GEMLIK、GEBZE 等）**`ediCode` 均为 `null`**，而较早数据有值。建议同时验证 **`AddAsync` 创建时是否也未持久化 `ediCode`**。

---

## 5. 前端字段约定（供后端对齐）

前端 API 类型与提交字段（`apps/web-antd/src/api/system/base-data/port-code-admin.ts`）：

| JSON 字段   | 类型                | 说明             |
| ----------- | ------------------- | ---------------- |
| `ediCode`   | `string?`           | EDI 代码         |
| `id`        | `number` / `string` | 主键（编辑必填） |
| `portName`  | `string?`           | 港口英文名       |
| `cnName`    | `string?`           | 中文名           |
| `countryId` | `number`            | 国家 ID          |
| `laneId`    | `number`            | 航线 ID          |
| `status`    | `number`            | 0 启用 / 1 禁用  |

编辑提交代码（`PortCodeAdmin/modules/form.vue`）已显式传入 `ediCode: values.ediCode`，**无需前端改动即可验证后端**。

---

## 6. 期望结果 vs 实际结果

| 项目 | 期望 | 实际（抓包） |
| --- | --- | --- |
| `EditAsync` 入参 | 接收并持久化 `ediCode` | 入参含 `"ediCode":"123123"` |
| `EditAsync` 响应 | `success: true` 且 DB 已更新 | `success: true` |
| `DetailAsync` | `ediCode` 为 `"123123"` | **`ediCode: null`** |
| `GetPagedListAsync` | 同行 `ediCode` 为 `"123123"` | **`ediCode: null`** |
| 审计字段 | `lastModificationTime` 更新 | **仍为 `null`** |

---

## 7. 初步原因判断（后端重点排查）

高概率问题（按优先级）：

1. **`PortCodeEditDto` / `EditAsync` 映射遗漏**
   - DTO 无 `EdiCode` 属性，或 JSON 名不一致（如后端期望 `EdiCode` 而绑定失败）。
   - AutoMapper `CreateMap<PortCodeEditDto, PortCode>()` 未包含 `EdiCode`，或 `ForMember(..., opt => opt.Ignore())`。

2. **应用服务更新逻辑未赋值**
   - `EditAsync` 内手动 `entity.PortName = input.PortName` 等，但**漏写 `entity.EdiCode = input.EdiCode`**。
   - 使用「仅更新非空字段」策略时，对 `ediCode` 处理错误（例如把合法字符串当空跳过）。

3. **EF Core 未标记修改**
   - 附加实体后未设置 `EdiCode` 为 `Modified`；或更新时用了 `Attach` + 部分字段导致 `EdiCode` 未跟踪。

4. **数据库列名/实体属性不一致**
   - 实体属性 `EdiCode` 未映射到表列，或映射到错误列；迁移未包含该列（读历史数据正常、写新数据失败时需核对表结构）。

5. **`AddAsync` 同类问题（扩展）**
   - 新建港口时若也未保存 `ediCode`，需与 `EditAsync` 一并修复。

6. **`EditAsync` 整体未真正更新（辅助线索）**
   - 保存后 `lastModificationTime`、`lastModifierUserId` 仍为 `null`，需确认该 PUT 是否只返回成功但未 `SaveChanges`，或更新了错误表/错误租户库。

---

## 8. 后端修改要求

### 8.1 `EditAsync`

- 入参 DTO 必须包含 `EdiCode`（或与前端一致的 `ediCode` JSON 命名策略）。
- 映射到实体并 `SaveChanges`。
- 允许将 `ediCode` 更新为空字符串或 `null`（若业务允许清空 EDI）。
- 保存成功后更新 `LastModificationTime` / `LastModifierUserId`（若项目统一规范要求）。

### 8.2 `AddAsync`（建议一并检查）

- 创建时持久化 `ediCode`，与 `EditAsync` 行为一致。

### 8.3 `DetailAsync` / `GetPagedListAsync`

- 确认读路径已映射 `EdiCode`（列表历史数据可读，重点保证写后读一致）。
- 修复后无需改接口契约，前端字段名已为 `ediCode`。

### 8.4 建议测试用例

- **编辑**：对 `id=1942403213076598796` 调用 `EditAsync`，`ediCode="123123"` → `DetailAsync` 返回 `"123123"`。
- **清空**：`ediCode=""` 或 `null` → 读回符合业务规则。
- **新增**：`AddAsync` 带 `ediCode` → 列表与详情一致。
- **回归**：编辑后 `lastModificationTime` 非空（若系统有审计字段）。

---

## 9. 验收标准（必须满足）

1. 使用上文 **4.1 相同 Payload** 调用 `EditAsync` 后，`DetailAsync` 返回 `ediCode: "123123"`。
2. `GetPagedListAsync` 中 `id=1942403213076598796` 的行 `ediCode` 为 `"123123"`。
3. 前端无需改代码，刷新页面即可看到 EDI 列与编辑表单回显正确。
4. （建议）`AddAsync` 新建港口时填写 EDI，保存后列表/详情均有值。
5. （建议）编辑后审计字段与同类已维护港口行为一致。

---

## 10. 排查清单（实现层）

- [ ] `PortCodeEditDto` / `PortCodeAddDto` 是否含 `EdiCode`
- [ ] `PortCodeAdminAppService.EditAsync` 是否对 `EdiCode` 赋值
- [ ] AutoMapper Profile：`PortCodeEditDto` → `PortCode`
- [ ] 实体 `PortCode.EdiCode` 与 DB 列映射
- [ ] `SaveChanges` 是否执行、是否多租户过滤导致写到错误库
- [ ] `AddAsync` 是否与 `EditAsync` 同源问题
- [ ] 集成测试覆盖：PUT 后 GET 断言 `ediCode`

---

## 11. 交付物

- 后端修复代码（AppService + DTO + 映射 + 如有必要的数据库迁移）。
- 变更说明（根因、影响范围、是否需洗历史 `null` 数据）。
- 至少 1 个测试：`EditAsync` 更新 `ediCode` 后 `DetailAsync` 可读回。

---

## 12. 参考：请求时序（MCP reqid）

```
1028 GET  DetailAsync   (保存前, ediCode=null)
1033 PUT  EditAsync     (body含 ediCode=123123, 200 success)
1034 GET  GetPagedListAsync (IZMIR 行 ediCode=null)
1035 GET  DetailAsync   (保存后, ediCode=null)
```

**测试记录 ID**：`1942403213076598796`  
**测试 EDI 值**：`123123`
