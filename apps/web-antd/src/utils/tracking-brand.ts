import { isSjtdBrand } from './brand-assets';

/**
 * 运踪能力按「打包品牌 × 业务线」分流。
 *
 * - 世纪通达（`sjtd`）的**海运出口**沿用已上线的运踪（订阅 / 查看 / 分享详情）；
 * - 其余场景（含 `sjtd` 的海运进口与空运出口、其他品牌的海运出口）走新服务商运踪。
 *
 * 品牌由构建期环境变量 `VITE_APP_BRAND` 决定，不是运行时公司切换。
 * 详见 `doc/modules/shared/feituo-tracking-brand-split.md`。
 */

/** 海运出口是否走已上线的旧运踪（仅 sjtd） */
export const isLegacyOceanExportTracking = isSjtdBrand;

/** 海运出口是否走新服务商运踪（非 sjtd 品牌） */
export const isVendorOceanExportTracking = !isSjtdBrand;
