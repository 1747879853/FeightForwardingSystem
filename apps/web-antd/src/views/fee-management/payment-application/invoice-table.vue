<script lang="ts" setup>
import type { UploadFile } from 'ant-design-vue';

import type { InvoiceRowForm } from './invoice-rows';

import { ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  DatePicker,
  Input,
  Tooltip,
  Upload,
  message,
} from 'ant-design-vue';

import { mapResultToAttachment, uploadFile } from '#/api/common/upload';
import { extractInvoice } from '#/api/sea-export/gemini-admin';
import { openAttachmentViewer } from '#/components/attachment-viewer';

import {
  applyExtractedInvoiceToRow,
  createEmptyInvoiceRow,
} from './invoice-rows';

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
  }>(),
  { disabled: false },
);

const rows = defineModel<InvoiceRowForm[]>({ default: () => [] });

const uploadingKey = ref<null | string>(null);
const extractingKey = ref<null | string>(null);

function addRow() {
  if (props.disabled) return;
  rows.value = [...rows.value, createEmptyInvoiceRow()];
}

function removeRow(index: number) {
  if (props.disabled) return;
  const next = rows.value.filter((_, rowIndex) => rowIndex !== index);
  rows.value = next.length > 0 ? next : [createEmptyInvoiceRow()];
}

function patchRow(index: number, patch: Partial<InvoiceRowForm>) {
  rows.value = rows.value.map((row, rowIndex) =>
    rowIndex === index ? { ...row, ...patch } : row,
  );
}

function getFileName(row: InvoiceRowForm) {
  return (
    row.attachment?.friendlyFileName ||
    row.attachment?.url?.split('/').pop() ||
    '附件'
  );
}

function openAttachment(row: InvoiceRowForm) {
  openAttachmentViewer(row.attachment);
}

async function handleUpload(file: UploadFile, index: number) {
  if (props.disabled) return false;
  const row = rows.value[index];
  if (!row) return false;
  const rawFile = file as unknown as File;
  uploadingKey.value = row.key;
  try {
    const formData = new FormData();
    formData.append('file', rawFile);
    const uploaded = (await uploadFile(formData))[0];
    if (!uploaded) throw new Error('Upload returned no file.');
    const attachment = mapResultToAttachment(uploaded);
    patchRow(index, {
      attachment: {
        attachmentId: attachment.attachmentId,
        clientVisible: false,
        displayOrder: 0,
        friendlyFileName: attachment.friendlyFileName || attachment.fileName,
        url: attachment.url,
      },
    });
  } catch (error: any) {
    message.error(error?.message || '上传失败');
  } finally {
    uploadingKey.value = null;
  }
  return false;
}

function removeAttachment(index: number) {
  if (props.disabled) return;
  patchRow(index, { attachment: null });
}

async function recognizeInvoice(index: number) {
  const row = rows.value[index];
  if (!row?.attachment?.attachmentId) {
    message.warning('请先上传发票附件再识别');
    return;
  }
  extractingKey.value = row.key;
  const hideLoading = message.loading('正在识别发票，请稍候...', 0);
  try {
    const result = await extractInvoice(row.attachment.attachmentId);
    const applied = applyExtractedInvoiceToRow(row, result ?? {});
    if (!applied.ok) {
      message.warning(applied.message);
      return;
    }
    patchRow(index, applied.next);
    message.success(applied.message);
  } catch {
    // UserFriendlyException 由全局拦截器展示
  } finally {
    hideLoading();
    extractingKey.value = null;
  }
}
</script>

<template>
  <div class="invoice-table" :class="{ 'invoice-table--disabled': disabled }">
    <div v-if="rows.length === 0" class="invoice-table__empty">
      {{ disabled ? '不开票无需录入发票' : '暂无发票，可点击下方添加' }}
    </div>
    <div v-for="(row, index) in rows" :key="row.key" class="invoice-table__row">
      <div class="invoice-field">
        <Input
          :value="row.invoiceNo"
          :bordered="false"
          class="invoice-field__control"
          placeholder="发票号"
          :maxlength="128"
          :disabled="disabled"
          @update:value="(value) => patchRow(index, { invoiceNo: value ?? '' })"
        />
      </div>
      <div class="invoice-field">
        <DatePicker
          :value="row.invoiceDate"
          :bordered="false"
          class="invoice-field__control"
          value-format="YYYY-MM-DD"
          placeholder="开票日期"
          :disabled="disabled"
          @update:value="
            (value) =>
              patchRow(index, {
                invoiceDate: value ? String(value) : undefined,
              })
          "
        />
      </div>
      <div class="invoice-table__actions">
        <template v-if="row.attachment">
          <button
            type="button"
            class="invoice-table__file-name"
            :title="getFileName(row)"
            @click="openAttachment(row)"
          >
            <IconifyIcon icon="mdi:file-outline" />
            <span>{{ getFileName(row) }}</span>
          </button>
          <Tooltip title="识别发票">
            <Button
              type="text"
              size="small"
              class="invoice-table__icon-btn"
              :loading="extractingKey === row.key"
              :disabled="disabled || extractingKey != null"
              aria-label="识别发票"
              @click="recognizeInvoice(index)"
            >
              <IconifyIcon icon="mdi:text-recognition" />
            </Button>
          </Tooltip>
          <Button
            v-if="!disabled"
            type="text"
            size="small"
            class="invoice-table__icon-btn invoice-table__icon-btn--danger"
            aria-label="删除附件"
            @click="removeAttachment(index)"
          >
            <IconifyIcon icon="mdi:close" />
          </Button>
        </template>
        <Upload
          v-else-if="!disabled"
          :before-upload="(file) => handleUpload(file, index)"
          :disabled="uploadingKey === row.key"
          :show-upload-list="false"
        >
          <Button type="link" size="small" :loading="uploadingKey === row.key">
            上传
          </Button>
        </Upload>
        <span v-else class="invoice-table__file-empty">无附件</span>
        <Button
          v-if="!disabled"
          type="text"
          size="small"
          class="invoice-table__icon-btn invoice-table__icon-btn--danger"
          aria-label="删除发票"
          @click="removeRow(index)"
        >
          <IconifyIcon icon="mdi:delete-outline" />
        </Button>
      </div>
    </div>
    <Button
      v-if="!disabled"
      type="dashed"
      size="small"
      class="invoice-table__add"
      @click="addRow"
    >
      <IconifyIcon icon="mdi:plus" />
      添加发票
    </Button>
  </div>
</template>

<style scoped>
.invoice-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.invoice-table--disabled {
  pointer-events: none;
}

.invoice-table__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
  gap: 12px;
  align-items: center;
}

.invoice-field {
  min-height: 32px;
  font-size: 12px;
  background: #fff;
  border: 1px solid #e5e9ef;
  border-radius: 8px;
  box-shadow: none;
}

.invoice-field__control {
  width: 100%;
  height: 30px;
  font-size: 12px;
}

.invoice-field :deep(.ant-input),
.invoice-field :deep(.ant-picker) {
  height: 30px;
  padding: 0 11px;
  font-size: 12px;
  color: #4e5969;
  box-shadow: none;
}

.invoice-table__actions {
  display: flex;
  gap: 2px;
  align-items: center;
  min-width: 0;
}

.invoice-table__file-name {
  display: flex;
  flex: 1 1 auto;
  gap: 4px;
  align-items: center;
  min-width: 0;
  max-width: 120px;
  padding: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  color: #2563eb;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.invoice-table__file-empty {
  font-size: 11px;
  color: #94a3b8;
}

.invoice-table__icon-btn {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 22px;
  min-width: 22px;
  height: 22px;
  padding: 0;
  color: #94a3b8;
}

.invoice-table__icon-btn--danger:hover {
  color: #ef4444;
}

.invoice-table__empty {
  padding: 4px 0;
  font-size: 12px;
  color: #94a3b8;
}

.invoice-table__add {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  align-self: flex-start;
}

@media (max-width: 640px) {
  .invoice-table__row {
    grid-template-columns: 1fr;
  }
}
</style>
