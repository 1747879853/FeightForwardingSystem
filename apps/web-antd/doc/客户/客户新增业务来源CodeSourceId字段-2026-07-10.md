---
title: 客户新增业务来源(CodeSourceId)字段
module: 合作客户（ClientAdminAppService）
author: AI
last_updated: 2026-07-10
---

# 1. 背景意图 (Background)

`Client`（合作客户）实体新增了 `CodeSourceId`（业务来源，外键指向 `App_CodeSources`）。需要在客户的增删改查接口中：

1. 输入（新增/编辑）时对 `CodeSourceId` 做外键存在性校验。
2. 输出（列表/详情）时额外返回对应的 `CodeSourceSimpleDto`（业务来源简易对象）。

# 2. 核心逻辑变更 (Core Logic Changes)

## 2.1 DTO（`App/Client/Dto/ClientDto.cs`）

- 新增 `using CsprojBuilder.App.CodeSource.Dto;`
- `ClientAddDto` 新增 `long? CodeSourceId`
- `ClientEditDto` 新增 `long? CodeSourceId`
- `ClientDto` 新增 `long? CodeSourceId` 与 `CodeSourceSimpleDto CodeSource`（业务来源返回对象）

## 2.2 应用服务（`App/Client/ClientAdminAppService.cs`）

- 注入 `IRepository<Entites.CodeSource, long> _codeSourceRepository`
- **AddAsync**：新增外键校验，`CodeSourceId` 有值时校验业务来源是否存在，不存在抛「业务来源不存在」。实体映射走 `ObjectMapper.Map`，`CodeSourceId` 自动映射落库。
- **EditAsync**：新增同样的外键校验；并显式赋值 `client.CodeSourceId = input.CodeSourceId;`（编辑为手动逐字段赋值，必须显式赋值否则不保存）。
- **GetPagedListAsync**（列表）：按当前页 `CodeSourceId` 批量查出业务来源，逐条填充 `data.CodeSource`；并新增 `CodeSourceId` 查询筛选条件（`ClientQueryDto.CodeSourceId`，为空不筛选）。
- **DetailAsync**（详情）：按 `client.CodeSourceId` 查出并填充 `result.CodeSource`。
- **GetSettlementBanksAsync**（结算对象查询，同样返回 `ClientDto`）：一并填充 `CodeSource` 以保持一致。

`CodeSourceSimpleDto` 已加 `[AutoMapFrom(typeof(Entites.CodeSource))]`，列表/详情/结算查询统一使用 `ProjectTo<CodeSourceSimpleDto>(_mapperConfiguration)` 投影（映射下推到 SQL，只查 `Id/Code/CnName/EnName` 四列，避免全字段查询，性能更好），写法与币种 `CurrencySimpleDto` 一致。

# 3. 避坑指南 (Pitfalls)

- **编辑接口是手动赋值**：`EditAsync` 未使用整体 AutoMapper 映射，新增字段必须在赋值段显式写 `client.CodeSourceId = input.CodeSourceId;`，否则会出现「提示成功但不保存」。
- **新增接口自动映射**：`AddAsync` 用 `ObjectMapper.Map<Entites.Client>(input)`，`CodeSourceId` 会自动映射，只需补校验。
- **`CodeSourceSimpleDto` 需映射特性**：使用 `ProjectTo` 前必须给其加 `[AutoMapFrom(typeof(Entites.CodeSource))]`，否则运行时报未配置映射。
- **列表性能**：列表按当前页 `CodeSourceId` 去重后一次性 `ProjectTo` 查询，既避免 N+1，又只查所需列。
- **无需 migration 由我方生成**：实体字段已由你新增，本次仅接口层改动。

# 4. 变更日志 (Changelog)

| 日期 | 变更类型 | 业务功能变动 | 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-07-10 | `Feature` | 客户增删改查支持业务来源：新增/编辑做外键校验，列表/详情额外返回 CodeSourceSimpleDto | AddAsync 依赖 AutoMapper 自动映射 CodeSourceId；EditAsync 需手动赋值；输出对象手动 new 填充 CodeSourceSimpleDto |
| 2026-07-10 | `Feature` | 列表查询新增 CodeSourceId 筛选条件（为空不筛选） | ClientQueryDto 加 CodeSourceId；GetPagedListAsync 用 WhereIf 过滤 |
