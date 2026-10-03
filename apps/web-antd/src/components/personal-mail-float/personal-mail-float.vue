<script setup lang="ts">
import { onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { usePersonalMailFloat } from './use-personal-mail-float';

const router = useRouter();
const mail = usePersonalMailFloat();

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
  mail.stopMailWatch();
});

function openLine(index: number) {
  const item = mail.noticeMails.value[index];
  mail.dismissNotice();
  if (!item) {
    void router.push({ name: 'PersonalMail' });
    return;
  }
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
  <aside v-if="mail.noticeOpen.value" class="mail-notice">
    <header class="mail-notice__head">
      <span class="mail-notice__mark" aria-hidden="true">
        <IconifyIcon icon="lucide:mail" />
      </span>
      <span class="mail-notice__titles">
        <strong>有新邮件</strong>
        <span>{{ mail.accountName.value || '点击查看' }}</span>
      </span>
      <button
        type="button"
        class="mail-notice__close"
        aria-label="关闭"
        @click="mail.dismissNotice()"
      >
        <IconifyIcon icon="lucide:x" />
      </button>
    </header>
    <button
      v-for="(line, index) in mail.noticeLines.value"
      :key="index"
      type="button"
      class="mail-notice__line"
      @click="openLine(index)"
    >
      {{ line }}
    </button>
  </aside>
</template>

<style scoped>
.mail-notice {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 860;
  display: flex;
  flex-direction: column;
  width: min(360px, calc(100vw - 32px));
  overflow: hidden;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  box-shadow:
    0 1px 2px hsl(var(--foreground) / 4%),
    0 16px 36px hsl(var(--foreground) / 10%);
}

.mail-notice__head {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 14px 12px 14px 14px;
  background: linear-gradient(
    180deg,
    hsl(var(--primary) / 10%) 0%,
    hsl(var(--primary) / 4%) 100%
  );
  border-bottom: 1px solid hsl(var(--primary) / 12%);
}

.mail-notice__mark {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: hsl(var(--primary));
  background: hsl(var(--card));
  border: 1px solid hsl(var(--primary) / 16%);
  border-radius: 10px;
  box-shadow: 0 1px 2px hsl(var(--primary) / 10%);
}

.mail-notice__mark :deep(svg) {
  width: 18px;
  height: 18px;
}

.mail-notice__titles {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.mail-notice__titles strong {
  font-size: 14px;
  font-weight: 650;
  line-height: 20px;
  color: hsl(var(--foreground));
}

.mail-notice__titles span {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  line-height: 18px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.mail-notice__close,
.mail-notice__line {
  cursor: pointer;
  border: 0;
  transition:
    background-color 0.18s ease,
    color 0.18s ease;
}

.mail-notice__close {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--card) / 70%);
  border-radius: 8px;
}

.mail-notice__close:hover {
  color: hsl(var(--foreground));
  background: hsl(var(--card));
}

.mail-notice__close :deep(svg) {
  width: 16px;
  height: 16px;
}

.mail-notice__line {
  padding: 10px 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  line-height: 1.5;
  color: hsl(var(--foreground));
  text-align: left;
  white-space: nowrap;
  background: transparent;
  box-shadow: inset 0 1px 0 hsl(var(--border) / 70%);
}

.mail-notice__line:hover {
  background: hsl(var(--primary) / 8%);
}

.mail-notice__line:last-child {
  padding-bottom: 12px;
}
</style>
