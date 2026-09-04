<script lang="ts" setup>
import type { GeminiInvoiceDto } from '#/api/sea-export/gemini-admin';
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';
import type { InvoiceRowForm } from './invoice-rows';

import { computed, ref, watch } from 'vue';

import { Modal, Select, Spin, message } from 'ant-design-vue';

import {
  editPaymentApplicationInvoice,
  getPaymentApplicationDetail,
} from '#/api/settlement-management/payment-application-admin';

import AttachmentGroups from './attachment-groups.vue';
import InvoiceTable from './invoice-table.vue';
import {
  INVOICE_PROCESS,
  applyExtractedInvoiceToRows,
  buildInvoiceSubmitPayload,
  createEmptyInvoiceRow,
  mapInvoicesFromDetail,
  validateInvoiceRows,
} from './invoice-rows';

const props = defineProps<{
  open: boolean;
  applicationId?: string;
  applicationNo?: string;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  success: [];
}>();

const loading = ref(false);
const saving = ref(false);
const invoiceProcess = ref<number | undefined>(undefined);
const invoiceRows = ref<InvoiceRowForm[]>([]);
const attachmentGroup = ref<
  PaymentApplicationAdminApi.AttachmentGroupInputDto[]
>([]);

const isNoInvoice = computed(
  () => invoiceProcess.value === INVOICE_PROCESS.NoInvoice,
);

const invoiceProcessOptions = [
  { label: '先票后付', value: INVOICE_PROCESS.InvoiceBeforePayment },
  { label: '先付后票', value: INVOICE_PROCESS.PaymentBeforeInvoice },
  { label: '不开票', value: INVOICE_PROCESS.NoInvoice },
];

function resetForm() {
  invoiceProcess.value = undefined;
  invoiceRows.value = [];
  attachmentGroup.value = [];
}

function mapAttachmentGroupFromDetail(
  groups?: PaymentApplicationAdminApi.AttachmentGroupDto[] | null,
): PaymentApplicationAdminApi.AttachmentGroupInputDto[] {
  return (groups ?? []).map((group) => ({
    attachmentDtlTypeId: group.attachmentDtlTypeId ?? null,
    items: (group.items ?? []).map((item) => ({
      attachmentId: item.attachmentId,
      attachmentDtlTypeId:
        item.attachmentDtlTypeId ?? group.attachmentDtlTypeId ?? null,
      clientVisible: item.clientVisible ?? false,
      displayOrder: item.displayOrder,
      friendlyFileName: item.friendlyFileName,
      url: item.url,
    })),
  }));
}

/** 提交用：仅保留有文件的分组，结构与 Edit/EditInvoice 一致 */
function buildAttachmentGroupSubmit(): PaymentApplicationAdminApi.AttachmentGroupInputDto[] {
  return (attachmentGroup.value ?? [])
    .map((group) => ({
      attachmentDtlTypeId: group.attachmentDtlTypeId ?? null,
      items: (group.items ?? []).map((item, index) => ({
        attachmentId: item.attachmentId,
        attachmentDtlTypeId:
          item.attachmentDtlTypeId ?? group.attachmentDtlTypeId ?? null,
        clientVisible: item.clientVisible ?? false,
        displayOrder: item.displayOrder ?? index,
        friendlyFileName: item.friendlyFileName,
        url: item.url,
      })),
    }))
    .filter((group) => (group.items?.length ?? 0) > 0);
}

function onInvoiceProcessChange(value: number) {
  invoiceProcess.value = value;
  if (value === INVOICE_PROCESS.NoInvoice) {
    invoiceRows.value = [];
    return;
  }
  if (invoiceRows.value.length === 0) {
    invoiceRows.value = [createEmptyInvoiceRow()];
  }
}

/** 识别结果仅预填弹窗表单，点确定才走 EditInvoiceAsync */
function applyExtractedInvoice(result: GeminiInvoiceDto) {
  if (isNoInvoice.value) {
    message.warning('当前为不开票，无法填入发票信息');
    return;
  }
  const applied = applyExtractedInvoiceToRows(invoiceRows.value, result);
  if (!applied.ok) {
    message.warning(applied.message);
    return;
  }
  invoiceRows.value = applied.next;
  message.success(applied.message);
}

async function loadDetail(id: string) {
  loading.value = true;
  try {
    const detail = await getPaymentApplicationDetail(id);
    invoiceProcess.value = detail.invoiceProcess ?? undefined;
    invoiceRows.value =
      invoiceProcess.value === INVOICE_PROCESS.NoInvoice
        ? []
        : mapInvoicesFromDetail(detail.paymentApplicationInvoices);
    if (
      invoiceProcess.value !== INVOICE_PROCESS.NoInvoice &&
      invoiceRows.value.length === 0
    ) {
      invoiceRows.value = [createEmptyInvoiceRow()];
    }
    attachmentGroup.value = mapAttachmentGroupFromDetail(
      detail.attachmentGroup,
    );
  } catch {
    message.error('加载发票信息失败');
    emit('update:open', false);
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.open, props.applicationId] as const,
  ([open, id]) => {
    if (open && id) {
      void loadDetail(id);
    } else if (!open) {
      resetForm();
    }
  },
);

function handleCancel() {
  emit('update:open', false);
}

async function handleOk() {
  if (!props.applicationId) return;
  if (invoiceProcess.value == null) {
    message.warning('请选择发票流程');
    return;
  }
  const validation = validateInvoiceRows(
    invoiceProcess.value,
    invoiceRows.value,
  );
  if (!validation.ok) {
    message.warning(validation.message);
    return;
  }
  saving.value = true;
  try {
    await editPaymentApplicationInvoice({
      id: props.applicationId,
      invoiceProcess: invoiceProcess.value,
      paymentApplicationInvoices: buildInvoiceSubmitPayload(
        invoiceProcess.value,
        invoiceRows.value,
      ),
      // 全量覆盖：必须带回当前附件，否则会被清空
      attachmentGroup: buildAttachmentGroupSubmit(),
    });
    message.success('发票信息已保存');
    emit('update:open', false);
    emit('success');
  } catch (error: any) {
    message.error(error?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Modal
    :open="open"
    :title="applicationNo ? `维护发票信息 · ${applicationNo}` : '维护发票信息'"
    :confirm-loading="saving"
    :ok-button-props="{ disabled: loading }"
    width="640px"
    destroy-on-close
    @cancel="handleCancel"
    @ok="handleOk"
  >
    <Spin :spinning="loading">
      <div class="invoice-edit-form">
        <div class="invoice-edit-row">
          <span class="invoice-edit-label">发票流程</span>
          <Select
            :value="invoiceProcess"
            :options="invoiceProcessOptions"
            class="invoice-edit-control"
            placeholder="请选择"
            @update:value="onInvoiceProcessChange"
          />
        </div>
        <div class="invoice-edit-invoices">
          <div class="invoice-edit-invoices__title">发票明细</div>
          <InvoiceTable v-model="invoiceRows" :disabled="isNoInvoice" />
        </div>
        <div class="invoice-edit-attachments">
          <div class="invoice-edit-attachments__title">附件</div>
          <AttachmentGroups
            v-if="open && applicationId"
            v-model="attachmentGroup"
            :application-id="applicationId"
            @extracted="applyExtractedInvoice"
          />
        </div>
      </div>
    </Spin>
  </Modal>
</template>

<style scoped>
.invoice-edit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 120px;
  padding: 8px 0 4px;
}

.invoice-edit-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.invoice-edit-label {
  flex-shrink: 0;
  width: 72px;
  color: rgb(0 0 0 / 65%);
}

.invoice-edit-control {
  flex: 1;
  min-width: 0;
}

.invoice-edit-invoices__title,
.invoice-edit-attachments__title {
  margin-bottom: 8px;
  font-weight: 500;
  color: rgb(0 0 0 / 85%);
}
</style>
