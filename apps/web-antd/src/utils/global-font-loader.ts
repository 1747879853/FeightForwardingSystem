import { getOssPrivateFileUrlByCandidates } from '#/api/common/oss-private-file';
import { isJhtBrand } from '#/utils/brand-assets';

interface FontAssetConfig {
  fileName: string;
  objectNames: string[];
  weight: number;
}

const FONT_STYLE_ID = 'global-font-face-style';
const FIXED_FONT_OSS_BASE_URL = 'https://oss.jiayuebetter.com';

const fontAssets: FontAssetConfig[] = [
  {
    fileName: 'Alibaba_PuHuiTi_2.0_35_Thin_35_Thin.ttf',
    weight: 100,
    objectNames: [
      'Alibaba_PuHuiTi_2.0_35_Thin_35_Thin.ttf',
      'assets/fonts/Alibaba_PuHuiTi_2.0_35_Thin_35_Thin.ttf',
    ],
  },
  {
    fileName: 'Alibaba_PuHuiTi_2.0_45_Light_45_Light.ttf',
    weight: 300,
    objectNames: [
      'Alibaba_PuHuiTi_2.0_45_Light_45_Light.ttf',
      'assets/fonts/Alibaba_PuHuiTi_2.0_45_Light_45_Light.ttf',
    ],
  },
  {
    fileName: 'Alibaba_PuHuiTi_2.0_55_Regular_55_Regular.ttf',
    weight: 400,
    objectNames: [
      'Alibaba_PuHuiTi_2.0_55_Regular_55_Regular.ttf',
      'assets/fonts/Alibaba_PuHuiTi_2.0_55_Regular_55_Regular.ttf',
    ],
  },
  {
    fileName: 'Alibaba_PuHuiTi_2.0_65_Medium_65_Medium.ttf',
    weight: 500,
    objectNames: [
      'Alibaba_PuHuiTi_2.0_65_Medium_65_Medium.ttf',
      'assets/fonts/Alibaba_PuHuiTi_2.0_65_Medium_65_Medium.ttf',
    ],
  },
  {
    fileName: 'Alibaba_PuHuiTi_2.0_75_SemiBold_75_SemiBold.ttf',
    weight: 600,
    objectNames: [
      'Alibaba_PuHuiTi_2.0_75_SemiBold_75_SemiBold.ttf',
      'assets/fonts/Alibaba_PuHuiTi_2.0_75_SemiBold_75_SemiBold.ttf',
    ],
  },
  {
    fileName: 'Alibaba_PuHuiTi_2.0_55_Regular_85_Bold.ttf',
    weight: 700,
    objectNames: [
      'Alibaba_PuHuiTi_2.0_55_Regular_85_Bold.ttf',
      'assets/fonts/Alibaba_PuHuiTi_2.0_55_Regular_85_Bold.ttf',
    ],
  },
];

let hasInitFonts = false;

async function resolveFontUrl(config: FontAssetConfig) {
  if (!isJhtBrand) {
    return `${FIXED_FONT_OSS_BASE_URL}/${config.fileName}`;
  }

  try {
    return await getOssPrivateFileUrlByCandidates(config.objectNames);
  } catch {
    return `${FIXED_FONT_OSS_BASE_URL}/${config.fileName}`;
  }
}

function buildFontFaceCss(url: string, weight: number) {
  return `@font-face {
  font-family: 'Alibaba PuHuiTi';
  font-style: normal;
  font-weight: ${weight};
  src: url('${url}') format('truetype');
  font-display: swap;
}`;
}

export async function initGlobalFonts() {
  if (hasInitFonts) {
    return;
  }

  const existsStyleElement = document.getElementById(FONT_STYLE_ID);
  if (existsStyleElement) {
    hasInitFonts = true;
    return;
  }

  const fontUrls = await Promise.all(
    fontAssets.map(async (config) => {
      const resolvedUrl = await resolveFontUrl(config);
      return buildFontFaceCss(resolvedUrl, config.weight);
    }),
  );

  const styleElement = document.createElement('style');
  styleElement.id = FONT_STYLE_ID;
  styleElement.textContent = fontUrls.join('\n\n');
  document.head.append(styleElement);

  hasInitFonts = true;
}
