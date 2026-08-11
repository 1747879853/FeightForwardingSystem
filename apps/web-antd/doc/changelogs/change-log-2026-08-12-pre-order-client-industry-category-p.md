# 业务联系单委托单位补齐 industryCategory=p

## 背景意图

`/pre-order/add` 委托单位下拉的 `industryCategory` 为空，与海运出口不一致。通用客户接口在 `industryCategory` 为空时不下发请求，导致无法按「委托单位(p)」过滤，也不走干系人数据权限。

## 核心逻辑变更

1. **`usePreOrderBasicSchema`**：委托单位改为 `createClientSelectSchema({ industryCategory: 'p' })`，与海出 `clientId` 对齐
2. **`bindClientUserLinkage`**：`updateSchema` 时显式保留 `industryCategory: 'p'`，避免只写 `selectedItems`/`onChange` 时冲掉类别
3. **列表筛选 `ClientId`**：同步改为 `industryCategory: 'p'`，与海出列表筛选一致

## 避坑指南

- 委托单位必须传字母码 `p`，不是数值 key；空字符串会导致 `Client/GetPagedListAsync` 不下发
- `updateSchema` 覆盖 `componentProps` 时务必带上 `industryCategory`，不要假设浅合并一定保留初始值
