# 海运出口脏检查空值归一化（修复删空后仍被拦截）

## 背景意图

接入未保存离开拦截（见 `change-log-2026-07-14-unsaved-changes-navigation-guard.md`）后出现误报：先修改「收货人备注」不保存 → 切菜单被正确拦截；随后把修改**删空**恢复原状，再跳转**仍被拦截**。用户已把内容改回，却仍判为「有未保存」。

## 核心逻辑变更

`basic-info-form/use-sea-export-submit.ts` 的脏检查由 `JSON.stringify(buildDto(values))` 直接比对，改为经 `normalizeForDirtyCheck` 归一化后再比对（新增 `stableDtoJson`）：

- `undefined` / `null` / `''` 统一视为「空」，对象里的空键一律丢弃；
- 递归处理对象与数组，数组保序（空元素以 `null` 占位保留长度语义）；
- 对象键排序，消除键顺序差异。

`syncFormSnapshot`（建基线）与 `isFormDirty`（判脏）改用同一 `stableDtoJson`。提交仍走原始 `buildDto`，不受影响。

## 根因

`JSON.stringify` 对空值三态处理不一致：

```js
JSON.stringify({ a: undefined }); // "{}"        key 消失
JSON.stringify({ a: null }); // '{"a":null}'
JSON.stringify({ a: '' }); // '{"a":""}'
```

`consigneeContent` 详情映射取 `to?.consigneeContent`，后端无值时基线为 `undefined`（序列化后无该 key）。用户输入后删空，`EnglishUpperTextarea`（`allowClear`）产出 `''` 或 `null`，当前 DTO 含 `consigneeContent:""`，与基线「无此 key」不等 → 误判脏。该问题波及所有直接透传的文本字段（`shipperContent` / `notifierContent` / 各 `remark` 等）。

## 避坑指南

- 快照式脏检查**禁止**用裸 `JSON.stringify` 比对含可空文本的结构；空值三态必须先归一。
- 归一化仅作用于「比对」，`buildDto` 的提交语义保持不变（后端可能区分 `null` 与不传，勿动提交侧）。
- `0` / `false` 不是空值，归一化保留（`pkgs=0`、`isBusinessLocking=false` 等仍参与比对）。
- 归一化不做数字/字符串互转；若后续出现「`'123'` vs `123`」类 ID 漂移，属另一类问题，需单独在映射层统一类型。
