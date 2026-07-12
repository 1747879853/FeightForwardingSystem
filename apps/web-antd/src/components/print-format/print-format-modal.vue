<script lang="ts" setup>
import { computed } from 'vue';

import { Button, Empty, Modal, Select, Spin } from 'ant-design-vue';

import { buildPdfEmbedUrl } from '#/utils';

import { PrintExportFormat } from './types';
import { usePrintFormat } from './use-print-format';

const {
  visible,
  loading,
  previewLoading,
  exporting,
  templates,
  selectedTemplateId,
  exportFormat,
  previewUrl,
  close,
  handleTemplateChange,
  handleExport,
} = usePrintFormat();

const emptySimpleImage = Empty.PRESENTED_IMAGE_SIMPLE;

/** 预览用：隐藏 PDF 工具栏与左侧分页；下载仍用原始 previewUrl */
const previewEmbedUrl = computed(() => buildPdfEmbedUrl(previewUrl.value));

const templateOptions = computed(() =>
  templates.value.map((item) => ({
    label: item.name || '未命名模板',
    value: item.id,
  })),
);

const formatOptions = [
  { label: 'PDF', value: PrintExportFormat.Pdf },
  { label: 'Excel', value: PrintExportFormat.Excel },
  { label: 'Word', value: PrintExportFormat.Word },
];
</script>

<template>
  <Modal
    v-model:open="visible"
    :width="1200"
    :destroy-on-close="true"
    :mask-closable="false"
    wrap-class-name="print-format-modal"
    @cancel="close"
  >
    <template #title>
      <div class="flex items-center gap-3 pr-8">
        <span>打印预览</span>
        <Select
          :value="selectedTemplateId"
          :options="templateOptions"
          :loading="loading"
          placeholder="请选择打印模板"
          style="width: 260px"
          @change="handleTemplateChange"
        />
      </div>
    </template>

    <!-- PDF 预览 -->
    <div
      class="relative overflow-hidden rounded-md border border-[#f0f0f0] bg-[#f5f5f5]"
      style="height: 76vh"
    >
      <Spin v-if="previewLoading" class="print-preview-loading" size="large" />
      <iframe
        v-else-if="previewEmbedUrl"
        :src="previewEmbedUrl"
        class="h-full w-full border-0"
        title="打印预览"
      ></iframe>
      <div v-else class="flex h-full items-center justify-center">
        <Empty :image="emptySimpleImage" description="请选择模板生成预览" />
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm text-[#595959]">导出格式</span>
          <Select
            v-model:value="exportFormat"
            :options="formatOptions"
            style="width: 120px"
          />
        </div>
        <div class="flex items-center gap-2">
          <Button @click="close">关闭</Button>
          <Button
            type="primary"
            :loading="exporting"
            :disabled="!selectedTemplateId || loading"
            @click="handleExport"
          >
            导出
          </Button>
        </div>
      </div>
    </template>
  </Modal>
</template>

<style>
.print-format-modal .ant-modal {
  top: 24px;
  padding-bottom: 0;
}

.print-format-modal .print-preview-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
