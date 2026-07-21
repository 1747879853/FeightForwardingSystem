<script lang="ts" setup>
import { computed } from 'vue';

import {
  Button,
  DropdownButton,
  Empty,
  Menu,
  MenuItem,
  Modal,
  Select,
  Spin,
} from 'ant-design-vue';

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

const exportDisabled = computed(
  () => !selectedTemplateId.value || loading.value,
);

const formatMenuItems = [
  { key: PrintExportFormat.Pdf, label: '打印 PDF' },
  { key: PrintExportFormat.Excel, label: '导出 Excel' },
  { key: PrintExportFormat.Word, label: '导出 Word' },
];

function onExportMenuClick(info: { key: number | string }) {
  handleExport(Number(info.key) as PrintExportFormat);
}
</script>

<template>
  <Modal
    v-model:open="visible"
    :width="'92vw'"
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

    <!-- PDF 预览：贴边铺满，FitH 消除两侧黑边 -->
    <div class="print-preview-body">
      <Spin v-if="previewLoading" class="print-preview-loading" size="large" />
      <iframe
        v-else-if="previewEmbedUrl"
        :src="previewEmbedUrl"
        class="print-preview-iframe"
        title="打印预览"
      ></iframe>
      <div
        v-else
        class="print-preview-empty flex h-full items-center justify-center"
      >
        <Empty :image="emptySimpleImage" description="请选择模板生成预览" />
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <Button @click="close">关闭</Button>
        <DropdownButton
          type="primary"
          :loading="exporting"
          :disabled="exportDisabled"
          @click="handleExport(PrintExportFormat.Pdf)"
        >
          打印
          <template #overlay>
            <Menu @click="onExportMenuClick">
              <MenuItem
                v-for="item in formatMenuItems"
                :key="item.key"
                :disabled="exportDisabled"
              >
                {{ item.label }}
              </MenuItem>
            </Menu>
          </template>
        </DropdownButton>
      </div>
    </template>
  </Modal>
</template>

<style>
.print-format-modal .ant-modal {
  top: 16px;
  max-width: 1600px;
  padding-bottom: 0;
}

.print-format-modal .ant-modal-body {
  padding: 0;
}

.print-format-modal .print-preview-body {
  position: relative;
  height: 78vh;
  overflow: hidden;
  background: #525659;
}

.print-format-modal .print-preview-iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

.print-format-modal .print-preview-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.print-format-modal .print-preview-empty .ant-empty-description {
  color: #fff;
}

.print-format-modal .print-preview-empty .ant-empty-img-simple-g,
.print-format-modal .print-preview-empty .ant-empty-img-simple-path {
  stroke: #d9d9d9;
}
</style>
