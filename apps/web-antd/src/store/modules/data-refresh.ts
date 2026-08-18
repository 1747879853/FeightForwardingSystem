import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useDataRefreshStore = defineStore('data-refresh', () => {
  // 费用代码刷新信号
  const feeCodeRefreshSignal = ref(0);

  // 触发费用代码刷新
  function triggerFeeCodeRefresh() {
    feeCodeRefreshSignal.value++;
    console.log('🔄 [DataRefreshStore] 费用代码刷新信号已触发');
  }

  return {
    feeCodeRefreshSignal,
    triggerFeeCodeRefresh,
  };
});
