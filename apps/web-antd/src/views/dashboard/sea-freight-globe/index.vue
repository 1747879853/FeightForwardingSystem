<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

interface PortPoint {
  code: string;
  country: string;
  name: string;
  lat: number;
  lon: number;
  services: string[];
}

interface ScreenPoint {
  port: PortPoint;
  visible: boolean;
  x: number;
  y: number;
  z: number;
}

const selectedOrigin = ref('QINGDAO');
const selectedPort = ref<PortPoint | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

const originOptions = [
  { label: '青岛港（Qingdao）', value: 'QINGDAO' },
  { label: '上海港（Shanghai）', value: 'SHANGHAI' },
];

const ports: PortPoint[] = [
  {
    code: 'QINGDAO',
    country: '中国',
    name: '青岛港',
    lat: 36.0671,
    lon: 120.3826,
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
    lon: 121.4737,
    services: ['全球主干线订舱', '特种柜运输', '多式联运'],
  },
  {
    code: 'SIN',
    country: '新加坡',
    name: '新加坡港',
    lat: 1.3521,
    lon: 103.8198,
    services: ['中转分拨', '危险品仓储衔接', '海运到门派送'],
  },
  {
    code: 'RTM',
    country: '荷兰',
    name: '鹿特丹港',
    lat: 51.9244,
    lon: 4.4777,
    services: ['欧洲干线进口', '清关与拖车派送', '集装箱堆场服务'],
  },
  {
    code: 'LAX',
    country: '美国',
    name: '洛杉矶港',
    lat: 33.7292,
    lon: -118.2641,
    services: ['美西快线', '电商货优先提柜', '港后铁路联运'],
  },
  {
    code: 'DXB',
    country: '阿联酋',
    name: '杰贝阿里港',
    lat: 24.9857,
    lon: 55.065,
    services: ['中东航线', '项目货运输', '港区保税服务'],
  },
  {
    code: 'SYD',
    country: '澳大利亚',
    name: '悉尼港',
    lat: -33.8688,
    lon: 151.2093,
    services: ['澳新航线', '冷链运输', '目的港仓储配送'],
  },
  {
    code: 'SANTOS',
    country: '巴西',
    name: '桑托斯港',
    lat: -23.9608,
    lon: -46.3289,
    services: ['南美航线', '整柜与拼箱并行', '农产品订舱'],
  },
];

const originPort = computed(
  () => ports.find((port) => port.code === selectedOrigin.value) ?? ports[0],
);
const destinationPorts = computed(() =>
  ports.filter((port) => port.code !== originPort.value.code),
);
const weeklyBooking = computed(() => destinationPorts.value.length * 32 + 18);

let frameId = 0;
let rotation = 0;
let hoveredPort: PortPoint | null = null;
let screenPoints: ScreenPoint[] = [];

function latLonToXYZ(lat: number, lon: number, radius: number) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

function rotateY(point: { x: number; y: number; z: number }, angle: number) {
  return {
    x: point.x * Math.cos(angle) + point.z * Math.sin(angle),
    y: point.y,
    z: -point.x * Math.sin(angle) + point.z * Math.cos(angle),
  };
}

function projectPoint(
  point: { x: number; y: number; z: number },
  center: number,
  radius: number,
) {
  const depth = 350;
  const scale = depth / (depth + point.z + radius);
  return {
    x: center + point.x * scale,
    y: center + point.y * scale,
    visible: point.z > -radius * 0.95,
    z: point.z,
  };
}

function draw() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = Math.min(canvas.clientWidth, canvas.clientHeight);
  const ratio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * ratio;
  canvas.height = canvas.clientHeight * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const centerX = canvas.clientWidth / 2;
  const centerY = canvas.clientHeight / 2;
  const radius = size * 0.35;

  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  const bg = ctx.createRadialGradient(
    centerX - radius * 0.35,
    centerY - radius * 0.35,
    20,
    centerX,
    centerY,
    radius * 1.2,
  );
  bg.addColorStop(0, '#12345d');
  bg.addColorStop(1, '#020617');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
  for (let i = -4; i <= 4; i++) {
    const arcRadius = radius * Math.cos((i * Math.PI) / 10);
    ctx.beginPath();
    ctx.ellipse(
      centerX,
      centerY,
      Math.abs(arcRadius),
      radius,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  screenPoints = ports.map((port) => {
    const base = latLonToXYZ(port.lat, port.lon, radius);
    const rotated = rotateY(base, rotation);
    const projected = projectPoint(rotated, centerX, radius);
    return {
      port,
      x: projected.x,
      y: projected.y,
      visible: projected.visible,
      z: projected.z,
    };
  });

  const originPoint = screenPoints.find(
    (point) => point.port.code === originPort.value.code,
  );

  if (originPoint) {
    const routes = screenPoints.filter(
      (point) => point.port.code !== originPort.value.code,
    );
    for (const point of routes) {
      if (!originPoint.visible && !point.visible) continue;
      const controlX = (originPoint.x + point.x) / 2;
      const controlY = Math.min(originPoint.y, point.y) - 70;

      ctx.beginPath();
      ctx.moveTo(originPoint.x, originPoint.y);
      ctx.quadraticCurveTo(controlX, controlY, point.x, point.y);
      const gradient = ctx.createLinearGradient(
        originPoint.x,
        originPoint.y,
        point.x,
        point.y,
      );
      gradient.addColorStop(0, 'rgba(249, 115, 22, 0.8)');
      gradient.addColorStop(1, 'rgba(34, 211, 238, 0.5)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
  }

  const sorted = [...screenPoints].sort((a, b) => a.z - b.z);
  for (const point of sorted) {
    if (!point.visible) continue;
    const isOrigin = point.port.code === originPort.value.code;
    const isHovered =
      hoveredPort?.code === point.port.code ||
      selectedPort.value?.code === point.port.code;
    ctx.beginPath();
    ctx.arc(point.x, point.y, isOrigin ? 8 : 6, 0, Math.PI * 2);
    ctx.fillStyle = isOrigin ? '#f97316' : '#22d3ee';
    ctx.fill();

    if (isHovered) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, isOrigin ? 13 : 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px sans-serif';
    ctx.fillText(point.port.name, point.x + 10, point.y - 10);
  }
}

function animate() {
  rotation += 0.0055;
  draw();
  frameId = requestAnimationFrame(animate);
}

function detectPort(event: MouseEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  return screenPoints
    .filter((item) => item.visible)
    .find((item) => Math.hypot(item.x - mouseX, item.y - mouseY) < 10)?.port;
}

function handleMouseMove(event: MouseEvent) {
  hoveredPort = detectPort(event);
  draw();
}

function handleClick(event: MouseEvent) {
  selectedPort.value = detectPort(event) ?? null;
}

watch(selectedOrigin, () => {
  selectedPort.value = originPort.value;
  draw();
});

onMounted(() => {
  selectedPort.value = originPort.value;
  animate();
  window.addEventListener('resize', draw);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId);
  window.removeEventListener('resize', draw);
});
</script>

<template>
  <div class="sea-globe-page">
    <div class="sea-globe-header">
      <div>
        <h2>海运全球航线 3D 指挥看板</h2>
        <p>
          模拟海运业务：选择启运港（默认青岛）后展示全球目的港点位与航线轨迹。
        </p>
      </div>
      <a-select
        v-model:value="selectedOrigin"
        :options="originOptions"
        class="origin-select"
      />
    </div>

    <div class="statistic-row">
      <div class="statistic-card">
        <span>起运港</span><strong>{{ originPort.name }}</strong>
      </div>
      <div class="statistic-card">
        <span>全球目的港</span><strong>{{ destinationPorts.length }} 个</strong>
      </div>
      <div class="statistic-card">
        <span>模拟周订舱量</span><strong>{{ weeklyBooking }} TEU</strong>
      </div>
    </div>

    <div class="globe-wrapper">
      <canvas
        ref="canvasRef"
        class="globe-canvas"
        @click="handleClick"
        @mousemove="handleMouseMove"
      ></canvas>

      <div v-if="selectedPort" class="port-tooltip">
        <h4>{{ selectedPort.name }}（{{ selectedPort.country }}）</h4>
        <ul>
          <li v-for="service in selectedPort.services" :key="service">
            {{ service }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sea-globe-page {
  min-height: calc(100vh - 140px);
  padding: 20px;
  background: radial-gradient(
    circle at 20% 20%,
    #0f172a 0,
    #020617 55%,
    #01030b 100%
  );
  border-radius: 20px;
}

.sea-globe-header {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.sea-globe-header h2 {
  margin: 0;
  color: #f8fafc;
}

.sea-globe-header p {
  margin: 6px 0 0;
  color: #94a3b8;
}

.origin-select {
  width: 220px;
}

.statistic-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.statistic-card {
  padding: 12px 14px;
  color: #cbd5e1;
  background: rgb(15 23 42 / 70%);
  border: 1px solid rgb(56 189 248 / 25%);
  border-radius: 14px;
}

.statistic-card strong {
  display: block;
  margin-top: 8px;
  font-size: 22px;
  color: #e2e8f0;
}

.globe-wrapper {
  position: relative;
}

.globe-canvas {
  width: 100%;
  height: calc(100vh - 320px);
  min-height: 540px;
  background: linear-gradient(180deg, rgb(15 23 42 / 85%), rgb(2 6 23 / 95%));
  border: 1px solid rgb(148 163 184 / 20%);
  border-radius: 16px;
}

.port-tooltip {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 280px;
  padding: 12px 14px;
  color: #cbd5e1;
  background: rgb(7 18 36 / 88%);
  border: 1px solid rgb(56 189 248 / 35%);
  border-radius: 12px;
  backdrop-filter: blur(4px);
}

.port-tooltip h4 {
  margin: 0 0 8px;
  color: #7dd3fc;
}

.port-tooltip ul {
  padding-left: 16px;
  margin: 0;
}

.port-tooltip li {
  margin-bottom: 4px;
}
</style>
