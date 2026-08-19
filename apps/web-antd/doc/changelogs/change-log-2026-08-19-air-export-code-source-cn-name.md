# 空运出口业务来源改为读 codeSource.cnName

## 背景意图

- 列表业务来源仍为空：列 `field` 还是废弃的 `transportOrder.codeSourceName`，用户列配置持久化后 formatter 可能不生效。
- 费用侧栏摘要同样读 `codeSourceName`。

## 核心逻辑变更

- 列表列 `field` 改为 `transportOrder.codeSource.cnName`，formatter 只读该字段。
- 排序映射增加对应 key，旧 `codeSourceName` 保留以免历史排序失效。
- 费用侧栏 `codeSourceName` 展示改为 `transportOrder.codeSource.cnName`。

## 避坑指南

- 对象化字段优先改 `field` 到真实路径，不要只靠 formatter 叠在旧 `*Name` 上。
