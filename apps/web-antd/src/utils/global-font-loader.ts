import fontThin from '#/assets/fonts/Alibaba_PuHuiTi_2.0_35_Thin_35_Thin.ttf';
import fontLight from '#/assets/fonts/Alibaba_PuHuiTi_2.0_45_Light_45_Light.ttf';
import fontRegular from '#/assets/fonts/Alibaba_PuHuiTi_2.0_55_Regular_55_Regular.ttf';
import fontBold from '#/assets/fonts/Alibaba_PuHuiTi_2.0_55_Regular_85_Bold.ttf';
import fontMedium from '#/assets/fonts/Alibaba_PuHuiTi_2.0_65_Medium_65_Medium.ttf';
import fontSemiBold from '#/assets/fonts/Alibaba_PuHuiTi_2.0_75_SemiBold_75_SemiBold.ttf';

import { getOssPrivateFileUrlByCandidates } from '#/api/common/oss-private-file';

interface FontAssetConfig {
  localUrl: string;
  objectNames: string[];
  weight: number;
}

const FONT_STYLE_ID = 'global-font-face-style';

const fontAssets: FontAssetConfig[] = [
  {
    weight: 100,
    objectNames: [
      'Alibaba_PuHuiTi_2.0_35_Thin_35_Thin.ttf',
      'assets/fonts/Alibaba_PuHuiTi_2.0_35_Thin_35_Thin.ttf',
    ],
    localUrl: fontThin,
  },
  {
    weight: 300,
    objectNames: [
      'Alibaba_PuHuiTi_2.0_45_Light_45_Light.ttf',
      'assets/fonts/Alibaba_PuHuiTi_2.0_45_Light_45_Light.ttf',
    ],
    localUrl: fontLight,
  },
  {
    weight: 400,
    objectNames: [
      'Alibaba_PuHuiTi_2.0_55_Regular_55_Regular.ttf',
      'assets/fonts/Alibaba_PuHuiTi_2.0_55_Regular_55_Regular.ttf',
    ],
    localUrl: fontRegular,
  },
  {
    weight: 500,
    objectNames: [
      'Alibaba_PuHuiTi_2.0_65_Medium_65_Medium.ttf',
      'assets/fonts/Alibaba_PuHuiTi_2.0_65_Medium_65_Medium.ttf',
    ],
    localUrl: fontMedium,
  },
  {
    weight: 600,
    objectNames: [
      'Alibaba_PuHuiTi_2.0_75_SemiBold_75_SemiBold.ttf',
      'assets/fonts/Alibaba_PuHuiTi_2.0_75_SemiBold_75_SemiBold.ttf',
    ],
    localUrl: fontSemiBold,
  },
  {
    weight: 700,
    objectNames: [
      'Alibaba_PuHuiTi_2.0_55_Regular_85_Bold.ttf',
      'assets/fonts/Alibaba_PuHuiTi_2.0_55_Regular_85_Bold.ttf',
    ],
    localUrl: fontBold,
  },
];

let hasInitFonts = false;

async function resolveFontUrl(config: FontAssetConfig) {
  try {
    return await getOssPrivateFileUrlByCandidates(config.objectNames);
  } catch {
    return config.localUrl;
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
