<script lang="ts" setup>
import OrderFeePage from '#/views/_shared/order-fee/OrderFeePage.vue';
import { airExportAdapter } from '#/views/_shared/order-fee/adapter/air-export';

// KeepAlive include 依赖路由组件 name（editor.vue 中 <KeepAlive include="AirExportOrderFee">）
defineOptions({
  name: 'AirExportOrderFee',
});

defineProps<{
  latestDetail?: any;
}>();

defineEmits<{
  (
    e: 'fee-count-change',
    payload: { recCount: number; payCount: number },
  ): void;
}>();
</script>

<template>
  <OrderFeePage
    :adapter="airExportAdapter"
    :latest-detail="latestDetail"
    @fee-count-change="$emit('fee-count-change', $event)"
  />
</template>
