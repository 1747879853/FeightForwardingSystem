# 监装分享页按摄像头显示视频入口

日期：2026-09-13

## 背景意图

未绑定摄像头时仍露出「查看监装视频」，点进去 `StartPlayAsync` 才 500，且全屏里只看到「视频连接失败」，看不到后端业务文案。

## 核心逻辑变更

- 公开详情 `cameraNo` 为空：只提示「暂无现场视频」并带问号，悬停说明未绑定摄像头，不调点播。
- 有摄像头才渲染查看按钮；点击后 `StartPlayAsync` 失败展示接口 `error.message`。
- 请求层会把 Axios 错误收成 ABP 响应体，解析时要读 `error.message`，不能只看 `response.data`。

## 避坑指南

- 不要用 `StartPlayAsync` 或 `GetViewerCountAsync` 判断有没有摄像头，详情里的 `cameraNo` 已经够用。
- 通用 Axios「Request failed with status code 500」不要展示给客户。
