import hhyyLogo from '#/assets/img/hhyy/logo.png';
import hhyyLogoText from '#/assets/img/hhyy/logo-text.png';
import hhyyLoginLogo from '#/assets/img/hhyy/logo-login.png';
import hhyyLoginBackVideo from '#/assets/img/hhyy/hhyy-login-back.mp4';
import jiayueLogo from '#/assets/img/jiayue/logo.webp';
import jiayueLogoText from '#/assets/img/jiayue/logo-text.webp';
import jiayueLoginLogo from '#/assets/img/jiayue/logo-login.webp';
import jiayueLoginBackVideo from '#/assets/img/jiayue/login-back.mp4';
import jhtLogo from '#/assets/img/jht/logo.png';
import jhtLogoText from '#/assets/img/jht/logo-text.png';
import jhtLoginLogo from '#/assets/img/jht/logo-login.png';
import jhtLoginBackVideo from '#/assets/img/jht/jht-login-back.mp4';
import { getOssPrivateFileUrlByCandidates } from '#/api/common/oss-private-file';

const appBrand = import.meta.env.VITE_APP_BRAND;

/** 津海通 */
export const isJhtBrand = appBrand === 'jht';

/** 浩瀚远洋 */
export const isHhyyBrand = appBrand === 'hhyy';

/** 佳越软件（pnpm dev 默认，Vben 中性 Logo） */
export const isJiayueBrand = appBrand === 'jiayue';

function pickBrandAsset<T>(jht: T, hhyy: T, jiayue: T, fallback: T): T {
  if (isJhtBrand) return jht;
  if (isHhyyBrand) return hhyy;
  if (isJiayueBrand) return jiayue;
  return fallback;
}

/** 侧栏 / 偏好设置等使用的方形 Logo */
export const brandLogo = pickBrandAsset(
  jhtLogo,
  hhyyLogo,
  jiayueLogo,
  jiayueLogo,
);

/** 首屏与路由 Loading 使用的横版文字 Logo */
export const brandLogoText = pickBrandAsset(
  jhtLogoText,
  hhyyLogoText,
  jiayueLogoText,
  jiayueLogoText,
);

/** 登录页背景视频 */
const localBrandLoginBackVideo = pickBrandAsset(
  jhtLoginBackVideo,
  hhyyLoginBackVideo,
  jiayueLoginBackVideo,
  hhyyLoginBackVideo,
);

/** 登录页背景视频（运行时可切换为 OSS 私有签名链接） */
export let brandLoginBackVideo = localBrandLoginBackVideo;

const brandLoginBackVideoObjectNames = pickBrandAsset(
  ['jht-login-back.mp4', 'assets/img/jht/jht-login-back.mp4'],
  ['hhyy-login-back.mp4', 'assets/img/hhyy/hhyy-login-back.mp4'],
  ['login-back.mp4', 'assets/img/jiayue/login-back.mp4'],
  ['hhyy-login-back.mp4', 'assets/img/hhyy/hhyy-login-back.mp4'],
);

/** 登录页 auth-title-logo 横版 Logo */
export const brandLoginTitleLogo = pickBrandAsset(
  jhtLoginLogo,
  hhyyLoginLogo,
  jiayueLoginLogo,
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
 * 初始化品牌私有素材
 * 目前仅将登录页背景视频切换为 OSS 签名 URL，失败时自动回退本地静态资源
 */
export async function initBrandPrivateAssets() {
  try {
    brandLoginBackVideo = await getOssPrivateFileUrlByCandidates(
      brandLoginBackVideoObjectNames,
    );
  } catch {
    brandLoginBackVideo = localBrandLoginBackVideo;
  }
}
