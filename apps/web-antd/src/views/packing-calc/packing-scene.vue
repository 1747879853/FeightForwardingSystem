<script lang="ts" setup>
import type { PackingAdminApi } from '#/api/packing/packing-admin';

import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type PackingViewMode = 'perspective' | 'top' | 'side' | 'front';

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
    /** 视角：透视总览 / 俯视 / 侧视 / 正视 */
    viewMode?: PackingViewMode;
    /** 显示标尺网格与轴刻度 */
    showRulers?: boolean;
    /** 显示货物实时尺寸标注 */
    showDimLabels?: boolean;
  }>(),
  {
    gravityOffsetLength: 0,
    gravityOffsetWidth: 0,
    maxLayerY: 0,
    highlightLineNo: 0,
    gravityWarning: false,
    viewMode: 'perspective',
    showRulers: true,
    showDimLabels: true,
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
let perspectiveCamera: THREE.PerspectiveCamera | undefined;
let orthoCamera: THREE.OrthographicCamera | undefined;
let activeCamera: THREE.Camera | undefined;
let controls: OrbitControls | undefined;
let cargoGroup: THREE.Group | undefined;
let labelGroup: THREE.Group | undefined;
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
    values.push(Math.round(value * 1000) / 1000);
  }
  values.push(max);
  return values;
}

function makeLabel(
  text: string,
  worldHeight: number,
  color = '#1e293b',
  options?: { bg?: string; padding?: number },
) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return new THREE.Sprite();
  const fontSize = 96;
  const padding = options?.padding ?? 20;
  const font = `600 ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  context.font = font;
  const metrics = context.measureText(text);
  const width = Math.ceil(metrics.width + padding * 2);
  const height = fontSize + padding * 1.4;
  canvas.width = width;
  canvas.height = height;
  context.font = font;
  if (options?.bg) {
    context.fillStyle = options.bg;
    const radius = 18;
    context.beginPath();
    context.moveTo(radius, 0);
    context.arcTo(width, 0, width, height, radius);
    context.arcTo(width, height, 0, height, radius);
    context.arcTo(0, height, 0, 0, radius);
    context.arcTo(0, 0, width, 0, radius);
    context.closePath();
    context.fill();
  }
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
  color = 0x334155,
  opacity = 1,
) {
  const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
  parent.add(
    new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color,
        transparent: opacity < 1,
        opacity,
        depthWrite: false,
      }),
    ),
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
  addSegment(parent, origin, end, 0x1677ff);
  const tickLength = labelSize * 0.45;
  for (const value of axisTicks(max)) {
    const at = origin.clone().addScaledVector(direction, value);
    const tickEnd = at.clone().addScaledVector(tickDirection, tickLength);
    addSegment(parent, at, tickEnd, 0x334155);
    const label = makeLabel(`${formatDim(value)}`, labelSize * 0.85);
    label.position
      .copy(tickEnd)
      .addScaledVector(tickDirection, labelSize * 0.7);
    parent.add(label);
  }
  const titleLabel = makeLabel(
    `${title} ${formatDim(max)}cm`,
    labelSize * 1.15,
    '#1677ff',
    { bg: 'rgba(255,255,255,0.88)' },
  );
  titleLabel.position
    .copy(origin)
    .addScaledVector(direction, max / 2)
    .add(titleOffset);
  parent.add(titleLabel);
}

/** 标尺网格：按视角铺在对应投影面 */
function addRulerGrid(
  parent: THREE.Object3D,
  mode: PackingViewMode,
  length: number,
  width: number,
  height: number,
) {
  if (mode === 'perspective') {
    // 透视模式：地面网格（X-Z）
    const xTicks = axisTicks(length);
    const zTicks = axisTicks(width);
    for (const x of xTicks) {
      addSegment(
        parent,
        new THREE.Vector3(x, 0.05, 0),
        new THREE.Vector3(x, 0.05, width),
        0x94a3b8,
        x === 0 || x === length ? 0.55 : 0.28,
      );
    }
    for (const z of zTicks) {
      addSegment(
        parent,
        new THREE.Vector3(0, 0.05, z),
        new THREE.Vector3(length, 0.05, z),
        0x94a3b8,
        z === 0 || z === width ? 0.55 : 0.28,
      );
    }
    return;
  }

  if (mode === 'top') {
    const xTicks = axisTicks(length);
    const zTicks = axisTicks(width);
    for (const x of xTicks) {
      addSegment(
        parent,
        new THREE.Vector3(x, height + 0.2, 0),
        new THREE.Vector3(x, height + 0.2, width),
        0x64748b,
        0.45,
      );
    }
    for (const z of zTicks) {
      addSegment(
        parent,
        new THREE.Vector3(0, height + 0.2, z),
        new THREE.Vector3(length, height + 0.2, z),
        0x64748b,
        0.45,
      );
    }
    return;
  }

  if (mode === 'side') {
    // 侧视：X-Y 平面（从 +Z 看）
    const xTicks = axisTicks(length);
    const yTicks = axisTicks(height);
    for (const x of xTicks) {
      addSegment(
        parent,
        new THREE.Vector3(x, 0, width + 0.2),
        new THREE.Vector3(x, height, width + 0.2),
        0x64748b,
        0.4,
      );
    }
    for (const y of yTicks) {
      addSegment(
        parent,
        new THREE.Vector3(0, y, width + 0.2),
        new THREE.Vector3(length, y, width + 0.2),
        0x64748b,
        0.4,
      );
    }
    return;
  }

  // 正视：Z-Y 平面（从箱门 +X 看）
  const zTicks = axisTicks(width);
  const yTicks = axisTicks(height);
  for (const z of zTicks) {
    addSegment(
      parent,
      new THREE.Vector3(length + 0.2, 0, z),
      new THREE.Vector3(length + 0.2, height, z),
      0x64748b,
      0.4,
    );
  }
  for (const y of yTicks) {
    addSegment(
      parent,
      new THREE.Vector3(length + 0.2, y, 0),
      new THREE.Vector3(length + 0.2, y, width),
      0x64748b,
      0.4,
    );
  }
}

function pieceDimText(
  piece: PackingAdminApi.PackingPlacement,
  mode: PackingViewMode,
) {
  const L = formatDim(piece.length);
  const W = formatDim(piece.width);
  const H = formatDim(piece.height);
  if (mode === 'top') return `${L}×${W}`;
  if (mode === 'side') return `${L}×${H}`;
  if (mode === 'front') return `${W}×${H}`;
  return `${L}×${W}×${H}`;
}

function getActiveCamera() {
  return activeCamera;
}

function syncOrthoFrustum() {
  if (!orthoCamera || !hostRef.value) return;
  const host = hostRef.value;
  const aspect = host.clientWidth / Math.max(host.clientHeight, 1);
  const { length, width, height } = props;
  const mode = props.viewMode;
  let contentW = Math.max(length, width, height);
  let contentH = contentW;
  if (mode === 'top') {
    contentW = length;
    contentH = width;
  } else if (mode === 'side') {
    contentW = length;
    contentH = height;
  } else if (mode === 'front') {
    contentW = width;
    contentH = height;
  }
  const margin = 1.25;
  let halfW = (contentW * margin) / 2;
  let halfH = (contentH * margin) / 2;
  if (halfW / halfH < aspect) {
    halfW = halfH * aspect;
  } else {
    halfH = halfW / aspect;
  }
  orthoCamera.left = -halfW;
  orthoCamera.right = halfW;
  orthoCamera.top = halfH;
  orthoCamera.bottom = -halfH;
  const span = Math.max(length, width, height);
  orthoCamera.near = -span * 20;
  orthoCamera.far = span * 20;
  orthoCamera.updateProjectionMatrix();
}

function applyViewMode() {
  if (!controls || !perspectiveCamera || !orthoCamera) return;
  const { length, width, height } = props;
  const mode = props.viewMode;
  const cx = length / 2;
  const cy = height / 2;
  const cz = width / 2;
  const span = Math.max(length, width, height);

  if (mode === 'perspective') {
    activeCamera = perspectiveCamera;
    controls.object = perspectiveCamera;
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.target.set(cx, cy, cz);
    perspectiveCamera.up.set(0, 1, 0);
    perspectiveCamera.position.set(length * 1.45, height * 1.7, width * 3.1);
    perspectiveCamera.near = 1;
    perspectiveCamera.far = span * 20;
    perspectiveCamera.updateProjectionMatrix();
    controls.update();
    return;
  }

  activeCamera = orthoCamera;
  controls.object = orthoCamera;
  controls.enableRotate = false;
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };
  syncOrthoFrustum();

  if (mode === 'top') {
    // 俯视：看 X-Z，箱头在画面上方
    controls.target.set(cx, 0, cz);
    orthoCamera.up.set(0, 0, -1);
    orthoCamera.position.set(cx, height + span * 2, cz);
  } else if (mode === 'side') {
    // 侧视：从右侧看 X-Y（箱长×箱高）
    controls.target.set(cx, cy, 0);
    orthoCamera.up.set(0, 1, 0);
    orthoCamera.position.set(cx, cy, width + span * 2);
  } else {
    // 正视：从箱门看 Z-Y（箱宽×箱高）
    controls.target.set(length, cy, cz);
    orthoCamera.up.set(0, 1, 0);
    orthoCamera.position.set(length + span * 2, cy, cz);
  }
  orthoCamera.lookAt(controls.target);
  controls.update();
}

function fitCamera() {
  applyViewMode();
}

function setDoorView() {
  if (!perspectiveCamera || !controls) return;
  // 切回透视再对准箱门
  if (props.viewMode !== 'perspective') {
    // 调用方应先切 perspective；此处兜底只移透视相机
  }
  const { length, width, height } = props;
  activeCamera = perspectiveCamera;
  controls.object = perspectiveCamera;
  controls.enableRotate = true;
  controls.target.set(length * 0.55, height / 2, width / 2);
  perspectiveCamera.position.set(length * 1.85, height * 0.9, width / 2);
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

  if (props.showRulers) {
    addRulerGrid(shell, props.viewMode, length, width, height);
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
  }

  const head = makeLabel('箱头', labelSize * 1.45, '#1677ff');
  head.position.set(0, height + labelSize * 1.8, width / 2);
  shell.add(head);
  const tail = makeLabel('箱门', labelSize * 1.45, '#cf1322');
  tail.position.set(length, height + labelSize * 1.8, width / 2);
  shell.add(tail);

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
  if (!cargoGroup || !labelGroup) return;
  while (cargoGroup.children.length > 0) {
    const child = cargoGroup.children[0]!;
    cargoGroup.remove(child);
    disposeObject(child);
  }
  while (labelGroup.children.length > 0) {
    const child = labelGroup.children[0]!;
    labelGroup.remove(child);
    disposeObject(child);
  }

  const labelSize = Math.max(props.length, props.width, props.height) * 0.032;
  const mode = props.viewMode;

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
    const cx = piece.x + piece.length / 2;
    const cy = piece.y + piece.height / 2;
    const cz = piece.z + piece.width / 2;
    mesh.position.set(cx, cy, cz);
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

    if (props.showDimLabels) {
      const showDetail =
        props.highlightLineNo <= 0 || piece.lineNo === props.highlightLineNo;
      if (showDetail) {
        const text = pieceDimText(piece, mode);
        const label = makeLabel(text, labelSize, '#0f172a', {
          bg: 'rgba(255,255,255,0.92)',
          padding: 16,
        });
        // 标注贴着件的可见外侧，避免埋进箱体
        if (mode === 'top') {
          label.position.set(cx, piece.y + piece.height + labelSize * 0.9, cz);
        } else if (mode === 'side') {
          label.position.set(cx, cy, piece.z + piece.width + labelSize * 0.6);
        } else if (mode === 'front') {
          label.position.set(piece.x + piece.length + labelSize * 0.6, cy, cz);
        } else {
          label.position.set(cx, piece.y + piece.height + labelSize * 0.8, cz);
        }
        label.userData.loadOrder = piece.loadOrder;
        label.userData.topY = piece.y + piece.height;
        labelGroup.add(label);
      }
    }
  }
  applyVisibility();
}

function applyVisibility() {
  if (!cargoGroup) return;
  const orderLimit = props.visibleLoadOrder;
  const layerLimit = props.maxLayerY;
  const apply = (child: THREE.Object3D) => {
    const order = Number(child.userData.loadOrder ?? 0);
    const topY = Number(child.userData.topY ?? 0);
    const orderOk = orderLimit <= 0 || order <= orderLimit;
    const layerOk = layerLimit <= 0 || topY <= layerLimit + 0.01;
    child.visible = orderOk && layerOk;
  };
  for (const child of cargoGroup.children) apply(child);
  if (labelGroup) {
    for (const child of labelGroup.children) apply(child);
  }
}

function resize() {
  const host = hostRef.value;
  if (!host || !renderer || !perspectiveCamera) return;
  const width = host.clientWidth;
  const height = host.clientHeight;
  if (width <= 0 || height <= 0) return;
  perspectiveCamera.aspect = width / height;
  perspectiveCamera.updateProjectionMatrix();
  if (props.viewMode !== 'perspective') {
    syncOrthoFrustum();
  }
  renderer.setSize(width, height, false);
}

function tick() {
  frameId = requestAnimationFrame(tick);
  controls?.update();
  const cam = getActiveCamera();
  if (renderer && scene && cam) renderer.render(scene, cam);
}

function capturePng(): string | null {
  const cam = getActiveCamera();
  if (!renderer || !scene || !cam) return null;
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL('image/png');
}

defineExpose({
  capturePng,
  setDoorView,
  fitCamera,
  applyViewMode,
});

onMounted(() => {
  const host = hostRef.value;
  if (!host) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf8fafc);
  perspectiveCamera = new THREE.PerspectiveCamera(40, 1, 1, 10000);
  orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10000, 10000);
  activeCamera = perspectiveCamera;

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
  labelGroup = new THREE.Group();
  scene.add(cargoGroup);
  scene.add(labelGroup);

  controls = new OrbitControls(perspectiveCamera, host);
  controls.enableDamping = true;
  controls.enableRotate = true;
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.zoomToCursor = true;
  controls.screenSpacePanning = true;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };

  rebuildContainer();
  rebuildCargos();
  applyViewMode();
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
      props.showRulers,
      props.viewMode,
    ] as const,
  () => {
    rebuildContainer();
    rebuildCargos();
    applyViewMode();
    resize();
  },
);

watch(
  () => [props.placements, props.highlightLineNo, props.showDimLabels] as const,
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
  perspectiveCamera = undefined;
  orthoCamera = undefined;
  activeCamera = undefined;
  controls = undefined;
  cargoGroup = undefined;
  labelGroup = undefined;
});
</script>

<template>
  <div
    ref="hostRef"
    class="packing-scene"
    :class="{ 'packing-scene--ortho': viewMode !== 'perspective' }"
  ></div>
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

.packing-scene--ortho {
  cursor: grab;
}

.packing-scene :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
