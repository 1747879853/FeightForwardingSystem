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
  carriers: Array.from(labelCache.value.carriers.entries()).map(([id, name]) => ({
    label: name,
    value: Number(id),
  })),
  ports: Array.from(labelCache.value.ports.entries()).map(([id, name]) => ({
    label: name,
    value: id,
  })),
  currencies: Array.from(labelCache.value.currencies.entries()).map(([id, code]) => ({
    label: code,
    value: Number(id),
  })),
  clients: Array.from(labelCache.value.clients.entries()).map(([id, name]) => ({
    label: name,
    value: Number(id),
  })),
}));

// Handsontable 下拉框需要的字符串数组格式
const dropdownSourceCache = computed(() => {
  // Map 对象需要使用 Array.from() 或展开运算符转换为数组
  const result = {
    carriers: Array.from(labelCache.value.carriers.values()),
    ports: Array.from(labelCache.value.ports.values()),
    currencies: Array.from(labelCache.value.currencies.values()),
    clients: Array.from(labelCache.value.clients.values()),
  };

  return result;
});

// Label 到 ID 的反向映射（用于将用户选择的 Label 转换回 ID）
const labelToIdMap = computed(() => ({
  carriers: new Map<string, string>(
    Array.from(labelCache.value.carriers.entries()).map(([id, name]) => [
      name,
      id,
    ]),
  ),
  ports: new Map<string, string>(
    Array.from(labelCache.value.ports.entries()).map(([id, name]) => [
      name,
      id,
    ]),
  ),
  currencies: new Map<string, string>(
    Array.from(labelCache.value.currencies.entries()).map(([id, code]) => [
      code,
      id,
    ]),
  ),
  clients: new Map<string, string>(
    Array.from(labelCache.value.clients.entries()).map(([id, name]) => [
      name,
      id,
    ]),
  ),
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
  dropdownSourceCache,
  labelToIdMap,
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
  dropdownSourceCache,
  getColumnIndex,
  handleOpenDropdown,
  getSortIcon,
);

const hotSettings = shallowRef(rawHotSettings.value);

// 定义 BatchAddTableCore 组件的类型
interface BatchAddTableCoreInstance {
  hotTableRef: any;
  handleOpenDropdown: (
    rowIndex: number,
    colIndex: number,
    field: string,
    source: string[],
  ) => void;
}

const coreTableRef = ref<BatchAddTableCoreInstance | null>(null);

// 将 loading 解包为普通值，避免类型错误
const loading = computed(() => actions.loading.value);
const customRowCountVisible = computed({
  get: () => actions.customRowCountVisible.value,
  set: (val) => {
    actions.customRowCountVisible.value = val;
  },
});
const customRowCount = computed({
  get: () => actions.customRowCount.value,
  set: (val) => {
    actions.customRowCount.value = val;
  },
});
const selectedCtnId = computed({
  get: () => actions.selectedCtnId.value,
  set: (val) => {
    actions.selectedCtnId.value = val;
  },
});
const availableCtnOptions = computed(() => actions.availableCtnOptions.value);

const [Modal, modalApi] = useVbenModal({
  title: '批量新增运价',
  confirmLoading: false,
  onConfirm: async () => {
    // ⚠️ 关键修复：在提交前，先从 Handsontable 同步最新数据到 dataSource
    // 因为使用了 shallowRef，Handsontable 内部的数据变化不会自动触发响应式更新
    if (coreTableRef.value?.hotTableRef?.hotInstance) {
      const hotInstance = coreTableRef.value.hotTableRef.hotInstance;
      
      // 获取 Handsontable 的最新数据（包含所有编辑后的值）
      const hotData = hotInstance.getSourceData();
      
      if (hotData && hotData.length > 0) {
        // 将二维数组转换为对象数组格式
        // getSourceData() 返回的是 [[val1, val2], [val3, val4]]
        // 我们需要 [{field1: val1, field2: val2}, {field1: val3, field2: val4}]
        const columns = hotInstance.getSettings().columns;
        const objectData = hotData.map((rowArray: any[]) => {
          const rowObject: any = {};
          columns.forEach((col: any, index: number) => {
            if (rowArray[col.data]) {
              rowObject[col.data] = rowArray[col.data];
            }
          });
          return rowObject;
        });
        
        // 更新 dataSource，触发浅响应式更新
        dataSource.value = objectData;
      }
    }
    
    // 现在调用 handleSubmit，它会使用同步后的 dataSource
    await actions.handleSubmit(labelToIdMap.value);
  },
  onCancel: () => {
    modalApi.close();
  },
  onOpened: async () => {
    if (allCtnOptions.value.length === 0) {
      const { defaultCtns } = await initDropdownSources(defaultCurrencyId);
      
      addedCtnTypes.value = defaultCtns;
      
      // ⚠️ 关键修复：等待 addedCtnTypes 变化触发 hotColumns 重新计算
      await nextTick();
      await nextTick(); // 多等待一个 tick，确保 computed 完全更新
    } else {
      // ⚠️ 关键修复：即使数据已存在，也要确保 hotColumns 是最新的
      await nextTick();
    }

    await nextTick();
    if (dataSource.value.length === 0) {
      addRow(1);
      await nextTick(); // 等待行数据添加完成
    }
    
    // ⚠️ 关键修复：确保 Handsontable 使用最新的数据源和列配置
    if (coreTableRef.value?.hotTableRef?.hotInstance) {
      // ⚠️ 关键修复：直接更新列配置，Handsontable 会自动处理数据绑定
      // 不要使用 getData/loadData，因为这会丢失行对象中的额外字段（如 _rowKey, seFreiPriceCtns 等）
      coreTableRef.value.hotTableRef.hotInstance.updateSettings({
        columns: hotColumns.value,
      });
    }
  },
});

watch(
  addedCtnTypes,
  async (newVal, oldVal) => {
    await nextTick();
    
    if (coreTableRef.value?.hotTableRef?.hotInstance) {
      // ⚠️ 关键修复：直接更新列配置，Handsontable 会自动处理数据绑定
      // 不要使用 getData/loadData，因为这会丢失行对象中的额外字段（如 _rowKey, seFreiPriceCtns 等）
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
  <Modal title="批量新增运价" class="w-[1400px]" :confirm-loading="loading">
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
            v-model:value="selectedCtnId"
            style="width: 200px"
            placeholder="选择箱型"
            show-search
            :filter-option="actions.filterCtnOption"
            :options="availableCtnOptions"
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
        :label-to-id-map="labelToIdMap"
      />
    </div>

    <AntModal
      v-model:open="customRowCountVisible"
      title="设置新增行数"
      @ok="actions.handleConfirmCustomRowCount(addRow)"
    >
      <div class="py-4">
        <label class="mb-2 block text-sm font-medium text-gray-700"
          >请输入要新增的行数：</label
        >
        <InputNumber
          v-model:value="customRowCount"
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
