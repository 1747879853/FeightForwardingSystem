<script setup lang="ts">
import { computed } from 'vue';
import {
  Button,
  Card,
  message,
  Space,
  Spin,
  Checkbox,
  CheckboxGroup,
  Select,
  Tag,
  Modal,
} from 'ant-design-vue';
interface Props {
  value: boolean;
  src: string;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  value: false,
  src: '',
  title: 'PDF预览',
});

const emit = defineEmits<{
  'update:value': [value: boolean];
  close: [];
}>();

const modelValue = computed({
  get: () => props.value,
  set: (val) => emit('update:value', val),
});

const handleCancel = () => {
  modelValue.value = false;
  emit('close');
};
</script>
<!-- components/PdfPreview.vue -->
<template>
  <Modal
    v-model:visible="modelValue"
    title="PDF预览"
    width="80%"
    :footer="null"
    @cancel="handleCancel"
    destroyOnClose
  >
    <div style="width: 100%; height: 80vh">
      <iframe
        v-if="modelValue && src"
        :src="src"
        frameborder="0"
        style="width: 100%; height: 100%"
        :title="title"
      ></iframe>
      <div v-else style="padding: 50px; text-align: center">
        <Spin size="large" />
      </div>
    </div>
  </Modal>
</template>
