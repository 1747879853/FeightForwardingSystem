# 枚举配置后在业务页面中的使用方式 — 解析日志

## 解析目标

- 梳理 `/system/enumeration` 配置与前端消费链路。
- 将对话中的「枚举使用说明」沉淀为可维护的项目文档，供业务开发接入新页面时查阅。

## 核心逻辑梳理 / 发现的文档偏差

- 原 `doc/modules/system/enumeration.md` 仅描述枚举管理页本身，**未说明** 业务页面如何通过 `getEnumItems` 消费枚举。
- 源码侧已有完整实现：`src/utils/init-enum.ts`、`src/bootstrap.ts` 启动预加载、`src/api/system/enum-admin.ts` 的 `GetItemsByNameAsync`。
- `src/utils/ENUM-CACHE-USAGE.md` 为英文标题的源码旁文档，与 `doc/` 活文档体系未打通；本次在 `doc/guides/` 建立中文版权威指南并回链源码路径。
- `getAllEnumNames()` 仅预加载 `InvoiceStatus`、`FeeStatus`；其他枚举依赖 `getEnumItems` 的 `autoLoad` 按需拉取，文档中需明确以免误以为必须改预加载列表才能使用。

## 架构洞察

- **枚举名称（`name`）** 是前后端契约 key，业务代码、缓存 key、接口参数三者必须一致。
- 提交与存库使用 **`value`（number）**，`displayName` 仅用于展示层。
- 订单费用模块采用「模块级 cache + 同步 getter」模式，解决 Vxe 列配置无法 await 的问题，可作为表格密集使用枚举的参考实现。
