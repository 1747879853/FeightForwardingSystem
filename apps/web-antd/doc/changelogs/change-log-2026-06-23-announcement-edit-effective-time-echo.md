# 公告编辑生效时间回显修复

## 背景意图

公告编辑抽屉打开后，生效起始/终止时间在表单中为空，但列表与详情接口均返回了 `startTime`、`endTime`。

## 核心逻辑变更

- `announcement/modules/form.vue` 新增 `toDayjs`，编辑回填时将接口 ISO 字符串转为 `dayjs` 对象后再 `setValues`。
- 提交仍走 `toIsoString`，保存逻辑不变。

## 避坑指南

- Ant Design Vue 的 `DatePicker`（含 `showTime`）回显值必须是 `dayjs`，不能直接绑定 API 字符串。
- 项目内 `form-api.setValues` 注释亦明确日期组件需排除深度合并的 `dayjs` 类型。
