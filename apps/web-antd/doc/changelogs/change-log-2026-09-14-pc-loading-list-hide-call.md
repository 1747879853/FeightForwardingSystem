# PC 监装列表派单人不显示拨打

## 背景意图

PC 监装列表把派单人做成可点击链接，弹出确认框后走 `tel:` 拨打。桌面端无法打电话，这个入口没有实际作用。

## 核心逻辑变更

- `loading-order-admin/list.vue` 去掉派单人点击、手机号校验与拨打弹窗。
- 派单人列改回普通文本，空值显示 `-`；列 `field` 仍是 `submitUserName`。
- 删除仅给拨打用的 i18n：`callPhone`、`submitUserPhoneEmpty`。
- 小程序监装列表仍保留拨打，接口字段 `submitUserPhone` 未删。

## 避坑指南

- 不要在 PC 列表再挂 `tel:` 或拨打按钮。需要联系人时只展示姓名即可。
- 列设置按 `submitUserName` 持久化，不要改成 formatter 取值或换 field。
