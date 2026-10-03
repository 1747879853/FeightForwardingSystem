---
title: 接口入参字符串统一 Trim
module: 通用
author: auto-doc-sync
last_updated: 2026-07-31
---

# 1. 业务背景说明 (Background)

**白话解释：** 所有对外 HTTP 接口在执行增删改查前，会自动去掉入参字符串的首尾空格，避免空格导致查不到、重复建档或校验异常。

# 2. 功能与操作说明 (Features & Operations)

- **自动生效：** 无需前端或业务代码额外调用；所有走 MVC 管道的接口入参均生效。
- **实现位置：** 全局过滤器 `StringTrimActionFilter`，卡在模型绑定完成之后、Action 执行之前，对 `ActionArguments` 就地 Trim。
- **覆盖范围：** `[FromBody]` 的 JSON、`[FromQuery]` 的查询串、路由参数；根参数为 string、DTO 内 string、嵌套对象、列表/数组内对象的 string、字典的 string 值。
- **不覆盖：** 接口返回值；非 HTTP 入口（后台任务、SignalR Hub、AppService 之间的内部互调）。这些场景需要 Trim 请显式调 `StringTrimHelper.TrimStrings(dto)`。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :------- | :---------- | :------- | :------- |
| 无       | -           | -        | 无状态机 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **（全部入参 string）** | 任意业务字符串 | **HTTP 请求入参** | **触发：** 模型绑定后、Action 执行前自动 Trim | 业务校验基于 Trim 后的值；DataAnnotations 长度校验基于 Trim 前的值 |
| **DisableStringTrim** | 跳过 Trim 的标记 | 代码特性 | 标在属性/参数/类型上则跳过 | 按需使用 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：依赖首尾空格的特殊字段]** 若业务必须保留首尾空格 -> 需加 `[DisableStringTrim]`，否则会被去掉。

> [!IMPORTANT] **[卡点 2：长度校验用的是 Trim 前的值]** `MvcActionInvocationValidator` 直接读 `ActionContext.ModelState`，而 ModelState 在模型绑定阶段就已算完，早于任何 ActionFilter。因此 `[MaxLength]` / `[StringLength]` / `[RegularExpression]` 判定的是原始值 -> 上限 50 的字段传入「50 字符 + 末尾空格」会被 400 拒绝，不会先 Trim 再放行。`[Required]` 不受影响（其内部本就按 Trim 后判空）。

> [!IMPORTANT] **[卡点 3：禁止用 Castle 拦截器做 AppService 横切]** 本项目 AppService 以自身类型注册（`WithService.Self()`）并被 `ServiceBasedControllerActivator` 按具体类解析，Windsor 生成的是继承式类代理，**只能拦截 virtual 方法**，而项目内 AppService 方法全部非虚 -> 任何基于 `IApplicationService` 的 Castle 拦截器都是死代码。要做方法级横切请写 MVC 过滤器。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-31 | `Fix` | 入参 Trim 从「配了但没生效」改为真正生效 | 根因：Windsor 类代理只能拦 virtual 方法，`StringTrimInterceptor` 从未触发。改用全局 `StringTrimActionFilter` 操作 `ActionArguments`，删除拦截器与注册器 |
| 2026-07-29 | `Feature` | Application 入参 string 统一自动 Trim（实际未生效，见上行） | StringTrimInterceptor 注册于全部 IApplicationService |
