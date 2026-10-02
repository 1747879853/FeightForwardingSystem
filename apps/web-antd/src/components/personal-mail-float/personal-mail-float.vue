<script setup lang="ts">
import type { PersonalMailAdminApi } from '#/api/personal-mail/personal-mail-admin';

import { computed, onMounted, onUnmounted, useTemplateRef, watch } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { useDraggable } from '@vueuse/core';

import { isJhtBrand } from '#/utils/brand-assets';
import {
  formatMailTime,
  senderInitial,
} from '#/views/personal-mail/mail-format';

import { usePersonalMailFloat } from './use-personal-mail-float';

const FAB_SIZE = 52;
const EDGE = 8;
const POSITION_KEY = 'personal-mail-float-position';

const router = useRouter();
const mail = usePersonalMailFloat();
const rootRef = useTemplateRef('root');
const fabRef = useTemplateRef('fab');

function defaultAnchor() {
  const beside = isJhtBrand ? 186 : 0;
  return clamp(
    window.innerWidth - FAB_SIZE - 24 - beside,
    window.innerHeight - FAB_SIZE - 24,
  );
}

function clamp(x: number, y: number) {
  const maxX = Math.max(EDGE, window.innerWidth - FAB_SIZE - EDGE);
  const maxY = Math.max(EDGE, window.innerHeight - FAB_SIZE - EDGE);
  return {
    x: Math.min(Math.max(EDGE, x), maxX),
    y: Math.min(Math.max(EDGE, y), maxY),
  };
}

function readAnchor() {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return defaultAnchor();
    const parsed = JSON.parse(raw) as { x?: number; y?: number };
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') {
      return defaultAnchor();
    }
    return clamp(parsed.x, parsed.y);
  } catch {
    return defaultAnchor();
  }
}

let dragOrigin = { x: 0, y: 0 };
let suppressClick = false;
let toggledByPointer = false;

const { position, isDragging, style } = useDraggable(rootRef, {
  handle: fabRef,
  initialValue: readAnchor(),
  preventDefault: true,
  onStart() {
    dragOrigin = { x: position.value.x, y: position.value.y };
    suppressClick = false;
  },
  onMove(current) {
    const next = clamp(current.x, current.y);
    current.x = next.x;
    current.y = next.y;
    if (Math.hypot(next.x - dragOrigin.x, next.y - dragOrigin.y) > 4) {
      suppressClick = true;
    }
  },
  onEnd(current) {
    const next = clamp(current.x, current.y);
    current.x = next.x;
    current.y = next.y;
    localStorage.setItem(POSITION_KEY, JSON.stringify(next));
  },
});

const panelBelow = computed(() => position.value.y < 280);
const panelToRight = computed(() => position.value.x < 200);

function keepInside() {
  const next = clamp(position.value.x, position.value.y);
  position.value = next;
}

onMounted(() => {
  window.addEventListener('resize', keepInside);
});

watch(
  mail.canWatch,
  (enabled) => {
    if (enabled) {
      void mail.startMailWatch();
      return;
    }
    mail.stopMailWatch();
  },
  { immediate: true },
);

onUnmounted(() => {
  window.removeEventListener('resize', keepInside);
  mail.stopMailWatch();
});

function senderText(item: PersonalMailAdminApi.MailSummary) {
  return item.from?.name?.trim() || item.from?.address?.trim() || '未知发件人';
}

function onFabPointerUp(event: PointerEvent) {
  if (event.button !== 0 || suppressClick) return;
  toggledByPointer = true;
  mail.togglePanel();
}

function onFabClick() {
  if (suppressClick || toggledByPointer) {
    suppressClick = false;
    toggledByPointer = false;
    return;
  }
  mail.togglePanel();
}

function openInbox() {
  mail.expanded.value = false;
  void router.push({ name: 'PersonalMail' });
}

function openPreview(item: PersonalMailAdminApi.MailSummary) {
  mail.expanded.value = false;
  void router.push({
    name: 'PersonalMail',
    query: {
      folder: item.folderName || '',
      uid: String(item.uid),
    },
  });
}
</script>

<template>
  <aside
    v-if="mail.ready.value"
    ref="root"
    class="mail-float"
    :class="{
      'is-dragging': isDragging,
      'is-panel-below': panelBelow,
      'is-panel-right': panelToRight,
    }"
    :style="style"
  >
    <section v-if="mail.expanded.value" class="mail-float__panel">
      <header class="mail-float__head">
        <div class="mail-float__identity">
          <strong>{{ mail.accountName.value || '个人邮箱' }}</strong>
          <span v-if="mail.accountEmail.value">{{
            mail.accountEmail.value
          }}</span>
        </div>
        <button
          type="button"
          class="mail-float__icon"
          @click="mail.togglePanel"
        >
          <IconifyIcon icon="lucide:x" />
        </button>
      </header>
      <p class="mail-float__stat">
        收件箱
        {{ mail.inboxTotal.value == null ? '—' : mail.inboxTotal.value }}
        封
        <template v-if="(mail.inboxUnread.value || 0) > 0">
          · 未读 {{ mail.inboxUnread.value }}
        </template>
      </p>
      <div class="mail-float__list">
        <p v-if="mail.loadingPreview.value" class="mail-float__empty">
          正在收取…
        </p>
        <p
          v-else-if="mail.previews.value.length === 0"
          class="mail-float__empty"
        >
          暂时没有新邮件
        </p>
        <button
          v-for="item in mail.previews.value"
          :key="item.uid"
          type="button"
          class="mail-float__item"
          :class="{ 'is-unread': !item.isRead }"
          @click="openPreview(item)"
        >
          <span class="mail-float__avatar">{{ senderInitial(item.from) }}</span>
          <span class="mail-float__main">
            <span class="mail-float__line">
              <span class="mail-float__from">{{ senderText(item) }}</span>
              <span class="mail-float__time">{{
                formatMailTime(item.date)
              }}</span>
            </span>
            <span class="mail-float__subject">
              {{ item.subject || '(无主题)' }}
            </span>
          </span>
        </button>
      </div>
      <button type="button" class="mail-float__open" @click="openInbox">
        打开邮箱
      </button>
    </section>
    <button
      ref="fab"
      type="button"
      class="mail-float__fab"
      :title="
        mail.unreadBadge.value
          ? `未读 ${mail.unreadBadge.value}，按住可拖动`
          : '个人邮箱，按住可拖动'
      "
      @click="onFabClick"
      @pointerup="onFabPointerUp"
    >
      <IconifyIcon icon="lucide:mail" />
      <span v-if="mail.unreadBadge.value" class="mail-float__badge">
        {{ mail.unreadBadge.value }}
      </span>
    </button>
  </aside>
</template>

<style scoped>
.mail-float {
  position: fixed;
  z-index: 860;
  width: 52px;
  height: 52px;
  touch-action: none;
  user-select: none;
}

.mail-float.is-dragging {
  z-index: 870;
}

.mail-float__panel {
  position: absolute;
  right: 0;
  bottom: calc(100% + 10px);
  display: flex;
  flex-direction: column;
  width: min(360px, calc(100vw - 32px));
  max-height: min(480px, calc(100vh - 120px));
  overflow: hidden;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  box-shadow: 0 16px 40px rgb(15 23 42 / 16%);
}

.mail-float.is-panel-below .mail-float__panel {
  top: calc(100% + 10px);
  bottom: auto;
}

.mail-float.is-panel-right .mail-float__panel {
  right: auto;
  left: 0;
}

.mail-float__head {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 14px 14px 8px;
}

.mail-float__identity {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.mail-float__identity strong,
.mail-float__identity span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-float__identity strong {
  font-size: 14px;
  font-weight: 650;
  color: hsl(var(--foreground));
}

.mail-float__identity span,
.mail-float__stat,
.mail-float__empty,
.mail-float__time {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.mail-float__icon,
.mail-float__open,
.mail-float__fab,
.mail-float__item {
  cursor: pointer;
  border: 0;
}

.mail-float__icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: hsl(var(--muted-foreground));
  background: transparent;
  border-radius: 6px;
}

.mail-float__icon:hover {
  color: hsl(var(--foreground));
  background: hsl(var(--muted) / 60%);
}

.mail-float__stat {
  padding: 0 14px 10px;
  margin: 0;
}

.mail-float__list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border-top: 1px solid hsl(var(--border));
}

.mail-float__empty {
  padding: 20px 14px;
  margin: 0;
  text-align: center;
}

.mail-float__item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  width: 100%;
  padding: 10px 14px;
  text-align: left;
  background: transparent;
  box-shadow: inset 0 -1px 0 hsl(var(--border) / 70%);
}

.mail-float__item:hover {
  background: hsl(var(--primary) / 8%);
}

.mail-float__avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 13px;
  font-weight: 650;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 12%);
  border-radius: 50%;
}

.mail-float__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.mail-float__line {
  display: flex;
  gap: 8px;
  align-items: center;
}

.mail-float__from,
.mail-float__subject {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-float__from {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: hsl(var(--foreground) / 82%);
}

.mail-float__item.is-unread .mail-float__from,
.mail-float__item.is-unread .mail-float__subject {
  font-weight: 650;
  color: hsl(var(--foreground));
}

.mail-float__time {
  flex: none;
}

.mail-float__subject {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.mail-float__open {
  height: 40px;
  color: hsl(var(--primary));
  background: hsl(var(--background));
  border-top: 1px solid hsl(var(--border));
}

.mail-float__open:hover {
  background: hsl(var(--primary) / 8%);
}

.mail-float__fab {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  color: hsl(var(--primary-foreground));
  cursor: grab;
  background: hsl(var(--primary));
  border-radius: 50%;
  box-shadow: 0 10px 24px hsl(var(--primary) / 32%);
}

.mail-float__fab:hover {
  filter: brightness(1.05);
}

.mail-float.is-dragging .mail-float__fab {
  cursor: grabbing;
  box-shadow:
    0 0 0 4px hsl(var(--primary) / 28%),
    0 14px 28px hsl(var(--primary) / 36%);
  transform: scale(1.06);
}

.mail-float__fab :deep(svg) {
  width: 22px;
  height: 22px;
}

.mail-float__badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  color: #fff;
  text-align: center;
  background: #e11d48;
  border: 2px solid hsl(var(--card));
  border-radius: 999px;
}
</style>
