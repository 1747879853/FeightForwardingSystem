# 公告登录弹窗已读改为会话级存储

## 背景意图

原先用 `localStorage` 记录「我已阅读」，已读后即使关闭浏览器再次登录也不会再弹。产品希望改为会话级：关闭浏览器或新开标签页会话后，有效公告应再次弹出。

## 核心逻辑变更

- `announcement-read-storage.ts`：已读 Map 从 `localStorage` 改为 `sessionStorage`。
- 移除「稍后提醒」及 `announcement:skip-session` 相关逻辑。
- 登录弹窗 footer 仅保留「我已阅读」按钮。

## 行为说明

| 场景                                          | 是否再弹       |
| :-------------------------------------------- | :------------- |
| 同标签页内点已读后刷新（F5）                  | 否（同一会话） |
| 关闭浏览器后重新打开                          | 是             |
| 管理员修改公告（`lastModificationTime` 更新） | 是             |

## 避坑指南

- `sessionStorage` 按标签页隔离：新标签页会再次弹出未读公告。
- 历史 `localStorage` 中的 `announcement:read:*` 不再读取，可忽略。
