# 列表勾选改为仅点击 checkbox/radio 选中

## 背景意图

业务列表此前普遍配置 `checkboxConfig.trigger: 'row'` / `radioConfig.trigger: 'row'`，单击任意单元格都会切换选中态，容易在浏览、复制文案或点击运踪 Tag 等交互时误勾选。期望与常见桌面表格习惯一致：**只有点击勾选框本身才选中**；单击行不选中，双击进编辑等既有行为保持不变。

## 核心逻辑变更

1. 将各业务列表中的 `trigger: 'row'` 统一改为 `trigger: 'default'`（vxe-table 默认：仅点击 checkbox/radio 列控件切换选中）。
2. 覆盖范围：
   - **多选（checkbox）**：海运出口列表、客户列表、费用锁定列表。
   - **单选（radio）**：海运进口列表、费用审核/费用提交相关列表、客户联系人/付款条件子列表、海出/海进费用表与更改单表等。
3. 未改动：双击行进编辑（如海运出口 `cellDblclick` 内仍会 `setCheckboxRow` 再跳转）、选中高亮样式、顶部「选中行 + 工具栏按钮」操作模式。

## 避坑指南

- `trigger: 'default'` 后，若业务仍依赖「点一下行就选中再点工具栏」，需改为先点勾选框，或在对应操作入口里显式 `setCheckboxRow`/`setRadioRow`。
- 行内可点击元素（Tag、链接）本就不应用整行选中；改完后更不必额外 `@click.stop` 仅为防误选（仍可为事件冒泡保留 stop）。
- 备份/实验文件（如 `order-fee-table-行背景色.vue`）未引用则不必同步；docs/playground 示例不属业务系统。
