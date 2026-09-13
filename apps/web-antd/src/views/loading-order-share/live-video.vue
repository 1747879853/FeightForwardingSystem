<script setup lang="ts">
import type Mpegts from 'mpegts.js';

import type { LoadingVideoPlay } from '#/api/sea-export/loading-order-video';

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { Button, Spin } from 'ant-design-vue';

import {
  controlLoadingVideo,
  getLoadingVideoViewers,
  loadingVideoError,
  startLoadingVideo,
} from '#/api/sea-export/loading-order-video';

const props = defineProps<{
  mblNum: string;
  loadingOrderNum: string;
  lang: 'en' | 'zh';
  completed: boolean;
}>();
const english = computed(() => props.lang === 'en');
const video = ref<HTMLVideoElement>();
const opened = ref(false);
const busy = ref(false);
const playing = ref(false);
const error = ref('');
const controlError = ref('');
const ended = ref(props.completed);
const unsupported = ref(false);
const playInfo = ref<LoadingVideoPlay>();
const viewers = ref<number | null>(null);
const needGesture = ref(false);
const query = { mblNum: props.mblNum, loadingOrderNum: props.loadingOrderNum };
let player: ReturnType<typeof Mpegts.createPlayer> | undefined;
let alive = true;
let generation = 0;
let request: AbortController | undefined;
let poll: ReturnType<typeof setTimeout> | undefined;
let firstFrameTimeout: ReturnType<typeof setTimeout> | undefined;
const connecting = ref(false);
let controlQueue = Promise.resolve();
let moving = false;
let controlVersion = 0;

const pad = [
  { command: 5, place: 'nw', zh: '左上', en: 'Up left' },
  { command: 3, place: 'n', zh: '向上', en: 'Up' },
  { command: 6, place: 'ne', zh: '右上', en: 'Up right' },
  { command: 1, place: 'w', zh: '向左', en: 'Left' },
  { command: 2, place: 'e', zh: '向右', en: 'Right' },
  { command: 7, place: 'sw', zh: '左下', en: 'Down left' },
  { command: 4, place: 's', zh: '向下', en: 'Down' },
  { command: 8, place: 'se', zh: '右下', en: 'Down right' },
] as const;

function destroyPlayer() {
  needGesture.value = false;
  clearTimeout(firstFrameTimeout);
  connecting.value = false;
  clearTimeout(poll);
  poll = undefined;
  const previous = player;
  player = undefined;
  playing.value = false;
  previous?.destroy();
}

function showError(failure: unknown) {
  error.value = loadingVideoError(
    failure,
    english.value
      ? 'Video connection failed. Please retry.'
      : '视频连接失败，请稍后重试',
  );
  if (/监装已完成|视频已关闭/.test(error.value)) ended.value = true;
}

async function pollViewers(token: number) {
  if (!alive || token !== generation || !player) return;
  try {
    const result = await getLoadingVideoViewers(query, request?.signal);
    if (!alive || token !== generation) return;
    viewers.value = result.viewerCount;
  } catch (failure) {
    if (!alive || token !== generation) return;
    viewers.value = null;
    const message = loadingVideoError(failure, '');
    if (
      /监装已完成|视频已关闭|未绑定摄像头|主提单号或监装工单号错误/.test(
        message,
      )
    ) {
      destroyPlayer();
      stopControl();
      showError(failure);
      return;
    }
  }
  if (alive && token === generation && player) {
    poll = setTimeout(() => void pollViewers(token), 10_000);
  }
}

async function diagnosePlayback(token: number, firstFrameTimedOut = false) {
  if (!alive || token !== generation || !player) return;
  // 先断开自己的连接，再查业务错误，避免诊断被自己的观看位干扰。
  destroyPlayer();
  stopControl();
  busy.value = true;
  try {
    await startLoadingVideo(query, request?.signal);
    if (alive && token === generation) {
      error.value = firstFrameTimedOut
        ? english.value
          ? 'No playable video received after 30 seconds. Please ask an administrator to check the camera stream and video relay.'
          : '等待30秒仍未收到可播放画面，请联系管理员检查摄像头出流与视频转发'
        : english.value
          ? 'Video interrupted. Please retry.'
          : '视频已中断，请重试连接';
    }
  } catch (failure) {
    if (alive && token === generation) showError(failure);
  } finally {
    if (alive && token === generation) busy.value = false;
  }
}

async function start() {
  if (!alive || busy.value || ended.value || !opened.value) return;
  const token = ++generation;
  request?.abort();
  request = new AbortController();
  destroyPlayer();
  busy.value = true;
  error.value = '';
  needGesture.value = false;
  try {
    const { default: mpegts } = await import('mpegts.js');
    if (!alive || token !== generation) return;
    if (!mpegts.getFeatureList().mseLivePlayback) {
      unsupported.value = true;
      error.value = english.value
        ? 'Please open this video in a desktop browser that supports live FLV playback.'
        : '当前浏览器不支持直播，请使用电脑端 Chrome 或 Edge 查看';
      return;
    }
    const info = await startLoadingVideo(query, request.signal);
    if (!alive || token !== generation || !video.value) return;
    playInfo.value = info;
    viewers.value = info.viewerCount;
    const current = mpegts.createPlayer(
      { type: 'flv', isLive: true, url: info.flvUrl, withCredentials: false },
      {
        enableStashBuffer: false,
        lazyLoad: false,
        liveBufferLatencyChasing: true,
        autoCleanupSourceBuffer: true,
      },
    );
    player = current;
    connecting.value = true;
    current.on(mpegts.Events.ERROR, () => void diagnosePlayback(token));
    current.on(
      mpegts.Events.LOADING_COMPLETE,
      () => void diagnosePlayback(token),
    );
    current.attachMediaElement(video.value);
    current.load();
    firstFrameTimeout = setTimeout(
      () => void diagnosePlayback(token, true),
      30_000,
    );
    void current.play()?.catch(() => {
      if (alive && token === generation && player === current) {
        clearTimeout(firstFrameTimeout);
        connecting.value = false;
        needGesture.value = true;
      }
    });
    poll = setTimeout(() => void pollViewers(token), 10_000);
  } catch (failure) {
    if (alive && token === generation) {
      destroyPlayer();
      showError(failure);
    }
  } finally {
    if (alive && token === generation) busy.value = false;
  }
}

function resume() {
  void player
    ?.play()
    ?.then(() => {
      needGesture.value = false;
    })
    .catch(() => void diagnosePlayback(generation));
}

function onPlaying() {
  if (!player) return;
  clearTimeout(firstFrameTimeout);
  connecting.value = false;
  needGesture.value = false;
  playing.value = true;
}

function queueControl(command: number, version = controlVersion) {
  controlQueue = controlQueue.then(async () => {
    if (command !== 0 && (!alive || version !== controlVersion)) return;
    try {
      await controlLoadingVideo({ ...query, command });
    } catch (failure) {
      if (alive)
        controlError.value = loadingVideoError(failure, '云台指令发送失败');
    }
  });
}

function beginControl(command: number) {
  if (!playing.value || moving) return;
  moving = true;
  controlError.value = '';
  queueControl(command, ++controlVersion);
}

function stopControl(force = false) {
  if (!moving && !force) return;
  moving = false;
  ++controlVersion;
  // 串行保证开始请求即使很慢，停止也最终在它之后下发。
  queueControl(0);
}

function pointerDown(event: PointerEvent, command: number) {
  if (event.button !== 0) return;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  beginControl(command);
}

function keyDown(event: KeyboardEvent, command: number) {
  if (![' ', 'Enter'].includes(event.key)) return;
  event.preventDefault();
  if (!event.repeat) beginControl(command);
}

const release = () => stopControl();

async function openPlayer() {
  if (ended.value || opened.value) return;
  opened.value = true;
  document.body.style.overflow = 'hidden';
  await nextTick();
  void start();
}

function closeVideo() {
  ++generation;
  request?.abort();
  busy.value = false;
  destroyPlayer();
  stopControl(true);
}

function closePlayer() {
  opened.value = false;
  document.body.style.overflow = '';
  closeVideo();
}

const onPageShow = (event: PageTransitionEvent) => {
  if (event.persisted && opened.value) void start();
};
const onVisibility = () => {
  if (document.hidden) stopControl();
};
const onEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && opened.value) closePlayer();
};

onMounted(() => {
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('blur', release);
  window.addEventListener('pagehide', closePlayer);
  window.addEventListener('pageshow', onPageShow);
  window.addEventListener('keydown', onEscape);
  document.addEventListener('visibilitychange', onVisibility);
});

onBeforeUnmount(() => {
  alive = false;
  closePlayer();
  window.removeEventListener('pointerup', release);
  window.removeEventListener('pointercancel', release);
  window.removeEventListener('blur', release);
  window.removeEventListener('pagehide', closePlayer);
  window.removeEventListener('pageshow', onPageShow);
  window.removeEventListener('keydown', onEscape);
  document.removeEventListener('visibilitychange', onVisibility);
});
</script>

<template>
  <section class="live-video">
    <p v-if="ended" class="live-video__closed">
      {{
        english ? 'Loading completed. Video closed.' : '监装已完成，视频已关闭'
      }}
    </p>
    <button v-else type="button" class="live-video__open" @click="openPlayer">
      <span class="live-video__open-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 7.5v9l8-4.5-8-4.5Z" />
        </svg>
      </span>
      <span class="live-video__open-copy">
        <strong>{{ english ? 'View live video' : '查看监装视频' }}</strong>
        <em>{{
          english
            ? 'Opens fullscreen. Stream starts only after you click.'
            : '点击后全屏查看现场画面'
        }}</em>
      </span>
    </button>

    <Teleport to="body">
      <div
        v-if="opened"
        class="live-video__overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="english ? 'Live loading video' : '监装直播'"
      >
        <header class="live-video__bar">
          <div>
            <strong>{{ english ? 'Live loading video' : '监装直播' }}</strong>
            <span v-if="playInfo">
              {{ playInfo.camera.name }} ·
              {{ english ? 'Connections' : '观看' }}
              {{ viewers ?? '—' }} / {{ playInfo.maxViewerCount }}
            </span>
          </div>
          <button
            type="button"
            class="live-video__close"
            :aria-label="english ? 'Close video' : '关闭视频'"
            @click="closePlayer"
          >
            {{ english ? 'Close' : '关闭' }}
          </button>
        </header>

        <div class="live-video__stage" :aria-busy="busy">
          <video
            ref="video"
            muted
            playsinline
            @playing="onPlaying"
            @pause="release"
          />
          <div
            v-if="busy || connecting || ended || error || needGesture"
            class="live-video__state"
            role="status"
            aria-live="polite"
          >
            <Spin v-if="busy || (connecting && !needGesture)" />
            <p>
              {{
                ended
                  ? english
                    ? 'Loading completed. Video closed.'
                    : '监装已完成，视频已关闭'
                  : busy || (connecting && !needGesture)
                    ? english
                      ? 'Waiting for the camera…'
                      : '正在连接摄像头，等待设备出流…'
                    : error
              }}
            </p>
            <Button
              v-if="
                !busy && (!connecting || needGesture) && !ended && !unsupported
              "
              @click="needGesture ? resume() : start()"
              >{{ english ? 'Play / retry' : '播放 / 重试' }}</Button
            >
          </div>

          <div v-if="!ended && !unsupported" class="live-video__hud">
            <div class="live-video__ptz" role="group" aria-label="云台">
              <div class="live-video__pad">
                <button
                  v-for="item in pad"
                  :key="item.command"
                  type="button"
                  :class="`is-${item.place}`"
                  :aria-label="english ? item.en : item.zh"
                  :title="english ? item.en : item.zh"
                  :disabled="!playing"
                  @pointerdown.prevent="pointerDown($event, item.command)"
                  @pointerup="release"
                  @pointercancel="release"
                  @lostpointercapture="release"
                  @keydown="keyDown($event, item.command)"
                  @keyup.space.prevent="release"
                  @keyup.enter.prevent="release"
                  @blur="release"
                  @contextmenu.prevent
                >
                  <span />
                </button>
              </div>
              <div class="live-video__zoom">
                <button
                  type="button"
                  :aria-label="english ? 'Zoom in' : '放大'"
                  :title="english ? 'Zoom in' : '放大'"
                  :disabled="!playing"
                  @pointerdown.prevent="pointerDown($event, 9)"
                  @pointerup="release"
                  @pointercancel="release"
                  @lostpointercapture="release"
                  @keydown="keyDown($event, 9)"
                  @keyup.space.prevent="release"
                  @keyup.enter.prevent="release"
                  @blur="release"
                  @contextmenu.prevent
                >
                  +
                </button>
                <button
                  type="button"
                  :aria-label="english ? 'Zoom out' : '缩小'"
                  :title="english ? 'Zoom out' : '缩小'"
                  :disabled="!playing"
                  @pointerdown.prevent="pointerDown($event, 10)"
                  @pointerup="release"
                  @pointercancel="release"
                  @lostpointercapture="release"
                  @keydown="keyDown($event, 10)"
                  @keyup.space.prevent="release"
                  @keyup.enter.prevent="release"
                  @blur="release"
                  @contextmenu.prevent
                >
                  −
                </button>
              </div>
            </div>
            <p v-if="controlError" class="live-video__ptz-error" role="alert">
              {{ controlError }}
            </p>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.live-video {
  margin: 8px 0 22px;
}

.live-video__closed,
.live-video__open {
  box-sizing: border-box;
  width: 100%;
  padding: 18px 20px;
  background: #fff;
  border: 1px solid #e1e7ef;
  border-radius: 12px;
}

.live-video__closed {
  margin: 0;
  font-size: 14px;
  color: #6b7b90;
}

.live-video__open {
  display: flex;
  gap: 14px;
  align-items: center;
  text-align: left;
  cursor: pointer;
}

.live-video__open:hover {
  border-color: #c5d4e6;
  box-shadow: 0 8px 24px rgb(36 52 74 / 6%);
}

.live-video__open-icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 44px;
  height: 44px;
  color: #fff;
  background: hsl(var(--primary));
  border-radius: 50%;
}

.live-video__open-icon svg {
  width: 22px;
  height: 22px;
  margin-left: 2px;
}

.live-video__open-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.live-video__open-copy strong {
  font-size: 16px;
  font-weight: 600;
  color: #24344a;
}

.live-video__open-copy em {
  font-size: 12px;
  font-style: normal;
  color: #6b7b90;
}

.live-video__overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  background: #0b1220;
}

.live-video__bar {
  display: flex;
  flex-shrink: 0;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  color: #e8eef6;
}

.live-video__bar strong {
  margin-right: 12px;
  font-size: 15px;
}

.live-video__bar span {
  font-size: 12px;
  color: #93a4bb;
}

.live-video__close {
  padding: 6px 12px;
  font-size: 13px;
  color: #e8eef6;
  cursor: pointer;
  background: rgb(255 255 255 / 8%);
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 8px;
}

.live-video__stage {
  position: relative;
  flex: 1;
  min-height: 0;
  background: #000;
}

.live-video__stage video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.live-video__state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #fff;
  text-align: center;
  background: #0b1220;
}

.live-video__hud {
  position: absolute;
  right: 20px;
  bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
}

.live-video__ptz {
  display: flex;
  gap: 14px;
  align-items: center;
}

.live-video__pad {
  position: relative;
  width: 164px;
  height: 164px;
  background: rgb(8 14 26 / 55%);
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 4%);
  backdrop-filter: blur(10px);
}

.live-video__pad button,
.live-video__zoom button {
  padding: 0;
  color: #f3f7fc;
  touch-action: none;
  cursor: pointer;
  user-select: none;
  background: rgb(255 255 255 / 10%);
  border: 1px solid rgb(255 255 255 / 12%);
}

.live-video__pad button {
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.live-video__pad button span {
  display: block;
  width: 8px;
  height: 8px;
  margin: 0 auto;
  border-top: 2px solid currentcolor;
  border-right: 2px solid currentcolor;
}

.live-video__pad .is-n {
  top: 10px;
  left: 62px;
}

.live-video__pad .is-n span {
  transform: rotate(-45deg) translateY(1px);
}

.live-video__pad .is-s {
  bottom: 10px;
  left: 62px;
}

.live-video__pad .is-s span {
  transform: rotate(135deg) translateY(1px);
}

.live-video__pad .is-w {
  top: 62px;
  left: 10px;
}

.live-video__pad .is-w span {
  transform: rotate(-135deg) translateY(1px);
}

.live-video__pad .is-e {
  top: 62px;
  right: 10px;
}

.live-video__pad .is-e span {
  transform: rotate(45deg) translateY(1px);
}

.live-video__pad .is-nw {
  top: 24px;
  left: 24px;
  width: 32px;
  height: 32px;
}

.live-video__pad .is-nw span {
  transform: rotate(-90deg);
}

.live-video__pad .is-ne {
  top: 24px;
  right: 24px;
  width: 32px;
  height: 32px;
}

.live-video__pad .is-ne span {
  transform: rotate(0deg);
}

.live-video__pad .is-sw {
  bottom: 24px;
  left: 24px;
  width: 32px;
  height: 32px;
}

.live-video__pad .is-sw span {
  transform: rotate(180deg);
}

.live-video__pad .is-se {
  right: 24px;
  bottom: 24px;
  width: 32px;
  height: 32px;
}

.live-video__pad .is-se span {
  transform: rotate(90deg);
}

.live-video__zoom {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.live-video__zoom button {
  width: 40px;
  height: 40px;
  font-size: 20px;
  line-height: 1;
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.live-video__pad button:active,
.live-video__zoom button:active {
  background: hsl(var(--primary) / 70%);
}

.live-video__pad button:disabled,
.live-video__zoom button:disabled {
  cursor: default;
  opacity: 0.35;
}

.live-video__pad button:focus-visible,
.live-video__zoom button:focus-visible,
.live-video__close:focus-visible,
.live-video__open:focus-visible {
  outline: 2px solid #7cb3ff;
  outline-offset: 2px;
}

.live-video__ptz-error {
  max-width: 240px;
  margin: 0;
  font-size: 12px;
  color: #fecaca;
  text-align: right;
}

@media (max-width: 600px) {
  .live-video__hud {
    right: 12px;
    bottom: 16px;
  }

  .live-video__pad {
    width: 148px;
    height: 148px;
  }

  .live-video__pad .is-n,
  .live-video__pad .is-s {
    left: 54px;
  }

  .live-video__pad .is-w,
  .live-video__pad .is-e {
    top: 54px;
  }
}
</style>
