# 字体资源说明

阿里巴巴普惠体通过 `src/utils/global-font-loader.ts` 在运行时加载：

- `jht`：优先使用 OSS 私有签名 URL，失败时回退固定 OSS 地址。
- `hhyy` / `jiayue`：直接使用固定 OSS 地址。

本目录不再存放本地字体文件，避免被前端构建打包。
