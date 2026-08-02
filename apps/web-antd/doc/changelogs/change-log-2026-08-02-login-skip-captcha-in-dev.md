# 开发模式登录页跳过滑动验证

## 背景意图

- 本地 `dev` 联调时每次登录都要拖动滑动验证，影响效率。
- 生产/预览构建仍需保留前端滑动验证门槛。

## 核心逻辑变更

- `src/views/_core/authentication/login.vue`：以 `import.meta.env.DEV` 判断，开发模式不向 `formSchema` 注入 `SliderCaptcha` 字段及其必填校验；非 DEV（含 `build` / preview）行为不变。
- 登录接口本身不消费 `captcha`，仅前端表单校验受影响。

## 避坑指南

- 用 `pnpm build` / preview 验证生产包时仍会出现滑动验证，属预期。
- 勿用业务环境变量替代 `import.meta.env.DEV`，避免误在线上关闭验证。
