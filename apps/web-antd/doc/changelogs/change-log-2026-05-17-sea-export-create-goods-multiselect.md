# 变更记录：海运出口新建品名改为多选下拉

## 背景意图

- 海运出口新建页的“品名”此前通过按钮打开弹窗维护，录入链路较长，常用场景下交互成本偏高。
- 业务诉求是直接在主表单内完成“可搜索 + 可多选”的品名选择，减少弹窗切换和二次确认步骤。

## 核心技术决策/逻辑变更

- 修改 `apps/web-antd/src/adapter/component/biz-form/order-goods-button.vue`：
  - 移除“按钮 + 弹窗表格”的维护方式，改为内联 `CodeGoodsSelect`。
  - 启用 `mode="multiple"`，支持品名多选并沿用分页远程搜索能力。
  - 保持外部 `modelValue` 数据结构不变，继续输出 `orderCodeGoodss` 数组，避免影响 `sea-export-admin/form.vue` 的 DTO 组装与提交链路。
  - 对已存在数据做回填兼容：基于 `codeGoodsId` 保留原有行对象，新增选择项按最小 DTO `{ codeGoodsId }` 生成。
- 修改 `apps/web-antd/src/adapter/component/biz-select/code-goods-select.vue`：
  - 新增 `showNameWithHsCode` 配置项（默认关闭），用于按 `品名-海关代码` 生成下拉项与已选标签文案。
  - 在 `apps/web-antd/src/views/sea-export-admin/data.ts` 的“品名”字段开启该配置，满足海运出口新建页展示口径。
- 修改 `apps/web-antd/src/views/sea-export-admin/form.vue`：
  - 为货物类型行增加字段级 class，将“货物类型”与“品名”分离样式控制。
  - “品名”输入区宽度调整为自适应：最小维持当前基线宽度，随已选内容增长逐步扩展，最大不超过父容器可用剩余宽度。

## 避坑指南（Gotchas & Constraints）

- `orderCodeGoodss` 提交给后端的核心字段仅需 `codeGoodsId`，前端交互形态变更时应避免改动该字段结构。
- 多选下拉返回值可能是单值或数组，组件内部需统一归一化，防止清空/单选边界下写入异常结构。
