<script lang="ts" setup>
import { ref, computed } from 'vue';
import { Input, Button, message } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';

interface Props {
  row: any;
  column: any;
}

const props = defineProps<Props>();
const emit = defineEmits(['success']);

// 编辑状态
const isEditing = ref(false);
const editingValue = ref<number | string>('');
const loading = ref(false);

// 获取箱型名称
const ctnName = props.column.params?.ctnName || '';

// 进入编辑模式
function handleEdit() {
  isEditing.value = true;

  // 从 seFreiPriceCtns 中获取当前箱型的成本值
  const ctn = props.row.seFreiPriceCtns?.find(
    (item: any) => item.ctnCode?.ctnName === ctnName,
  );
  editingValue.value = ctn?.cost ?? '';
}

// 确认保存
async function handleConfirm() {
  const newValue = Number(editingValue.value);
  if (isNaN(newValue)) {
    message.warning('请输入有效的数字');
    return;
  }

  loading.value = true;
  try {
    const result = await props.column.params?.onConfirm?.(newValue, props.row);
    if (result !== false) {
      isEditing.value = false;
      emit('success');
    }
  } catch (error) {
    console.error('保存失败:', error);
    message.error('保存失败');
  } finally {
    loading.value = false;
  }
}

// 取消编辑
function handleCancel() {
  isEditing.value = false;
  // 从 seFreiPriceCtns 中恢复原始值
  const ctn = props.row.seFreiPriceCtns?.find(
    (item: any) => item.ctnCode?.ctnName === ctnName,
  );
  editingValue.value = ctn?.cost ?? '';
}

// 键盘事件
function handleKeyPress(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleConfirm();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    handleCancel();
  }
}

// 格式化显示值
const displayValue = computed(() => {
  // 从 row.seFreiPriceCtns 中查找对应的箱型成本
  const ctnName = props.column.params?.ctnName;
  if (!ctnName || !props.row.seFreiPriceCtns) {
    return '-';
  }

  const ctn = props.row.seFreiPriceCtns.find(
    (item: any) => item.ctnCode?.ctnName === ctnName,
  );

  if (!ctn || ctn.cost === undefined || ctn.cost === null || ctn.cost === '') {
    return '-';
  }

  const numValue = Number(ctn.cost);
  return isNaN(numValue) ? '-' : numValue.toFixed(2);
});
</script>

<template>
  <div v-if="isEditing" class="flex items-center gap-1">
    <Button
      type="primary"
      size="small"
      @click="handleConfirm"
      :loading="loading"
      title="确认"
    >
      <IconifyIcon icon="mdi:check" class="size-4" />
    </Button>
    <Button size="small" @click="handleCancel" title="取消">
      <IconifyIcon icon="mdi:close" class="size-4" />
    </Button>
    <Input
      v-model:value="editingValue"
      size="small"
      placeholder="请输入"
      @press-enter="handleConfirm"
      @keydown="handleKeyPress"
      :style="{ flex: 1 }"
      autofocus
    />
  </div>
  <div
    v-else
    class="cell-editable-number flex items-center justify-between rounded px-2 py-1 transition-colors hover:bg-blue-50"
  >
    <span class="cost-value">{{ displayValue }}</span>
    <Button
      type="text"
      size="small"
      @click.stop="handleEdit"
      class="edit-icon-btn"
      title="编辑"
    >
      <IconifyIcon icon="mdi:pencil-outline" class="size-4" />
    </Button>
  </div>
</template>

<style scoped>
.cell-editable-number {
  min-height: 28px;
  user-select: none;
}

.cost-value {
  font-weight: 600;
  color: #fa8c16;
}

.edit-icon-btn {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.cell-editable-number:hover .edit-icon-btn {
  opacity: 1;
}
</style>
