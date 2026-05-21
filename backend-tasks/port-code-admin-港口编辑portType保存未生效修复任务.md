# PortCodeAdmin 后端修复任务（港口编辑 `portType` 保存未生效）

> **面向**：后端开发 / 后端 Agent  
> **来源**：前端页面实机操作 + Chrome DevTools MCP 网络抓包（2026-05-21）  
> **前端结论**：请求已正确携带 `portType`，接口返回成功，但详情/列表读回仍为 `null` —— **问题在后端持久化或读回映射，非前端漏传。**

---

## 1. 问题描述

在 **基础数据 → 港口代码**（`/basic-data/port-code`）编辑港口时，修改 **港口类型**（字段名 `portType`，取值 `port` = 海港 / `inland` = 内陆港）并保存：

- 前端提示保存成功；
- `EditAsync` HTTP 200 且 `success: true`；
- 再次打开编辑弹窗或刷新列表后，`portType` 仍为 `null`，列表「港口类型」列无显示，表现为「保存没生效」。

同期该记录在编辑后 **`lastModificationTime` 仍为 `null`**，与 `ediCode` 等字段未落库现象一致，需怀疑 `EditAsync` 对实体更新不完整（见关联任务）。

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
2. 打开港口列表，编辑记录 **IZMIR / 伊兹密尔**（`id=1942403213076598796`）。
3. 在表单中将 **港口类型** 选为 **海港**（`port`），点击保存。
4. 列表刷新或再次打开编辑：`portType` 仍为空 / 表单下拉无回显。

---

## 4. 抓包证据（关键）

### 4.1 编辑请求 — 已传 `portType`

**`PUT PortCodeAdmin/EditAsync`**（reqid=3329，200）

请求体：

```json
{
  "id": "1942403213076598796",
  "portName": "IZMIR",
  "cnName": "伊兹密尔",
  "portType": "port",
  "countryId": "1816307258519326943",
  "laneId": "1826509716952584207",
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

### 4.2 保存前详情 — `portType` 已为 null

**`GET DetailAsync?Id=1942403213076598796`**（reqid=3324，保存前）

```json
{
  "result": {
    "portName": "IZMIR",
    "cnName": "伊兹密尔",
    "portType": null,
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

### 4.3 保存后详情 — `portType` 仍为 null（未生效）

**`GET DetailAsync?Id=1942403213076598796`**（reqid=3331，保存后约 2s）

```json
{
  "result": {
    "portName": "IZMIR",
    "cnName": "伊兹密尔",
    "portType": null,
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

### 4.4 保存后列表 — 目标行 `portType` 仍为 null

**`GET GetPagedListAsync?PageIndex=1&PageSize=20`**（reqid=3330）

目标行（节选）：

```json
{
  "portName": "IZMIR",
  "cnName": "伊兹密尔",
  "countryName": "土耳其",
  "laneCode": "EMS",
  "laneName": "地东线",
  "portType": null,
  "ediCode": null,
  "id": 1942403213076598796
}
```

### 4.5 对照：列表读回能力正常

同一次列表响应中，**历史记录** 能正确返回 `portType`，例如：

| 港口名           | portType   |
| ---------------- | ---------- |
| `PHILIPSBURG`    | `"port"`   |
| `LANDMARK`       | `"port"`   |
| `TEPEAPULCO,HID` | `"inland"` |
| `TATOPANI`       | `"inland"` |

说明 **`DetailAsync` / `GetPagedListAsync` 的 DTO 映射并非整体缺失 `PortType`**，更可能是 **`EditAsync`（及可能的 `AddAsync`）未写入该字段**，或写入了错误列/未提交。

### 4.6 关联现象（2026-05-21 新建的土耳其港口批次）

列表中 `creationTime` 为 `2026-05-21` 的多条土耳其港口（IZMIR、GEMLIK、GEBZE、DERINCE 等）**`portType`、`ediCode`、`chau`、`explain` 均为 `null`**，而 2025 年及更早数据有值。建议：

- 同时验证 **`AddAsync` 创建时是否也未持久化 `portType`**；
- 与 **`ediCode` 未落库`** 一并排查（见 `backend-tasks/port-code-admin-港口编辑ediCode保存未生效修复任务.md`），根因可能为同一处 `EditAsync`/`AddAsync` 字段白名单过窄。

---

## 5. 前端字段约定（供后端对齐）

前端 API 类型与提交字段（`apps/web-antd/src/api/system/base-data/port-code-admin.ts`）：

| JSON 字段   | 类型                | 说明                                    |
| ----------- | ------------------- | --------------------------------------- |
| `portType`  | `string?`           | 港口类型：`port` 海港 / `inland` 内陆港 |
| `id`        | `number` / `string` | 主键（编辑必填）                        |
| `portName`  | `string?`           | 港口英文名                              |
| `cnName`    | `string?`           | 中文名                                  |
| `countryId` | `number`            | 国家 ID                                 |
| `laneId`    | `number`            | 航线 ID                                 |
| `status`    | `number`            | 0 启用 / 1 禁用                         |

编辑提交代码（`PortCodeAdmin/modules/form.vue`）已显式传入 `portType: values.portType`：

```typescript
await editPortCode({
  id: formData.value.id,
  portName: values.portName,
  cnName: values.cnName,
  chau: values.chau,
  explain: values.explain,
  portType: values.portType,
  countryId: values.countryId,
  laneId: values.laneId,
  ediCode: values.ediCode,
  statisticalArea: values.statisticalArea,
  status: values.status,
});
```

表单选项（`PortCodeAdmin/data.ts`）：

- `port` → 海港
- `inland` → 内陆港

**无需前端改动即可验证后端。**

---

## 6. 期望结果 vs 实际结果

| 项目 | 期望 | 实际（抓包） |
| --- | --- | --- |
| `EditAsync` 入参 | 接收并持久化 `portType` | 入参含 `"portType":"port"` |
| `EditAsync` 响应 | `success: true` 且 DB 已更新 | `success: true` |
| `DetailAsync` | `portType` 为 `"port"` | **`portType: null`** |
| `GetPagedListAsync` | 同行 `portType` 为 `"port"` | **`portType: null`** |
| 审计字段 | `lastModificationTime` 更新 | **仍为 `null`** |

---

## 7. 初步原因判断（后端重点排查）

高概率问题（按优先级）：

1. **`PortCodeEditDto` / `EditAsync` 映射遗漏**
   - DTO 无 `PortType` 属性，或 JSON 名不一致（前端为 camelCase `portType`，需与 ASP.NET Core 序列化配置一致）。
   - AutoMapper `CreateMap<PortCodeEditDto, PortCode>()` 未包含 `PortType`，或 `ForMember(..., opt => opt.Ignore())`。

2. **应用服务更新逻辑未赋值**
   - `EditAsync` 内仅更新 `PortName`、`CnName`、`CountryId`、`LaneId`、`Status` 等，**漏写 `entity.PortType = input.PortType`**。
   - 使用「仅更新非空字段」策略时，对 `portType` 处理错误。

3. **EF Core 未标记修改**
   - 附加实体后未将 `PortType` 标为 `Modified`；部分字段更新导致 `PortType` 未跟踪。

4. **数据库列名/实体属性不一致**
   - 实体 `PortType` 未映射到表列；迁移缺失（读历史数据正常、写新数据失败时需核对表结构）。

5. **`AddAsync` 同类问题（扩展）**
   - 新建港口时若也未保存 `portType`，需与 `EditAsync` 一并修复。

6. **与 `ediCode` 等同源缺陷（强烈建议合并修复）**
   - 同一 `EditAsync` 可能未写入 `EdiCode`、`Chau`、`Explain`、`StatisticalArea` 等；修复 `PortType` 时应对照前端 `PortCodeEditDto` 全量字段做一次回归。

7. **`EditAsync` 整体未真正更新（辅助线索）**
   - 保存后 `lastModificationTime`、`lastModifierUserId` 仍为 `null`，需确认 PUT 是否只返回成功但未 `SaveChanges`。

---

## 8. 后端修改要求

### 8.1 `EditAsync`

- 入参 DTO 必须包含 `PortType`（或与前端一致的 `portType` JSON 命名）。
- 映射到实体并 `SaveChanges`。
- 允许将 `portType` 更新为 `port` / `inland` 或清空（若业务允许）。
- 保存成功后更新 `LastModificationTime` / `LastModifierUserId`（若项目统一规范要求）。

### 8.2 `AddAsync`（建议一并检查）

- 创建时持久化 `portType`，与 `EditAsync` 行为一致。

### 8.3 `DetailAsync` / `GetPagedListAsync`

- 确认读路径已映射 `PortType`（历史数据可读，重点保证写后读一致）。
- 修复后无需改接口契约，前端字段名已为 `portType`。

### 8.4 建议测试用例

- **编辑海港**：对 `id=1942403213076598796` 调用 `EditAsync`，`portType="port"` → `DetailAsync` 返回 `"port"`。
- **编辑内陆港**：`portType="inland"` → 列表与详情一致。
- **切换类型**：`port` → `inland` → 读回为 `inland`。
- **新增**：`AddAsync` 带 `portType` → 列表与详情一致。
- **回归**：编辑后 `lastModificationTime` 非空；`ediCode` 等同批字段若已修，一并断言。

---

## 9. 验收标准（必须满足）

1. 使用上文 **4.1 相同 Payload** 调用 `EditAsync` 后，`DetailAsync` 返回 `portType: "port"`。
2. `GetPagedListAsync` 中 `id=1942403213076598796` 的行 `portType` 为 `"port"`。
3. 前端无需改代码，刷新页面即可看到「港口类型」列与编辑表单下拉回显正确。
4. （建议）`AddAsync` 新建港口时选择类型，保存后列表/详情均有值。
5. （建议）与 `ediCode` 修复任务合并验收：可选字段批量写后读一致。

---

## 10. 排查清单（实现层）

- [ ] `PortCodeEditDto` / `PortCodeAddDto` 是否含 `PortType`
- [ ] `PortCodeAdminAppService.EditAsync` 是否对 `PortType` 赋值
- [ ] AutoMapper Profile：`PortCodeEditDto` → `PortCode`
- [ ] 实体 `PortCode.PortType` 与 DB 列映射（类型建议 `nvarchar`，长度覆盖 `inland`）
- [ ] `SaveChanges` 是否执行、多租户是否写到正确库
- [ ] `AddAsync` 是否与 `EditAsync` 同源问题
- [ ] 与 `EdiCode`、`Chau`、`Explain`、`StatisticalArea` 是否同一处遗漏
- [ ] 集成测试：PUT 后 GET 断言 `portType`

---

## 11. 交付物

- 后端修复代码（AppService + DTO + 映射 + 如有必要的数据库迁移）。
- 变更说明（根因、影响范围、是否需补写历史 `null` 数据）。
- 至少 1 个测试：`EditAsync` 更新 `portType` 后 `DetailAsync` 可读回。

---

## 12. 参考：请求时序（MCP reqid）

```
3324 GET  DetailAsync        (保存前, portType=null)
3329 PUT  EditAsync          (body含 portType=port, 200 success)
3330 GET  GetPagedListAsync  (IZMIR 行 portType=null)
3331 GET  DetailAsync        (保存后, portType=null)
```

**测试记录 ID**：`1942403213076598796`  
**测试港口类型值**：`port`（海港）

**关联文档**：`backend-tasks/port-code-admin-港口编辑ediCode保存未生效修复任务.md`
