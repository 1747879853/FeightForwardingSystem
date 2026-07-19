<script lang="ts" setup>
import type { MascotPosition } from './jht-mascot-state';

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
} from 'vue';

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { buildBrandStorageKey } from '#/utils/brand-storage';

import {
  clampMascotPosition,
  getDefaultMascotPosition,
} from './jht-mascot-state';

defineOptions({ name: 'JhtMascot' });

interface PersistedMascotState {
  closed: boolean;
  position: MascotPosition;
}

const MODEL_SCALE = 0.3;
const ENVIRONMENT_BRIGHTNESS = 1.25;
const TAIL_SWAY_FACTOR = 5;
const MASCOT_SIZE = { height: 218, width: 176 };
const TAIL_BONE_NAMES = ['bone_28', 'bone_29', 'bone_30', 'bone_31', 'bone_32'];
const storageKey = buildBrandStorageKey('jht-desktop-mascot:v2');
const modelUrl = `${import.meta.env.BASE_URL}models/jht/fantasy_creature_desktop_pet.glb`;

const containerRef = shallowRef<HTMLElement>();
const canvasRef = shallowRef<HTMLCanvasElement>();
const position = ref<MascotPosition>({ x: 12, y: 12 });
const isDragging = ref(false);
const isClosed = ref(false);
const isLoading = ref(true);
const loadError = ref(false);

const positionStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
}));

let dragPointerId: null | number = null;
let dragTarget: HTMLElement | null = null;
let dragOffset = { x: 0, y: 0 };
let animationFrameId = 0;
let disposed = false;
let renderer: null | THREE.WebGLRenderer = null;
let scene: null | THREE.Scene = null;
let camera: null | THREE.PerspectiveCamera = null;
let model: null | THREE.Object3D = null;
let mixer: null | THREE.AnimationMixer = null;
let headFollow: null | THREE.Object3D = null;
let headBaseQuaternion: null | THREE.Quaternion = null;
let tailBones: THREE.Object3D[] = [];
let tailBaseQuaternions: THREE.Quaternion[] = [];
let tailAnimatedQuaternions: THREE.Quaternion[] = [];
const clock = new THREE.Clock();
const pointer = new THREE.Vector2();
const smoothedPointer = new THREE.Vector2();
const headOffsetEuler = new THREE.Euler(0, 0, 0, 'XYZ');
const headOffsetQuaternion = new THREE.Quaternion();
const tailOffsetEuler = new THREE.Euler(0, 0, 0, 'XYZ');
const tailOffsetQuaternion = new THREE.Quaternion();

function viewportSize() {
  return { height: window.innerHeight, width: window.innerWidth };
}

function clampToViewport() {
  position.value = clampMascotPosition(
    position.value,
    viewportSize(),
    MASCOT_SIZE,
  );
}

function persistState() {
  const state: PersistedMascotState = {
    closed: isClosed.value,
    position: position.value,
  };
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

function restoreState() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return false;
    const saved = JSON.parse(raw) as Partial<PersistedMascotState>;
    if (!saved.position) return false;
    position.value = clampMascotPosition(
      saved.position,
      viewportSize(),
      MASCOT_SIZE,
    );
    isClosed.value = saved.closed === true;
    return true;
  } catch {
    return false;
  }
}

function handleDragStart(event: PointerEvent) {
  if (event.button !== 0) return;
  const element = containerRef.value;
  if (!element) return;
  const bounds = element.getBoundingClientRect();
  dragPointerId = event.pointerId;
  dragOffset = {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  };
  isDragging.value = true;
  dragTarget = event.currentTarget as HTMLElement;
  dragTarget.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function handleDragMove(event: PointerEvent) {
  if (!isDragging.value || dragPointerId !== event.pointerId) return;
  position.value = clampMascotPosition(
    {
      x: event.clientX - dragOffset.x,
      y: event.clientY - dragOffset.y,
    },
    viewportSize(),
    MASCOT_SIZE,
  );
}

function handleDragEnd(event: PointerEvent) {
  if (dragPointerId !== event.pointerId) return;
  if (dragTarget?.hasPointerCapture(event.pointerId)) {
    dragTarget.releasePointerCapture(event.pointerId);
  }
  dragPointerId = null;
  dragTarget = null;
  isDragging.value = false;
  persistState();
}

function closeMascot() {
  isClosed.value = true;
  persistState();
  window.cancelAnimationFrame(animationFrameId);
  window.removeEventListener('resize', clampToViewport);
  window.removeEventListener('pointermove', handlePointerMove);
  disposeScene();
}

function handlePointerMove(event: PointerEvent) {
  pointer.x = THREE.MathUtils.clamp(
    (event.clientX / window.innerWidth) * 2 - 1,
    -1,
    1,
  );
  pointer.y = THREE.MathUtils.clamp(
    (event.clientY / window.innerHeight) * 2 - 1,
    -1,
    1,
  );
}

function resizeRenderer() {
  if (!renderer || !camera || !canvasRef.value) return;
  const width = canvasRef.value.clientWidth;
  const height = canvasRef.value.clientHeight;
  if (!width || !height) return;
  const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
  const targetWidth = Math.round(width * pixelRatio);
  const targetHeight = Math.round(height * pixelRatio);
  if (
    canvasRef.value.width !== targetWidth ||
    canvasRef.value.height !== targetHeight
  ) {
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function applyTailSway() {
  tailBones.forEach((bone, index) => {
    tailOffsetQuaternion
      .copy(tailBaseQuaternions[index]!)
      .invert()
      .multiply(tailAnimatedQuaternions[index]!);
    tailOffsetEuler.setFromQuaternion(tailOffsetQuaternion, 'XYZ');
    tailOffsetEuler.x *= TAIL_SWAY_FACTOR;
    tailOffsetEuler.y *= TAIL_SWAY_FACTOR;
    tailOffsetEuler.z *= TAIL_SWAY_FACTOR;
    tailOffsetQuaternion.setFromEuler(tailOffsetEuler);
    bone.quaternion
      .copy(tailBaseQuaternions[index]!)
      .multiply(tailOffsetQuaternion);
  });
}

function applyHeadFollow(delta: number) {
  if (!headFollow || !headBaseQuaternion) return;
  smoothedPointer.x = THREE.MathUtils.damp(
    smoothedPointer.x,
    pointer.x,
    6.5,
    delta,
  );
  smoothedPointer.y = THREE.MathUtils.damp(
    smoothedPointer.y,
    pointer.y,
    6.5,
    delta,
  );
  headOffsetEuler.set(
    THREE.MathUtils.degToRad(5 * smoothedPointer.y),
    THREE.MathUtils.degToRad(8 * smoothedPointer.x),
    0,
  );
  headOffsetQuaternion.setFromEuler(headOffsetEuler);
  headFollow.quaternion.copy(headBaseQuaternion).multiply(headOffsetQuaternion);
}

function renderFrame() {
  animationFrameId = window.requestAnimationFrame(renderFrame);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (isClosed.value || !renderer || !scene || !camera) {
    return;
  }

  resizeRenderer();
  if (mixer) {
    mixer.update(delta);
    tailBones.forEach((bone, index) => {
      tailAnimatedQuaternions[index]!.copy(bone.quaternion);
    });
    applyTailSway();
  }
  applyHeadFollow(delta);
  renderer.render(scene, camera);
}

async function initializeRenderer() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    canvas,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02 * ENVIRONMENT_BRIGHTNESS;
  renderer.setClearAlpha(0);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(28, 1, 0.01, 20);
  camera.position.set(0, 0.18, 1.34);
  camera.lookAt(0, 0.15, 0);

  scene.add(new THREE.HemisphereLight(0xfffbef, 0x91a99f, 2.05));
  const keyLight = new THREE.DirectionalLight(0xffeadb, 3.65);
  keyLight.position.set(-1.4, 2.2, 2.8);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xb9ddd2, 2.25);
  rimLight.position.set(2.2, 1.1, -1.8);
  scene.add(rimLight);

  try {
    const gltf = await new GLTFLoader().loadAsync(modelUrl);
    if (disposed || !scene) return;
    model = gltf.scene;
    model.scale.setScalar(MODEL_SCALE);
    scene.add(model);

    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.y -= bounds.min.y;
    model.position.z -= center.z;

    headFollow = model.getObjectByName('CTRL_HeadFollow') ?? null;
    headBaseQuaternion = headFollow?.quaternion.clone() ?? null;
    tailBones = TAIL_BONE_NAMES.map((name) =>
      model!.getObjectByName(name),
    ).filter((bone): bone is THREE.Object3D => Boolean(bone));
    tailBaseQuaternions = tailBones.map((bone) => bone.quaternion.clone());
    tailAnimatedQuaternions = tailBones.map((bone) => bone.quaternion.clone());

    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(gltf.animations[0]!);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.play();
      mixer.update(0);
    }

    isLoading.value = false;
  } catch (error) {
    console.error('[JhtMascot] Failed to load mascot model', error);
    isLoading.value = false;
    loadError.value = true;
  }
}

function disposeScene() {
  if (model) {
    model.traverse((node) => {
      const mesh = node as THREE.Mesh;
      mesh.geometry?.dispose();
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : mesh.material
          ? [mesh.material]
          : [];
      materials.forEach((material) => material.dispose());
    });
  }
  renderer?.dispose();
  renderer = null;
  scene = null;
  camera = null;
  model = null;
  mixer = null;
}

onMounted(async () => {
  const restored = restoreState();
  if (!restored) {
    position.value = getDefaultMascotPosition(viewportSize(), MASCOT_SIZE);
  }
  if (isClosed.value) return;
  await nextTick();
  window.addEventListener('resize', clampToViewport, { passive: true });
  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  await initializeRenderer();
  renderFrame();
});

onBeforeUnmount(() => {
  disposed = true;
  window.cancelAnimationFrame(animationFrameId);
  window.removeEventListener('resize', clampToViewport);
  window.removeEventListener('pointermove', handlePointerMove);
  disposeScene();
});
</script>

<template>
  <section
    v-if="!isClosed"
    ref="containerRef"
    class="jht-mascot"
    :class="{ 'is-dragging': isDragging }"
    :style="positionStyle"
    aria-label="津海通企业吉祥物"
  >
    <div
      class="jht-mascot__stage"
      aria-live="polite"
      @pointercancel="handleDragEnd"
      @pointerdown="handleDragStart"
      @pointermove="handleDragMove"
      @pointerup="handleDragEnd"
    >
      <canvas ref="canvasRef" aria-label="津海通三维企业吉祥物"></canvas>
      <div v-if="isLoading" class="jht-mascot__message">
        <span class="jht-mascot__loader" aria-hidden="true"></span>
        正在唤醒
      </div>
      <div v-else-if="loadError" class="jht-mascot__message is-error">
        吉祥物暂时休息
      </div>
    </div>

    <button
      class="jht-mascot__close"
      type="button"
      aria-label="关闭吉祥物"
      title="关闭吉祥物"
      @pointerdown.stop
      @click="closeMascot"
    >
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="m6 6 8 8M14 6l-8 8" />
      </svg>
    </button>
  </section>
</template>

<style scoped>
.jht-mascot {
  position: fixed;
  z-index: 900;
  width: 176px;
  height: 218px;
  overflow: visible;
  color: #18352f;
  pointer-events: none;
  user-select: none;
  transition:
    filter 180ms ease,
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.jht-mascot.is-dragging {
  filter: drop-shadow(0 18px 18px rgb(25 55 49 / 24%));
  transform: scale(1.015);
}

.jht-mascot__close {
  position: absolute;
  top: 6px;
  right: 4px;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  color: #315f56;
  pointer-events: auto;
  cursor: pointer;
  background: rgb(248 251 249 / 82%);
  border: 1px solid rgb(22 105 91 / 14%);
  border-radius: 50%;
  box-shadow: 0 5px 14px rgb(25 55 49 / 11%);
  opacity: 0.48;
  backdrop-filter: blur(8px);
  transition:
    background 140ms ease,
    border-color 140ms ease,
    opacity 140ms ease,
    transform 140ms ease;
}

.jht-mascot:hover .jht-mascot__close,
.jht-mascot__close:hover,
.jht-mascot__close:focus-visible {
  background: rgb(241 248 245 / 96%);
  border-color: rgb(22 105 91 / 28%);
  opacity: 1;
}

.jht-mascot__close:hover {
  transform: scale(1.06);
}

.jht-mascot__close svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentcolor;
  stroke-width: 1.7;
  stroke-linecap: round;
}

.jht-mascot__close:focus-visible {
  outline: 2px solid #2e8b78;
  outline-offset: 2px;
}

.jht-mascot__stage {
  position: relative;
  width: 100%;
  height: 100%;
  pointer-events: auto;
  touch-action: none;
  cursor: grab;
}

.is-dragging .jht-mascot__stage {
  cursor: grabbing;
}

.jht-mascot__stage canvas {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
  filter: drop-shadow(0 10px 10px rgb(25 55 49 / 16%));
}

.jht-mascot__message {
  position: absolute;
  inset: 0;
  display: flex;
  gap: 9px;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #60756f;
  letter-spacing: 0.08em;
}

.jht-mascot__message.is-error {
  color: #7a5a4e;
}

.jht-mascot__loader {
  width: 12px;
  height: 12px;
  border: 1px solid rgb(46 139 120 / 25%);
  border-top-color: #2e8b78;
  border-radius: 50%;
  animation: jht-mascot-spin 800ms linear infinite;
}

@keyframes jht-mascot-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .jht-mascot,
  .jht-mascot__close {
    transition: none;
  }

  .jht-mascot__loader {
    animation-duration: 1600ms;
  }
}
</style>
