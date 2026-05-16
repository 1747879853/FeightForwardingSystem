# 权限新增键 i18n 补齐

## 背景意图

- 后台权限模块新增了一批权限点，`auth.*` 对应国际化键未同步进入 `zh` 语言包。
- 页面渲染权限文案时出现 `[intlify] Not found ... key in 'zh' locale messages` 告警，影响菜单与权限标签可读性。

## 核心技术决策 / 逻辑变更

- 在 `apps/web-antd/src/locales/langs/zh-CN/auth.json` 补齐新增权限键，包括打印格式、付款结算、付款申请、工作流、工作台、公告、服务配置等分组。
- 同步在 `apps/web-antd/src/locales/langs/en-US/auth.json` 添加同名键，保持双语键集合一致，避免后续跨语言环境出现缺失。
- 保持现有权限键命名规则不变（`Admin_*`），仅新增缺失项，不改动既有键语义。

## 避坑指南（Gotchas & Constraints）

- 新增权限常常由后端枚举先落地，前端需同步检查 `auth.json` 两个语言文件是否同键齐全。
- 若控制台出现 `Not found 'auth.xxx' key`，应优先核对 `auth.json` 键名大小写与下划线分段是否和权限码完全一致。
- 建议后续新增权限时将“权限点 + i18n 键补齐”作为同一改动提交，避免运行期告警和占位文案回退。
