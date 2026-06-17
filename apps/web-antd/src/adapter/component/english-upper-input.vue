<script lang="ts" setup>
import { Input } from 'ant-design-vue';

import { toEnglishUpperCase } from '#/utils/english-upper-case';

interface Props {
  value?: string;
}

defineProps<Props>();

const emit = defineEmits<{
  'update:value': [value: string];
}>();

const handleUpdate = (value: string) => {
  emit('update:value', toEnglishUpperCase(value));
};
</script>

<template>
  <Input :value="value" v-bind="$attrs" @update:value="handleUpdate" />
</template>
