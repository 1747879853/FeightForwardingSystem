# 船公司 Logo 回显补齐（CarrierSelect + 海运出口编辑页）

## 背景意图

船公司 Logo 已通过后端接口下发，但前端在两类关键交互中存在体验断层：

- 船公司下拉仅在候选项或部分场景显示名称，选中态缺少 Logo；
- 海运出口编辑页虽然 `DetailAsync` 返回了 `carrierLogo`，但 `selectedItems` 回填未携带该字段，导致首屏回显不稳定。

本次目标是统一“船公司名称展示 = Logo + 名称”，并确保编辑页打开即稳定回显。

## 核心逻辑变更

1. **CarrierSelect 下拉与选中态统一显示 Logo**
   - 文件：`src/adapter/component/biz-select/carrier-select.vue`
   - 下拉 `#option` 渲染维持 `logo + 文本`；
   - 选中态 `label` 改为富渲染节点，同步显示 `logo + 文本`；
   - 增加选项行高/文本行高兜底与微调间距，避免图标压缩和光标遮挡。

2. **海运出口编辑页回填拼接 `carrierLogo`**
   - 文件：`src/views/sea-export-admin/form.vue`
   - `toSelectedItems` 增加 `extra` 扩展参数；
   - `carrierId` 回填时把 `detail.carrierLogo` 注入为 `selectedItems[0].logo`，与 `CarrierSelect` 的 `logoUrl` 读取口径对齐。

3. **分页选择器选项类型兼容富标签**
   - 文件：`src/adapter/component/biz-select/use-paged-select.ts`
   - `OptionItem.label` 放宽为可承载富渲染内容，避免仅字符串类型限制阻断选中态图文展示。

## 避坑指南

- **不要把船公司下拉走 `ClientSelect`**：船公司标准下拉组件是 `CarrierSelect`，数据源与字段口径均不同。
- **回填优先走详情接口返回的 `carrierLogo`**：编辑页首屏显示依赖 `selectedItems`，仅传 `id + cnName` 会导致 Logo 需要二次请求后才出现。
- **图标尺寸与行高需成套调整**：仅改 `h-5 w-5` 不能解决挤压问题，需同步控制选项容器最小高度与输入区内边距。
