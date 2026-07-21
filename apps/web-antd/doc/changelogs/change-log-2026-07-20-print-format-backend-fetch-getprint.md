# 2026-07-20 打印改为后端自动取数（GetPrintAsync）+ 非管理端模板列表按当票要素筛选

## 背景意图

后端打印能力升级（详见接口文档《打印格式（PrintFormat）》）：

1. 新增 `PrintFormatAdmin/GetPrintAsync`：前端**不再拼接业务 json**，改为按 `printJsonType` 传对应业务接口的真实入参（详情类 `detailInput`、费用列表类 `orderFeeListInput`），后端自动校验权限并取数生成打印数据。
2. 新增**非管理端** `PrintFormat/GetPagedListAsync`（登录即可访问）：获取打印模板列表时按当票的**签单方式/船公司/分公司**（`codeIssueTypeId`/`carrierId`/`orgId`）筛选，规则为「相等或为空」，即通用模板也会返回。
3. 更改单费用打印通过 `isChangeOrderPrint=true` + `detailInput`（更改单 id）走 `ChangeOrderAdmin/DetailAsync` 取费用。
4. `GetPrintAsync` 返回的文件名若含 `-`，需**截断 `-` 及其之后内容并保留扩展名**后再拼接静态地址。

前端据此将全局打印流程从「前端拼 json → `PrintAsync`」改造为「传业务入参 → `GetPrintAsync`」，并将模板列表来源切到非管理端接口。

## 核心逻辑变更

1. **`components/print-format/types.ts`**
   - `PrintJsonType` 新增 `StatementDetail = 11000`（客户对账详情）。

2. **`api/system/print-format-admin.ts`**
   - 新增 `getPrintFormatList`（`PrintFormat/GetPagedListAsync`，非管理端）与 `getPrintAsync`（`PrintFormatAdmin/GetPrintAsync`）。
   - `PrintFormatQueryDto` 新增 `codeIssueTypeId`/`carrierId`/`orgId`/`fileName`；`PrintFormatDto` 补充四列及 `codeIssueType`/`carrier`/`org` 简易对象。
   - 新增 DTO：`GuidIdDto`、`OrderFeeQueryDto`、`GetPrintDto`。
   - 旧 `getPrintFormatPagedList`/`printFormatAsync` 保留（暂不删除）。

3. **`components/print-format/use-print-format.ts`**（核心）
   - `PrintFormatOpenParams` 重构：由 `{ printJsonType, json }` 改为 `{ printJsonType, codeIssueTypeId?, carrierId?, orgId?, detailInput?, orderFeeListInput?, isChangeOrderPrint? }`。
   - `loadTemplates` 走 `getPrintFormatList`，携带当票 `codeIssueTypeId`/`carrierId`/`orgId`。
   - `loadPreview`/`handleExport` 改调 `getPrintAsync`，入参由 `buildPrintDto` 组装（`detailInput`/`orderFeeListInput`/`isChangeOrderPrint` + `format`）。
   - 新增 `cleanReturnedFilename`：文件名含 `-` 时截断为 `<前缀><扩展名>`（如 `638...-海运出口.pdf` → `638....pdf`），预览、下载、导出统一使用清洗后的文件名定位静态文件。

4. **调用方改造**
   - `sea-export-admin/basic-info-form/form.vue`：`resolvePrintJson` → `resolvePrintContext`，仅取当票要素并以 `detailInput={id: editId}` 打开打印；未保存修改仅提示「打印使用已保存数据」（后端按 id 取数，脏数据不体现）。
   - `orderFee/modules/composables/useOrderFeePrint.ts`：`handlePrint` 改为对象入参 `{ feeType, transportOrderId, orderDetail, isChangeOrderPrint?, changeOrderId?, selectedFeeIds? }`；普通费用打印传 `orderFeeListInput={transportOrderId, ids?, pageSize:9999}`，更改单打印传 `isChangeOrderPrint=true` + `detailInput`。
   - `orderFee/modules/order-fee-table-handsontable.vue`：打印按钮传 `{ feeType, transportOrderId: editId, orderDetail: orderBaseData, selectedFeeIds }`；`selectedFeeIds` 由勾选行已保存费用 id 计算，未勾选则不传 `ids`（打印整票）。
   - `orderFee/modules/order-fee-table.vue`（VXE，更改单内嵌）与 `order-fee-table-handsontable-back.vue`（历史备份）同步适配；并**放开更改单 Tab 的打印入口**：更改单模式走 `isChangeOrderPrint=true` + `detailInput={id: 更改单id, ids: 勾选的已保存费用}`。
   - `fee-management/statement/editor.vue`：顶栏「打印」由占位 `message.info` 接入全局打印，`openPrint({ printJsonType: StatementDetail(11000), detailInput: { id: editId } })`；对账单跨票无单一签单方式/船公司/分公司，模板筛选三要素留空。

5. **打印弹窗交互（2026-07-21 补齐）**
   - 底部操作由悬停下拉改为 `DropdownButton` 分裂按钮（主文案「打印」+ 可见下拉箭头），菜单项：打印 PDF / 导出 Excel / 导出 Word。
   - 点击「打印」或「打印 PDF」：`window.open` 新窗口打开 PDF，不再当前窗口触发下载。

## 避坑指南

- **模板列表接口区分管理端/业务端**：业务打印用**非管理端** `PrintFormat/GetPagedListAsync`（`getPrintFormatList`），务必传当票 `codeIssueTypeId`/`carrierId`/`orgId`，否则可能拿不到「限定该维度」的模板；管理端 `getPrintFormatPagedList` 仅用于打印格式后台管理。
- **分公司/组织取值**：海运出口取 `detail.companys?.[0]?.id`（所属公司）；签单方式取 `codeIssueTypeId ?? issueType`。
- **费用打印支持「整票」或「勾选」**：普通费用打印传 `orderFeeListInput.transportOrderId`；勾选了已保存费用时额外传 `orderFeeListInput.ids` 仅打勾选项，未勾选则不传 `ids`（打整票）。`pageSize: 9999` 仍需后端放开原 `maximum: 1000` 上限，否则整票会 400。更改单打印用 `detailInput.ids`。
- **Handsontable 必须显式传 `selectedFeeIds`**：只改 composable / VXE 表不够，主费用表 `order-fee-table-handsontable.vue` 若不传，`GetPrintAsync` 请求体里就不会有 `ids`。
- **未保存修改不进打印**：`GetPrintAsync` 按 id 从库取数，详情打印前的表单脏数据不会体现，提示语已调整。
- **返回文件名务必清洗**：含 `-` 时截断保留扩展名（`cleanReturnedFilename`），否则拼出的静态地址将 404。
- **PDF 新窗口打开**：主按钮打印 PDF 用 `window.open`；Excel/Word 仍按目标 `format` 重新调 `getPrintAsync` 并新窗口打开。

## 验证备注

- 代码通过 vite HMR 编译与 ReadLints（新增/改动文件无新增 lint）。
- 端到端需后端联调：海运出口详情打印（`detailInput`）、应收/应付费用整票与勾选 `ids` 打印（`orderFeeListInput`）、更改单费用打印（`isChangeOrderPrint`）、返回文件名含 `-` 时的清洗与静态访问、PDF 新窗口打开。
