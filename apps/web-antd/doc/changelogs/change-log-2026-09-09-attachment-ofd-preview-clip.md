# OFD 预览去掉裁切与图层错位

## 背景意图

数电发票 OFD 预览时白底比内容窄，右侧发票号码、销售方、税率被裁掉，字跑到灰色背景上。

## 核心逻辑变更

1. 去掉对内部 `svg/img` 的 `max-width: 100%`。OFD 各层是按页宽绝对定位的，单独压图会让底图变窄、文字还停在原坐标。
2. 缩放改为「外层按缩放后宽高裁切 + `transform-origin: top left`」。不再用 `width:100%` 的 flex 容器加 `overflow:hidden` 去裁未缩放的 2100px 页盒。
3. 页的原始宽高写入 `data-ofd-natural-*`，避免 ResizeObserver 二次测量用到已经 scale 过的视觉尺寸。

## 避坑指南

- **不要给 OFD 内部 svg/img 设 `max-width: 100%`**：那是图片预览的写法，会拆开版式层。
- **`transform: scale` 不改变布局盒**：父级若按容器宽度 `overflow:hidden`，会按未缩放的页宽裁左右。外层必须写成缩放后的宽高，原点用 `top left`。
