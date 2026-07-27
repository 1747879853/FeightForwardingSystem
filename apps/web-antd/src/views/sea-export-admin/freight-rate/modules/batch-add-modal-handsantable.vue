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
    value: Number(id),
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

  // 调试日志：输出缓存数据
  console.log('📦 [dropdownSourceCache] 计算属性被调用');
  console.log('📦 [dropdownSourceCache] labelCache.carriers Map大小:', labelCache.value.carriers.size);
  console.log('📦 [dropdownSourceCache] labelCache.ports Map大小:', labelCache.value.ports.size);
  console.log('📦 [dropdownSourceCache] labelCache.currencies Map大小:', labelCache.value.currencies.size);
  console.log('📦 [dropdownSourceCache] labelCache.clients Map大小:', labelCache.value.clients.size);
  console.log('📦 [dropdownSourceCache] 船公司数量:', result.carriers.length);
  console.log('📦 [dropdownSourceCache] 港口数量:', result.ports.length);
  console.log('📦 [dropdownSourceCache] 币别数量:', result.currencies.length);
  console.log('📦 [dropdownSourceCache] 订舱代理数量:', result.clients.length);

  if (result.carriers.length > 0) {
    console.log(
      '📦 [dropdownSourceCache] 船公司示例:',
      result.carriers.slice(0, 3),
    );
  }
  if (result.ports.length > 0) {
    console.log(
      '📦 [dropdownSourceCache] 港口示例:',
      result.ports.slice(0, 3),
    );
  }
  if (result.currencies.length > 0) {
    console.log(
      '📦 [dropdownSourceCache] 币别示例:',
      result.currencies.slice(0, 3),
    );
  }
  if (result.clients.length > 0) {
    console.log(
      '📦 [dropdownSourceCache] 订舱代理示例:',
      result.clients.slice(0, 3),
    );
  }

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
  console.log(
    `🔍 [handleOpenDropdown] 字段: ${field}, 选项数量: ${source.length}`,
  );
  if (source.length > 0 && source.length <= 5) {
    console.log(`🔍 [handleOpenDropdown] 选项示例:`, source.slice(0, 5));
  }
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
    await actions.handleSubmit(labelToIdMap.value);
  },
  onCancel: () => {
    modalApi.close();
  },
  onOpened: async () => {
    console.log('📋 [Modal] 弹窗已打开');
    console.log('📋 [Modal] allCtnOptions.length:', allCtnOptions.value.length);
    console.log(
      '📋 [Modal] labelCache.carriers.size:',
      labelCache.value.carriers.size,
    );
    console.log(
      '📋 [Modal] labelCache.ports.size:',
      labelCache.value.ports.size,
    );

    if (allCtnOptions.value.length === 0) {
      console.log('🔄 [Modal] 开始初始化下拉框数据源...');
      const { defaultCtns } = await initDropdownSources(defaultCurrencyId);
      addedCtnTypes.value = defaultCtns;
      console.log('✅ [Modal] 初始化完成，默认箱型数量:', defaultCtns.length);
      
      // 等待 dropdownSourceCache 更新
      
      console.log('📊 [Modal] 初始化后缓存状态:');
      console.log('  - carriers:', dropdownSourceCache.value.carriers.length);
      console.log('  - ports:', dropdownSourceCache.value.ports.length);
      console.log('  - currencies:', dropdownSourceCache.value.currencies.length);
      console.log('  - clients:', dropdownSourceCache.value.clients.length);
    } else {
      console.log('⏭️ [Modal] 跳过初始化，数据已存在');
    }

    await nextTick();
    if (dataSource.value.length === 0) {
      addRow(1);
    }
    
    // 确保 Handsontable 使用最新的数据源
    if (coreTableRef.value?.hotTableRef?.hotInstance) {
      console.log('🔄 [Modal] 刷新 Handsontable 设置...');
      coreTableRef.value.hotTableRef.hotInstance.updateSettings({
        columns: hotColumns.value,
      });
      console.log('✅ [Modal] Handsontable 设置已更新');
    }
  },
});

onMounted(async () => {
  console.log('🚀 [Component] 组件已挂载');
  if (allCtnOptions.value.length === 0) {
    console.log('🔄 [Component] 开始初始化下拉框数据源...');
    const { defaultCtns } = await initDropdownSources(defaultCurrencyId);
    addedCtnTypes.value = defaultCtns;
    console.log('✅ [Component] 初始化完成，默认箱型数量:', defaultCtns.length);
  } else {
    console.log('⏭️ [Component] 跳过初始化，数据已存在');
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
