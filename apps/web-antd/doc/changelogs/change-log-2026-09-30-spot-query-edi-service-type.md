# TAPD #1001026：即时运价五字码白名单与运输类型必填

对应 [TAPD #1161580498001001026](https://www.tapd.cn/61580498/bugtrace/bugs/view/1161580498001001026)。

## 改动

1. **五字码写死：** `supported-edi-codes.ts` 固化 911 个大写 EDI；选港后用港口 EDI（trim + 忽略大小写）校验，不在名单提示「港口不支持」且不调 `SpotQueryAsync`。
2. **运输类型必填：** 表单增加起运/目的港运输类型（`CY`/`SD`）；入参 `polServiceType`、`podServiceType`；未选不调接口。
3. 卡片「运输条款」展示当前所选类型组合，不再写死 `CY-CY`。

## 验证

- [ ] 选不在白名单的港口 EDI → 提示「港口不支持」，无 `SpotQueryAsync` 请求
- [ ] 未选运输类型 → 不调接口
- [ ] 两端 CY/SD + 白名单港口 → 请求体含运输类型字段且能出结果
