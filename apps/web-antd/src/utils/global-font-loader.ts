interface FontAssetConfig {
  fileName: string;
  weight: number;
}

const FONT_STYLE_ID = 'global-font-face-style';
const FIXED_FONT_OSS_BASE_URL = 'https://oss.jiayuebetter.com';

const fontAssets: FontAssetConfig[] = [
  {
    fileName: 'Alibaba_PuHuiTi_2.0_35_Thin_35_Thin.ttf',
    weight: 100,
  },
  {
    fileName: 'Alibaba_PuHuiTi_2.0_45_Light_45_Light.ttf',
    weight: 300,
  },
  {
    fileName: 'Alibaba_PuHuiTi_2.0_55_Regular_55_Regular.ttf',
    weight: 400,
  },
  {
    fileName: 'Alibaba_PuHuiTi_2.0_65_Medium_65_Medium.ttf',
    weight: 500,
  },
  {
    fileName: 'Alibaba_PuHuiTi_2.0_75_SemiBold_75_SemiBold.ttf',
    weight: 600,
  },
  {
    fileName: 'Alibaba_PuHuiTi_2.0_55_Regular_85_Bold.ttf',
    weight: 700,
  },
];

let hasInitFonts = false;

function resolveFontUrl(config: FontAssetConfig) {
  return `${FIXED_FONT_OSS_BASE_URL}/${config.fileName}`;
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

  const fontUrls = fontAssets.map((config) =>
    buildFontFaceCss(resolveFontUrl(config), config.weight),
  );

  const styleElement = document.createElement('style');
  styleElement.id = FONT_STYLE_ID;
  styleElement.textContent = fontUrls.join('\n\n');
  document.head.append(styleElement);

  hasInitFonts = true;
}
