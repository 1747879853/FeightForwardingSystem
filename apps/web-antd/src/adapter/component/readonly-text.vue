<script lang="ts" setup>
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    emptyText?: string;
    value?: null | number | string;
  }>(),
  {
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
  <span class="block min-h-8 text-sm leading-8 text-foreground">
    {{ displayValue }}
  </span>
</template>
