<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import AttachmentViewerModal from '#/adapter/component/file-preview/attachment-viewer-modal.vue';

defineOptions({ name: 'AttachmentPreviewPage' });

const route = useRoute();

function queryText(key: string) {
  const value = route.query[key];
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

const fileUrl = computed(() => queryText('fileUrl'));
const fileName = computed(() => queryText('fileName'));
const uploader = computed(() => queryText('uploader'));
const uploadTime = computed(() => queryText('uploadTime'));
const title = computed(() => queryText('title'));
</script>

<template>
  <div class="attachment-preview-page">
    <AttachmentViewerModal
      mode="page"
      :open="true"
      :file-url="fileUrl"
      :file-name="fileName"
      :uploader="uploader"
      :upload-time="uploadTime"
      :title="title"
    />
  </div>
</template>

<style scoped>
.attachment-preview-page {
  min-height: 100vh;
  background: hsl(var(--background));
}
</style>
