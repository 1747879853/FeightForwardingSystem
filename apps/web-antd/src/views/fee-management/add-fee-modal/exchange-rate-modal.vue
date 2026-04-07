<script lang="ts" setup>
import { reactive, watch } from 'vue';

import { InputNumber, message, Modal, Tag } from 'ant-design-vue';

import type { CurrencyInfo } from './data';

const props = defineProps<{
  open: boolean;
  currencies: CurrencyInfo[];
  settlementCurrencyId?: number | null;
  settlementCurrencyName?: string;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  confirm: [rateMap: Map<number, number>];
}>();

const rateValues = reactive(new Map<number, number>());

watch(
  () => props.currencies,
  (list) => {
    rateValues.clear();
    for (const c of list) {
      rateValues.set(c.currencyId, 1);
    }
  },
);

function handleOk() {
  for (const c of props.currencies) {
    const rate = rateValues.get(c.currencyId);
    if (rate == null || rate <= 0) {
      message.warning(`请填写 ${c.currencyName} 的汇率`);
      return;
    }
  }
  emit('confirm', new Map(rateValues));
  emit('update:open', false);
}

function handleCancel() {
  emit('update:open', false);
}

function onRateChange(currencyId: number, val: number | null) {
  rateValues.set(currencyId, val ?? 0);
}
</script>

<template>
  <Modal
    :open="open"
    title="汇率录入"
    :width="520"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div class="py-2">
      <div class="mb-4 text-sm text-gray-500">
        所选费用包含与结算币别不同的币种，请输入对应汇率（精度：小数点后6位）
      </div>
      <div class="space-y-3">
        <div
          v-for="currency in currencies"
          :key="currency.currencyId"
          class="flex items-center gap-3"
        >
          <div class="flex w-52 items-center justify-end gap-1">
            <Tag color="blue">{{ currency.currencyName }}</Tag>
            <span class="text-gray-400">→</span>
            <Tag color="green">{{ settlementCurrencyName || '结算币别' }}</Tag>
          </div>
          <InputNumber
            :value="rateValues.get(currency.currencyId)"
            :min="0"
            :precision="6"
            :step="0.000001"
            class="flex-1"
            placeholder="请输入汇率"
            @change="(val) => onRateChange(currency.currencyId, val)"
          />
        </div>
      </div>
    </div>
  </Modal>
</template>
