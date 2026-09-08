<script lang="ts" setup>
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import { computed, ref, watch } from 'vue';
import dayjs from 'dayjs';

import { Empty, Modal, Spin, Table, message } from 'ant-design-vue';

import { getPaymentApplicationInputInvoiceList } from '#/api/settlement-management/payment-application-admin';
import { openAttachmentViewer } from '#/components/attachment-viewer';

import { formatAmount } from './form-data';

const props = defineProps<{
  open: boolean;
  orgId?: number | string;
  settlementId?: string;
  clientInvoiceInfoId?: string;
  excludeInvoiceNos?: string[];
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  confirm: [invoices: PaymentApplicationAdminApi.InputInvoiceSimpleDto[]];
}>();

const loading = ref(false);
const invoices = ref<PaymentApplicationAdminApi.InputInvoiceSimpleDto[]>([]);
const selectedRowKeys = ref<string[]>([]);

const selectedInvoices = computed(() => {
  const selected = new Set(selectedRowKeys.value.map(String));
  return invoices.value.filter((invoice) => selected.has(String(invoice.id)));
});

function onSelectChange(keys: (number | string)[]) {
  selectedRowKeys.value = keys.map(String);
}

/** 列宽合计对齐弹窗内容区，避免仅开纵向滚动时表头与表体错位 */
const TABLE_SCROLL_X = 848;

const columns = [
  { title: '发票号', dataIndex: 'invoiceNo', key: 'invoiceNo', width: 180 },
  {
    title: '开票日期',
    dataIndex: 'invoiceTime',
    key: 'invoiceTime',
    width: 120,
  },
  {
    title: '销售方抬头',
    dataIndex: 'sellerHeader',
    key: 'sellerHeader',
    ellipsis: true,
    width: 220,
  },
  {
    title: '金额',
    dataIndex: 'totalAmount',
    key: 'totalAmount',
    width: 120,
    align: 'right' as const,
  },
  {
    title: '附件',
    dataIndex: 'attachment',
    key: 'attachment',
    width: 160,
    ellipsis: true,
  },
];

function formatInvoiceTime(value?: null | string) {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '-';
}

function getFileName(
  item: PaymentApplicationAdminApi.AttachmentItemDto,
): string {
  return item.friendlyFileName || item.url?.split('/').pop() || '发票.pdf';
}

function resetState() {
  invoices.value = [];
  selectedRowKeys.value = [];
}

async function loadInvoices() {
  if (props.orgId == null || !props.settlementId) return;
  loading.value = true;
  resetState();
  try {
    invoices.value = await getPaymentApplicationInputInvoiceList({
      clientInvoiceInfoId: props.clientInvoiceInfoId,
      excludeInvoiceNos: props.excludeInvoiceNos,
      orgId: props.orgId,
      settlementId: props.settlementId,
    });
  } catch {
    emit('update:open', false);
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      void loadInvoices();
      return;
    }
    resetState();
  },
);

function handleCancel() {
  emit('update:open', false);
}

function handleOk() {
  if (selectedInvoices.value.length === 0) {
    message.warning('请选择进项发票');
    return;
  }
  emit('confirm', selectedInvoices.value);
  emit('update:open', false);
}
</script>

<template>
  <Modal
    :open="open"
    title="从进项发票选择"
    :confirm-loading="loading"
    :ok-button-props="{ disabled: loading }"
    width="920px"
    destroy-on-close
    @cancel="handleCancel"
    @ok="handleOk"
  >
    <Spin :spinning="loading">
      <Empty
        v-if="!loading && invoices.length === 0"
        description="暂无可用进项发票。请确认结算对象已维护纳税人识别号，且发票在最近一个月内、未被其他付费申请占用。"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
      <div v-else class="input-invoice-picker-table">
        <Table
          :columns="columns"
          :data-source="invoices"
          :pagination="false"
          :row-selection="{
            selectedRowKeys,
            onChange: onSelectChange,
            columnWidth: 48,
          }"
          size="small"
          bordered
          row-key="id"
          table-layout="fixed"
          :scroll="{ x: TABLE_SCROLL_X, y: 420 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'invoiceNo'">
              {{ record.invoiceNo || '-' }}
            </template>
            <template v-else-if="column.key === 'invoiceTime'">
              {{ formatInvoiceTime(record.invoiceTime) }}
            </template>
            <template v-else-if="column.key === 'sellerHeader'">
              {{ record.sellerHeader || '-' }}
            </template>
            <template v-else-if="column.key === 'totalAmount'">
              {{
                record.totalAmount == null
                  ? '-'
                  : formatAmount(record.totalAmount)
              }}
            </template>
            <template v-else-if="column.key === 'attachment'">
              <button
                v-if="record.attachment"
                type="button"
                class="input-invoice-file"
                :title="getFileName(record.attachment)"
                @click="openAttachmentViewer(record.attachment)"
              >
                {{ getFileName(record.attachment) }}
              </button>
              <span v-else class="input-invoice-file-empty">无 PDF</span>
            </template>
          </template>
        </Table>
      </div>
    </Spin>
  </Modal>
</template>

<style scoped>
.input-invoice-picker-table :deep(.ant-table-header) {
  /* 与表体滚动条占位对齐，避免「附件」列表头右侧留白错位 */
  overflow-y: scroll !important;
  scrollbar-gutter: stable;
}

.input-invoice-picker-table :deep(.ant-table-body) {
  scrollbar-gutter: stable;
}

.input-invoice-file {
  display: block;
  max-width: 100%;
  padding: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: #2563eb;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.input-invoice-file-empty {
  font-size: 12px;
  color: #94a3b8;
}
</style>
