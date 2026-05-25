<script lang="ts">
export default {
  name: 'WorkbenchFilterBar',
};
</script>

<script lang="ts" setup>
import type { FilterModel } from '../../workbench-data';

interface Props {
  modelValue: FilterModel;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  reset: [];
  search: [];
  'update:modelValue': [FilterModel];
}>();

function patchField(field: keyof FilterModel, value: string) {
  emit('update:modelValue', { ...props.modelValue, [field]: value });
}

function onInput(field: keyof FilterModel, event: Event) {
  const target = event.target as HTMLInputElement | null;
  patchField(field, target?.value ?? '');
}
</script>

<template>
  <section class="filter-panel">
    <div class="filter-grid">
      <label class="field">
        <span class="field__label">ETD:</span>
        <input
          class="field__input"
          :value="modelValue.etd"
          type="text"
          @input="onInput('etd', $event)"
        />
      </label>
      <label class="field">
        <span class="field__label">客户:</span>
        <input
          class="field__input"
          :value="modelValue.customer"
          placeholder="输入关键字..."
          type="text"
          @input="onInput('customer', $event)"
        />
      </label>
      <label class="field">
        <span class="field__label">船公司:</span>
        <input
          class="field__input"
          :value="modelValue.shippingCompany"
          placeholder="MSK/MSC/COSCO..."
          type="text"
          @input="onInput('shippingCompany', $event)"
        />
      </label>
      <label class="field">
        <span class="field__label">提单号:</span>
        <input
          class="field__input"
          :value="modelValue.blNo"
          placeholder="HBL/MBL No."
          type="text"
          @input="onInput('blNo', $event)"
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
  grid-template-columns: repeat(4, minmax(120px, 1fr));
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
  height: 35px;
  padding: 0 11px;
  font-size: 14px;
  color: #181b20;
  outline: none;
  background: #fff;
  border: 1px solid #dee1e6;
  border-radius: 6px;
}

.field__input::placeholder {
  color: #555d6d;
}

.field__input:focus {
  border-color: #258cf4;
  box-shadow: 0 0 0 1px rgb(37 140 244 / 25%);
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
</style>
