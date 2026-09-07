<script lang="ts" setup>
import type { Dayjs } from 'dayjs';

import { computed, nextTick, reactive, ref, watch } from 'vue';

import {
  Alert,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
} from 'ant-design-vue';

import { MyCompanySelect } from '#/adapter/component';
import { InputInvoiceAdminApi as Api } from '#/api/settlement-management/input-invoice-admin';

import {
  enterAccountStatusOptions,
  invoiceLineOptions,
  invoiceStatusOptions,
  poolCheckedFilterOptions,
  reimbursementStatusOptions,
  signStatusOptions,
} from './constants';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ 'update:open': [boolean]; success: [] }>();

const visible = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
});

/** 手动拉取表单模型（枚举字段用 API 枚举类型，提交时直接对齐 DTO） */
interface PullFormModel {
  companyId?: number;
  invoiceNo?: string;
  invoiceCode?: string;
  elecInvoiceNumber?: string;
  invoiceTimeRange?: [Dayjs, Dayjs];
  updateTimeRange?: [Dayjs, Dayjs];
  sellerHeader?: string;
  sellerTaxNo?: string;
  totalAmount?: number;
  invoiceLine?: Api.InputInvoiceLine;
  invoiceStatus?: Api.InputInvoiceStatus;
  checkedStatus?: Api.InputInvoicePoolCheckedFilter;
  reimbursementStatus?: Api.InputInvoiceReimbursementStatus;
  signStatus?: Api.InputInvoiceSignStatus;
  enterAccountStatus?: Api.InputInvoiceEnterAccountStatus;
}

const createInitialModel = (): PullFormModel => ({
  companyId: undefined,
  invoiceNo: undefined,
  invoiceCode: undefined,
  elecInvoiceNumber: undefined,
  invoiceTimeRange: undefined,
  updateTimeRange: undefined,
  sellerHeader: undefined,
  sellerTaxNo: undefined,
  totalAmount: undefined,
  invoiceLine: undefined,
  invoiceStatus: undefined,
  checkedStatus: undefined,
  reimbursementStatus: undefined,
  signStatus: undefined,
  enterAccountStatus: undefined,
});

const formRef = ref();
const model = reactive<PullFormModel>(createInitialModel());
const submitting = ref(false);

const rules: Record<string, any> = {
  companyId: [
    {
      required: true,
      type: 'number',
      message: '请选择所属公司',
      trigger: 'change',
    },
  ],
};

// 每次打开重置筛选；公司由 MyCompanySelect 的 autoDefault 在挂载时回填默认公司
watch(
  () => props.open,
  (open) => {
    if (open) {
      Object.assign(model, createInitialModel());
      nextTick(() => formRef.value?.clearValidate?.());
    }
  },
);

const trimToUndefined = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

async function handleOk() {
  try {
    await formRef.value?.validate();
  } catch {
    // 校验未过：保持打开，AntD 已就地标红
    return;
  }

  const dto: Api.InputInvoicePullDto = {
    companyId: model.companyId as number,
    invoiceNo: trimToUndefined(model.invoiceNo),
    invoiceCode: trimToUndefined(model.invoiceCode),
    elecInvoiceNumber: trimToUndefined(model.elecInvoiceNumber),
    // 区间选择器保证起止成对且起不晚于止；起取当天 00:00、止取当天 23:59
    invoiceTimeStart: model.invoiceTimeRange?.[0]?.startOf('day').toISOString(),
    invoiceTimeEnd: model.invoiceTimeRange?.[1]?.endOf('day').toISOString(),
    updateTimeStart: model.updateTimeRange?.[0]?.startOf('day').toISOString(),
    updateTimeEnd: model.updateTimeRange?.[1]?.endOf('day').toISOString(),
    sellerHeader: trimToUndefined(model.sellerHeader),
    sellerTaxNo: trimToUndefined(model.sellerTaxNo),
    totalAmount: model.totalAmount ?? undefined,
    invoiceLine: model.invoiceLine,
    invoiceStatus: model.invoiceStatus,
    checkedStatus: model.checkedStatus,
    reimbursementStatus: model.reimbursementStatus,
    signStatus: model.signStatus,
    enterAccountStatus: model.enterAccountStatus,
  };

  submitting.value = true;
  try {
    const result = await Api.pull(dto);
    message.success(`拉取完成，本次写入/更新 ${result?.count ?? 0} 张`);
    emit('success');
    visible.value = false;
  } catch {
    // 失败保持打开，错误提示由全局响应拦截器给出，避免重复弹窗
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Modal
    v-model:open="visible"
    title="手动拉取进项发票"
    :width="820"
    :mask-closable="false"
    :confirm-loading="submitting"
    ok-text="开始拉取"
    cancel-text="取消"
    destroy-on-close
    @ok="handleOk"
  >
    <Alert
      class="mb-4"
      type="info"
      show-icon
      message="按公司现查开票接口发票池并写入本地"
      description="不填筛选条件将按该公司发票池分页全量拉取，可能较慢；填写发票号码 / 代码 / 数电号码时只查这些票，不再按页扫池。开票时间、更新时间的起止需成对且起不晚于止（用日期区间选择即可保证）。"
    />
    <Form ref="formRef" :model="model" :rules="rules" layout="vertical">
      <div class="grid grid-cols-2 gap-x-4">
        <FormItem label="所属公司" name="companyId">
          <MyCompanySelect
            v-model="model.companyId"
            placeholder="请选择所属公司"
          />
        </FormItem>
        <FormItem label="含税总金额" name="totalAmount">
          <InputNumber
            v-model:value="model.totalAmount"
            :min="0"
            :precision="2"
            class="w-full"
            placeholder="精确匹配"
          />
        </FormItem>
        <FormItem label="发票号码" name="invoiceNo">
          <Input
            v-model:value="model.invoiceNo"
            allow-clear
            placeholder="有值时按号码查"
          />
        </FormItem>
        <FormItem label="发票代码" name="invoiceCode">
          <Input
            v-model:value="model.invoiceCode"
            allow-clear
            placeholder="数电票不填"
          />
        </FormItem>
        <FormItem label="数电号码" name="elecInvoiceNumber">
          <Input
            v-model:value="model.elecInvoiceNumber"
            allow-clear
            placeholder="数电号码"
          />
        </FormItem>
        <FormItem label="销方名称" name="sellerHeader">
          <Input
            v-model:value="model.sellerHeader"
            allow-clear
            placeholder="销售方抬头"
          />
        </FormItem>
        <FormItem label="销方税号" name="sellerTaxNo">
          <Input
            v-model:value="model.sellerTaxNo"
            allow-clear
            placeholder="销方税号"
          />
        </FormItem>
        <FormItem label="发票种类" name="invoiceLine">
          <Select
            v-model:value="model.invoiceLine"
            :options="invoiceLineOptions"
            allow-clear
            show-search
            option-filter-prop="label"
            placeholder="全部"
          />
        </FormItem>
        <FormItem label="发票状态" name="invoiceStatus">
          <Select
            v-model:value="model.invoiceStatus"
            :options="invoiceStatusOptions"
            allow-clear
            show-search
            option-filter-prop="label"
            placeholder="全部"
          />
        </FormItem>
        <FormItem label="查验筛选" name="checkedStatus">
          <Select
            v-model:value="model.checkedStatus"
            :options="poolCheckedFilterOptions"
            allow-clear
            placeholder="未查验 / 已查验"
          />
        </FormItem>
        <FormItem label="报销状态" name="reimbursementStatus">
          <Select
            v-model:value="model.reimbursementStatus"
            :options="reimbursementStatusOptions"
            allow-clear
            placeholder="全部"
          />
        </FormItem>
        <FormItem label="签收状态" name="signStatus">
          <Select
            v-model:value="model.signStatus"
            :options="signStatusOptions"
            allow-clear
            placeholder="全部"
          />
        </FormItem>
        <FormItem label="入账状态" name="enterAccountStatus">
          <Select
            v-model:value="model.enterAccountStatus"
            :options="enterAccountStatusOptions"
            allow-clear
            show-search
            option-filter-prop="label"
            placeholder="全部"
          />
        </FormItem>
        <FormItem label="开票时间" name="invoiceTimeRange" class="col-span-2">
          <DatePicker.RangePicker
            v-model:value="model.invoiceTimeRange"
            class="w-full"
            :placeholder="['开票时间起', '开票时间止']"
          />
        </FormItem>
        <FormItem label="更新时间" name="updateTimeRange" class="col-span-2">
          <DatePicker.RangePicker
            v-model:value="model.updateTimeRange"
            class="w-full"
            :placeholder="['更新时间起', '更新时间止']"
          />
        </FormItem>
      </div>
    </Form>
  </Modal>
</template>
