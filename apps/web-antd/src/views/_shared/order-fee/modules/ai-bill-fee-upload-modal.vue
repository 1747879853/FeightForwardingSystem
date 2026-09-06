<script lang="ts" setup>
import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Modal, Spin, UploadDragger, message } from 'ant-design-vue';

/**
 * AI 识别账单费用 - 文件上传弹窗（列表页 / 费用页共用）
 *
 * 纯上传交互：选中或拖入文件后立即把 File 交给父组件识别，本组件不关心识别结果。
 * 单票账单仅支持文件（无文字输入），支持类型与后端 ExtractBillFeesAsync 一致。
 */
defineOptions({
  name: 'AiBillFeeUploadModal',
});

// 支持的文件类型：PDF、图片、Excel、文本（与后端 ExtractBillFeesAsync 一致）
const AI_BILL_FEE_ACCEPT = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.heic',
  '.heif',
  '.gif',
  '.bmp',
  '.txt',
  '.xlsx',
  '.xls',
].join(',');

/** 单票账单上限 20MB（与后端一致，前端先挡一道） */
const MAX_SIZE_MB = 20;

const props = withDefaults(
  defineProps<{
    open: boolean;
    recognizing?: boolean;
    title?: string;
  }>(),
  {
    recognizing: false,
    title: 'AI识别账单费用',
  },
);

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
  const sizeMb = file.size / 1024 / 1024;
  if (sizeMb > MAX_SIZE_MB) {
    // 超过上限时前端先挡一道，避免无谓请求（后端也会拦截并给出文案）
    message.warning(
      `账单文件大小 ${sizeMb.toFixed(1)}MB，超过 ${MAX_SIZE_MB}MB 上限，无法识别`,
    );
    return false;
  }
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
    :title="title"
    :footer="null"
    :mask-closable="!recognizing"
    :closable="!recognizing"
    :keyboard="!recognizing"
    destroy-on-close
    centered
    width="640px"
    class="ai-bill-fee-upload-modal"
    @cancel="handleCancel"
  >
    <Spin :spinning="!!recognizing" tip="AI识别中，请稍候...">
      <div class="ai-bill-fee-upload-content flex flex-col gap-3">
        <div class="ai-bill-fee-upload-area min-h-[300px]">
          <UploadDragger
            :accept="AI_BILL_FEE_ACCEPT"
            :disabled="!!recognizing"
            :multiple="false"
            :show-upload-list="false"
            :before-upload="handleBeforeUpload"
            class="ai-bill-fee-upload-dragger h-full"
          >
            <div class="ai-bill-fee-upload-body">
              <div class="ai-bill-fee-upload-icon" aria-hidden="true">
                <IconifyIcon icon="mdi:receipt-text-outline" />
              </div>
              <p class="ai-bill-fee-upload-title">点击或拖拽账单文件到此处</p>
              <p class="ai-bill-fee-upload-desc">放入后自动开始识别</p>
              <p class="ai-bill-fee-upload-formats">
                支持 PDF · 图片 · Excel / TXT，单个文件不超过
                {{ MAX_SIZE_MB }}MB
              </p>
            </div>
          </UploadDragger>
        </div>
      </div>
    </Spin>
  </Modal>
</template>

<style scoped>
.ai-bill-fee-upload-dragger {
  background: transparent !important;
  border: none !important;
}

.ai-bill-fee-upload-dragger :deep(.ant-upload.ant-upload-drag) {
  padding: 0;
  background: hsl(var(--primary) / 4%);
  border: 1.5px dashed hsl(var(--primary) / 35%);
  border-radius: 12px;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.ai-bill-fee-upload-dragger
  :deep(.ant-upload.ant-upload-drag:not(.ant-upload-disabled):hover) {
  background: hsl(var(--primary) / 8%);
  border-color: hsl(var(--primary) / 65%);
}

.ai-bill-fee-upload-dragger
  :deep(
    .ant-upload.ant-upload-drag.ant-upload-drag-hover:not(.ant-upload-disabled)
  ) {
  background: hsl(var(--primary) / 12%);
  border-color: hsl(var(--primary));
  border-style: solid;
  box-shadow: inset 0 0 0 1px hsl(var(--primary) / 25%);
}

.ai-bill-fee-upload-dragger
  :deep(.ant-upload.ant-upload-drag.ant-upload-disabled) {
  opacity: 0.7;
}

.ai-bill-fee-upload-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  padding: 28px 24px 32px;
  text-align: center;
}

.ai-bill-fee-upload-icon {
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

.ai-bill-fee-upload-dragger
  :deep(
    .ant-upload.ant-upload-drag:not(.ant-upload-disabled):hover
      .ai-bill-fee-upload-icon
  ) {
  background: hsl(var(--primary) / 18%);
  transform: translateY(-1px);
}

.ai-bill-fee-upload-dragger
  :deep(
    .ant-upload.ant-upload-drag.ant-upload-drag-hover:not(.ant-upload-disabled)
      .ai-bill-fee-upload-icon
  ) {
  color: #fff;
  background: hsl(var(--primary));
  transform: scale(1.04);
}

.ai-bill-fee-upload-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: hsl(var(--foreground));
}

.ai-bill-fee-upload-desc {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.4;
  color: hsl(var(--muted-foreground));
}

.ai-bill-fee-upload-formats {
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
