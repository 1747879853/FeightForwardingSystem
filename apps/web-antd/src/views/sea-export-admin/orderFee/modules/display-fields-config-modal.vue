<script lang="ts" setup>
import { ref } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { $t } from '#/locales';
import { Button, Switch, message } from 'ant-design-vue';
import { ArrowUp, ArrowDown, GripVertical } from '@vben/icons';
import { IconifyIcon } from '@vben/icons';
// 定义字段配置接口
export interface DisplayFieldConfig {
  key: string;
  label: string;
  visible: boolean;
}

const props = defineProps<{
  availableFields: DisplayFieldConfig[];
}>();

const emit = defineEmits(['confirm']);

// 本地配置状态
const localFields = ref<DisplayFieldConfig[]>([]);

// 初始化配置
const initFields = () => {
  localFields.value = props.availableFields.map((field) => ({ ...field }));
};

// 模态框
const [Modal, modalApi] = useVbenModal({
  class: 'w-[600px]',
  onConfirm: () => {
    // 验证至少选择一个字段
    const visibleCount = localFields.value.filter((f) => f.visible).length;
    if (visibleCount === 0) {
      //message.warning($t('seaExport.export.atLeastOneField'));
      return;
    }

    emit('confirm', [...localFields.value]);
    modalApi.close();
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      initFields();
    }
  },
});

// 上移
const moveUp = (index: number) => {
  if (index === 0) return;
  const temp = localFields.value[index];
  if (!temp) return;
  localFields.value[index] = localFields.value[index - 1]!;
  localFields.value[index - 1] = temp;
};

// 下移
const moveDown = (index: number) => {
  if (index === localFields.value.length - 1) return;
  const temp = localFields.value[index];
  if (!temp) return;
  localFields.value[index] = localFields.value[index + 1]!;
  localFields.value[index + 1] = temp;
};

// 全选
const selectAll = () => {
  localFields.value.forEach((field) => {
    field.visible = true;
  });
};

// 取消全选
const deselectAll = () => {
  localFields.value.forEach((field) => {
    field.visible = false;
  });
};

// 移动到顶部
const moveToTop = (index: number) => {
  if (index === 0) return;
  const item = localFields.value.splice(index, 1)[0];
  if (item) {
    localFields.value.unshift(item);
  }
};

// 移动到底部
const moveToBottom = (index: number) => {
  if (index === localFields.value.length - 1) return;
  const item = localFields.value.splice(index, 1)[0];
  if (item) {
    localFields.value.push(item);
  }
};

// 暴露modalApi供父组件调用
defineExpose({
  open() {
    modalApi.open();
  },
});
</script>

<template>
  <Modal :title="$t('seaExport.export.configureDisplayFields')" width="600px">
    <div class="mb-4 flex items-center justify-between">
      <div class="text-sm text-gray-500">
        {{ $t('seaExport.export.dragToReorder') }}
      </div>
      <div class="space-x-2">
        <Button size="small" @click="selectAll">
          {{ $t('common.selectAll') }}
        </Button>
        <Button size="small" @click="deselectAll">
          {{ $t('common.deselectAll') }}
        </Button>
      </div>
    </div>

    <div class="max-h-[450px] space-y-2 overflow-y-auto pr-2">
      <div
        v-for="(field, index) in localFields"
        :key="field.key"
        class="group flex items-center justify-between rounded border border-gray-200 bg-white px-3 py-2.5 transition-all hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm"
      >
        <div class="flex flex-1 items-center gap-3">
          <!-- 序号 -->
          <span
            class="flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs font-medium text-gray-600"
          >
            {{ index + 1 }}
          </span>

          <!-- 拖拽手柄 -->
          <!-- <GripVertical class="size-4 cursor-move text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" /> -->

          <!-- 字段名称 -->
          <span class="flex-1 text-sm">{{ field.label }}</span>
        </div>

        <div class="flex items-center gap-2">
          <!-- 显示/隐藏开关 -->
          <Switch
            v-model:checked="field.visible"
            size="small"
            :checked-children="$t('common.show')"
            :un-checked-children="$t('common.hide')"
          />

          <!-- 排序按钮组 -->
          <div class="ml-2 flex gap-1">
            <!-- 移到顶部 -->
            <Button
              size="small"
              :disabled="index === 0"
              @click="moveToTop(index)"
              title="移到顶部"
              class="h-6 w-6 p-1"
            >
              <IconifyIcon icon="mdi:arrow-collapse-up" class="btn-icon" />
            </Button>

            <!-- 上移 -->
            <Button
              size="small"
              :disabled="index === 0"
              @click="moveUp(index)"
              title="上移"
              class="h-6 w-6 p-0"
            >
              <IconifyIcon icon="mdi:arrow-up" class="btn-icon" />
            </Button>

            <!-- 下移 -->
            <Button
              size="small"
              :disabled="index === localFields.length - 1"
              @click="moveDown(index)"
              title="下移"
              class="h-6 w-6 p-0"
            >
              <IconifyIcon icon="mdi:arrow-down" class="btn-icon" />
            </Button>

            <!-- 移到底部 -->
            <Button
              size="small"
              :disabled="index === localFields.length - 1"
              @click="moveToBottom(index)"
              title="移到底部"
              class="h-6 w-6 p-0"
            >
              <IconifyIcon icon="mdi:arrow-collapse-down" class="btn-icon" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-4 rounded bg-blue-50 p-3 text-xs text-blue-700">
      <div class="mb-1 font-medium">💡 {{ $t('common.tips') }}：</div>
      <div>• {{ $t('seaExport.export.useSwitchToShowHide') }}</div>
      <div>• {{ $t('seaExport.export.useArrowsToReorder') }}</div>
      <!-- <div>• 悬停显示排序按钮，点击快速调整顺序</div> -->
    </div>
  </Modal>
</template>

<style scoped lang="scss">
.group:hover {
  .cursor-move {
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }
}
</style>
