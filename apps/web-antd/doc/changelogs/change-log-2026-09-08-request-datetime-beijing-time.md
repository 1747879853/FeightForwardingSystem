# 出站时间口径统一为北京时间（修复全局时间早 8 小时）

## 背景意图

各模块的时间选择（表单提交、列表查询区间）保存/回显后普遍比所选值**早 8 小时**。

根因：后端接口的时间字段约定为**不带时区标记的北京时间墙钟字符串**（如 `2026-09-08T10:00:00`，见各接口文档示例），但前端大量历史代码在提交时用 `toISOString()` 产出 **UTC Z 串**（本地 10:00 → `02:00:00.000Z`），或直接传 `Date`/`dayjs` 对象（JSON 序列化同样输出 UTC Z 串）。后端按 UTC 墙钟解析存储，回显即早 8 小时。显示链路（naive 串按本地解析 + `formatDate`）本身无偏移。

## 核心逻辑变更

- 新增 `src/utils/beijing-datetime.ts`：
  - `toBeijingDateTimeString(value)`：把 `Date`/`dayjs`/带 `Z` 或偏移的 ISO 串统一转为北京时间（固定 UTC+8，与运行机器时区无关）的 `YYYY-MM-DDTHH:mm:ss` 串。
  - `convertPayloadToBeijingTime(payload)`：深度遍历请求载荷，转换其中的 UTC/偏移 ISO 串与 `Date`/`dayjs` 对象；**返回副本**，不修改原对象（避免污染表单模型/响应式状态）；naive 串、普通文本、`FormData` 等原样保留。
- `src/api/request.ts`：`createRequestClient` 新增出站请求拦截器，对 `config.data` 与 `config.params` 统一调用 `convertPayloadToBeijingTime`。所有走 `requestClient` 的请求（含既有 60 余处 `toISOString()` 调用点、隐式 `toJSON()` 序列化点）一次性修复，无需逐文件改动。
- 新增单测 `src/utils/beijing-datetime.test.ts`（8 例，全部与机器时区无关）。

## 避坑指南

1. **新代码提交时间建议直接用 `toBeijingDateTimeString()`** 产出 naive 北京时间串；即使沿用 `toISOString()`，出站拦截器也会兜底转换，但语义上以工具函数为准。
2. **拦截器只处理「整串匹配」的 ISO 时间**（带 `Z` 或 `±hh:mm` 偏移）；已嵌在其他字符串内部的时间、`YYYY-MM-DD`/`YYYY-MM` 等短格式不受影响。
3. **本地存储/导出文件等非 HTTP 场景不在转换范围**：如 `announcement-read-storage`（sessionStorage，按时间戳比较，本身正确）、`config-transfer` 的 `exportedAt`（导出元数据）。
4. **历史脏数据**：本修复只保证新提交的数据正确；此前以 UTC 墙钟入库的存量数据仍会显示早 8 小时，需后端做一次性数据订正（+8h）才能彻底消除。
5. 日期区间查询原先 `startOf('day').toISOString()` 会发送前一日 `16:00:00Z`，与后端 naive 本地时间比较时区间整体偏移；转换后为本地 `00:00:00`/`23:59:59`，区间语义恢复正确。
