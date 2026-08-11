# 付费申请附件分组支持拖拽上传

## 背景意图

付款申请新增/编辑页右侧附件区仅支持点击右上角上传按钮选文件，操作路径偏长。需要在各附件类型卡片上支持拖拽投放，并保持原有点击上传与分组绑定逻辑不变。

## 核心逻辑变更

- 组件：`src/views/fee-management/payment-application/attachment-groups.vue`
- 每个附件类型卡片在可上传态监听 `dragenter` / `dragover` / `dragleave` / `drop`：
  - 拖入文件时高亮虚线边框（`attachment-group--drag-over`）
  - 放下后按文件列表串行调用既有 `handleUpload`，写入对应 `attachmentDtlTypeId` 分组
- 空态文案由「暂无文件」改为「点击或拖拽上传」（可上传时）
- `handleUpload` 改为经 `getGroupItems` 读取最新 `modelValue`，避免多文件串行/并行时用过期 `group.items` 互相覆盖

上传成功后的落库路径不变：可编辑态仅本地维护 `attachmentGroup`，只读追加态仍走 `AddAttachments`。

## 避坑指南

- `dragleave` 需用 `relatedTarget` 判断是否仍在卡片内，否则移入子节点会误清高亮。
- 拖多文件必须串行 `await handleUpload`，且追加列表时读最新 model，不可闭包捕获初始 `group.items`。
- 组件被新增页与编辑页共用，改此处两页同步生效。
