<script lang="ts" setup>
import { computed } from 'vue';

import AttachmentViewerModal from '#/adapter/component/file-preview/attachment-viewer-modal.vue';

import { useAttachmentViewer } from './use-attachment-viewer';

defineOptions({ name: 'AttachmentViewerHost' });

const { visible, current, playlist, playlistIndex, close, showPrev, showNext } =
  useAttachmentViewer();

const open = computed({
  get: () => visible.value,
  set: (value) => {
    if (!value) close();
  },
});

const pageLabel = computed(() =>
  playlist.value.length > 1
    ? `${playlistIndex.value + 1} / ${playlist.value.length}`
    : '',
);

const hasPrev = computed(() => playlistIndex.value > 0);
const hasNext = computed(() => playlistIndex.value < playlist.value.length - 1);
</script>

<template>
  <AttachmentViewerModal
    v-model:open="open"
    :file-url="current.fileUrl"
    :file-name="current.fileName"
    :uploader="current.uploader"
    :upload-time="current.uploadTime"
    :title="current.title"
    :page-label="pageLabel"
    :has-prev="hasPrev"
    :has-next="hasNext"
    @prev="showPrev"
    @next="showNext"
  />
</template>
