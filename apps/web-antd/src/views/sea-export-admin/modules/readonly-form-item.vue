<script lang="ts" setup>
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    label: string;
    value?: null | number | string;
    labelWidth?: number;
    emptyText?: string;
  }>(),
  {
    labelWidth: 86,
    emptyText: '-',
  },
);

const displayValue = computed(() => {
  if (props.value === null || props.value === undefined || props.value === '') {
    return props.emptyText;
  }
  return String(props.value);
});
</script>

<template>
  <div class="readonly-form-item">
    <span
      class="readonly-form-item__label"
      :style="{ width: `${labelWidth}px` }"
    >
      {{ label }}
    </span>
    <span class="readonly-form-item__value">{{ displayValue }}</span>
  </div>
</template>

<style scoped>
.readonly-form-item {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 22px;
  text-align: right;
}

.readonly-form-item__label {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 24px;
  color: #595959;
  text-align: left;
}

.readonly-form-item__value {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 500;
  line-height: 22px;
  color: #262626;
}
</style>
