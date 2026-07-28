# 运价批量新增 Handsontable 重构 - 文件替换指南

## 问题说明

batch-add-modal.vue 文件过大（~65KB，1999行），edit_file 工具无法完全替换。

## 解决方案

### 方法1：手动替换（推荐）

1. **备份当前文件**（已完成）

   ```
   batch-add-modal-old.vue (已备份)
   ```

2. **删除旧文件**

   ```bash
   Remove-Item batch-add-modal.vue
   ```

3. **创建新文件** 将以下内容保存为 `batch-add-modal.vue`：

```vue
<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { Plus, Copy } from '@vben/icons';
import {
  Button,
  message,
  Select,
  Space,
  Modal as AntModal,
  InputNumber,
  DropdownButton,
  Menu,
  MenuItem,
} from 'ant-design-vue';

// 导入 composables
import { useBatchAddData } from './composables/useBatchAddData';
import { useBatchAddDropdownSources } from './composables/useBatchAddDropdownSources';
import { useBatchAddColumns } from './composables/useBatchAddColumns';
import { useBatchAddSettings } from './composables/useBatchAddSettings';
import { useBatchAddActions } from './composables/useBatchAddActions';

// 导入核心表格组件
import BatchAddTableCore from './BatchAddTableCore.vue';

const emit = defineEmits<{ success: [] }>();

// ==================== 使用 Composables ====================

const {
  dataSource,
  selectedRowKeys,
  addedCtnTypes,
  defaultCurrencyId,
  addRow,
  deleteSelectedRows,
  copySelectedRows,
  validateForm,
  prepareSubmitData,
  reset,
} = useBatchAddData();

const {
  allCtnOptions,
  labelCache,
  updateLabelCache,
  getCarrierName,
  getPortName,
  getCurrencyName,
  getClientName,
  initDropdownSources,
} = useBatchAddDropdownSources();

const actions = useBatchAddActions(
  dataSource,
  selectedRowKeys,
  addedCtnTypes,
  allCtnOptions,
  validateForm,
  prepareSubmitData,
  reset,
  emit,
);

const currentOptionsCache = computed(() => ({
  carriers: Object.entries(labelCache.value.carriers).map(([id, name]) => ({
    label: name,
    value: Number(id),
  })),
  ports: Object.entries(labelCache.value.ports).map(([id, name]) => ({
    label: name,
    value: Number(id),
  })),
  currencies: Object.entries(labelCache.value.currencies).map(([id, code]) => ({
    label: code,
    value: Number(id),
  })),
  clients: Object.entries(labelCache.value.clients).map(([id, name]) => ({
    label: name,
    value: Number(id),
  })),
}));

const sortableFieldsSet = new Set<string>([
  'carrierId',
  'polId',
  'podId',
  'currencyId',
]);
const sortState = ref<{ field: string | null; order: 'asc' | 'desc' | null }>({
  field: null,
  order: null,
});

const getSortIcon = (field: string): string => {
  if (sortState.value.field !== field) return '';
  return sortState.value.order === 'asc' ? '↑' : '↓';
};

const handleColumnSort = (field: string, order: 'asc' | 'desc') => {
  sortState.value = { field, order };
};

const getColumnIndex = (field: string): number => {
  const columns = hotColumns.value;
  if (!columns || !Array.isArray(columns)) return -1;
  return columns.findIndex((col: any) => col.data === field);
};

const handleOpenDropdown = (
  rowIndex: number,
  colIndex: number,
  field: string,
  source: string[],
) => {
  coreTableRef.value?.handleOpenDropdown(rowIndex, colIndex, field, source);
};

const linkage = {
  handleIsDirectChange: (row: any, value: boolean) => {
    if (value) {
      row.poT1Id = undefined;
      row.poT2Id = undefined;
    }
  },
  handleSwitchToDateTimeMode: (row: any) => {
    row.etdDayOfWeek = undefined;
    row.closeDocDayOfWeek = undefined;
    row.closingDayOfWeek = undefined;
  },
  handleSwitchToWeekMode: (row: any) => {
    row.etd = '';
    row.closeDocTime = '';
    row.closingTime = '';
  },
};

const { hotColumns } = useBatchAddColumns(
  addedCtnTypes,
  { getCarrierName, getPortName, getCurrencyName, getClientName },
  dataSource,
  selectedRowKeys,
  sortableFieldsSet,
  sortState,
  getSortIcon,
  currentOptionsCache,
  getColumnIndex,
  handleOpenDropdown,
  linkage,
);

const { hotSettings: rawHotSettings } = useBatchAddSettings(
  dataSource,
  selectedRowKeys,
  hotColumns,
  handleColumnSort,
  linkage,
  { getCarrierName, getPortName, getCurrencyName, getClientName },
  currentOptionsCache,
  getColumnIndex,
  handleOpenDropdown,
  getSortIcon,
);

const hotSettings = shallowRef(rawHotSettings.value);
const coreTableRef = ref<InstanceType<typeof BatchAddTableCore>>();

const [Modal, modalApi] = useVbenModal({
  title: '批量新增运价',
  confirmLoading: false,
  onConfirm: async () => {
    await actions.handleSubmit();
  },
  onCancel: () => {
    modalApi.close();
  },
  onOpened: async () => {
    console.log('弹窗已打开');
    if (allCtnOptions.value.length === 0) {
      const { defaultCtns } = await initDropdownSources(defaultCurrencyId);
      addedCtnTypes.value = defaultCtns;
    }
    await nextTick();
    await nextTick();
    if (dataSource.value.length === 0) {
      addRow(1);
    }
  },
});

onMounted(async () => {
  if (allCtnOptions.value.length === 0) {
    const { defaultCtns } = await initDropdownSources(defaultCurrencyId);
    addedCtnTypes.value = defaultCtns;
  }
});

watch(
  addedCtnTypes,
  async (newVal) => {
    console.log('箱型列表变化:', newVal);
    await nextTick();
    if (coreTableRef.value?.hotTableRef?.hotInstance) {
      coreTableRef.value.hotTableRef.hotInstance.updateSettings({
        columns: hotColumns.value,
      });
    }
  },
  { deep: true },
);

defineExpose({
  open: () => {
    if (allCtnOptions.value.length === 0) {
      initDropdownSources(defaultCurrencyId);
    }
    modalApi.open();
  },
  close: () => {
    modalApi.close();
  },
  setData: (data: { aiData?: any[] }) => {
    console.log('收到外部设置的AI数据:', data);
  },
});
</script>

<template>
  <Modal
    title="批量新增运价"
    class="w-[1400px]"
    :confirm-loading="actions.loading"
  >
    <div class="batch-add-container">
      <div class="mb-4 flex items-center justify-between">
        <Space>
          <DropdownButton type="primary" @click="addRow(1)">
            <template #icon><Plus class="size-4" /></template>
            新增行
            <template #overlay>
              <Menu>
                <MenuItem @click="addRow(5)">新增 5 行</MenuItem>
                <MenuItem @click="addRow(10)">新增 10 行</MenuItem>
                <MenuItem @click="actions.showCustomRowCountModal"
                  >新增自定义行数</MenuItem
                >
              </Menu>
            </template>
          </DropdownButton>
          <Button
            :disabled="selectedRowKeys.length === 0"
            @click="actions.handleCopyRows(copySelectedRows)"
          >
            <Copy class="size-4" />复制选中行
          </Button>
          <Button
            danger
            :disabled="selectedRowKeys.length === 0"
            @click="actions.handleDeleteRows(deleteSelectedRows)"
          >
            删除选中行
          </Button>
        </Space>
        <Space>
          <span class="text-gray-600">添加箱型：</span>
          <Select
            v-model:value="actions.selectedCtnId"
            style="width: 200px"
            placeholder="选择箱型"
            show-search
            :filter-option="actions.filterCtnOption"
            :options="actions.availableCtnOptions"
            :field-names="{ label: 'ctnName', value: 'ctnCodeId' }"
            @change="actions.handleAddCtnType"
          />
        </Space>
      </div>

      <BatchAddTableCore
        ref="coreTableRef"
        v-model:selected-row-keys="selectedRowKeys"
        :data-source="dataSource"
        :hot-settings="hotSettings"
      />

      <div class="mt-4 text-sm text-gray-500">
        <p>提示：</p>
        <ul class="list-inside list-disc">
          <li>点击"新增行"按钮添加新的运价记录</li>
          <li>选中行后点击"复制选中行"可快速复制该行数据</li>
          <li>勾选行后点击"删除选中行"可删除选中的记录</li>
          <li>使用"添加箱型"下拉框动态添加箱型成本列</li>
          <li>带 * 号的字段为必填项</li>
        </ul>
      </div>
    </div>

    <AntModal
      v-model:open="actions.customRowCountVisible"
      title="设置新增行数"
      @ok="actions.handleConfirmCustomRowCount(addRow)"
    >
      <div class="py-4">
        <label class="mb-2 block text-sm font-medium text-gray-700"
          >请输入要新增的行数：</label
        >
        <InputNumber
          v-model:value="actions.customRowCount"
          :min="1"
          :max="100"
          style="width: 100%"
          placeholder="请输入行数（1-100）"
        />
      </div>
    </AntModal>
  </Modal>
</template>

<style scoped lang="scss">
.batch-add-container {
  display: flex;
  flex-direction: column;
  height: 600px;
  .handsontable-container {
    flex: 1;
    overflow: hidden;
  }
}
</style>
```

### 方法2：使用 VSCode 手动操作

1. 打开 `batch-add-modal-old.vue` （这是备份的旧文件）
2. 新建一个文件 `batch-add-modal-new.vue`
3. 将上面的代码复制到新文件中
4. 删除 `batch-add-modal.vue`
5. 重命名 `batch-add-modal-new.vue` 为 `batch-add-modal.vue`

## 验证步骤

1. 检查文件大小应该是 ~8KB（而不是 65KB）
2. 检查文件行数应该是 ~300行（而不是 1999行）
3. 运行 `get_problems` 确认没有语法错误

## 相关文件

所有 composables 和核心组件已经创建完成：

- ✅ composables/useBatchAddData.ts
- ✅ composables/useBatchAddDropdownSources.ts
- ✅ composables/useBatchAddColumns.ts
- ✅ composables/useBatchAddSettings.ts
- ✅ composables/useBatchAddActions.ts
- ✅ BatchAddTableCore.vue
- ✅ README_HANDSONTABLE.md

## 注意事项

1. 确保所有 composables 文件都已正确创建
2. 确保 BatchAddTableCore.vue 存在
3. 新文件应该只有约 300 行代码
4. 不再依赖 VXE Table，改用 Handsontable
