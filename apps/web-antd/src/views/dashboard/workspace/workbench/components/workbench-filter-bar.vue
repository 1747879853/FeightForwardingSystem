<script lang="ts">
export default {
  name: 'WorkbenchFilterBar',
};
</script>

<script lang="ts" setup>
import type { FilterModel } from '../../workbench-data';

import { DatePicker, Input } from 'ant-design-vue';

import CarrierSelect from '#/adapter/component/biz-select/carrier-select.vue';
import ClientSelect from '#/adapter/component/biz-select/client-select.vue';
import PortSelect from '#/adapter/component/biz-select/port-select.vue';

interface Props {
  modelValue: FilterModel;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  reset: [];
  search: [];
  'update:modelValue': [FilterModel];
}>();

function patchField<K extends keyof FilterModel>(
  field: K,
  value: FilterModel[K],
) {
  emit('update:modelValue', { ...props.modelValue, [field]: value });
}

function onInput(field: keyof FilterModel, event: Event) {
  const target = event.target as HTMLInputElement | null;
  patchField(field, target?.value ?? '');
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
</script>

<template>
  <section class="filter-panel">
    <div class="filter-grid">
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
        <span class="field__label">MBL:</span>
        <Input
          class="field__input"
          :value="modelValue.mblNum"
          placeholder="输入主提单号"
          allow-clear
          @input="onInput('mblNum', $event)"
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
  gap: 12px;
  align-items: center;
  justify-content: flex-start;
  min-height: 72px;
  padding: 12px 16px;
  background: #fff;
  border: 0.5px solid #eff0f2;
  border-radius: 8px;
  box-shadow: 0 2px 8px 0 rgb(150 199 217 / 6%);
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(180px, 1fr));
  gap: 12px;
}

.field {
  display: flex;
  gap: 8px;
  align-items: center;
}

.field__label {
  flex: none;
  font-size: 12px;
  font-weight: 500;
  color: #181b20;
}

.field__input {
  width: 100%;
}

.filter-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-left: auto;
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
.filter-panel :deep(.ant-input),
.filter-panel :deep(.ant-select-selector) {
  height: 35px !important;
  border-radius: 6px !important;
}

.filter-panel :deep(.ant-picker-input > input),
.filter-panel :deep(.ant-input) {
  font-size: 14px;
}
</style>
