# biz-select 大数 ID 校验与透传修复

## 背景意图

`requestClient` 通过 `json-bigint` 将超出 JS 安全整数（2^53-1）的主键解析为 **字符串**。港口、费用代码、汇率等基础资料表单中，`CountrySelect` / `LaneSelect` / `CurrencySelect` 选中后回传 string，但部分页面仍用 `z.number()` 校验，切换选项时报 `Expected number, received string`；若再用 `Number()` 转回 number 则会 **丢精度**，导致保存/删除错误记录。

## 核心逻辑变更

- **港口代码（PortCodeAdmin）**：`countryId`、`laneId` 改为 `z.preprocess` + `z.string()` 校验；提交前 `normalizeSelectId` 原样透传 string，禁止 `Number()`。
- **费用代码（FeeCodeAdmin）**：`currencyId` 同上，DTO 中 `id` / `currencyId` 放宽为 `number | string`。
- **汇率资料（ExchangeRateAdmin）**：`currencyId` 同上，删除接口参数同步放宽。
- **客户账期（payment-terms）**：删除时去掉 `Number(row.id)`，`IdDto.id` 改为 `number | string`。
- **API 类型**：上述模块 DTO 与 delete 方法注释并标注大数 string 透传约定。

## 避坑指南

- **biz-select 关联的主键 ID 字段**：表单校验用 `z.preprocess` 归一为 string，**禁止** `z.number()` 与 `z.coerce.number()`。
- **提交/删除**：大数 ID **禁止** `Number(id)`；JSON 中以 string 发送，后端 long 可正常反序列化。
- **排序字段 sortId**：小整数序号可继续用 number，与雪花主键区分。
- **valueKey 为 code 的下拉**（如 `CountrySelect valueKey='code'`）：值为业务编码字符串，不涉及 bigint 精度问题。
