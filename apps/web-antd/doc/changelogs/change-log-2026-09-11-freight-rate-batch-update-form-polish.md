# 运价批量更改弹窗视觉分区优化

## 背景意图

批量更改（`sync-update-form.vue`）原先黄底提示 + 扁平分区，与已优化的单条新增/编辑、批量新增弹窗风格不一致。

## 核心逻辑变更

- 主色摘要顶栏（已选条数 chip）替代黄底提示。
- 基础信息 / 日期时间 / 箱型费率 / 附加费改为分区卡片：渐变标题栏、图标色区分块、chip 日期模式切换。
- 基础信息区内 Select / DatePicker / InputNumber / Input 统一 `width: 100%`，与四列网格对齐；备注跨整行。
- 附加费明细表对齐新增弹窗：序号 / 费用基础 / 箱型价分区、chip 表头、条件态高亮与空态引导。
- 滚动：**仅 Modal 内容区一层纵向滚动**；去掉内层 `max-height`/`overflow` 与 `content-class="overflow-hidden"`，避免附加费等末段裁切滚不全。
- 费率表圆角与行悬停；底栏按钮微反馈。业务逻辑未改。

## 避坑指南

- 列表「批量操作 → 批量更改」挂载 `sync-update-form.vue`（原 `form.vue` 已重命名）。
- 海运费输入仍靠 `id="ctn_${id}"` DOM 读取，勿去掉对应 `id`。
- **禁止**在弹窗内容上再套 `max-height: *vh` + `overflow: auto`，或 `content-class="overflow-hidden"` + 内层视口限高——必然导致最后一块内容显示不全。见规则 `modal-single-scroll`。
