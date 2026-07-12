<script lang="ts">
export default {
  name: 'WorkbenchFilterBar',
};
</script>

<script lang="ts" setup>
import type { FilterModel, ProcessingTab } from '../../workbench-data';

import { DatePicker, Input, Select } from 'ant-design-vue';
import { computed } from 'vue';

import CarrierSelect from '#/adapter/component/biz-select/carrier-select.vue';
import ClientSelect from '#/adapter/component/biz-select/client-select.vue';
import PortSelect from '#/adapter/component/biz-select/port-select.vue';

interface Props {
  activeProcessingTab: string;
  modelValue: FilterModel;
  processingTabs: ProcessingTab[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  reset: [];
  search: [];
  'update:activeProcessingTab': [string];
  'update:modelValue': [FilterModel];
}>();

const processingOptions = computed(() =>
  props.processingTabs.map((item) => ({
    label: item.label,
    value: item.key,
  })),
);

function patchField<K extends keyof FilterModel>(
  field: K,
  value: FilterModel[K],
) {
  emit('update:modelValue', { ...props.modelValue, [field]: value });
}

function onClientChange(value: unknown) {
  patchField('clientId', value as string | undefined);
}

function onCarrierChange(value: unknown) {
  patchField('carrierId', value as number | undefined);
}

function onPodChange(value: unknown) {
  patchField('podId', value as number | undefined);
}

function onEtdChange(value: [string, string] | [any, any] | null) {
  patchField('etdRange', value as FilterModel['etdRange']);
}

function onProcessingTabChange(value: unknown) {
  emit('update:activeProcessingTab', String(value ?? 'processing'));
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
      <label class="field">
        <span class="field__label">ETD:</span>
        <DatePicker.RangePicker
          class="field__input"
          :value="modelValue.etdRange ?? undefined"
          @update:value="onEtdChange($event ?? null)"
        />
      </label>
      <label class="field">
        <span class="field__label">客户名称:</span>
        <ClientSelect
          class="field__input"
          :model-value="modelValue.clientId"
          :selected-items="[]"
          placeholder="请选择客户"
          @update:model-value="onClientChange"
        />
      </label>
      <label class="field">
        <span class="field__label">船公司:</span>
        <CarrierSelect
          class="field__input"
          :model-value="modelValue.carrierId"
          :selected-items="[]"
          placeholder="请选择船公司"
          @update:model-value="onCarrierChange"
        />
      </label>
      <label class="field">
        <span class="field__label">编号:</span>
        <Input
          class="field__input"
          :value="modelValue.keyword"
          placeholder="主提单号/订舱编号/委托编号"
          allow-clear
          @update:value="patchField('keyword', ($event ?? '').trim())"
        />
      </label>
      <label class="field">
        <span class="field__label">POD:</span>
        <PortSelect
          class="field__input"
          :model-value="modelValue.podId"
          :selected-items="[]"
          placeholder="请选择目的港"
          @update:model-value="onPodChange"
        />
      </label>
    </div>

    <div class="filter-actions">
      <button class="btn btn-reset" type="button" @click="emit('reset')">
        重置
      </button>
      <button class="btn btn-search" type="button" @click="emit('search')">
        立即查询
      </button>
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
  grid-template-columns: repeat(6, minmax(160px, 1fr));
  gap: 12px;
}

.field {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.field__label {
  flex: none;
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
.filter-panel :deep(.ant-input-affix-wrapper) {
  height: 35px !important;
  border-radius: 6px !important;
}

.field :deep(.ant-select) {
  width: 100% !important;
  min-width: 0;
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

  .filter-actions {
    justify-content: flex-start;
  }

  .filter-grid {
    grid-template-columns: repeat(3, minmax(180px, 1fr));
  }
}

@media (max-width: 1200px) {
  .filter-grid {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}
</style>
