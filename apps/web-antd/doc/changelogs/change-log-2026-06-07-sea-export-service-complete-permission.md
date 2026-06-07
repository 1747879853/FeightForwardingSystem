# 变更日志：海运出口进行中服务完成权限校验

> 日期：2026-06-07  
> 范围：`form.vue`、`sea-export-admin.ts`

---

## 背景意图

服务流水线「完成」校验 `seServiceTaskUsers` 处理人，「取消完成」校验 `completionUserId` 完成人。无权限用户需明确感知，避免误点后接口报错。

## 核心逻辑变更

### 详情回填扩展

- `SeaExportServiceTaskDto` 新增 `seServiceTaskUsers`，`parseDetailServiceTypes` 映射为节点 `taskUsers`。

### 权限判定

- **完成**：流水线 **处理中** 且任务待处理时，当前用户须在 `seServiceTaskUsers` 中。
- **取消完成**：任务已处理时，当前用户须与 `completionUserId` 一致。
- `taskUsers` / `completionUserId` 为空时保持兼容，不拦截（由后端兜底）。

### 交互

- 待处理节点 Tooltip 展示「处理人」行；已完成节点展示「完成人」。
- 无权限时隐藏对应操作按钮，展示琥珀色提示（完成：「您不是当前处理人…」；取消：「您不是完成人…」）。
- 点击兜底仍触发 `message.warning`，文案含处理人/完成人信息。

## 避坑指南

- 「完成」与「取消完成」权限口径不同，勿混用 `seServiceTaskUsers` 与 `completionUserId`。
