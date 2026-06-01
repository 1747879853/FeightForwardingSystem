# 字体文件放置说明

请将阿里巴巴普惠体 2.0 字体文件放在当前目录：

| 文件                                              | CSS `font-weight` |
| ------------------------------------------------- | ----------------- |
| `Alibaba_PuHuiTi_2.0_35_Thin_35_Thin.ttf`         | 100               |
| `Alibaba_PuHuiTi_2.0_45_Light_45_Light.ttf`       | 300               |
| `Alibaba_PuHuiTi_2.0_55_Regular_55_Regular.ttf`   | 400               |
| `Alibaba_PuHuiTi_2.0_65_Medium_65_Medium.ttf`     | 500               |
| `Alibaba_PuHuiTi_2.0_75_SemiBold_75_SemiBold.ttf` | 600               |
| `Alibaba_PuHuiTi_2.0_55_Regular_85_Bold.ttf`      | 700               |

运行时通过 `src/utils/global-font-loader.ts` 调用 OSS 私有签名接口并动态注入 `@font-face`，请求失败时自动回退到本地资源。
