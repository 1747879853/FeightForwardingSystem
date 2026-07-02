<script lang="ts" setup>
export type ListTabKey = 'bank-statement' | 'receive-settlement';

const activeKey = defineModel<ListTabKey>('activeKey', { required: true });

const tabs: { key: ListTabKey; label: string }[] = [
  { key: 'bank-statement', label: '银行流水' },
  { key: 'receive-settlement', label: '收费结算' },
];
</script>

<template>
  <div class="inline-flex items-center gap-1">
    <span
      v-for="tab in tabs"
      :key="tab.key"
      class="cursor-pointer border-b-2 px-3 py-1 text-base transition-colors"
      :class="
        activeKey === tab.key
          ? 'border-blue-500 font-medium text-blue-500'
          : 'border-transparent text-gray-600 hover:text-gray-900'
      "
      @click="activeKey = tab.key"
    >
      {{ tab.label }}
    </span>
  </div>
</template>
