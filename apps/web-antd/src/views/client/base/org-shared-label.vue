<script lang="ts" setup>
import { IconifyIcon } from '@vben/icons';
import { Switch, Tooltip } from 'ant-design-vue';

defineProps<{
  checked?: boolean;
}>();

const emit = defineEmits<{
  'update:checked': [value: boolean];
}>();
</script>

<template>
  <div class="flex w-full min-w-0 items-center justify-between gap-2">
    <span class="shrink-0">所属公司</span>
    <div
      class="flex shrink-0 items-center gap-1.5 text-xs font-normal text-[#64748b]"
      @click.stop
    >
      <span>是否共享</span>
      <Tooltip title="共享后全集团可见">
        <IconifyIcon
          icon="mdi:help-circle-outline"
          class="size-3.5 cursor-help opacity-70 hover:opacity-100"
        />
      </Tooltip>
      <Switch
        size="small"
        :checked="Boolean(checked)"
        @update:checked="emit('update:checked', $event)"
      />
    </div>
  </div>
</template>
