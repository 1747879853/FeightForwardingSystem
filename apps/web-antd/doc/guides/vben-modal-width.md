# useVbenModal 弹窗宽度约定

## 结论

Vben Modal **没有** Ant Design 式的 `width` prop。实际宽度来自 `DialogContent` 上的 Tailwind class；默认是 `w-[520px]`。业务侧必须用 `class` 覆盖，例如 `w-[1200px]`。

## 正确写法

```vue
<!-- 抽离弹窗组件内部 -->
<Modal :title="pageTitle" class="billing-period-modal w-[1200px]">
```

```ts
// 列表页 connectedComponent 入口（官方推荐）
const [Modal, modalApi] = useVbenModal({
  connectedComponent: AddModal,
  class: 'w-[1200px]',
});
```

## 错误写法

```vue
<!-- ❌ ModalProps 无 width，会被忽略，仍是 520px -->
<Modal title="…" width="1200px">
```

## 典型踩坑：自定义 class 盖掉宽度

`usePriorityValues` 下，**模板上的 `class` 优先于** `useVbenModal({ class })` / 父层 `connectedComponent` 的 options。

若父层已设 `class: 'w-[1200px]'`，子组件却写：

```vue
<Modal class="billing-period-modal">
```

则父层宽度被**整段替换**掉，弹窗回到默认 `520px`。

修复：子组件 class **合并**宽度类：

```vue
<Modal class="billing-period-modal w-[1200px]">
```

## 相关默认行为

- `draggable: true`
- `closeOnClickModal: false`（需点遮罩关闭时再显式打开）

## 参考实现

- `views/client/payment-terms/list.vue`（父层 `class: 'w-[1200px]'`）
- `views/client/payment-terms/add-modal.vue`（子层 `class="… w-[1200px]"`）
- Cursor 规则：`.cursor/rules/vben-modal-conventions.mdc`
