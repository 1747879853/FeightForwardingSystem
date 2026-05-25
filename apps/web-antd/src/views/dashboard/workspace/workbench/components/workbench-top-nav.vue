<script lang="ts">
export default {
  name: 'WorkbenchTopNav',
};
</script>

<script lang="ts" setup>
import type { ServiceTab } from '../../workbench-data';

interface Props {
  modelValue: string;
  tabs: ServiceTab[];
}

defineProps<Props>();
const emit = defineEmits<{ 'update:modelValue': [string] }>();
</script>

<template>
  <header class="top-nav">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      :class="['top-nav__item', { 'is-active': tab.key === modelValue }]"
      type="button"
      @click="emit('update:modelValue', tab.key)"
    >
      {{ tab.label }}
    </button>
  </header>
</template>

<style scoped>
.top-nav {
  display: flex;
  gap: 30px;
  align-items: flex-end;
  height: 48px;
  padding-left: 24px;
  background: #fff;
  border-bottom: 1px solid #f3f4f6;
}

.top-nav__item {
  height: 47px;
  padding: 0 4px;
  font-size: 14px;
  font-weight: 500;
  line-height: 21px;
  color: #555d6d;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  opacity: 0.6;
}

.top-nav__item.is-active {
  color: #258cf4;
  border-bottom-color: #258cf4;
  opacity: 1;
}
</style>
