<script lang="ts">
export default {
  name: 'WorkbenchReviewFilterBar',
};
</script>

<script lang="ts" setup>
import type { ProcessingTab } from '../../workbench-data';

import { DatePicker, Input, Select } from 'ant-design-vue';
import { computed } from 'vue';

import ClientSelect from '#/adapter/component/biz-select/client-select.vue';
import CurrencySelect from '#/adapter/component/biz-select/currency-select.vue';
import UserSelect from '#/adapter/component/biz-select/user-select.vue';
import { BusinessTypeOptions } from '#/views/client/payment-terms/data';

export interface ArApReviewFilterModel {
  bizType?: number;
  keyword: string;
  clientId?: string;
  etdStart?: any;
  etdEnd?: any;
  saleId?: number;
  operatorId?: number;
}

export interface PaymentReviewFilterModel {
  applicationNo: string;
  auditUserId?: number;
  creatorUserId?: number;
  currencyId?: number;
  keyword: string;
  settlementId?: string;
  submitTimeRange: [string, string] | [any, any] | null;
}

type ReviewFilterModel = ArApReviewFilterModel | PaymentReviewFilterModel;

interface Props {
  activeProcessingTab: string;
  mode: 'ar-ap-review' | 'payment-review';
  modelValue: ReviewFilterModel;
  processingTabs: ProcessingTab[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  reset: [];
  search: [];
  'update:activeProcessingTab': [string];
  'update:modelValue': [ReviewFilterModel];
}>();

const processingOptions = props.processingTabs.map((item) => ({
  label: item.label,
  value: item.key,
}));

const arApModel = computed<ArApReviewFilterModel>(
  () => props.modelValue as ArApReviewFilterModel,
);

const paymentModel = computed<PaymentReviewFilterModel>(
  () => props.modelValue as PaymentReviewFilterModel,
);

function patchValue(value: ReviewFilterModel) {
  emit('update:modelValue', value);
}

function patchArApField<K extends keyof ArApReviewFilterModel>(
  field: K,
  value: ArApReviewFilterModel[K],
) {
  if (props.mode !== 'ar-ap-review') return;
  const current = props.modelValue as ArApReviewFilterModel;
  patchValue({ ...current, [field]: value });
}

function patchPaymentField<K extends keyof PaymentReviewFilterModel>(
  field: K,
  value: PaymentReviewFilterModel[K],
) {
  if (props.mode !== 'payment-review') return;
  const current = props.modelValue as PaymentReviewFilterModel;
  patchValue({ ...current, [field]: value });
}

function onProcessingTabChange(value: unknown) {
  emit('update:activeProcessingTab', String(value ?? 'processing'));
}

function onArApBizTypeChange(value: unknown) {
  patchArApField('bizType', (value as number | undefined) ?? undefined);
}

function onArApClientChange(value: unknown) {
  patchArApField('clientId', (value as string | undefined) ?? undefined);
}

function onArApSaleChange(value: unknown) {
  patchArApField('saleId', (value as number | undefined) ?? undefined);
}

function onArApOperatorChange(value: unknown) {
  patchArApField('operatorId', (value as number | undefined) ?? undefined);
}

function onArApDateChange(field: 'etdEnd' | 'etdStart', value: unknown) {
  patchArApField(field, (value ?? null) as any);
}

function onSettlementChange(value: unknown) {
  patchPaymentField('settlementId', (value as string | undefined) ?? undefined);
}

function onCurrencyChange(value: unknown) {
  patchPaymentField('currencyId', (value as number | undefined) ?? undefined);
}

function onSubmitTimeChange(value: unknown) {
  patchPaymentField('submitTimeRange', (value ?? null) as any);
}

function onCreatorChange(value: unknown) {
  patchPaymentField(
    'creatorUserId',
    (value as number | undefined) ?? undefined,
  );
}

function onAuditUserChange(value: unknown) {
  patchPaymentField('auditUserId', (value as number | undefined) ?? undefined);
}
</script>

<template>
  <section class="filter-panel">
    <div class="filter-grid">
      <label class="field">
        <span class="field__label">处理状态:</span>
        <Select
          class="field__input"
          :value="props.activeProcessingTab"
          :options="processingOptions"
          placeholder="请选择状态"
          @update:value="onProcessingTabChange"
        />
      </label>
      <template v-if="props.mode === 'ar-ap-review'">
        <label class="field">
          <span class="field__label">业务类型:</span>
          <Select
            class="field__input"
            :value="arApModel.bizType"
            :options="BusinessTypeOptions"
            placeholder="请选择业务类型"
            allow-clear
            @update:value="onArApBizTypeChange"
          />
        </label>
        <label class="field">
          <span class="field__label">业务编号:</span>
          <Input
            class="field__input"
            :value="arApModel.keyword"
            placeholder="输入业务编号/关键字"
            allow-clear
            @update:value="patchArApField('keyword', $event ?? '')"
          />
        </label>
        <label class="field">
          <span class="field__label">客户:</span>
          <ClientSelect
            class="field__input"
            :model-value="arApModel.clientId"
            :selected-items="[]"
            placeholder="请选择客户"
            @update:model-value="onArApClientChange"
          />
        </label>
        <label class="field">
          <span class="field__label">ETD:</span>
          <DatePicker
            class="field__input"
            :value="arApModel.etdStart ?? undefined"
            placeholder="请选择 ETD"
            @update:value="onArApDateChange('etdStart', $event)"
          />
        </label>
        <label class="field">
          <span class="field__label">截止日期:</span>
          <DatePicker
            class="field__input"
            :value="arApModel.etdEnd ?? undefined"
            placeholder="请选择截止日期"
            @update:value="onArApDateChange('etdEnd', $event)"
          />
        </label>
        <label class="field">
          <span class="field__label">销售:</span>
          <UserSelect
            class="field__input"
            :model-value="arApModel.saleId"
            :selected-items="[]"
            :user-attribute="16"
            placeholder="请选择销售"
            @update:model-value="onArApSaleChange"
          />
        </label>
        <label class="field">
          <span class="field__label">操作:</span>
          <UserSelect
            class="field__input"
            :model-value="arApModel.operatorId"
            :selected-items="[]"
            :user-attribute="1"
            placeholder="请选择操作"
            @update:model-value="onArApOperatorChange"
          />
        </label>
      </template>

      <template v-else>
        <label class="field">
          <span class="field__label">业务编号:</span>
          <Input
            class="field__input"
            :value="paymentModel.keyword"
            placeholder="输入业务编号/关键字"
            allow-clear
            @update:value="patchPaymentField('keyword', $event ?? '')"
          />
        </label>
        <label class="field">
          <span class="field__label">申请单号:</span>
          <Input
            class="field__input"
            :value="paymentModel.applicationNo"
            placeholder="输入申请单号"
            allow-clear
            @update:value="patchPaymentField('applicationNo', $event ?? '')"
          />
        </label>
        <label class="field">
          <span class="field__label">结算对象:</span>
          <ClientSelect
            class="field__input"
            :model-value="paymentModel.settlementId"
            :selected-items="[]"
            placeholder="请选择结算对象"
            @update:model-value="onSettlementChange"
          />
        </label>
        <label class="field">
          <span class="field__label">币种:</span>
          <CurrencySelect
            class="field__input"
            :model-value="paymentModel.currencyId"
            :selected-items="[]"
            placeholder="请选择币种"
            @update:model-value="onCurrencyChange"
          />
        </label>
        <label class="field">
          <span class="field__label">提交时间:</span>
          <DatePicker.RangePicker
            class="field__input"
            :value="paymentModel.submitTimeRange ?? undefined"
            @update:value="onSubmitTimeChange"
          />
        </label>
        <label class="field">
          <span class="field__label">申请人:</span>
          <UserSelect
            class="field__input"
            :model-value="paymentModel.creatorUserId"
            :selected-items="[]"
            placeholder="请选择申请人"
            @update:model-value="onCreatorChange"
          />
        </label>
        <label class="field">
          <span class="field__label">审核人:</span>
          <UserSelect
            class="field__input"
            :model-value="paymentModel.auditUserId"
            :selected-items="[]"
            placeholder="请选择审核人"
            @update:model-value="onAuditUserChange"
          />
        </label>
      </template>

      <div class="filter-actions">
        <button class="btn btn-reset" type="button" @click="emit('reset')">
          重置
        </button>
        <button class="btn btn-search" type="button" @click="emit('search')">
          立即查询
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.filter-panel {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  min-height: 83px;
  padding: 13px 40px 16px;
  background: #fff;
  border-bottom: 1px solid #f3f4f6;
  box-shadow: 0 2px 6px rgb(24 27 32 / 4%);
}

.filter-grid {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  align-items: center;
}

.field {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.field__label {
  flex: none;
  width: 64px;
  font-size: 12px;
  font-weight: 500;
  color: #181b20;
}

.field__input {
  width: 100%;
  min-width: 0;
}

.filter-actions {
  display: flex;
  grid-column: -2 / -1;
  gap: 8px;
  justify-content: flex-end;
}

.btn {
  min-width: 84px;
  height: 36px;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 6px;
}

.btn-reset {
  color: #181b20;
  background: #fff;
  border-color: #dee1e6;
}

.btn-search {
  padding: 0 20px;
  color: #fff;
  background: #258cf4;
  box-shadow: 0 2px 4px rgb(37 140 244 / 20%);
}

.filter-panel :deep(.ant-picker),
.filter-panel :deep(.ant-select-selector),
.filter-panel :deep(.ant-input-affix-wrapper),
.filter-panel :deep(.ant-input) {
  height: 35px !important;
  border-radius: 6px !important;
}

.field :deep(.ant-select) {
  width: 170px !important;
  min-width: 170px;
  max-width: 170px;
}

.filter-panel :deep(.ant-picker-input > input),
.filter-panel :deep(.ant-input) {
  font-size: 14px;
}

.filter-panel
  :deep(.ant-select-single .ant-select-selector .ant-select-selection-item),
.filter-panel
  :deep(
    .ant-select-single .ant-select-selector .ant-select-selection-placeholder
  ) {
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 33px !important;
  white-space: nowrap;
}

.filter-panel :deep(.ant-input-affix-wrapper) {
  display: flex;
  align-items: center;
}

.filter-panel :deep(.ant-input-affix-wrapper .ant-input) {
  height: auto !important;
  padding: 0 !important;
}

@media (max-width: 1680px) {
  .filter-panel {
    flex-direction: column;
    align-items: stretch;
    padding: 12px 20px;
  }
}
</style>
