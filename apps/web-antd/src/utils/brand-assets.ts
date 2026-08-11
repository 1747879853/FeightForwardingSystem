import hhyyLogo from '#/assets/img/hhyy/logo.png';
import hhyyLogoText from '#/assets/img/hhyy/logo-text.png';
import hhyyLoginLogo from '#/assets/img/hhyy/logo-login.png';
import jiayueLogo from '#/assets/img/jiayue/logo.webp';
import jiayueLogoText from '#/assets/img/jiayue/logo-text.webp';
import jiayueLoginLogo from '#/assets/img/jiayue/logo-login.webp';
import jhtLogo from '#/assets/img/jht/logo.png';
import jhtLogoText from '#/assets/img/jht/logo-text.png';
import jhtLoginLogo from '#/assets/img/jht/logo-login.png';
import longshanLogo from '#/assets/img/longshan/logo.png';
import longshanLogoText from '#/assets/img/longshan/logo-text.png';
import longshanLoginLogo from '#/assets/img/longshan/logo-login.png';
import sjtdLogo from '#/assets/img/sjtd/logo.png';
import sjtdLogoText from '#/assets/img/sjtd/logo-text.png';
import sjtdLoginLogo from '#/assets/img/sjtd/logo-login.png';

const appBrand = import.meta.env.VITE_APP_BRAND;

/** 津海通 */
export const isJhtBrand = appBrand === 'jht';

/** 浩瀚远洋 */
export const isHhyyBrand = appBrand === 'hhyy';

/** 佳越软件（pnpm dev 默认，Vben 中性 Logo） */
export const isJiayueBrand = appBrand === 'jiayue';

/** 世纪通达 */
export const isSjtdBrand = appBrand === 'sjtd';

/** 龙山 */
export const isLongshanBrand = appBrand === 'longshan';

function pickBrandAsset<T>(
  jht: T,
  hhyy: T,
  jiayue: T,
  sjtd: T,
  longshan: T,
  fallback: T,
): T {
  if (isJhtBrand) return jht;
  if (isHhyyBrand) return hhyy;
  if (isJiayueBrand) return jiayue;
  if (isSjtdBrand) return sjtd;
  if (isLongshanBrand) return longshan;
  return fallback;
}

/** 侧栏 / 偏好设置等使用的方形 Logo */
export const brandLogo = pickBrandAsset(
  jhtLogo,
  hhyyLogo,
  jiayueLogo,
  sjtdLogo,
  longshanLogo,
  jiayueLogo,
);

/** 首屏与路由 Loading 使用的横版文字 Logo */
export const brandLogoText = pickBrandAsset(
  jhtLogoText,
  hhyyLogoText,
  jiayueLogoText,
  sjtdLogoText,
  longshanLogoText,
  jiayueLogoText,
);

/** 登录页背景视频（jiayue/demo 与 jht 共用 jht-login-back.mp4；原 login-back.mp4 已从 OSS 下线） */
const defaultBrandLoginBackVideoOssUrl = pickBrandAsset(
  'https://oss.jiayuebetter.com/jht-login-back.mp4',
  'https://oss.jiayuebetter.com/hhyy-login-back.mp4',
  'https://oss.jiayuebetter.com/jht-login-back.mp4',
  'https://oss.jiayuebetter.com/hhyy-login-back.mp4',
  'https://oss.jiayuebetter.com/hhyy-login-back.mp4',
  'https://oss.jiayuebetter.com/hhyy-login-back.mp4',
);

/** 登录页背景视频（固定 OSS 地址） */
export let brandLoginBackVideo = defaultBrandLoginBackVideoOssUrl;

/** 登录页 auth-title-logo 横版 Logo */
export const brandLoginTitleLogo = pickBrandAsset(
  jhtLoginLogo,
  hhyyLoginLogo,
  jiayueLoginLogo,
  sjtdLoginLogo,
  longshanLoginLogo,
  undefined,
);

/** 登录页 auth-title-logo 样式（品牌专用宽度） */
export const brandLoginTitleLogoClass = isJhtBrand
  ? 'auth-title-logo--brand-jht'
  : isJiayueBrand
    ? 'auth-title-logo--brand-jiayue'
    : undefined;

/**
 * Loading 进度条底轨（logo-bg）品牌修饰类。
 * 彩色/深蓝 Logo 不宜沿用默认 brightness(0.75)，否则会明显偏深。
 */
export const brandLoadingMaskClass = isJhtBrand ? 'loader-fill--brand-jht' : '';

/**
 * 初始化品牌素材
 * 登录页背景视频统一使用固定 OSS 地址
 */
export async function initBrandPrivateAssets() {
  brandLoginBackVideo = defaultBrandLoginBackVideoOssUrl;
}
