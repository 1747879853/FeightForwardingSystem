<script lang="ts" setup>
import { Textarea } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import { computed, useAttrs } from 'vue';

import { toEnglishUpperCase } from '#/utils/english-upper-case';

defineOptions({
  inheritAttrs: false,
});

interface Props {
  value?: string;
  allowClear?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  value: undefined,
  allowClear: false,
});

const emit = defineEmits<{
  'update:value': [value: string];
}>();

const attrs = useAttrs();

const textareaAttrs = computed(() => {
  const {
    allowClear: _allowClear,
    rows: _rows,
    ...rest
  } = attrs as Record<string, unknown>;
  return rest;
});

const showClear = computed(
  () => props.allowClear && String(props.value ?? '').length > 0,
);

const handleUpdate = (value: string) => {
  emit('update:value', toEnglishUpperCase(value));
};

const handleClear = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
  emit('update:value', '');
};
</script>

<template>
  <div
    class="english-upper-textarea"
    :class="{ 'english-upper-textarea--clearable': allowClear }"
  >
    <Textarea
      :value="value"
      :allow-clear="false"
      :rows="1"
      v-bind="textareaAttrs"
      @update:value="handleUpdate"
    />
    <button
      v-if="showClear"
      type="button"
      class="english-upper-textarea__clear"
      aria-label="clear"
      tabindex="-1"
      @mousedown.prevent
      @click="handleClear"
    >
      <IconifyIcon icon="ant-design:close-circle-filled" class="size-3.5" />
    </button>
  </div>
</template>

<style scoped>
.english-upper-textarea {
  position: relative;
  width: 100%;
  height: 100%;
}

.english-upper-textarea :deep(textarea.ant-input) {
  width: 100%;
  resize: vertical;
}

.english-upper-textarea--clearable :deep(textarea.ant-input) {
  padding-right: 24px;
}

.english-upper-textarea :deep(.ant-input-clear-icon) {
  display: none !important;
}

.english-upper-textarea__clear {
  position: absolute;
  top: 8px;
  right: 11px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
  color: rgb(0 0 0 / 25%);
  cursor: pointer;
  background: transparent;
  border: none;
}

.english-upper-textarea__clear:hover {
  color: rgb(0 0 0 / 45%);
}
</style>
