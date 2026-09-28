<script lang="ts" setup>
import type { PackingAdminApi } from '#/api/packing/packing-admin';

import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const props = withDefaults(
  defineProps<{
    height: number;
    length: number;
    placements: PackingAdminApi.PackingPlacement[];
    /** 只显示装载顺序小于等于该值的件；0 表示全部 */
    visibleLoadOrder: number;
    width: number;
    gravityOffsetLength?: number;
    gravityOffsetWidth?: number;
    /** 层剖切：只显示底面 y 小于等于该值的件；0=关闭 */
    maxLayerY?: number;
    /** 高亮行号；0=无 */
    highlightLineNo?: number;
    /** 偏载超限时重心标红 */
    gravityWarning?: boolean;
  }>(),
  {
    gravityOffsetLength: 0,
    gravityOffsetWidth: 0,
    maxLayerY: 0,
    highlightLineNo: 0,
    gravityWarning: false,
  },
);

defineOptions({ name: 'PackingScene' });

const LINE_COLORS = [
  0x1677ff, 0x52c41a, 0xfa8c16, 0xeb2f96, 0x722ed1, 0x13c2c2, 0xfaad14,
  0x2f54eb,
];

const hostRef = shallowRef<HTMLDivElement>();
let renderer: THREE.WebGLRenderer | undefined;
let scene: THREE.Scene | undefined;
let camera: THREE.PerspectiveCamera | undefined;
let controls: OrbitControls | undefined;
let cargoGroup: THREE.Group | undefined;
let frameId = 0;
let resizeObserver: ResizeObserver | undefined;

function colorOf(lineNo: number) {
  const index = Math.max(0, lineNo - 1) % LINE_COLORS.length;
  return LINE_COLORS[index]!;
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = mesh.material;
    const list = Array.isArray(materials)
      ? materials
      : materials
        ? [materials]
        : [];
    for (const material of list) {
      const mapped = material as THREE.MeshBasicMaterial;
      mapped.map?.dispose();
      material.dispose();
    }
  });
}

function formatDim(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function axisTicks(max: number) {
  if (!Number.isFinite(max) || max <= 0) return [0];
  const rough = max / 6;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = nice * magnitude;
  const values = [0];
  for (let value = step; value < max - step * 0.35; value += step) {
    values.push(value);
  }
  values.push(max);
  return values;
}

function makeLabel(text: string, worldHeight: number, color = '#1e293b') {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return new THREE.Sprite();
  const fontSize = 96;
  const font = `600 ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  context.font = font;
  const width = Math.ceil(context.measureText(text).width + 32);
  const height = fontSize + 28;
  canvas.width = width;
  canvas.height = height;
  context.font = font;
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, width / 2, height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  sprite.scale.set(worldHeight * (width / height), worldHeight, 1);
  sprite.renderOrder = 20;
  return sprite;
}

function addSegment(
  parent: THREE.Object3D,
  from: THREE.Vector3,
  to: THREE.Vector3,
) {
  const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
  parent.add(
    new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x334155 })),
  );
}

function addDimensionAxis(
  parent: THREE.Object3D,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  tickDirection: THREE.Vector3,
  max: number,
  title: string,
  titleOffset: THREE.Vector3,
  labelSize: number,
) {
  const end = origin.clone().addScaledVector(direction, max);
  addSegment(parent, origin, end);
  const tickLength = labelSize * 0.45;
  for (const value of axisTicks(max)) {
    const at = origin.clone().addScaledVector(direction, value);
    const tickEnd = at.clone().addScaledVector(tickDirection, tickLength);
    addSegment(parent, at, tickEnd);
    const label = makeLabel(formatDim(value), labelSize * 0.85);
    label.position
      .copy(tickEnd)
      .addScaledVector(tickDirection, labelSize * 0.7);
    parent.add(label);
  }
  const titleLabel = makeLabel(title, labelSize * 1.25, '#1677ff');
  titleLabel.position
    .copy(origin)
    .addScaledVector(direction, max / 2)
    .add(titleOffset);
  parent.add(titleLabel);
}

function fitCamera() {
  if (!camera || !controls) return;
  const { length, width, height } = props;
  controls.target.set(length / 2, height / 2, width / 2);
  camera.position.set(length * 1.45, height * 1.7, width * 3.1);
  camera.near = 1;
  camera.far = Math.max(length, width, height) * 20;
  camera.updateProjectionMatrix();
  controls.update();
}

function setDoorView() {
  if (!camera || !controls) return;
  const { length, width, height } = props;
  controls.target.set(length * 0.55, height / 2, width / 2);
  camera.position.set(length * 1.85, height * 0.9, width / 2);
  controls.update();
}

function rebuildContainer() {
  if (!scene || !cargoGroup) return;
  const previous = scene.getObjectByName('packing-shell');
  if (previous) {
    scene.remove(previous);
    disposeObject(previous);
  }

  const { length, width, height } = props;
  if (length <= 0 || width <= 0 || height <= 0) return;

  const shell = new THREE.Group();
  shell.name = 'packing-shell';

  const shellGeometry = new THREE.BoxGeometry(length, height, width);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(shellGeometry),
    new THREE.LineBasicMaterial({ color: 0x334155 }),
  );
  shellGeometry.dispose();
  edges.position.set(length / 2, height / 2, width / 2);
  shell.add(edges);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(length, width),
    new THREE.MeshLambertMaterial({
      color: 0xe8eef5,
      side: THREE.DoubleSide,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(length / 2, 0, width / 2);
  shell.add(floor);

  // 偏载安全区（中心 80% 矩形）
  const safe = new THREE.Mesh(
    new THREE.PlaneGeometry(length * 0.8, width * 0.8),
    new THREE.MeshBasicMaterial({
      color: 0x52c41a,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  safe.rotation.x = -Math.PI / 2;
  safe.position.set(length / 2, 0.15, width / 2);
  shell.add(safe);

  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      color: 0xff4d4f,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    }),
  );
  door.position.set(length, height / 2, width / 2);
  door.rotation.y = Math.PI / 2;
  shell.add(door);

  const labelSize = Math.max(length, width, height) * 0.038;
  const gap = labelSize * 1.6;
  addDimensionAxis(
    shell,
    new THREE.Vector3(0, -gap, -gap),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, -1, 0),
    length,
    '箱长',
    new THREE.Vector3(0, -labelSize * 2.4, 0),
    labelSize,
  );
  addDimensionAxis(
    shell,
    new THREE.Vector3(-gap, 0, -gap),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(-1, 0, 0),
    height,
    '箱高',
    new THREE.Vector3(-labelSize * 2.6, 0, 0),
    labelSize,
  );
  addDimensionAxis(
    shell,
    new THREE.Vector3(length + gap, -gap, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(1, 0, 0),
    width,
    '箱宽',
    new THREE.Vector3(labelSize * 2.6, 0, 0),
    labelSize,
  );

  const head = makeLabel('箱头', labelSize * 1.45, '#1677ff');
  head.position.set(0, height + labelSize * 1.8, width / 2);
  shell.add(head);
  const tail = makeLabel('箱门', labelSize * 1.45, '#cf1322');
  tail.position.set(length, height + labelSize * 1.8, width / 2);
  shell.add(tail);

  // 重心投影：柜中心 + 偏移
  const gx = length / 2 + Number(props.gravityOffsetLength || 0);
  const gz = width / 2 + Number(props.gravityOffsetWidth || 0);
  const cogColor = props.gravityWarning ? 0xff4d4f : 0xfa8c16;
  const cog = new THREE.Mesh(
    new THREE.CircleGeometry(Math.max(length, width) * 0.018, 24),
    new THREE.MeshBasicMaterial({
      color: cogColor,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    }),
  );
  cog.rotation.x = -Math.PI / 2;
  cog.position.set(
    Math.min(Math.max(gx, 0), length),
    0.25,
    Math.min(Math.max(gz, 0), width),
  );
  shell.add(cog);
  const cogLabel = makeLabel(
    props.gravityWarning ? '重心偏载' : '重心',
    labelSize * 1.1,
    props.gravityWarning ? '#cf1322' : '#d46b08',
  );
  cogLabel.position.set(cog.position.x, labelSize * 1.2, cog.position.z);
  shell.add(cogLabel);

  scene.add(shell);
}

function rebuildCargos() {
  if (!cargoGroup) return;
  while (cargoGroup.children.length > 0) {
    const child = cargoGroup.children[0]!;
    cargoGroup.remove(child);
    disposeObject(child);
  }

  for (const piece of props.placements) {
    const geometry = new THREE.BoxGeometry(
      piece.length,
      piece.height,
      piece.width,
    );
    const highlighted =
      props.highlightLineNo > 0 && piece.lineNo === props.highlightLineNo;
    const material = new THREE.MeshLambertMaterial({
      color: colorOf(piece.lineNo),
      transparent: highlighted ? false : props.highlightLineNo > 0,
      opacity: highlighted || props.highlightLineNo <= 0 ? 1 : 0.22,
      emissive: highlighted ? 0x222222 : 0x000000,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      piece.x + piece.length / 2,
      piece.y + piece.height / 2,
      piece.z + piece.width / 2,
    );
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({
        color: highlighted ? 0xff4d4f : 0x0f172a,
        transparent: true,
        opacity: highlighted ? 0.9 : 0.35,
      }),
    );
    mesh.add(edge);
    mesh.userData.loadOrder = piece.loadOrder;
    mesh.userData.lineNo = piece.lineNo;
    mesh.userData.bottomY = piece.y;
    mesh.userData.topY = piece.y + piece.height;
    cargoGroup.add(mesh);
  }
  applyVisibility();
}

function applyVisibility() {
  if (!cargoGroup) return;
  const orderLimit = props.visibleLoadOrder;
  const layerLimit = props.maxLayerY;
  for (const child of cargoGroup.children) {
    const order = Number(child.userData.loadOrder ?? 0);
    const topY = Number(child.userData.topY ?? 0);
    const orderOk = orderLimit <= 0 || order <= orderLimit;
    const layerOk = layerLimit <= 0 || topY <= layerLimit + 0.01;
    child.visible = orderOk && layerOk;
  }
}

function resize() {
  const host = hostRef.value;
  if (!host || !renderer || !camera) return;
  const width = host.clientWidth;
  const height = host.clientHeight;
  if (width <= 0 || height <= 0) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function tick() {
  frameId = requestAnimationFrame(tick);
  controls?.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
}

function capturePng(): string | null {
  if (!renderer || !scene || !camera) return null;
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL('image/png');
}

defineExpose({
  capturePng,
  setDoorView,
  fitCamera,
});

onMounted(() => {
  const host = hostRef.value;
  if (!host) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf8fafc);
  camera = new THREE.PerspectiveCamera(40, 1, 1, 10000);
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  host.append(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 0.7);
  key.position.set(400, 800, 600);
  scene.add(key);

  cargoGroup = new THREE.Group();
  scene.add(cargoGroup);

  controls = new OrbitControls(camera, host);
  controls.enableDamping = true;
  controls.enableRotate = true;
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.zoomToCursor = true;
  controls.screenSpacePanning = true;
  controls.cursorStyle = 'grab';
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };

  rebuildContainer();
  rebuildCargos();
  fitCamera();
  resize();

  resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(host);
  tick();
});

watch(
  () =>
    [
      props.length,
      props.width,
      props.height,
      props.gravityOffsetLength,
      props.gravityOffsetWidth,
      props.gravityWarning,
    ] as const,
  () => {
    rebuildContainer();
    fitCamera();
  },
);

watch(
  () => [props.placements, props.highlightLineNo] as const,
  () => {
    rebuildCargos();
  },
);

watch(
  () => [props.visibleLoadOrder, props.maxLayerY] as const,
  () => applyVisibility(),
);

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId);
  resizeObserver?.disconnect();
  controls?.dispose();
  if (scene) disposeObject(scene);
  renderer?.dispose();
  renderer?.domElement.remove();
  renderer = undefined;
  scene = undefined;
  camera = undefined;
  controls = undefined;
  cargoGroup = undefined;
});
</script>

<template>
  <div ref="hostRef" class="packing-scene"></div>
</template>

<style scoped>
.packing-scene {
  width: 100%;
  height: 100%;
  min-height: 280px;
  overflow: hidden;
  touch-action: none;
  cursor: grab;
  background: #f8fafc;
  border-radius: 8px;
}

.packing-scene :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
