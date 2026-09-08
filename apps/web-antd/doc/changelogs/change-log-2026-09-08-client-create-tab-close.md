# 2026-09-08 客户新建成功后关闭原新建页签

## 背景意图

客户新建与编辑是不同路由、不同 Tab key。保存成功后只 `router.replace` 进编辑页，顶栏仍会留下「客户新建」页签。用户看到的现象是：新建完成后原来的 tab 没有关掉。

## 核心逻辑变更

`src/views/client/base/form.vue` 新增成功后对齐其他页面级表单：

1. 跳转前记下新建页的 `route.fullPath`
2. `await router.replace(/clients/{id}/edit)`
3. `await closeTabByKey(createTabKey)` 关掉残留的新建页签

原先关页签调用被注释掉，且没有捕获 `createTabKey`，所以 replace 后旧 tab 一直留着。

## 避坑指南

- vben tabbar 按 `fullPath` 维护页签，`replace` 只改路由历史，不会删掉原 tab
- 必须先 `await` 导航再关新建页签；否则当前激活页仍是新建页，关的是当前页
- 关页签的 key 必须是跳转前的 `route.fullPath`
- 关页签前先 `syncFormSnapshot()`，避免未保存拦截挡住关闭
