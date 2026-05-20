# SeServiceConfig 后端修复任务（列表重复显示）

## 1. 问题背景

当前业务语义是：

- 一个港口（`polId`）对应一条港口服务配置主记录（`SeServiceConfig`）。
- 一条主记录下可以关联多条服务项明细（`SeServiceConfigItem`）。

但现象是：

- 新建港口服务配置时，如果一次添加 2 条服务项并保存成功；
- 列表页会出现 2 条记录（看起来像重复主配置），而不是 1 条主配置记录。

## 2. 复现路径

1. 调用 `POST /services/app/SeServiceConfigAdmin/AddAsync`。
2. 请求体示例（关键字段）：

```json
{
  "polId": "10001",
  "remark": "测试港口",
  "seServiceConfigItems": [
    { "serviceType": 1, "manualAllowed": true, "autoComplete": false },
    { "serviceType": 2, "manualAllowed": true, "autoComplete": false }
  ]
}
```

3. 保存成功后，调用 `GET /services/app/SeServiceConfigAdmin/GetPagedListAsync`。
4. 列表返回出现 2 条同港口配置记录（主配置维度重复）。

## 3. 期望结果

- 列表按主配置维度返回：一个 `SeServiceConfig` 只返回一行。
- 该行可包含汇总信息（如服务项数量、服务项类型集合），但不应因子项数量产生多行主记录。
- 新建一个港口 + 两个服务项后，列表总数应 +1，而不是 +2。

## 4. 初步原因判断（后端重点排查）

高概率是 `GetPagedListAsync` 当前查询直接基于 `SeServiceConfigItem`（明细表）做分页，或在 `SeServiceConfig` 与 `SeServiceConfigItem` 联表后未按主键聚合，导致一对多展开后每个服务项都生成一条列表行。

## 5. 后端修改要求

### 5.1 列表接口口径改为“主表分页”

`GetPagedListAsync` 必须以 `SeServiceConfig` 主表为分页主体：

- 先对主表按筛选条件分页（例如 `polId`、排序等）。
- 再按需要左连接/子查询计算明细汇总字段。
- 返回 DTO 一行代表一个主配置。

### 5.2 建议返回结构

建议新增或切换为主配置列表 DTO（命名可自定）：

- `id`（主配置 ID）
- `polId`
- `portName`（或 `pol` 对象）
- `sortId`
- `remark`
- `serviceItemCount`（明细数量）
- `serviceTypes`（可选，明细服务项类型集合）
- `creationTime` / `lastModificationTime`

> 注意：如果要兼容旧前端，请至少保证同一个主配置在列表中只出现一次；字段可以逐步扩展。

### 5.3 新增与编辑接口一致性

`AddAsync` / `EditAsync` 需要保证：

- 新增时只创建 1 条 `SeServiceConfig` 主记录；
- `seServiceConfigItems` 仅写入子表，不应误创建多条主记录；
- 编辑时对子项执行“增删改”但不改变主记录唯一性。

### 5.4 数据约束（建议）

建议在数据库层增加（或确认已有）以下约束：

- 同租户下 `SeServiceConfig(polId)` 唯一约束（如业务允许每港口仅一条配置）。

这样可防止并发或异常流程产生同港口多主记录。

## 6. 验收标准（必须满足）

1. **新增验证**：新建 1 个港口并添加 2 个服务项，列表只新增 1 行。
2. **总数验证**：`totalCount` 按主配置计数，不按服务项计数。
3. **编辑验证**：编辑该配置增减服务项后，列表仍为同 1 行，不出现拆分。
4. **删除验证**：删除该主配置后，列表对应 1 行消失，子项级联删除正常。
5. **回归验证**：按 `polId`、分页、排序查询结果稳定，不因子项数量产生重复。

## 7. 排查建议（实现层）

- 检查 `GetPagedListAsync` 的仓储查询是否从 `SeServiceConfigItem` 起查。
- 检查 LINQ/SQL 是否存在 `join` 后直接 `select` 明细 DTO 的逻辑。
- 若必须联查子项，请在主键（`SeServiceConfig.Id`）维度 `group by` 后再投影列表 DTO。
- 检查 AutoMapper 映射是否将明细 DTO 误作为列表主 DTO 使用。

## 8. 交付物

- 后端修复代码（应用服务 + 查询层 + DTO）。
- 变更说明（本问题根因、修复策略、影响范围）。
- 最少 1 个集成测试或应用服务测试，覆盖“1 主配置 + N 子项，列表仅 1 行”场景。
