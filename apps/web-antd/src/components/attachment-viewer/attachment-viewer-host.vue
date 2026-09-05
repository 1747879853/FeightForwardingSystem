<script lang="ts" setup>
import { computed } from 'vue';

import AttachmentViewerModal from '#/adapter/component/file-preview/attachment-viewer-modal.vue';

import { useAttachmentViewer } from './use-attachment-viewer';

defineOptions({ name: 'AttachmentViewerHost' });

const { visible, current, close } = useAttachmentViewer();

const open = computed({
  get: () => visible.value,
  set: (value) => {
    if (!value) close();
  },
});
</script>

<template>
  <AttachmentViewerModal
    v-model:open="open"
    :file-url="current.fileUrl"
    :file-name="current.fileName"
    :uploader="current.uploader"
    :upload-time="current.uploadTime"
    :title="current.title"
  />
</template>
