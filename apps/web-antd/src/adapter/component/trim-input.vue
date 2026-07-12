<script lang="ts" setup>
/**
 * 自动去除前后空格的输入框
 * 用于编号/单号等检索字段，粘贴带空格时即时清理，避免用户手动删除
 */
import { Input } from 'ant-design-vue';

interface Props {
  value?: string;
}

defineProps<Props>();

const emit = defineEmits<{
  'update:value': [value: string];
}>();

const handleUpdate = (value?: string) => {
  emit('update:value', (value ?? '').trim());
};
</script>

<template>
  <Input :value="value" v-bind="$attrs" @update:value="handleUpdate" />
</template>
