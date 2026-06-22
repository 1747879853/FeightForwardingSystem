<script lang="ts" setup>
import type { AnnouncementAdminApi } from '#/api/system/announcement-admin';

import { computed, ref } from 'vue';

import { Button, Modal } from 'ant-design-vue';

import { $t } from '#/locales';
import { buildAttachmentUrl } from '#/utils';
import {
  markAnnouncementAsRead,
  setAnnouncementSkipSession,
} from '#/utils/announcement-read-storage';
import { sanitizeAnnouncementHtml } from '#/utils/sanitize-html';

const props = defineProps<{
  announcements: AnnouncementAdminApi.AnnouncementDto[];
  open: boolean;
  userId: string;
}>();

const emit = defineEmits<{
  close: [];
  'update:open': [value: boolean];
}>();

const currentIndex = ref(0);

const currentAnnouncement = computed(
  () => props.announcements[currentIndex.value],
);

const sanitizedHtml = computed(() =>
  sanitizeAnnouncementHtml(currentAnnouncement.value?.text),
);

const progressText = computed(() => {
  if (props.announcements.length <= 1) {
    return '';
  }
  return $t('system.announcement.loginModalProgress', [
    currentIndex.value + 1,
    props.announcements.length,
  ]);
});

const modalOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
});

const resetIndex = () => {
  currentIndex.value = 0;
};

const closeModal = () => {
  modalOpen.value = false;
  emit('close');
  resetIndex();
};

const openAttachment = (url?: string | null) => {
  if (!url) {
    return;
  }
  window.open(buildAttachmentUrl(url), '_blank', 'noopener,noreferrer');
};

const handleRemindLater = () => {
  setAnnouncementSkipSession(props.userId);
  closeModal();
};

const handleMarkRead = () => {
  const current = currentAnnouncement.value;
  if (!current?.id) {
    closeModal();
    return;
  }

  markAnnouncementAsRead(props.userId, current.id);

  if (currentIndex.value < props.announcements.length - 1) {
    currentIndex.value += 1;
    return;
  }

  closeModal();
};

defineExpose({
  resetIndex,
});
</script>

<template>
  <Modal
    v-model:open="modalOpen"
    :title="
      currentAnnouncement?.name || $t('system.announcement.loginModalTitle')
    "
    :width="760"
    :closable="false"
    :mask-closable="false"
    :keyboard="false"
    destroy-on-close
    @cancel="handleRemindLater"
  >
    <div class="announcement-login-modal flex flex-col gap-4">
      <div v-if="progressText" class="text-sm text-foreground/70">
        {{ progressText }}
      </div>
      <div
        class="announcement-login-modal__content max-h-[50vh] overflow-y-auto"
        v-html="sanitizedHtml"
      />
      <div
        v-if="currentAnnouncement?.attachments?.length"
        class="announcement-login-modal__attachments border-t pt-3"
      >
        <div class="mb-2 text-sm font-medium">
          {{ $t('system.announcement.attachments') }}
        </div>
        <div class="flex flex-col gap-2">
          <button
            v-for="item in currentAnnouncement.attachments"
            :key="item.id || item.attachmentId"
            type="button"
            class="text-left text-sm text-primary hover:underline"
            @click="openAttachment(item.url)"
          >
            {{
              item.friendlyFileName ||
              $t('system.announcement.attachmentFallback')
            }}
          </button>
        </div>
      </div>
    </div>
    <template #footer>
      <Button @click="handleRemindLater">
        {{ $t('system.announcement.remindLater') }}
      </Button>
      <Button type="primary" @click="handleMarkRead">
        {{ $t('system.announcement.markAsRead') }}
      </Button>
    </template>
  </Modal>
</template>

<style scoped>
.announcement-login-modal__content :deep(img) {
  max-width: 100%;
  height: auto;
}

.announcement-login-modal__content :deep(a) {
  color: var(--primary-color, #1677ff);
}
</style>
