# 拒接弹窗 textarea 不再撑出右边

## 背景意图

拒接工单弹窗里输入框右边超出弹窗。微信原生 `textarea` 的 `width: 100%` 不含 padding。

## 核心逻辑变更

- 内边距和灰底改到外层 `view`，`textarea` 只铺满容器、自己不再加 padding。

## 避坑指南

- 小程序 `textarea` 不要写 `width: 100%` 再加 padding，用包裹层做间距。
