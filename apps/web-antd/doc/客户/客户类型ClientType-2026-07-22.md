---
title: 客户新增客户类型字段（ClientType）
module: 客户管理（合作客户）
author: AI
last_updated: 2026-07-22
---

# 1. 背景意图 (Background)

**业务需求：** 合作客户（`App_Clients`）需区分「同行 / 直客」。本次新增可空枚举字段 **客户类型**（`ClientType`），并同步到新增、编辑、列表筛选、详情/列表输出及通用简易查询接口。

**枚举值：**

| 值     | 含义   |
| ------ | ------ |
| `0`    | 同行   |
| `1`    | 直客   |
| `null` | 未设置 |

> 说明：项目中已有历史枚举 `ClientType`（原名「客户性质」，旧值为 0直客/1同行/2供应商）。本次按业务要求**调整枚举定义**为上表，并重新挂回客户表（此前迁移 `clientupmany` 曾从表中删除该列）。表字段由你方自行生成迁移。

# 2. 修改文件清单

| 文件 | 路径 | 修改类型 |
| --- | --- | --- |
| 枚举 | `Core/CsprojBuilderEnum.cs` | 调整 `ClientType`：0同行、1直客（去掉供应商） |
| 实体 | `Core/Entites/Client.cs` | 新增 `ClientType? ClientType` |
| DTO | `Application/App/Client/Dto/ClientDto.cs` | Add/Edit/Query/Simple/Detail 同步字段 |
| 管理接口 | `Application/App/Client/ClientAdminAppService.cs` | 编辑赋值；列表按 `ClientType` 筛选 |
| 通用接口 | `Application/App/Client/ClientAppService.cs` | 列表筛选；分组接口映射 |

# 3. 核心逻辑变更

## 3.1 枚举 `ClientType`

```csharp
public enum ClientType
{
    [Display(Name = "同行")] 同行 = 0,
    [Display(Name = "直客")] 直客 = 1,
}
```

## 3.2 实体

`Client` 新增：

```csharp
/// <summary>
/// 客户类型(可空：0同行、1直客)
/// </summary>
public ClientType? ClientType { get; set; }
```

## 3.3 增删改查

| 接口 | 变更 |
| --- | --- |
| `AddAsync` | 入参含 `clientType`；`ObjectMapper` 映射写入 |
| `EditAsync` | `client.ClientType = input.ClientType`（局部更新，不调用全列 Update） |
| `GetPagedListAsync`(Admin) | 出参含 `clientType`；筛选 `clientType` 有值时精确匹配 |
| `DetailAsync` | 出参含 `clientType` |
| `GetPagedListAsync`(通用 Client) | 同上筛选；`ClientSimpleDto` 含 `clientType` |
| `GetGroupedByIndustryCategoryAsync` | `ClientSimpleDto` 映射含 `clientType` |
| `DeleteAsync` | 无额外逻辑（删客户连带删行） |

# 4. 接口参数说明 (API)

## 4.1 新增 — `POST /api/services/app/ClientAdmin/AddAsync`

请求体新增：

| 字段       | 类型        | 必填 | 说明                                   |
| ---------- | ----------- | ---- | -------------------------------------- |
| clientType | ClientType? | 否   | `0`同行 / `1`直客 / 不传或 null=未设置 |

## 4.2 编辑 — `PUT /api/services/app/ClientAdmin/EditAsync`

请求体同上，可传 `null` 清空客户类型。

## 4.3 列表 — `GET /api/services/app/ClientAdmin/GetPagedListAsync`

| 参数       | 类型        | 必填 | 说明                       |
| ---------- | ----------- | ---- | -------------------------- |
| clientType | ClientType? | 否   | 为空不筛选；有值按精确匹配 |

响应每条记录含 `clientType`。

## 4.4 详情 — `GET /api/services/app/ClientAdmin/DetailAsync`

响应含 `clientType`。

## 4.5 通用列表 — `GET /api/services/app/Client/GetPagedListAsync`

查询参数、`ClientSimpleDto` 响应均支持 `clientType`（规则同 4.3）。

## 4.6 按行业分组 — `GET /api/services/app/Client/GetGroupedByIndustryCategoryAsync`

分组内 `ClientSimpleDto` 含 `clientType`。

# 5. 避坑指南 (Pitfalls)

- **可空**：未传 / `null` 表示未设置；列表不传筛选条件时不过滤。
- **枚举取值变更**：旧 `ClientType` 曾为 0直客/1同行/2供应商；现为 0同行/1直客。历史库若仍有旧列数据需自行评估清洗（本列此前已从库删除，一般无历史值）。
- **勿生成迁移**：本仓库约定由你自行 `Add-Migration`；代码侧只改实体/DTO/接口。
- **编辑局部更新**：仅赋值 `ClientType`，依赖 UoW 自动保存，避免全列 UPDATE。

# 6. 变更日志 (Changelog)

| 日期 | 变更类型 | 业务功能变动 | 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-07-22 | `Feature` | 客户新增可空「客户类型」字段；增删改查/通用列表均支持 | 调整枚举 `ClientType`(0同行/1直客)；实体+Add/Edit/Query/Simple/Detail DTO；Admin 列表筛选与 Edit 赋值；Client 通用列表筛选与分组映射 |
