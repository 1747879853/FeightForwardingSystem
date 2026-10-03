# 阿里云OSS私有文件签名URL接口文档

**控制器**：`Test`

---

## 获取OSS私有文件签名URL

### `GET /api/services/app/Test/GetOssUrlAsync`

**权限**：无需登录（匿名接口）

**入参**（Query参数）：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `objectName` | `string` | 是 | OSS文件Key（路径），如 `uploads/2026/report.pdf` |

**出参**：`string`（签名临时访问URL，10分钟有效）

**出参示例**：

```
https://your-bucket-name.oss-cn-hangzhou.aliyuncs.com/uploads/2026/report.pdf?OSSAccessKeyId=xxx&Expires=xxx&Signature=xxx
```

**业务规则**：

- 后端通过 `GetObjectMetadata` 从阿里云OSS获取文件实际大小（KB）
- 记录请求人IP和文件大小到 `App_AliossHists` 表
- 单个IP在24小时内累计请求文件大小超过 **1GB（1048576 KB）** 则拒绝请求
- 生成的签名URL有效期为 **10分钟**
- IP获取优先从 `X-Forwarded-For` 请求头取（支持反向代理场景）

---

## 限流说明

| 维度     | 限制              |
| -------- | ----------------- |
| 限流粒度 | 单个IP            |
| 时间窗口 | 滚动24小时        |
| 流量上限 | 1GB（1048576 KB） |

---

## 错误提示

| 错误信息 | 触发条件 |
| --- | --- |
| `objectName不能为空` | 未传入objectName参数 |
| `24小时内请求流量超限(1GB),请稍后再试` | 该IP 24小时内累计请求文件大小超过1GB |

---

## 配置说明

`appsettings.json` 中需配置：

```json
"AliyunOss": {
  "AccessKeyId": "阿里云AccessKeyId",
  "AccessKeySecret": "阿里云AccessKeySecret",
  "Endpoint": "oss-cn-hangzhou.aliyuncs.com",
  "BucketName": "你的bucket名称"
}
```

---

## 数据表

**表名**：`App_AliossHists`

| 字段   | 类型           | 说明           |
| ------ | -------------- | -------------- |
| `Id`   | `bigint`       | 主键自增       |
| `IP`   | `nvarchar(32)` | 请求人IP       |
| `Size` | `bigint`       | 文件大小（KB） |
| `Time` | `datetime`     | 访问时间       |
