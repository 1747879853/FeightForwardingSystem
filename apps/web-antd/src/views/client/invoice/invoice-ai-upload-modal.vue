<script lang="ts" setup>
import { computed, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Input, Modal, Spin, UploadDragger } from 'ant-design-vue';

import { CLIENT_INVOICE_INFO_ACCEPT } from '#/api/sea-export/gemini-admin';

defineOptions({
  name: 'ClientInvoiceAiUploadModal',
});

const props = defineProps<{
  open: boolean;
  recognizing?: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  file: [file: File];
  text: [text: string];
}>();

const openProxy = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
});

const activeTab = ref<'text' | 'upload'>('upload');
const inputText = ref('');

function handleBeforeUpload(file: File) {
  if (props.recognizing) return false;
  emit('file', file);
  return false;
}

function handleCancel() {
  if (props.recognizing) return;
  openProxy.value = false;
  activeTab.value = 'upload';
  inputText.value = '';
}

function handleTextConfirm() {
  if (!inputText.value.trim() || props.recognizing) return;
  emit('text', inputText.value.trim());
}
</script>

<template>
  <Modal
    v-model:open="openProxy"
    title="AI识别开票信息"
    :footer="null"
    :mask-closable="!recognizing"
    :closable="!recognizing"
    :keyboard="!recognizing"
    destroy-on-close
    centered
    width="720px"
    class="client-invoice-ai-upload-modal"
    @cancel="handleCancel"
  >
    <Spin :spinning="!!recognizing" tip="AI识别中，请稍候...">
      <div class="client-invoice-ai-upload-content flex flex-col gap-4">
        <div class="flex border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            class="relative flex-1 py-3 text-sm font-medium transition-colors"
            :class="
              activeTab === 'upload'
                ? '-mb-[1px] border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            "
            :disabled="recognizing"
            @click="activeTab = 'upload'"
          >
            上传文件
          </button>
          <button
            type="button"
            class="relative flex-1 py-3 text-sm font-medium transition-colors"
            :class="
              activeTab === 'text'
                ? '-mb-[1px] border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            "
            :disabled="recognizing"
            @click="activeTab = 'text'"
          >
            粘贴文本
          </button>
        </div>

        <div class="client-invoice-ai-upload-area min-h-[320px]">
          <div v-show="activeTab === 'upload'" class="h-[95%]">
            <UploadDragger
              :accept="CLIENT_INVOICE_INFO_ACCEPT"
              :disabled="!!recognizing"
              :multiple="false"
              :show-upload-list="false"
              :before-upload="handleBeforeUpload"
              class="client-invoice-ai-upload-dragger h-full"
            >
              <div class="client-invoice-ai-upload-body">
                <div class="client-invoice-ai-upload-icon" aria-hidden="true">
                  <IconifyIcon icon="mdi:file-document-plus-outline" />
                </div>
                <p class="client-invoice-ai-upload-title">
                  点击或拖拽开票资料到此处
                </p>
                <p class="client-invoice-ai-upload-desc">放入后自动开始识别</p>
                <p class="client-invoice-ai-upload-formats">
                  PDF · 图片 · Excel / TXT（≤20MB）
                </p>
              </div>
            </UploadDragger>
          </div>

          <div v-show="activeTab === 'text'" class="flex h-[95%] flex-col pt-2">
            <Input.TextArea
              v-model:value="inputText"
              placeholder="请粘贴开票资料文字（抬头、税号、地址电话、开户行账号等）"
              :rows="8"
              :disabled="recognizing"
              class="flex-grow resize-none"
            />
            <div class="mt-4 flex shrink-0 justify-end">
              <button
                type="button"
                class="rounded-md bg-primary px-4 py-2 text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!inputText.trim() || recognizing"
                @click="handleTextConfirm"
              >
                开始识别
              </button>
            </div>
          </div>
        </div>
      </div>
    </Spin>
  </Modal>
</template>

<style scoped>
.client-invoice-ai-upload-dragger {
  background: transparent !important;
  border: none !important;
}

.client-invoice-ai-upload-dragger :deep(.ant-upload.ant-upload-drag) {
  padding: 0;
  background: hsl(var(--primary) / 4%);
  border: 1.5px dashed hsl(var(--primary) / 35%);
  border-radius: 12px;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.client-invoice-ai-upload-dragger
  :deep(.ant-upload.ant-upload-drag:not(.ant-upload-disabled):hover) {
  background: hsl(var(--primary) / 8%);
  border-color: hsl(var(--primary) / 65%);
}

.client-invoice-ai-upload-dragger
  :deep(
    .ant-upload.ant-upload-drag.ant-upload-drag-hover:not(.ant-upload-disabled)
  ) {
  background: hsl(var(--primary) / 12%);
  border-color: hsl(var(--primary));
  border-style: solid;
  box-shadow: inset 0 0 0 1px hsl(var(--primary) / 25%);
}

.client-invoice-ai-upload-dragger
  :deep(.ant-upload.ant-upload-drag.ant-upload-disabled) {
  opacity: 0.7;
}

.client-invoice-ai-upload-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  padding: 28px 24px 32px;
  text-align: center;
}

.client-invoice-ai-upload-icon {
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
}

.client-invoice-ai-upload-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: hsl(var(--foreground));
}

.client-invoice-ai-upload-desc {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.4;
  color: hsl(var(--muted-foreground));
}

.client-invoice-ai-upload-formats {
  padding: 4px 10px;
  margin: 14px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: hsl(var(--primary));
  letter-spacing: 0.02em;
  background: hsl(var(--primary) / 8%);
  border-radius: 8px;
}

.client-invoice-ai-upload-content {
  height: 360px;
}
</style>
