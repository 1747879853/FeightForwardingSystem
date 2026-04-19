<!-- components/WordPreview.vue -->

<script setup lang="ts">
import OfficePreview from './office-preview.vue';

interface Props {
  visible?: boolean;
  fileUrl: string;
  fileName?: string;
  title?: string;
  // 是否转换为PDF预览（如果后端支持）
  convertToPdf?: boolean;
  // 是否显示工具栏
  showToolbar?: boolean;
}

withDefaults(defineProps<Props>(), {
  visible: false,
  fileName: '',
  title: '',
  convertToPdf: false,
  showToolbar: true,
});
</script>

<template>
  <OfficePreview
    v-bind="$attrs"
    :file-url="fileUrl"
    :title="title || 'Word文档预览'"
    :convert-to-pdf="convertToPdf"
  />
</template>
