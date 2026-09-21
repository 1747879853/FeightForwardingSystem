<script lang="ts" setup>
import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Segmented, Tooltip } from 'ant-design-vue';

import {
  ClientSharedType,
  getClientSharedTypeOptions,
  getClientSharedTypeSegmentedOptions,
  normalizeClientSharedType,
} from './shared-type';

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    value?: ClientSharedType | boolean | number | null;
  }>(),
  {
    disabled: false,
    value: ClientSharedType.None,
  },
);

const emit = defineEmits<{
  'update:value': [value: ClientSharedType];
}>();

const model = computed({
  get: () => normalizeClientSharedType(props.value),
  set: (next: ClientSharedType | string | number) => {
    emit('update:value', normalizeClientSharedType(next));
  },
});

const segmentedOptions = getClientSharedTypeSegmentedOptions();
const helpText = getClientSharedTypeOptions()
  .map((item) => `${item.label}：${item.hint}`)
  .join('；');

const toneClass = computed(() => {
  switch (model.value) {
    case ClientSharedType.Company:
      return 'is-company';
    case ClientSharedType.All:
      return 'is-all';
    default:
      return 'is-none';
  }
});
</script>

<template>
  <div
    class="client-org-shared-label flex w-full min-w-0 items-center justify-between gap-2"
  >
    <span class="shrink-0">所属公司</span>
    <div
      class="client-shared-control flex min-w-0 shrink-0 items-center gap-1.5"
      :class="toneClass"
      @click.stop
    >
      <span class="client-shared-control__caption">共享</span>
      <Tooltip :title="helpText">
        <IconifyIcon
          icon="mdi:help-circle-outline"
          class="client-shared-control__help size-3.5 cursor-help"
        />
      </Tooltip>
      <Segmented
        v-model:value="model"
        size="small"
        :disabled="disabled"
        :options="segmentedOptions"
        class="client-shared-segmented"
      />
    </div>
  </div>
</template>

<style scoped>
.client-shared-control__caption {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  letter-spacing: 0.02em;
}

.client-shared-control__help {
  color: #94a3b8;
  opacity: 0.85;
  transition:
    color 0.15s ease,
    opacity 0.15s ease;
}

.client-shared-control__help:hover {
  color: #64748b;
  opacity: 1;
}

.client-shared-segmented {
  flex-shrink: 0;
}

.client-shared-segmented :deep(.ant-segmented) {
  padding: 2px;
  background: #f1f5f9;
  border-radius: 8px;
}

.client-shared-segmented :deep(.ant-segmented-item) {
  min-width: 52px;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  border-radius: 6px;
}

.client-shared-segmented :deep(.ant-segmented-item-selected) {
  color: #0f172a;
  box-shadow: 0 1px 2px rgb(15 23 42 / 8%);
}

.client-shared-control.is-none :deep(.ant-segmented-item-selected) {
  color: #475569;
  background: #fff;
}

.client-shared-control.is-company :deep(.ant-segmented-item-selected) {
  color: #1d4ed8;
  background: #eff6ff;
}

.client-shared-control.is-all :deep(.ant-segmented-item-selected) {
  color: #15803d;
  background: #ecfdf5;
}

@media (max-width: 640px) {
  .client-org-shared-label {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .client-shared-control {
    justify-content: flex-end;
    width: 100%;
  }
}
</style>
