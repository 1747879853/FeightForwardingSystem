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

样式在 `src/global-font.css` 中通过 `@font-face` 注册字体族 `Alibaba PuHuiTi`；页面使用 `font-weight` 即可自动匹配对应文件。
