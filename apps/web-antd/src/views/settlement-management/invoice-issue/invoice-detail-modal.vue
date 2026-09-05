<script lang="ts" setup>
import type { InvoiceIssueApi } from '#/api/Invoice/InvoiceIssue';

import dayjs from 'dayjs';

import {
  Descriptions,
  Empty,
  Modal,
  Table,
  Tag,
  message,
} from 'ant-design-vue';

import { IconifyIcon } from '@vben/icons';
import { openAttachmentViewer } from '#/components/attachment-viewer';
import { buildAttachmentUrl } from '#/utils';
import {
  getCombinedStatusColor,
  getCombinedStatusLabel,
} from './invoice-status';

defineProps<{
  open: boolean;
  invoiceData?: InvoiceIssueApi.InvoiceIssueListDto | null;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

function formatDateTime(value?: string) {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : '-';
}

function formatAmount(value?: number) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '-';
  }
  return Number(value).toFixed(2);
}

/** 获取发票类型标签 */
function getInvoiceTypeLabel(type?: string) {
  if (!type) return '-';
  const typeMap: Record<string, string> = {
    p: '普通发票(电票)',
    c: '普通发票(纸票)',
    s: '专用发票',
  };
  return typeMap[type] || type;
}

/** 获取开票状态标签 */
function getIssueStatusLabel(status?: number): { text: string; color: string } {
  if (status === undefined || status === null) {
    return { text: '-', color: 'default' };
  }
  const statusMap: Record<number, { text: string; color: string }> = {
    0: { text: '待开票', color: 'default' },
    1: { text: '开票中', color: 'processing' },
    2: { text: '开票完成', color: 'success' },
    3: { text: '开票失败', color: 'error' },
  };
  return statusMap[status] || { text: String(status), color: 'default' };
}

/** 获取红冲状态标签 */
function getRedStatusLabel(status?: number): { text: string; color: string } {
  if (status === undefined || status === null) {
    return { text: '-', color: 'default' };
  }
  const statusMap: Record<number, { text: string; color: string }> = {
    0: { text: '未冲红', color: 'default' },
    1: { text: '冲红中', color: 'processing' },
    2: { text: '已冲红', color: 'error' },
    3: { text: '冲红失败', color: 'warning' },
  };
  return statusMap[status] || { text: String(status), color: 'default' };
}

/** 获取冲红原因标签 */
function getRedReasonLabel(reason?: number) {
  if (!reason) return '-';
  const reasonMap: Record<number, string> = {
    1: '销货退回',
    2: '开票有误',
    3: '服务中止',
    4: '销售折让',
  };
  return reasonMap[reason] || String(reason);
}

function getFileName(item: InvoiceIssueApi.AttachmentItemDto): string {
  return item.friendlyFileName || item.url?.split('/').pop() || '附件';
}

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function openAttachment(
  item: InvoiceIssueApi.AttachmentItemDto | Record<string, any>,
) {
  openAttachmentViewer(item);
}

/** 查看附件 */
function viewAttachment(
  item: InvoiceIssueApi.AttachmentItemDto | Record<string, any>,
) {
  openAttachmentViewer(item);
}

/** 下载附件 */
function downloadAttachment(
  item: InvoiceIssueApi.AttachmentItemDto | Record<string, any>,
) {
  if (item.url) {
    const url = buildAttachmentUrl(item.url);
    const link = document.createElement('a');
    link.href = url;
    link.download = item.friendlyFileName || 'attachment';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    message.warning('附件链接不存在');
  }
}

function handleCancel() {
  emit('update:open', false);
}

const attachmentColumns = [
  {
    title: '文件名',
    dataIndex: 'friendlyFileName',
    key: 'friendlyFileName',
    minWidth: 300,
  },
  {
    title: '操作',
    key: 'action',
    width: 160,
    fixed: 'right' as const,
  },
];
</script>

<template>
  <Modal
    :open="open"
    :title="
      invoiceData?.applicationNo
        ? `发票详情 · ${invoiceData.applicationNo}`
        : '发票详情'
    "
    :footer="null"
    width="1000px"
    destroy-on-close
    @cancel="handleCancel"
  >
    <Empty
      v-if="!invoiceData"
      description="暂无发票数据"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />
    <div v-else class="invoice-detail-container">
      <!-- 基本信息 -->
      <Descriptions
        title="基本信息"
        :column="2"
        bordered
        size="small"
        class="mb-4"
      >
        <Descriptions.Item label="开出单号">
          {{ invoiceData.applicationNo || '-' }}
        </Descriptions.Item>
        <Descriptions.Item label="发票号码">
          {{ invoiceData.invoiceNo || '-' }}
        </Descriptions.Item>
        <Descriptions.Item label="发票代码">
          {{ invoiceData.invoiceCode || '-' }}
        </Descriptions.Item>
        <Descriptions.Item label="开票时间">
          {{ formatDateTime(invoiceData.invoiceIssueTime) }}
        </Descriptions.Item>
        <Descriptions.Item label="结算对象">
          {{ invoiceData.settlement?.name || '-' }}
        </Descriptions.Item>
        <Descriptions.Item label="发票抬头">
          {{ invoiceData.clientInvoiceInfo?.header || '-' }}
        </Descriptions.Item>
        <Descriptions.Item label="税号">
          {{ invoiceData.clientInvoiceInfo?.taxNum || '-' }}
        </Descriptions.Item>
        <Descriptions.Item label="币别">
          <Tag v-if="invoiceData.currency?.code" color="blue">
            {{ invoiceData.currency.code }}
          </Tag>
          <span v-else>-</span>
        </Descriptions.Item>
        <Descriptions.Item label="发票类型">
          {{ getInvoiceTypeLabel(invoiceData.invoiceType) }}
        </Descriptions.Item>
        <Descriptions.Item label="发票状态">
          <Tag :color="getCombinedStatusColor(invoiceData.combinedStatus)">
            {{ getCombinedStatusLabel(invoiceData.combinedStatus) }}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="开票汇率">
          {{ formatAmount(invoiceData.invoiceExchangeRate) }}
        </Descriptions.Item>
        <Descriptions.Item label="商品金额合计">
          {{ formatAmount(invoiceData.totalAmount) }}
        </Descriptions.Item>
        <Descriptions.Item label="申请人">
          {{ invoiceData.applyUserName || '-' }}
        </Descriptions.Item>
      </Descriptions>

      <!-- 附件列表 -->
      <div class="attachment-section">
        <h3 class="section-title">发票附件</h3>
        <Empty
          v-if="!invoiceData.attachments?.length"
          description="暂无附件"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
          class="py-4"
        />
        <Table
          v-else
          :columns="attachmentColumns"
          :data-source="invoiceData.attachments"
          :pagination="false"
          size="small"
          bordered
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'friendlyFileName'">
              <span
                :title="record.friendlyFileName"
                class="attachment-filename"
              >
                {{ record.friendlyFileName || '-' }}
              </span>
            </template>
            <template v-else-if="column.key === 'action'">
              <div class="attachment-actions">
                <a-button
                  type="link"
                  size="small"
                  class="attachment-action-btn"
                  @click="viewAttachment(record)"
                >
                  <IconifyIcon icon="ant-design:eye-outlined" />
                  查看
                </a-button>
                <a-button
                  type="link"
                  size="small"
                  class="attachment-action-btn"
                  @click="downloadAttachment(record)"
                >
                  <IconifyIcon icon="ant-design:download-outlined" />
                  下载
                </a-button>
              </div>
            </template>
          </template>
        </Table>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.invoice-detail-container {
  max-height: 70vh;
  overflow-y: auto;
}

.section-title {
  margin: 16px 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #262626;
}

.mb-4 {
  margin-bottom: 16px;
}

.py-4 {
  padding-top: 16px;
  padding-bottom: 16px;
}

/* 附件文件名样式 */
.attachment-filename {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 附件操作按钮容器 */
.attachment-actions {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  white-space: nowrap;
}

/* 附件操作按钮样式 */
.attachment-action-btn {
  display: inline-flex;
  gap: 2px;
  align-items: center;
  padding: 0 4px;
  margin: 0;
  color: #1677ff;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.3s ease;
}

.attachment-action-btn :deep(.anticon) {
  font-size: 14px;
}

.attachment-action-btn:hover {
  color: #4096ff;
  cursor: pointer;
  background-color: rgb(22 119 255 / 10%);
}

.attachment-action-btn:active {
  transform: translateY(0);
}
</style>
