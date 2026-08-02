# 海运出口编辑页：委托编号支持一键重新生成

## 背景意图

TAPD 缺陷 1000594：订单委托编号旁边需要一个刷新按钮，点一下由后端按编号规则重新生成新的委托编号并替换旧编号。此前委托编号只在新建保存时由后端生成一次，页头只做只读展示，编号规则调整后已存在的单据无法重新取号。

## 核心逻辑变更

- 接口：`src/api/sea-export/sea-export-admin.ts` 新增 `updateSeaExportCommissionNum(id)`
  - `PUT /services/app/SeaExportAdmin/UpdateCommissionNumAsync`，入参仅 `{ id }`，出参为后端生成的新委托编号字符串
  - 前端不传编号内容，编号规则完全由后端决定；实际落库字段是同 Id 的 `TransportOrder.CommissionNum`
- 页面：`src/views/sea-export-admin/basic-info-form/form.vue`
  - 页头「委托编号」右侧新增图标按钮（`mdi:refresh`），仅编辑态（`isEdit && editId`）渲染，受 `Admin.SeaExport.Edit` 权限控制
  - `handleRegenerateCommissionNum`：调用接口后把返回值写回 `entrustReadonlyInfo.commissionNum`，提示成功并 `markListShouldRefresh('SeaExportList')`；返回空串时兜底 `loadEditData()` 重新拉详情
  - 请求期间按钮 loading，并用 `regeneratingCommissionNum` 防重复点击
- 文案：`locales/langs/{zh-CN,en-US}/seaExport.json` 新增 `export.regenerateCommissionNum`（按钮 Tooltip）与 `export.regenerateCommissionNumSuccess`
- 样式：`basic-info-form/form.css` 新增 `.basic-info-header__icon-btn`（20×20 图标按钮，与页头 12px 文本行高对齐）

## 避坑指南

- **未保存拦截会被误触发**：`commissionNum` 会进入提交 DTO（`use-sea-export-submit.ts` 的 `transportOrderFields`），改写后脏检查快照即不一致。所以重新生成前先 `isFormDirty()`，仅在「原本干净」时才 `syncFormSnapshot()` 重置基线；若用户本来就有未保存修改，不能重置基线，否则会吞掉真实的未保存内容提示。
- **不要额外弹错误提示**：请求失败时全局拦截器已展示后端 ABP 报错（如「海运出口不存在」「对应的业务信息不存在」），页面再 `message.error` 会双弹且信息更模糊。
- 新建态不显示该按钮：单据尚未落库，没有可重新取号的对象。
- 重新生成是立即生效的服务端操作，不随表单「保存」提交；点击后即使不保存，编号也已经变更。
