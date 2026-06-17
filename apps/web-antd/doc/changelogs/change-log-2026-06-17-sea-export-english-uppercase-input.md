# 海运出口新建页指定字段英文自动转大写

## 背景意图

海运出口提单类文本字段（唛头、相关方备注、港口备注、箱号、船名航次、主提单号等）在业务上要求英文以大写形式录入，减少手工切换大小写带来的差错。

## 核心逻辑变更

1. 新增工具函数 `toEnglishUpperCase`（`src/utils/english-upper-case.ts`），仅将英文字母 `a-z` 转为 `A-Z`，中文及其他字符保持不变。
2. 新增表单组件 `EnglishUpperInput`、`EnglishUpperTextarea`，在 `update:value` 时自动调用转换函数。
3. `data.ts` 中以下字段改用大写输入组件：
   - 唛头 `marks`、货物描述 `goodsDes`
   - 发货人/收货人/通知人/第二通知人/国外代理备注（`*Content`）
   - 港口备注（`*PortRemark`）
   - 主提单号 `mblNum`
4. `VesselVoyageInput` 对船名 `vessel`、航次 `innerVoyno` 输入实时转大写。
5. `OrderCtnTable` 对箱号 `ctnNo`、封号 `sealNo` 输入实时转大写。
6. 港口选择联动备注、AI 识别回填时同步执行大写转换。

## 避坑指南

- 新建页与编辑页共用 `form.vue`，本次改动对 `/sea-exports/:id/edit` 同样生效。
- 内部备注 `internalRemark`、外部备注 `remark`、箱型备注未纳入大写范围，避免影响中文备注场景。
- 若后续新增同类提单文本字段，优先复用 `EnglishUpperInput` / `EnglishUpperTextarea`，勿在页面内重复实现转换逻辑。
