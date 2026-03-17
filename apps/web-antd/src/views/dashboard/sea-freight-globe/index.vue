<script setup lang="ts">
import type { CSSProperties } from 'vue';

import Globe from 'globe.gl';
import { VbenCountToAnimator, VbenIcon } from '@vben-core/shadcn-ui';
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import { Select } from 'ant-design-vue';
// @ts-expect-error Vetur may not resolve static asset modules.
import globeTextureDay from './earth-blue-marble.jpg';
// @ts-expect-error Vetur may not resolve static asset modules.
import globeTextureNight from './earth-night.jpg';
// @ts-expect-error Vetur may not resolve static asset modules.
import globeBumpTexture from './earth-topology.png';
// @ts-expect-error Vetur may not resolve static asset modules.
import globeNightSkyTexture from './night-sky.png';

interface PortData {
  code: string;
  country: string;
  name: string;
  lat: number;
  lng: number;
  majorTradeLane: string;
  monthlyTeu: number;
  onTimeRate: number;
  topCargo: string;
  weeklyBookings: number;
  services: string[];
}

interface RouteArc {
  active: boolean;
  altitude: number;
  dashTime: number;
  endLat: number;
  endLng: number;
  endPort: string;
  startLat: number;
  startLng: number;
  startPort: string;
  teu: number;
}

const GLOBE_TEXTURE_DAY_URL = globeTextureDay;
const GLOBE_TEXTURE_NIGHT_URL = globeTextureNight;
const GLOBE_BUMP_URL = globeBumpTexture;
const GLOBE_BACKGROUND_NIGHT_URL = globeNightSkyTexture;

const ports: PortData[] = [
  {
    code: 'QINGDAO',
    country: '中国',
    name: '青岛港',
    lat: 36.0671,
    lng: 120.3826,
    majorTradeLane: '东北亚-欧洲主干线',
    monthlyTeu: 9200,
    onTimeRate: 96.3,
    topCargo: '机电设备 / 家电 / 化工品',
    weeklyBookings: 286,
    services: [
      '整箱出口（FCL）',
      '拼箱出口（LCL）',
      '冷藏柜订舱',
      '目的港代理清关协同',
    ],
  },
  {
    code: 'SHANGHAI',
    country: '中国',
    name: '上海港',
    lat: 31.2304,
    lng: 121.4737,
    majorTradeLane: '远东-全球主干线',
    monthlyTeu: 11800,
    onTimeRate: 97.1,
    topCargo: '汽车配件 / 电子产品 / 医疗器械',
    weeklyBookings: 342,
    services: ['全球主干线订舱', '特种柜运输', '多式联运', '港后铁路联动'],
  },
  {
    code: 'NINGBO',
    country: '中国',
    name: '宁波舟山港',
    lat: 29.8683,
    lng: 121.544,
    majorTradeLane: '华东-中东 / 欧洲',
    monthlyTeu: 8600,
    onTimeRate: 95.8,
    topCargo: '日用品 / 家具 / 纺织品',
    weeklyBookings: 251,
    services: ['跨境电商订舱', '散改集', '港区堆场服务', '拖车与仓储联动'],
  },
  {
    code: 'SHENZHEN',
    country: '中国',
    name: '深圳港',
    lat: 22.5431,
    lng: 114.0579,
    majorTradeLane: '华南-美西快航',
    monthlyTeu: 10150,
    onTimeRate: 95.5,
    topCargo: '消费电子 / LED / 快消品',
    weeklyBookings: 298,
    services: ['盐田 / 蛇口双港联动', '美西快线', '危险品申报', '目的港卡派'],
  },
  {
    code: 'SIN',
    country: '新加坡',
    name: '新加坡港',
    lat: 1.2644,
    lng: 103.8405,
    majorTradeLane: '东南亚中转枢纽',
    monthlyTeu: 7800,
    onTimeRate: 97.6,
    topCargo: '中转箱 / 危险品 / 零担拼箱',
    weeklyBookings: 212,
    services: ['中转分拨', '危险品仓储衔接', '海运到门派送', '驳船转运'],
  },
  {
    code: 'RTM',
    country: '荷兰',
    name: '鹿特丹港',
    lat: 51.9244,
    lng: 4.4777,
    majorTradeLane: '欧洲门户航线',
    monthlyTeu: 8400,
    onTimeRate: 94.8,
    topCargo: '工业设备 / 新能源组件 / 化工品',
    weeklyBookings: 204,
    services: [
      '欧洲干线进口',
      '清关与拖车派送',
      '集装箱堆场服务',
      '内河驳船联运',
    ],
  },
  {
    code: 'HAM',
    country: '德国',
    name: '汉堡港',
    lat: 53.5511,
    lng: 9.9937,
    majorTradeLane: '北欧 / 中东欧分拨',
    monthlyTeu: 6100,
    onTimeRate: 93.9,
    topCargo: '机械设备 / 木材 / 零配件',
    weeklyBookings: 162,
    services: ['中东欧卡派', '铁路转运', '港区拆箱', '保税仓服务'],
  },
  {
    code: 'LAX',
    country: '美国',
    name: '洛杉矶港',
    lat: 33.7292,
    lng: -118.2641,
    majorTradeLane: '美西快线',
    monthlyTeu: 8900,
    onTimeRate: 92.7,
    topCargo: '家具 / 家电 / 电商货',
    weeklyBookings: 227,
    services: ['美西快线', '电商货优先提柜', '港后铁路联运', '海外仓分拨'],
  },
  {
    code: 'NYC',
    country: '美国',
    name: '纽约-新泽西港',
    lat: 40.684,
    lng: -74.0062,
    majorTradeLane: '美东干线',
    monthlyTeu: 6550,
    onTimeRate: 91.8,
    topCargo: '家具 / 建材 / 服装',
    weeklyBookings: 171,
    services: ['美东直航', '清关派送', '铁路内陆点延伸', '仓配一体'],
  },
  {
    code: 'DXB',
    country: '阿联酋',
    name: '杰贝阿里港',
    lat: 25.0132,
    lng: 55.0603,
    majorTradeLane: '中东 / 红海航线',
    monthlyTeu: 7050,
    onTimeRate: 95.2,
    topCargo: '建材 / 项目货 / 快消品',
    weeklyBookings: 196,
    services: ['中东航线', '项目货运输', '港区保税服务', '海湾区域配送'],
  },
  {
    code: 'DURBAN',
    country: '南非',
    name: '德班港',
    lat: -29.8717,
    lng: 31.0456,
    majorTradeLane: '非洲东南岸航线',
    monthlyTeu: 4320,
    onTimeRate: 90.6,
    topCargo: '汽车零件 / 农资 / 建材',
    weeklyBookings: 108,
    services: ['东南非整箱', '目的港清关', '保税转运', '项目货拼载'],
  },
  {
    code: 'SYD',
    country: '澳大利亚',
    name: '悉尼港',
    lat: -33.8688,
    lng: 151.2093,
    majorTradeLane: '澳新精品航线',
    monthlyTeu: 5230,
    onTimeRate: 94.3,
    topCargo: '冷链食品 / 家居用品 / 建材',
    weeklyBookings: 144,
    services: ['澳新航线', '冷链运输', '目的港仓储配送', '跨境零售派送'],
  },
  {
    code: 'SANTOS',
    country: '巴西',
    name: '桑托斯港',
    lat: -23.9608,
    lng: -46.3289,
    majorTradeLane: '南美东海岸航线',
    monthlyTeu: 4860,
    onTimeRate: 89.8,
    topCargo: '农产品 / 机械设备 / 日用品',
    weeklyBookings: 118,
    services: ['南美航线', '整柜与拼箱并行', '农产品订舱', '保税仓延伸'],
  },
  {
    code: 'COLON',
    country: '巴拿马',
    name: '科隆自由贸易港',
    lat: 9.3592,
    lng: -79.9009,
    majorTradeLane: '中南美中转航线',
    monthlyTeu: 3980,
    onTimeRate: 91.1,
    topCargo: '消费品 / 家居 / 小家电',
    weeklyBookings: 97,
    services: ['中美洲中转', '拼箱拆分拨', '免税仓配', '加勒比转运'],
  },
];

const originPortCodes = new Set(['QINGDAO', 'SHANGHAI', 'NINGBO', 'SHENZHEN']);
const fallbackOriginOptions = ports
  .filter((port) => originPortCodes.has(port.code))
  .map((port) => ({
    label: `${port.name}（${port.code}）`,
    value: port.code,
  }));

const selectedOrigin = ref('QINGDAO');
const selectedPort = ref<PortData | null>(null);
const hoveredPort = ref<PortData | null>(null);
const globeContainerRef = ref<HTMLDivElement | null>(null);
const globeWrapperRef = ref<HTMLDivElement | null>(null);
const hoverPosition = ref({ x: 0, y: 0 });
const originOptions = ref(fallbackOriginOptions);
const isDark = ref(false);

let globe: InstanceType<typeof Globe> | null = null;
let resizeObserver: ResizeObserver | null = null;
let autoRotateTimer: number | null = null;
let controlsCleanup: (() => void) | null = null;
let themeObserver: MutationObserver | null = null;
let themeToggleObserver: MutationObserver | null = null;
let themeSyncTimer: number | null = null;
let isMouseOverGlobe = false;

const fallbackOriginPort = ports[0]!;

const originPort = computed<PortData>(
  () =>
    ports.find((port) => port.code === selectedOrigin.value) ??
    fallbackOriginPort,
);

const destinationPorts = computed(() =>
  ports.filter((port) => port.code !== originPort.value.code),
);

const activePanelPort = computed<PortData>(
  () => selectedPort.value ?? originPort.value,
);
const originSelectPopupClass = computed(() =>
  isDark.value
    ? 'sea-globe-origin-dropdown'
    : 'sea-globe-origin-dropdown sea-globe-origin-dropdown--light',
);

const weeklyBooking = computed(() =>
  destinationPorts.value.reduce(
    (total, port) => total + port.weeklyBookings,
    0,
  ),
);

const premiumPortCount = computed(
  () => destinationPorts.value.filter((port) => port.monthlyTeu >= 7000).length,
);

const shipmentProgressOverview = computed(() => [
  { label: '起运港待开航', value: 28, unit: '票' },
  { label: '运输中', value: 137, unit: '票' },
  { label: '目的港待提箱', value: 46, unit: '票' },
  { label: '目的港待还箱', value: 19, unit: '票' },
]);

const routeData = computed<RouteArc[]>(() =>
  destinationPorts.value.map((port, index) => ({
    active:
      hoveredPort.value?.code === port.code ||
      selectedPort.value?.code === port.code,
    altitude: Math.min(0.38, 0.12 + port.monthlyTeu / 50_000),
    dashTime: 2200 + index * 140,
    endLat: port.lat,
    endLng: port.lng,
    endPort: port.code,
    startLat: originPort.value.lat,
    startLng: originPort.value.lng,
    startPort: originPort.value.code,
    teu: port.monthlyTeu,
  })),
);

const hoverTooltipStyle = computed<CSSProperties>(() => ({
  left: `${hoverPosition.value.x + 18}px`,
  top: `${hoverPosition.value.y + 18}px`,
}));

function isActivePort(code: string) {
  return hoveredPort.value?.code === code || selectedPort.value?.code === code;
}

function getPortColor(port: PortData) {
  if (port.code === originPort.value.code) return '#fb923c';
  if (isActivePort(port.code)) return isDark.value ? '#f8fafc' : '#0f172a';
  return isDark.value ? '#22d3ee' : '#2f6f97';
}

function getPortAltitude(port: PortData) {
  if (port.code === originPort.value.code) return 0.2;
  return Math.min(0.16, 0.06 + port.monthlyTeu / 90_000);
}

function getPortRadius(port: PortData) {
  if (port.code === originPort.value.code) return 0.5;
  if (isActivePort(port.code)) return 0.42;
  return 0.34;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function getRouteByDestinationCode(code: string) {
  return routeData.value.find((route) => route.endPort === code);
}

function detectDarkMode() {
  if (typeof window === 'undefined') {
    console.debug(
      '[sea-globe][theme] detectDarkMode -> false (window undefined)',
    );
    return false;
  }

  if (document.documentElement.classList.contains('dark')) {
    console.debug('[sea-globe][theme] detectDarkMode -> true (html.dark)');
    return true;
  }
  if (document.body?.classList.contains('dark')) {
    console.debug('[sea-globe][theme] detectDarkMode -> true (body.dark)');
    return true;
  }

  const themeToggleButton = document.querySelector<HTMLButtonElement>(
    'button.theme-toggle',
  );
  const ariaLabel = themeToggleButton?.getAttribute('aria-label');
  if (ariaLabel === 'light') {
    console.debug(
      '[sea-globe][theme] detectDarkMode -> true (theme-toggle aria-label=light)',
    );
    return true;
  }
  if (ariaLabel === 'dark') {
    console.debug(
      '[sea-globe][theme] detectDarkMode -> false (theme-toggle aria-label=dark)',
    );
    return false;
  }
}

function syncThemeState() {
  isDark.value = detectDarkMode();
}

function scheduleThemeSync(delay = 0) {
  if (themeSyncTimer !== null) {
    window.clearTimeout(themeSyncTimer);
  }
  themeSyncTimer = window.setTimeout(() => {
    syncThemeState();
    themeSyncTimer = null;
  }, delay);
}

function observeThemeToggleButton() {
  themeToggleObserver?.disconnect();
  const themeToggleButton = document.querySelector<HTMLButtonElement>(
    'button.theme-toggle',
  );
  if (!themeToggleButton) return;

  themeToggleObserver = new MutationObserver(() => {
    syncThemeState();
  });
  themeToggleObserver.observe(themeToggleButton, {
    attributes: true,
    attributeFilter: ['class', 'aria-label'],
  });
}

async function loadOriginOptionsFromBasePorts() {
  originOptions.value = [
    { label: '青岛港（QINGDAO）', value: 'QINGDAO' },
    { label: '上海港（SHANGHAI）', value: 'SHANGHAI' },
    { label: '宁波舟山港（NINGBO）', value: 'NINGBO' },
    { label: '深圳港（SHENZHEN）', value: 'SHENZHEN' },
  ];

  if (
    !originOptions.value.some((option) => option.value === selectedOrigin.value)
  ) {
    selectedOrigin.value =
      originOptions.value[0]?.value ?? fallbackOriginPort.code;
  }
}

function handleOriginChange(
  value: string | number | { key?: string | number; value?: string | number },
) {
  const nextValue = (() => {
    if (typeof value === 'string' || typeof value === 'number') return value;
    if (value && typeof value === 'object') {
      if (typeof value.value === 'string' || typeof value.value === 'number')
        return value.value;
      if (typeof value.key === 'string' || typeof value.key === 'number')
        return value.key;
    }
    return fallbackOriginPort.code;
  })();

  const normalizedValue = String(nextValue);
  if (!ports.some((port) => port.code === normalizedValue)) {
    selectedOrigin.value = fallbackOriginPort.code;
    return;
  }

  // Even when the selected origin remains the same, the Select change action should
  // still trigger a layer refresh to avoid stale globe internals hiding point bars.
  if (selectedOrigin.value === normalizedValue) {
    selectedPort.value = originPort.value;
    hoveredPort.value = null;
    syncGlobeLayers(true);
    focusOnPort(originPort.value, 900);
    resumeAutoRotate(900);
    return;
  }

  selectedOrigin.value = normalizedValue;
}

function clearAutoRotateTimer() {
  if (autoRotateTimer !== null) {
    window.clearTimeout(autoRotateTimer);
    autoRotateTimer = null;
  }
}

function resumeAutoRotate(delay = 2200) {
  if (!globe) return;
  clearAutoRotateTimer();
  autoRotateTimer = window.setTimeout(() => {
    if (globe) {
      globe.controls().autoRotate = true;
    }
  }, delay);
}

function isPointerOverGlobe(event: MouseEvent) {
  if (!globe || !globeContainerRef.value) return false;

  const rect = globeContainerRef.value.getBoundingClientRect();
  const pointerX = event.clientX - rect.left;
  const pointerY = event.clientY - rect.top;

  if (
    pointerX < 0 ||
    pointerY < 0 ||
    pointerX > rect.width ||
    pointerY > rect.height
  ) {
    return false;
  }

  const globeWithHitTest = globe as unknown as Record<
    string,
    (...args: unknown[]) => unknown
  >;
  const tryHitTest = (methodName: 'toGlobeCoords' | 'toGeoCoords') => {
    const method = globeWithHitTest[methodName];
    if (typeof method !== 'function') return null;

    const candidates: unknown[][] = [
      [pointerX, pointerY],
      [event.clientX, event.clientY],
      [{ x: pointerX, y: pointerY }],
      [{ x: event.clientX, y: event.clientY }],
    ];
    for (const args of candidates) {
      try {
        const result = method(...args);
        if (result) return result;
      } catch {
        // ignore candidate shape mismatch and keep trying
      }
    }
    return null;
  };

  const hit = tryHitTest('toGlobeCoords') ?? tryHitTest('toGeoCoords');
  if (hit) return true;

  // Fallback: approximate globe projected circle from camera FOV and distance.
  const camera = globe.camera() as unknown as {
    fov?: number;
    zoom?: number;
    position?: { x?: number; y?: number; z?: number };
  };
  const globeRadius = 100;
  const pos = camera.position;
  const distance = Math.hypot(pos?.x ?? 0, pos?.y ?? 0, pos?.z ?? 250);
  const fovDeg = camera.fov ?? 50;
  const zoom = camera.zoom ?? 1;
  const focal = rect.height / 2 / Math.tan((fovDeg * Math.PI) / 360);
  const projectedRadius = (globeRadius / distance) * focal * zoom;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const pointerDistance = Math.hypot(pointerX - centerX, pointerY - centerY);

  return pointerDistance <= projectedRadius;
}

function handleStageMouseMove(event: MouseEvent) {
  const rect = globeWrapperRef.value?.getBoundingClientRect();
  if (!rect) return;
  hoverPosition.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };

  const overGlobe = isPointerOverGlobe(event);
  if (overGlobe === isMouseOverGlobe) return;

  isMouseOverGlobe = overGlobe;
  if (overGlobe) {
    if (globe) {
      globe.controls().autoRotate = false;
    }
    clearAutoRotateTimer();
    return;
  }
  resumeAutoRotate(500);
}

function handleStageMouseLeave() {
  if (hoveredPort.value) {
    hoveredPort.value = null;
  }
  isMouseOverGlobe = false;
  resumeAutoRotate(500);
}

function focusOnPort(port: PortData, duration = 1200) {
  globe?.pointOfView(
    {
      altitude: 2.05,
      lat: port.lat,
      lng: port.lng,
    },
    duration,
  );
}

function buildPortLabel(port: PortData) {
  const element = document.createElement('div');
  element.className = [
    'globe-port-label',
    port.code === originPort.value.code ? 'is-origin' : '',
    isActivePort(port.code) ? 'is-active' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const dot = document.createElement('span');
  dot.className = 'globe-port-label__dot';

  const text = document.createElement('span');
  text.className = 'globe-port-label__text';
  text.textContent = port.name;

  element.addEventListener('mouseenter', () => {
    hoveredPort.value = port;
  });
  element.addEventListener('mouseleave', () => {
    hoveredPort.value = null;
  });

  element.append(dot, text);
  return element;
}

function syncGlobeSize() {
  if (!globe || !globeContainerRef.value) return;
  globe
    .width(globeContainerRef.value.clientWidth)
    .height(globeContainerRef.value.clientHeight);
}

function syncGlobeLayers(forceRebuild = false) {
  if (!globe) return;
  const points = ports.map((port) => ({ ...port }));
  const pointTooltipStyle = isDark.value
    ? 'padding: 8px 10px; color: #e2e8f0; background: rgba(2, 6, 23, 0.92); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 10px;'
    : 'padding: 8px 10px; color: #0f172a; background: rgba(255, 255, 255, 0.94); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 10px; box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);';
  const pointTooltipTitleColor = isDark.value ? '#7dd3fc' : '#315f82';
  const pointTooltipSubColor = isDark.value ? '#94a3b8' : '#475569';

  if (forceRebuild) {
    globe.pointsData([]);
    globe.arcsData([]);
    globe.ringsData([]);
    globe.htmlElementsData([]);
  }

  globe
    .pointsData(points)
    .pointLat('lat')
    .pointLng('lng')
    .pointAltitude((port) => getPortAltitude(port as PortData))
    .pointRadius((port) => getPortRadius(port as PortData))
    .pointColor((port) => getPortColor(port as PortData))
    .pointResolution(18)
    .pointsTransitionDuration(0)
    .pointLabel((port) => {
      const currentPort = port as PortData;
      if (currentPort.code === originPort.value.code) {
        return `
          <div style="${pointTooltipStyle}">
            <div style="font-size: 13px; font-weight: 600; color: ${pointTooltipTitleColor};">${currentPort.name}（${currentPort.code}）</div>
            <div style="margin-top: 4px; font-size: 12px; color: ${pointTooltipSubColor};">${currentPort.country} · ${currentPort.majorTradeLane}</div>
            <div style="margin-top: 4px; font-size: 12px; color: ${pointTooltipSubColor};">月均箱量 ${formatNumber(currentPort.monthlyTeu)} TEU</div>
            <div style="margin-top: 2px; font-size: 12px; color: ${pointTooltipSubColor};">周订舱量 ${formatNumber(currentPort.weeklyBookings)} 单</div>
            <div style="margin-top: 2px; font-size: 12px; color: ${pointTooltipSubColor};">本月目标完成率 ${currentPort.onTimeRate}%</div>
            <div style="margin-top: 2px; font-size: 12px; color: ${pointTooltipSubColor};">核心货类 ${currentPort.topCargo}</div>
            <div style="margin-top: 4px; font-size: 12px; color: ${pointTooltipSubColor};">业务能力：${currentPort.services.join(' / ')}</div>
          </div>
        `;
      }

      const currentRoute = getRouteByDestinationCode(currentPort.code);
      return `
        <div style="${pointTooltipStyle}">
          <div style="font-size: 13px; font-weight: 600; color: ${pointTooltipTitleColor};">${originPort.value.name} -> ${currentPort.name}</div>
          <div style="margin-top: 4px; font-size: 12px; color: ${pointTooltipSubColor};">航线：${currentPort.majorTradeLane}</div>
          <div style="margin-top: 2px; font-size: 12px; color: ${pointTooltipSubColor};">月均箱量 ${formatNumber(currentRoute?.teu ?? currentPort.monthlyTeu)} TEU</div>
          <div style="margin-top: 2px; font-size: 12px; color: ${pointTooltipSubColor};">周订舱量 ${formatNumber(currentPort.weeklyBookings)} 单</div>
          <div style="margin-top: 2px; font-size: 12px; color: ${pointTooltipSubColor};">本月目标完成率 ${currentPort.onTimeRate}%</div>
        </div>
      `;
    })
    .onPointHover((port) => {
      hoveredPort.value = (port as PortData | null) ?? null;
    })
    .onPointClick((port) => {
      if (!port) return;
      selectedPort.value = port as PortData;
      focusOnPort(selectedPort.value, 900);
      resumeAutoRotate();
    })
    .arcsData(routeData.value)
    .arcStartLat('startLat')
    .arcStartLng('startLng')
    .arcEndLat('endLat')
    .arcEndLng('endLng')
    .arcAltitude((arc) => (arc as RouteArc).altitude)
    .arcStroke((arc) =>
      (arc as RouteArc).active
        ? isDark.value
          ? 0.34
          : 0.42
        : isDark.value
          ? 0.22
          : 0.3,
    )
    .arcColor((arc: unknown) =>
      (arc as RouteArc).active
        ? isDark.value
          ? ['rgba(251, 146, 60, 0.95)', 'rgba(248, 250, 252, 0.95)']
          : ['rgba(234, 88, 12, 0.98)', 'rgba(15, 23, 42, 0.96)']
        : isDark.value
          ? ['rgba(249, 115, 22, 0.82)', 'rgba(34, 211, 238, 0.55)']
          : ['rgba(245, 158, 11, 0.88)', 'rgba(14, 116, 144, 0.68)'],
    )
    .arcDashLength((arc) => ((arc as RouteArc).active ? 0.48 : 0.32))
    .arcDashGap((arc) => ((arc as RouteArc).active ? 0.7 : 1.05))
    .arcDashAnimateTime((arc) => (arc as RouteArc).dashTime)
    .arcCurveResolution(72)
    .arcsTransitionDuration(700)
    .arcLabel(() => '')
    .ringsData([originPort.value])
    .ringLat('lat')
    .ringLng('lng')
    .ringAltitude(0.015)
    .ringColor(() => ['rgba(251, 146, 60, 0.72)', 'rgba(251, 146, 60, 0)'])
    .ringMaxRadius(4.8)
    .ringPropagationSpeed(1.35)
    .ringRepeatPeriod(820)
    .htmlElementsData(points)
    .htmlLat('lat')
    .htmlLng('lng')
    .htmlAltitude((port) =>
      (port as PortData).code === originPort.value.code ? 0.22 : 0.12,
    )
    .htmlElement((port) => buildPortLabel(port as PortData))
    .htmlElementVisibilityModifier((element, isVisible) => {
      const htmlElement = element as HTMLElement;
      htmlElement.style.opacity = isVisible ? '1' : '0';
      htmlElement.style.transform = `translate(-50%, -50%) scale(${isVisible ? 1 : 0.9})`;
    })
    .htmlTransitionDuration(320);

  syncGlobeSize();
}

function initControls() {
  if (!globe) return;

  const controls = globe.controls();
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.45;
  controls.enablePan = false;
  controls.minDistance = 140;
  controls.maxDistance = 420;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  const handleStart = () => {
    controls.autoRotate = false;
    clearAutoRotateTimer();
  };

  const handleEnd = () => {
    resumeAutoRotate();
  };

  controls.addEventListener('start', handleStart);
  controls.addEventListener('end', handleEnd);

  controlsCleanup = () => {
    controls.removeEventListener('start', handleStart);
    controls.removeEventListener('end', handleEnd);
  };
}

function syncGlobeTheme() {
  if (!globe) return;

  const darkMode = isDark.value;

  globe
    .globeImageUrl(darkMode ? GLOBE_TEXTURE_NIGHT_URL : GLOBE_TEXTURE_DAY_URL)
    .backgroundImageUrl(darkMode ? GLOBE_BACKGROUND_NIGHT_URL : '')
    .atmosphereColor(darkMode ? '#38bdf8' : '#60a5fa')
    .atmosphereAltitude(darkMode ? 0.18 : 0.14);
}

async function initGlobe() {
  await nextTick();

  if (!globeContainerRef.value) return;

  globe = new Globe(globeContainerRef.value, {
    animateIn: true,
    waitForGlobeReady: true,
  });

  globe
    .backgroundColor('rgba(0,0,0,0)')
    .bumpImageUrl(GLOBE_BUMP_URL)
    .showGlobe(true)
    .showAtmosphere(true)
    .showGraticules(true)
    .onGlobeReady(() => {
      focusOnPort(originPort.value, 0);
    });

  syncGlobeTheme();
  initControls();
  syncGlobeLayers();
  focusOnPort(originPort.value, 0);

  resizeObserver = new ResizeObserver(() => {
    syncGlobeSize();
  });
  resizeObserver.observe(globeContainerRef.value);
}

watch(selectedOrigin, () => {
  selectedPort.value = originPort.value;
  hoveredPort.value = null;
  syncGlobeLayers(true);
  focusOnPort(originPort.value);
  nextTick(() => {
    syncGlobeLayers(true);
  });
  resumeAutoRotate(900);
});

watch(selectedPort, () => {
  syncGlobeLayers();
});

watch(isDark, () => {
  syncGlobeTheme();
  syncGlobeLayers();
});

onMounted(async () => {
  // Start in light mode first, then sync to system/app theme shortly after mount.
  scheduleThemeSync(180);
  observeThemeToggleButton();
  themeObserver = new MutationObserver(() => {
    observeThemeToggleButton();
    scheduleThemeSync(0);
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  });
  if (document.body) {
    themeObserver.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class', 'data-theme'],
    });
  }

  await loadOriginOptionsFromBasePorts();
  selectedPort.value = originPort.value;
  await initGlobe();
});

onBeforeUnmount(() => {
  clearAutoRotateTimer();
  controlsCleanup?.();
  resizeObserver?.disconnect();
  themeObserver?.disconnect();
  themeToggleObserver?.disconnect();
  if (themeSyncTimer !== null) {
    window.clearTimeout(themeSyncTimer);
    themeSyncTimer = null;
  }
  if (globeContainerRef.value) {
    globeContainerRef.value.innerHTML = '';
  }
  globe = null;
});
</script>

<template>
  <div class="sea-globe-page" :class="isDark ? 'is-dark' : 'is-light'">
    <div class="sea-globe-shell">
      <div class="statistic-row">
        <div class="statistic-card statistic-card--accent">
          <div class="statistic-card__title">
            <span>起运港</span>
            <VbenIcon icon="carbon:port-definition" />
          </div>
          <strong>{{ originPort.name }}</strong>
          <small>{{ originPort.majorTradeLane }}</small>
        </div>

        <div class="statistic-card">
          <div class="statistic-card__title">
            <span>全球目的港</span>
            <VbenIcon icon="carbon:location-company-filled" />
          </div>
          <strong>
            <VbenCountToAnimator
              :end-val="destinationPorts.length"
              :start-val="0"
            />
            <span class="statistic-card__unit">个</span>
          </strong>
          <small>覆盖五大洲核心中转与目的港节点</small>
        </div>

        <div class="statistic-card">
          <div class="statistic-card__title">
            <span>月箱量</span>
            <VbenIcon icon="carbon:chart-line-data" />
          </div>
          <strong>
            <VbenCountToAnimator :end-val="weeklyBooking" :start-val="0" />
            <span class="statistic-card__unit">TEU</span>
          </strong>
          <small>港口业务量，直观呈现您的外贸海运业务规模</small>
        </div>

        <div class="statistic-card">
          <div class="statistic-card__title">
            <span>重点高量港</span>
            <VbenIcon icon="carbon:ibm-cloud-direct-link-1-connect" />
          </div>
          <strong>
            <VbenCountToAnimator :end-val="premiumPortCount" :start-val="0" />
            <span class="statistic-card__unit">条</span>
          </strong>
          <small>月均箱量 7,000 TEU 以上的高密度航线</small>
        </div>
      </div>

      <div class="content-grid">
        <section class="globe-stage">
          <div class="globe-stage__meta">
            <div>
              <span class="legend-dot legend-dot--origin"></span>
              起运港
            </div>
            <div>
              <span class="legend-dot legend-dot--destination"></span>
              目的港
            </div>
            <div>
              <span class="legend-dot legend-dot--route"></span>
              动态航线
            </div>
            <div class="globe-stage__origin-switch">
              <span class="field-label">切换起运港</span>
              <Select
                :value="selectedOrigin"
                :options="originOptions"
                :popup-class-name="originSelectPopupClass"
                class="origin-select"
                @change="handleOriginChange"
              />
            </div>
          </div>

          <div
            ref="globeWrapperRef"
            class="globe-wrapper"
            @mousemove="handleStageMouseMove"
            @mouseleave="handleStageMouseLeave"
          >
            <div ref="globeContainerRef" class="globe-container"></div>

            <div
              v-if="hoveredPort"
              class="port-hover-card"
              :style="hoverTooltipStyle"
            >
              <div class="port-hover-card__name">
                {{ hoveredPort.name }}
                <span>{{ hoveredPort.country }}</span>
              </div>
              <template v-if="hoveredPort.code === originPort.code">
                <div class="port-hover-card__metric">
                  编码 {{ hoveredPort.code }} · {{ hoveredPort.majorTradeLane }}
                </div>
                <div class="port-hover-card__metric">
                  月均箱量 {{ formatNumber(hoveredPort.monthlyTeu) }} TEU
                </div>
                <div class="port-hover-card__metric">
                  周订舱量 {{ hoveredPort.weeklyBookings }} 单
                </div>
                <div class="port-hover-card__metric">
                  本月目标完成率 {{ hoveredPort.onTimeRate }}%
                </div>
                <div class="port-hover-card__metric">
                  核心货类 {{ hoveredPort.topCargo }}
                </div>
                <div class="port-hover-card__metric">
                  业务能力 {{ hoveredPort.services.join(' / ') }}
                </div>
              </template>
              <template v-else>
                <div class="port-hover-card__metric">
                  航线 {{ originPort.name }} -> {{ hoveredPort.name }}
                </div>
                <div class="port-hover-card__metric">
                  航线类型 {{ hoveredPort.majorTradeLane }}
                </div>
                <div class="port-hover-card__metric">
                  月均箱量
                  {{
                    formatNumber(
                      getRouteByDestinationCode(hoveredPort.code)?.teu ??
                        hoveredPort.monthlyTeu,
                    )
                  }}
                  TEU
                </div>
                <div class="port-hover-card__metric">
                  周订舱量 {{ hoveredPort.weeklyBookings }} 单
                </div>
                <div class="port-hover-card__metric">
                  本月目标完成率 {{ hoveredPort.onTimeRate }}%
                </div>
              </template>
            </div>
          </div>
        </section>

        <aside class="details-panel">
          <div class="details-panel__header">
            <div>
              <span class="details-panel__eyebrow">Port Intelligence</span>
              <h3>{{ activePanelPort.name }}</h3>
              <p>
                {{ activePanelPort.country }} ·
                {{ activePanelPort.majorTradeLane }}
              </p>
            </div>
            <div class="details-panel__badge">
              {{ activePanelPort.code }}
            </div>
          </div>

          <div class="details-grid">
            <div class="detail-tile">
              <span>月均箱量</span>
              <strong
                >{{ formatNumber(activePanelPort.monthlyTeu) }} TEU</strong
              >
            </div>
            <div class="detail-tile">
              <span>周订舱量</span>
              <strong>{{ activePanelPort.weeklyBookings }} 单</strong>
            </div>
            <div class="detail-tile">
              <span>本月目标完成率</span>
              <strong>{{ activePanelPort.onTimeRate }}%</strong>
            </div>
            <div class="detail-tile">
              <span>核心货类</span>
              <strong>{{ activePanelPort.topCargo }}</strong>
            </div>
          </div>

          <div class="details-section">
            <div class="details-section__title">港口业务能力</div>
            <div class="service-tags">
              <span
                v-for="service in activePanelPort.services"
                :key="service"
                class="service-tag"
              >
                {{ service }}
              </span>
            </div>
          </div>

          <div class="details-section">
            <div class="details-section__title">当前网络概览</div>
            <div
              v-for="item in shipmentProgressOverview"
              :key="item.label"
              class="network-metric"
            >
              <span>{{ item.label }}</span>
              <strong>{{ formatNumber(item.value) }} {{ item.unit }}</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sea-globe-page {
  min-height: calc(100vh - 140px);
  padding: 20px;
  overflow: hidden;
  color: #e2e8f0;
  background:
    radial-gradient(circle at 18% 18%, rgb(30 64 175 / 20%), transparent 32%),
    radial-gradient(circle at 82% 16%, rgb(14 165 233 / 18%), transparent 28%),
    radial-gradient(circle at 50% 100%, rgb(249 115 22 / 12%), transparent 36%),
    linear-gradient(180deg, #050816 0%, #020617 55%, #01030b 100%);
  border-radius: 24px;
}

.sea-globe-shell {
  position: relative;
  z-index: 1;
}

.sea-globe-page.is-light {
  position: relative;
  color: #0f172a;
  background:
    radial-gradient(circle at 18% 16%, rgb(125 176 204 / 16%), transparent 36%),
    radial-gradient(circle at 82% 14%, rgb(148 163 184 / 15%), transparent 34%),
    radial-gradient(circle at 48% 105%, rgb(251 146 60 / 14%), transparent 42%),
    linear-gradient(180deg, #f6f8fc 0%, #f8fafc 48%, #f3f5f9 100%);
}

.sea-globe-page.is-light::before,
.sea-globe-page.is-light::after {
  position: absolute;
  z-index: 0;
  width: 320px;
  height: 320px;
  pointer-events: none;
  content: '';
  border-radius: 999px;
  filter: blur(12px);
}

.sea-globe-page.is-light::before {
  top: -120px;
  right: -60px;
  background: radial-gradient(
    circle,
    rgb(219 234 254 / 40%) 0%,
    rgb(219 234 254 / 0%) 72%
  );
}

.sea-globe-page.is-light::after {
  bottom: -130px;
  left: -80px;
  background: radial-gradient(
    circle,
    rgb(226 232 240 / 48%) 0%,
    rgb(226 232 240 / 0%) 74%
  );
}

.sea-globe-page.is-light .sea-globe-shell {
  z-index: 1;
}

.sea-globe-page.is-light .sea-globe-header__eyebrow {
  font-weight: 540;
  color: #3f5f7a;
}

.sea-globe-page.is-light .sea-globe-header h2,
.sea-globe-page.is-light .details-panel__header h3,
.sea-globe-page.is-light .network-metric strong,
.sea-globe-page.is-light .statistic-card strong {
  font-weight: 600;
  color: #0f172a;
}

.sea-globe-page.is-light .sea-globe-header p,
.sea-globe-page.is-light .field-label,
.sea-globe-page.is-light .statistic-card__title,
.sea-globe-page.is-light .statistic-card small,
.sea-globe-page.is-light .globe-stage__meta,
.sea-globe-page.is-light .network-metric,
.sea-globe-page.is-light .port-hover-card__metric {
  font-weight: 460;
  color: #5b6572;
}

.sea-globe-page.is-light .globe-stage,
.sea-globe-page.is-light .details-panel {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 82%), rgb(248 250 252 / 72%)),
    linear-gradient(
      115deg,
      rgb(255 255 255 / 40%) 0%,
      rgb(255 255 255 / 0%) 45%
    );
  border-color: rgb(148 163 184 / 22%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 88%),
    0 14px 30px rgb(15 23 42 / 8%);
  backdrop-filter: blur(26px) saturate(128%);
}

.sea-globe-page.is-light .globe-stage::before,
.sea-globe-page.is-light .details-panel::before,
.sea-globe-page.is-light .statistic-card::before,
.sea-globe-page.is-light .detail-tile::before,
.sea-globe-page.is-light .globe-wrapper::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  border: 0.5px solid rgb(255 255 255 / 48%);
  border-radius: inherit;
}

.sea-globe-page.is-light .statistic-card {
  background:
    linear-gradient(180deg, rgb(255 255 255 / 88%), rgb(248 250 252 / 76%)),
    linear-gradient(135deg, rgb(255 255 255 / 52%), rgb(255 255 255 / 0%) 48%);
  border-color: rgb(148 163 184 / 22%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 86%),
    0 8px 20px rgb(15 23 42 / 7%);
  backdrop-filter: blur(20px) saturate(122%);
}

.sea-globe-page.is-light .statistic-card::after {
  background: linear-gradient(
    130deg,
    rgb(255 255 255 / 58%),
    rgb(255 255 255 / 0%) 42%
  );
}

.sea-globe-page.is-light .statistic-card:hover {
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 90%),
    0 12px 24px rgb(15 23 42 / 9%);
  transform: translateY(-1px);
}

.sea-globe-page.is-light .globe-wrapper {
  position: relative;
  background:
    radial-gradient(
      circle at 50% 45%,
      rgb(226 232 240 / 48%),
      rgb(226 232 240 / 68%)
    ),
    linear-gradient(180deg, rgb(255 255 255 / 56%), rgb(226 232 240 / 82%));
  border-color: rgb(148 163 184 / 22%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 80%),
    0 14px 28px rgb(15 23 42 / 7%);
}

.sea-globe-page.is-light .port-hover-card {
  color: #1e293b;
  background: linear-gradient(
    180deg,
    rgb(255 255 255 / 90%),
    rgb(248 250 252 / 84%)
  );
  border-color: rgb(148 163 184 / 22%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 82%),
    0 12px 28px rgb(15 23 42 / 11%);
  backdrop-filter: blur(18px) saturate(125%);
}

.sea-globe-page.is-light .port-hover-card__name {
  color: #0f172a;
}

.sea-globe-page.is-light .port-hover-card__name span {
  color: #3f6787;
}

.sea-globe-page.is-light :deep(.globe-port-label) {
  color: #1e293b;
  background: linear-gradient(
    180deg,
    rgb(255 255 255 / 88%),
    rgb(248 250 252 / 80%)
  );
  border-color: rgb(148 163 184 / 20%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 84%),
    0 6px 16px rgb(15 23 42 / 8%);
  backdrop-filter: blur(12px) saturate(122%);
}

.sea-globe-page.is-light :deep(.globe-port-label.is-active) {
  color: #0f172a;
  background: linear-gradient(
    180deg,
    rgb(241 245 249 / 92%),
    rgb(226 232 240 / 88%)
  );
  border-color: rgb(100 116 139 / 26%);
}

.sea-globe-page.is-light :deep(.globe-port-label.is-origin) {
  color: #7c2d12;
  background: rgb(255 237 213 / 88%);
  border-color: rgb(249 115 22 / 30%);
}

.sea-globe-page.is-light :deep(.globe-port-label__dot) {
  box-shadow: 0 0 10px rgb(14 165 233 / 38%);
}

.sea-globe-page.is-light
  :deep(.globe-port-label.is-origin .globe-port-label__dot) {
  box-shadow: 0 0 10px rgb(249 115 22 / 50%);
}

.sea-globe-page.is-light .details-panel__eyebrow {
  font-weight: 530;
  color: #466784;
}

.sea-globe-page.is-light .details-panel__header p {
  color: #5b6572;
}

.sea-globe-page.is-light .details-panel__badge {
  color: #9a3412;
  background: linear-gradient(
    180deg,
    rgb(255 247 237 / 82%),
    rgb(255 237 213 / 68%)
  );
  border-color: rgb(251 146 60 / 30%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 80%);
}

.sea-globe-page.is-light .detail-tile {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 88%), rgb(248 250 252 / 74%)),
    linear-gradient(130deg, rgb(255 255 255 / 52%), rgb(255 255 255 / 0%) 46%);
  border-color: rgb(148 163 184 / 22%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 84%),
    0 6px 14px rgb(15 23 42 / 5%);
  backdrop-filter: blur(16px);
}

.sea-globe-page.is-light .detail-tile span {
  color: #64748b;
}

.sea-globe-page.is-light .detail-tile strong {
  color: #0f172a;
}

.sea-globe-page.is-light .details-section__title {
  color: #1e293b;
}

.sea-globe-page.is-light .service-tag {
  font-weight: 500;
  color: #0f172a;
  background: linear-gradient(
    180deg,
    rgb(255 255 255 / 78%),
    rgb(241 245 249 / 72%)
  );
  border-color: rgb(148 163 184 / 20%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 78%);
}

.sea-globe-page.is-light .network-metric {
  border-bottom-color: rgb(148 163 184 / 24%);
}

.sea-globe-page.is-light .statistic-card__unit {
  font-weight: 560;
  color: #4a6d89;
}

.sea-globe-page.is-light :deep(.origin-select .ant-select-selector) {
  background: linear-gradient(
    180deg,
    rgb(255 255 255 / 88%),
    rgb(248 250 252 / 72%)
  ) !important;
  border-color: rgb(148 163 184 / 24%) !important;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 80%),
    0 6px 14px rgb(15 23 42 / 5%) !important;
  backdrop-filter: blur(14px);
}

.sea-globe-page.is-light :deep(.origin-select .ant-select-selection-item) {
  color: #0f172a;
}

.sea-globe-page.is-light :deep(.origin-select .ant-select-arrow) {
  color: #64748b;
}

.sea-globe-page.is-light
  :deep(.origin-select.ant-select-focused .ant-select-selector) {
  border-color: rgb(100 116 139 / 42%) !important;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 86%),
    0 0 0 3px rgb(148 163 184 / 18%),
    0 8px 18px rgb(15 23 42 / 6%) !important;
}

:global(.sea-globe-origin-dropdown--light.ant-select-dropdown) {
  padding: 6px;
  background: linear-gradient(
    180deg,
    rgb(255 255 255 / 98%),
    rgb(248 250 252 / 96%)
  );
  border: 1px solid rgb(148 163 184 / 22%);
  border-radius: 12px;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 88%),
    0 12px 26px rgb(15 23 42 / 12%);
}

:global(
  .sea-globe-origin-dropdown--light
    .ant-select-item-option-selected:not(.ant-select-item-option-disabled)
) {
  font-weight: 600;
  color: #0f172a;
  background: linear-gradient(
    180deg,
    rgb(226 232 240 / 96%),
    rgb(203 213 225 / 82%)
  );
  border-radius: 8px;
}

:global(
  .sea-globe-origin-dropdown--light
    .ant-select-item-option-active:not(.ant-select-item-option-disabled)
) {
  background: linear-gradient(
    180deg,
    rgb(241 245 249 / 96%),
    rgb(226 232 240 / 84%)
  );
  border-radius: 8px;
}

:global(.sea-globe-origin-dropdown--light .ant-select-item-option-content) {
  color: #1e293b;
}

.sea-globe-header {
  display: flex;
  gap: 20px;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 20px;
}

.sea-globe-header__copy {
  max-width: 760px;
}

.sea-globe-header__eyebrow {
  display: inline-block;
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #38bdf8;
  text-transform: uppercase;
  letter-spacing: 0.18em;
}

.sea-globe-header h2 {
  margin: 0;
  font-size: 30px;
  line-height: 1.15;
  color: #f8fafc;
}

.sea-globe-header p {
  margin: 10px 0 0;
  font-size: 15px;
  line-height: 1.75;
  color: #94a3b8;
}

.field-label {
  font-size: 12px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.origin-select {
  width: 100%;
}

.statistic-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}

.statistic-card {
  position: relative;
  padding: 18px 18px 16px;
  overflow: hidden;
  background: linear-gradient(180deg, rgb(15 23 42 / 82%), rgb(3 7 18 / 90%));
  border: 1px solid rgb(56 189 248 / 20%);
  border-radius: 18px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 4%);
  backdrop-filter: blur(18px);
}

.statistic-card::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background: linear-gradient(135deg, rgb(56 189 248 / 10%), transparent 42%);
}

.statistic-card--accent {
  border-color: rgb(249 115 22 / 34%);
}

.statistic-card__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #94a3b8;
}

.statistic-card__title :deep(svg) {
  font-size: 18px;
  color: #7dd3fc;
}

.statistic-card--accent .statistic-card__title :deep(svg) {
  color: #fb923c;
}

.statistic-card strong {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-top: 10px;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
  color: #f8fafc;
}

.statistic-card small {
  display: block;
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.6;
  color: #64748b;
}

.statistic-card__unit {
  font-size: 14px;
  font-weight: 500;
  color: #7dd3fc;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(320px, 420px);
  gap: 18px;
}

.globe-stage,
.details-panel {
  background: linear-gradient(180deg, rgb(2 8 23 / 82%), rgb(1 4 11 / 88%));
  border: 1px solid rgb(148 163 184 / 14%);
  border-radius: 24px;
  backdrop-filter: blur(18px);
}

.globe-stage {
  position: relative;
  padding: 16px;
}

.globe-stage__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: center;
  margin-bottom: 14px;
  font-size: 12px;
  color: #94a3b8;
}

.globe-stage__meta > div {
  display: flex;
  gap: 8px;
  align-items: center;
}

.globe-stage__origin-switch {
  min-width: 220px;
  margin-left: auto;
}

.globe-stage__origin-switch .field-label {
  white-space: nowrap;
}

.legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.legend-dot--origin {
  background: #fb923c;
  box-shadow: 0 0 18px rgb(249 115 22 / 75%);
}

.legend-dot--destination {
  background: #22d3ee;
  box-shadow: 0 0 16px rgb(34 211 238 / 55%);
}

.legend-dot--route {
  background: linear-gradient(90deg, #fb923c, #22d3ee);
}

.globe-wrapper {
  position: relative;
  min-height: 680px;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 50%, rgb(30 41 59 / 30%), rgb(2 6 23 / 74%)),
    linear-gradient(180deg, rgb(2 6 23 / 84%), rgb(2 6 23 / 96%));
  border: 1px solid rgb(56 189 248 / 12%);
  border-radius: 20px;
}

.globe-container {
  width: 100%;
  height: 680px;
}

.port-hover-card {
  position: absolute;
  z-index: 8;
  min-width: 190px;
  padding: 10px 12px;
  color: #e2e8f0;
  pointer-events: none;
  background: rgb(2 6 23 / 90%);
  border: 1px solid rgb(56 189 248 / 30%);
  border-radius: 14px;
  box-shadow: 0 14px 40px rgb(2 6 23 / 45%);
  backdrop-filter: blur(10px);
}

.port-hover-card__name {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #f8fafc;
}

.port-hover-card__name span {
  font-size: 12px;
  font-weight: 500;
  color: #7dd3fc;
}

.port-hover-card__metric {
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
}

.details-panel {
  padding: 20px;
}

.details-panel__header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
}

.details-panel__eyebrow {
  display: inline-block;
  margin-bottom: 8px;
  font-size: 12px;
  color: #38bdf8;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.details-panel__header h3 {
  margin: 0;
  font-size: 28px;
  color: #f8fafc;
}

.details-panel__header p {
  margin: 8px 0 0;
  line-height: 1.7;
  color: #94a3b8;
}

.details-panel__badge {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #fb923c;
  letter-spacing: 0.08em;
  background: rgb(249 115 22 / 10%);
  border: 1px solid rgb(249 115 22 / 24%);
  border-radius: 999px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.detail-tile {
  padding: 14px;
  background: rgb(15 23 42 / 58%);
  border: 1px solid rgb(56 189 248 / 14%);
  border-radius: 16px;
}

.detail-tile span {
  display: block;
  font-size: 12px;
  color: #94a3b8;
}

.detail-tile strong {
  display: block;
  margin-top: 10px;
  font-size: 18px;
  line-height: 1.5;
  color: #f8fafc;
}

.details-section + .details-section {
  margin-top: 18px;
}

.details-section__title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #cbd5e1;
}

.service-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.service-tag {
  padding: 7px 12px;
  font-size: 12px;
  color: #dbeafe;
  background: rgb(30 41 59 / 72%);
  border: 1px solid rgb(56 189 248 / 22%);
  border-radius: 999px;
}

.network-metric {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  color: #94a3b8;
  border-bottom: 1px solid rgb(148 163 184 / 10%);
}

.network-metric:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.network-metric strong {
  font-size: 16px;
  color: #f8fafc;
}

.sea-globe-page :deep(.globe-port-label) {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 5px 10px;
  font-size: 11px;
  color: #cbd5e1;
  white-space: nowrap;
  pointer-events: auto;
  cursor: pointer;
  background: rgb(2 6 23 / 68%);
  border: 1px solid rgb(56 189 248 / 16%);
  border-radius: 999px;
  box-shadow: 0 8px 28px rgb(2 6 23 / 35%);
  opacity: 1;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.sea-globe-page :deep(.globe-port-label.is-origin) {
  color: #fff7ed;
  background: rgb(124 45 18 / 70%);
  border-color: rgb(249 115 22 / 26%);
}

.sea-globe-page :deep(.globe-port-label.is-active) {
  color: #f8fafc;
  background: rgb(15 23 42 / 88%);
  border-color: rgb(248 250 252 / 34%);
}

.sea-globe-page :deep(.globe-port-label__dot) {
  width: 7px;
  height: 7px;
  background: #22d3ee;
  border-radius: 999px;
  box-shadow: 0 0 12px rgb(34 211 238 / 58%);
}

.sea-globe-page :deep(.globe-port-label.is-origin .globe-port-label__dot) {
  background: #fb923c;
  box-shadow: 0 0 12px rgb(249 115 22 / 68%);
}

@media (max-width: 1480px) {
  .content-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .details-panel {
    order: 2;
  }
}

@media (max-width: 1200px) {
  .statistic-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .sea-globe-header {
    flex-direction: column;
    align-items: stretch;
  }

  .globe-wrapper,
  .globe-container {
    height: 560px;
    min-height: 560px;
  }
}

@media (max-width: 640px) {
  .sea-globe-page {
    padding: 14px;
  }

  .statistic-row,
  .details-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .details-panel__header {
    flex-direction: column;
  }
}
</style>
