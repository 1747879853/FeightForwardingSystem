<script lang="ts" setup>
import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Modal, Spin, UploadDragger } from 'ant-design-vue';

import { AI_EXTRACT_ACCEPT } from './ai-extract-utils';

defineOptions({
  name: 'AiExtractUploadModal',
});

const props = defineProps<{
  open: boolean;
  recognizing?: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  file: [file: File];
}>();

const openProxy = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
});

/** 仅拦截自动上传；选中/拖入后立刻交给父组件识别 */
function handleBeforeUpload(file: File) {
  if (props.recognizing) return false;
  emit('file', file);
  return false;
}

function handleCancel() {
  if (props.recognizing) return;
  openProxy.value = false;
}
</script>

<template>
  <Modal
    v-model:open="openProxy"
    title="AI识别"
    :footer="null"
    :mask-closable="!recognizing"
    :closable="!recognizing"
    :keyboard="!recognizing"
    destroy-on-close
    centered
    width="440px"
    class="ai-extract-upload-modal"
    @cancel="handleCancel"
  >
    <Spin :spinning="!!recognizing" tip="AI识别中，请稍候...">
      <UploadDragger
        :accept="AI_EXTRACT_ACCEPT"
        :disabled="!!recognizing"
        :multiple="false"
        :show-upload-list="false"
        :before-upload="handleBeforeUpload"
        class="ai-extract-upload-dragger"
      >
        <div class="ai-extract-upload-body">
          <div class="ai-extract-upload-icon" aria-hidden="true">
            <IconifyIcon icon="mdi:file-document-plus-outline" />
          </div>
          <p class="ai-extract-upload-title">点击或拖拽文件到此处</p>
          <p class="ai-extract-upload-desc">放入后自动开始识别</p>
          <p class="ai-extract-upload-formats">
            PDF · 图片 · Word / Excel / RTF
          </p>
        </div>
      </UploadDragger>
    </Spin>
  </Modal>
</template>

<style scoped>
.ai-extract-upload-dragger {
  background: transparent !important;
  border: none !important;
}

.ai-extract-upload-dragger :deep(.ant-upload.ant-upload-drag) {
  padding: 0;
  background: hsl(var(--primary) / 4%);
  border: 1.5px dashed hsl(var(--primary) / 35%);
  border-radius: 12px;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.ai-extract-upload-dragger
  :deep(.ant-upload.ant-upload-drag:not(.ant-upload-disabled):hover) {
  background: hsl(var(--primary) / 8%);
  border-color: hsl(var(--primary) / 65%);
}

.ai-extract-upload-dragger
  :deep(
    .ant-upload.ant-upload-drag.ant-upload-drag-hover:not(.ant-upload-disabled)
  ) {
  background: hsl(var(--primary) / 12%);
  border-color: hsl(var(--primary));
  border-style: solid;
  box-shadow: inset 0 0 0 1px hsl(var(--primary) / 25%);
}

.ai-extract-upload-dragger
  :deep(.ant-upload.ant-upload-drag.ant-upload-disabled) {
  opacity: 0.7;
}

.ai-extract-upload-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  padding: 28px 24px 32px;
  text-align: center;
}

.ai-extract-upload-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-bottom: 16px;
  font-size: 28px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 12%);
  border-radius: 14px;
  transition:
    transform 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease;
}

.ai-extract-upload-dragger
  :deep(
    .ant-upload.ant-upload-drag:not(.ant-upload-disabled):hover
      .ai-extract-upload-icon
  ) {
  background: hsl(var(--primary) / 18%);
  transform: translateY(-1px);
}

.ai-extract-upload-dragger
  :deep(
    .ant-upload.ant-upload-drag.ant-upload-drag-hover:not(.ant-upload-disabled)
      .ai-extract-upload-icon
  ) {
  color: #fff;
  background: hsl(var(--primary));
  transform: scale(1.04);
}

.ai-extract-upload-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: hsl(var(--foreground));
}

.ai-extract-upload-desc {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.4;
  color: hsl(var(--muted-foreground));
}

.ai-extract-upload-formats {
  padding: 4px 10px;
  margin: 14px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: hsl(var(--primary));
  letter-spacing: 0.02em;
  background: hsl(var(--primary) / 8%);
  border-radius: 8px;
}
</style>
