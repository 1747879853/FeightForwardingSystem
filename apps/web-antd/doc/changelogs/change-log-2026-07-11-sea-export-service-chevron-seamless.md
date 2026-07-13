# 2026-07-11 海运出口服务流水线同 sortId 组视觉咬合修复

## 背景意图

海运出口编辑页顶栏服务项目流水线（Chevron 箭头流）中，多个服务共享同一 `sortId` 时应在视觉上合并成一块。实际排查发现：编辑态分组用的 `sortId` 已正确取自详情 `seaExportServices`（VGM/仓单同为 `sortId 2`），但同一组内相邻节点之间露出三角缝，看不出「同组已合并」，与首组（`收BC + 入货通知`）表现不一致。

根因是 Chevron 的「咬合重叠」机制写在 `chevron-step` 层：重叠量 = 前节点 `margin-left − 后节点 margin-left`。当固定 `item` 宽 96px、`gap:0` 时：

- `--first`（`margin-left:0`）→ 普通节点（`-7px`）：重叠 7px，紧贴；
- 普通（`-7px`）→ 普通（`-7px`）：重叠 0，仅首尾相接，两个箭头凹凸不互补，露出三角缝。

因此只有「全局第一个节点之后」的那一对能咬合；非首组内的相邻节点全部退化为 0 重叠。

## 核心逻辑变更

文件：`apps/web-antd/src/views/sea-export-admin/form.vue`

1. **咬合位移下沉到 `item` 层**：移除 `chevron-step` 的负 `margin-left`（普通 `-12px` / inline `-7px`），改为对 `.service-chevron-flow__item` 施加负 `margin-left`（普通 `-12px` / inline `-7px`），使每一对相邻节点都稳定重叠一个箭头宽，不再依赖「前一个是 `--first`」。
2. **组内无缝、组间区分**：每个 `sortId` 组的组首 `item`（`.service-chevron-flow__group .service-chevron-flow__item:first-child`）`margin-left: 0` 不做位移；组内其余节点咬合，`.group + .group` 保留间距（普通 `10px` / inline `8px`）以区分不同 `sortId` 组。
3. **两端收圆归整条链**：`isServiceChevronFlowFirst/Last` 判定为整条链的全局首/尾节点，仅整条链首端左收圆、尾端右收圆；组边界节点保留箭头形，配合组间间距形成「箭头流向 + 可辨分组」的观感。
4. **层叠简化**：移除仅作用于组内的 `:nth-child(n+2) { z-index: 1 }`，改由 DOM 顺序（后者在上）保证跨组咬合正确。

编辑态分组沿用详情 `seaExportServices` 的 `sortId`（`buildServiceTypeNodes` 的 `resolveSortId` 优先 `savedSortIdMap`），仅新建或改 POL 重新拉取后才用 POL 配置的 `sortId`（`applyServiceTypeStateByPol`）——此行为本次未改动，仅确认无误。

## 避坑指南

- Chevron 咬合是「相对错位」：重叠量取决于相邻节点 `margin-left` 之差，若把负 margin 放在等宽的 `chevron-step` 上，只有紧跟 `--first` 的那一对会重叠，其余相邻节点都会露缝。把咬合位移放到 `item` 层才能稳定持续咬合。
- 组内无缝 vs 组间区分靠「组首 `item` 是否位移 + `.group` 间距」控制；若要整条完全连续无豁口，把组首位移也去掉并将组间 `margin` 归 0 即可（本次按需求保留组间间距以便数出分组）。
- 该组件有 `--inline`（顶栏内联）与普通两套尺寸，箭头缺口分别为 7px / 12px，`item` 咬合位移需与之匹配，改动两处都要同步。
