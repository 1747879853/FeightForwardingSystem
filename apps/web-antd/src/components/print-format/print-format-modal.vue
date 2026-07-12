<script lang="ts" setup>
import {
  Button,
  Empty,
  Modal,
  Radio,
  RadioGroup,
  Select,
  Spin,
} from 'ant-design-vue';

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

const formatOptions = [
  { label: 'PDF', value: PrintExportFormat.Pdf },
  { label: 'Excel', value: PrintExportFormat.Excel },
  { label: 'Word', value: PrintExportFormat.Word },
];

function onTemplateChange(event: { target: { value: string } }) {
  handleTemplateChange(event.target.value);
}
</script>

<template>
  <Modal
    v-model:open="visible"
    title="打印预览"
    :width="960"
    :destroy-on-close="true"
    :mask-closable="false"
    wrap-class-name="print-format-modal"
    @cancel="close"
  >
    <div class="flex gap-3" style="height: 600px">
      <!-- 左侧：模板列表 -->
      <div
        class="w-52 shrink-0 overflow-auto rounded-md border border-[#f0f0f0] p-2"
      >
        <Spin :spinning="loading">
          <div v-if="!loading && templates.length === 0" class="py-6">
            <Empty :image="emptySimpleImage" description="暂无可用打印模板" />
          </div>
          <RadioGroup
            v-else
            :value="selectedTemplateId"
            class="flex w-full flex-col gap-2"
            @change="onTemplateChange"
          >
            <Radio
              v-for="item in templates"
              :key="item.id"
              :value="item.id"
              class="!m-0 w-full rounded-md border border-[#f0f0f0] px-3 py-2"
            >
              <div class="flex flex-col gap-0.5">
                <span class="text-sm font-medium text-[#262626]">
                  {{ item.name || '未命名模板' }}
                </span>
                <span v-if="item.remark" class="text-xs text-[#8c8c8c]">
                  {{ item.remark }}
                </span>
              </div>
            </Radio>
          </RadioGroup>
        </Spin>
      </div>

      <!-- 右侧：PDF 预览 -->
      <div
        class="relative flex-1 overflow-hidden rounded-md border border-[#f0f0f0] bg-[#f5f5f5]"
      >
        <Spin
          :spinning="previewLoading"
          class="h-full w-full"
          wrapper-class-name="h-full print-preview-spin"
        >
          <iframe
            v-if="previewUrl"
            :src="previewUrl"
            class="h-full w-full border-0"
            title="打印预览"
          ></iframe>
          <div
            v-else-if="!previewLoading"
            class="flex h-full items-center justify-center"
          >
            <Empty :image="emptySimpleImage" description="请选择模板生成预览" />
          </div>
        </Spin>
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
.print-format-modal .print-preview-spin .ant-spin-container {
  height: 100%;
}
</style>
