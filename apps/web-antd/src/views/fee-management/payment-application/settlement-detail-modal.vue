<script lang="ts" setup>
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import dayjs from 'dayjs';

import { Empty, Modal, Table, Tag } from 'ant-design-vue';

import { openAttachmentViewer } from '#/components/attachment-viewer';

defineProps<{
  open: boolean;
  applicationNo?: string;
  settlements: PaymentApplicationAdminApi.PaymentSettlementForApplicationSimpleDto[];
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

function formatDateTime(value?: string) {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm') : '-';
}

function formatAmount(value?: number) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '-';
  }
  return Number(value).toFixed(2);
}

function getFileName(
  item: PaymentApplicationAdminApi.AttachmentItemDto,
): string {
  return item.friendlyFileName || item.url?.split('/').pop() || '附件';
}

function openAttachment(item: PaymentApplicationAdminApi.AttachmentItemDto) {
  openAttachmentViewer(item);
}

function handleCancel() {
  emit('update:open', false);
}

const columns = [
  {
    title: '结算单号',
    dataIndex: 'settlementNo',
    key: 'settlementNo',
    width: 160,
  },
  {
    title: '结算时间',
    dataIndex: 'settlementTime',
    key: 'settlementTime',
    width: 150,
  },
  {
    title: '结算对象',
    dataIndex: 'settlement',
    key: 'settlement',
    width: 140,
  },
  {
    title: '结算币别',
    dataIndex: 'currency',
    key: 'currency',
    width: 90,
  },
  {
    title: '结算金额',
    dataIndex: 'totalSettledPrice',
    key: 'totalSettledPrice',
    width: 120,
    align: 'right' as const,
  },
  {
    title: '附件',
    dataIndex: 'attachments',
    key: 'attachments',
    minWidth: 200,
  },
];
</script>

<template>
  <Modal
    :open="open"
    :title="applicationNo ? `结算明细 · ${applicationNo}` : '结算明细'"
    :footer="null"
    width="920px"
    destroy-on-close
    @cancel="handleCancel"
  >
    <Empty
      v-if="!settlements.length"
      description="暂无关联结算"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />
    <Table
      v-else
      :columns="columns"
      :data-source="settlements"
      :pagination="false"
      size="small"
      bordered
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'settlementNo'">
          {{ record.settlementNo || '-' }}
        </template>
        <template v-else-if="column.key === 'settlementTime'">
          {{ formatDateTime(record.settlementTime) }}
        </template>
        <template v-else-if="column.key === 'settlement'">
          {{ record.settlement?.name || '-' }}
        </template>
        <template v-else-if="column.key === 'currency'">
          <Tag v-if="record.currency?.code" color="blue">
            {{ record.currency.code }}
          </Tag>
          <span v-else>-</span>
        </template>
        <template v-else-if="column.key === 'totalSettledPrice'">
          {{ formatAmount(record.totalSettledPrice) }}
        </template>
        <template v-else-if="column.key === 'attachments'">
          <div
            v-if="record.attachments?.length"
            class="settlement-attachment-list"
          >
            <button
              v-for="item in record.attachments"
              :key="item.id || item.attachmentId"
              type="button"
              class="settlement-attachment-item"
              :title="getFileName(item)"
              @click="openAttachment(item)"
            >
              {{ getFileName(item) }}
            </button>
          </div>
          <span v-else class="text-gray-400">无</span>
        </template>
      </template>
    </Table>
  </Modal>
</template>

<style scoped>
.settlement-attachment-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settlement-attachment-item {
  max-width: 100%;
  padding: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #1677ff;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: none;
}

.settlement-attachment-item:hover {
  text-decoration: underline;
}
</style>
