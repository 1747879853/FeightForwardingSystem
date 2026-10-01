# 即时运价：箱型白名单、下拉跳动与查询区样式

## 变更说明

1. 箱型下拉仅展示白名单：`20GP`、`40GP`、`40HC`、`45HC`、`20NOR`、`40NOR`、`20RF`、`40RF`、`40RH`、`20OT`、`40OT`（主数据 `40HQ`/`45HQ` 按 HC 别名放行）。
2. 箱型改为静态多选（本地过滤），避免分页 `CtnSelect` 选中后选项列表回顶。
3. 去掉查询区顶部色条，整块查询区域改为很浅的横向主题色渐变背景。

## 涉及文件

- `apps/web-antd/src/views/spot-query/supported-ctn-names.ts`
- `apps/web-antd/src/views/spot-query/supported-ctn-names.test.ts`
- `apps/web-antd/src/views/spot-query/list.vue`
