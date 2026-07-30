<script lang="ts" setup>
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import { computed, ref, watch } from 'vue';
import dayjs from 'dayjs';

import {
  DatePicker,
  Input,
  Modal,
  Select,
  Spin,
  message,
} from 'ant-design-vue';

import {
  editPaymentApplicationInvoice,
  getPaymentApplicationDetail,
} from '#/api/settlement-management/payment-application-admin';

import AttachmentGroups from './attachment-groups.vue';

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
const invoiceNo = ref('');
const invoiceDate = ref<string | undefined>(undefined);
const attachmentGroup = ref<
  PaymentApplicationAdminApi.AttachmentGroupInputDto[]
>([]);

const isNoInvoice = computed(() => invoiceProcess.value === 2);

const invoiceProcessOptions = [
  { label: '先票后付', value: 0 },
  { label: '先付后票', value: 1 },
  { label: '不开票', value: 2 },
];

function resetForm() {
  invoiceProcess.value = undefined;
  invoiceNo.value = '';
  invoiceDate.value = undefined;
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
        attachmentId: Number(item.attachmentId),
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
  if (value === 2) {
    invoiceNo.value = '';
    invoiceDate.value = undefined;
  }
}

async function loadDetail(id: string) {
  loading.value = true;
  try {
    const detail = await getPaymentApplicationDetail(id);
    invoiceProcess.value = detail.invoiceProcess ?? undefined;
    if (invoiceProcess.value === 2) {
      invoiceNo.value = '';
      invoiceDate.value = undefined;
    } else {
      invoiceNo.value = detail.invoiceNo ?? '';
      invoiceDate.value = detail.invoiceDate
        ? dayjs(detail.invoiceDate).format('YYYY-MM-DD')
        : undefined;
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
  saving.value = true;
  try {
    await editPaymentApplicationInvoice({
      id: props.applicationId,
      invoiceProcess: invoiceProcess.value,
      invoiceNo: isNoInvoice.value ? null : invoiceNo.value || null,
      invoiceDate:
        isNoInvoice.value || !invoiceDate.value
          ? null
          : dayjs(invoiceDate.value).toISOString(),
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
        <div class="invoice-edit-row">
          <span class="invoice-edit-label">发票号</span>
          <Input
            v-model:value="invoiceNo"
            class="invoice-edit-control"
            placeholder="发票号"
            :maxlength="128"
            allow-clear
            :disabled="isNoInvoice"
          />
        </div>
        <div class="invoice-edit-row">
          <span class="invoice-edit-label">开票日期</span>
          <DatePicker
            v-model:value="invoiceDate"
            class="invoice-edit-control"
            value-format="YYYY-MM-DD"
            placeholder="开票日期"
            :disabled="isNoInvoice"
          />
        </div>
        <div class="invoice-edit-attachments">
          <div class="invoice-edit-attachments__title">附件</div>
          <AttachmentGroups
            v-if="open && applicationId"
            v-model="attachmentGroup"
            :application-id="applicationId"
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

.invoice-edit-attachments__title {
  margin-bottom: 8px;
  font-weight: 500;
  color: rgb(0 0 0 / 85%);
}
</style>
