# 开发指南索引

本目录存放跨页面、跨模块的**开发指南**（非单页业务活文档）。页面级业务说明见 [`../modules/`](../modules/)。

> **约定：** 所有文档写在 `apps/web-antd/doc/` 下（`modules/<模块>/` 或本目录 `guides/`），**不要**写到 `src/views/**` 等代码文件夹。

| 指南 | 说明 | 最近更新 |
| :-- | :-- | :-- |
| [报表页面实现与经验培训](./report-page-implementation.md) | 配置驱动架构、数据流、扩展步骤、Handsontable/keepAlive 性能与易用性踩坑 | 2026-09-12 |
| [biz-select 业务选择器](./biz-select.md) | 表单字典/主数据下拉组件一览、扩展参数、缓存与搜索竞态 | 2026-09-12 |
| [品牌素材与字体](./brand-assets.md) | 各品牌 Logo/favicon 文件约定与字体 OSS 加载 | 2026-09-12 |
| [国际化 locales 扩展](./locales.md) | web-antd locales 目录职责 | 2026-09-12 |
| [useVbenModal 弹窗宽度约定](./vben-modal-width.md) | 宽度只用 Tailwind `class`；子组件自定义 class 勿盖掉父层宽度 | 2026-09-11 |
| [列表页 keepAlive 与刷新约定](./list-page-keepalive-refresh.md) | 业务列表路由缓存开启方式，及增删改/返回列表时的刷新策略 | 2026-05-30 |
| [Matt Pocock Agent Skills 使用指南](./matt-pocock-agent-skills-guide.md) | 已安装的 mattpocock/skills 用途、场景、工作流与调用方式 | 2026-05-25 |
| [枚举在业务页面中的使用指南](./enumeration-usage-in-pages.md) | 枚举管理配置后，业务页如何 `getEnumItems` 等 | 2026-05-18 |
| [多品牌开发与打包命令对照](./brand-dev-build-commands.md) | 品牌 dev/build 命令、API 注入机制、打包避坑及 GitHub Actions IIS 部署 Secrets | 2026-06-16 |
| [测试数据索引](../test-data/TEST_DATA_INDEX.md) | MCP/手工造数记录；含[业务流程与测试数据规划](../test-data/business-flow-and-test-data-plan-2026-06-28.md) | 2026-06-28 |
