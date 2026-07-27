<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { Plus, Copy } from '@vben/icons';
import dayjs from 'dayjs';
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

// ==================== AI 数据管理 ====================

// 存储AI识别的数据
const aiData = ref<any[] | undefined>(undefined);

/**
 * 生成唯一行 key
 */
function generateRowKey(): string {
  return `freight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 处理 AI 识别的数据
 */
async function handleAIData(aiDataList: any[]) {
  console.log('🤖 开始处理 AI 数据:', aiDataList);

  // 确保下拉选项已加载
  if (allCtnOptions.value.length === 0) {
    await initDropdownSources(defaultCurrencyId);
  }

  // 收集 AI 数据中的所有箱型
  const aiCtnTypes = new Set<string>();
  aiDataList.forEach((row: any, index: number) => {
    console.log(`🔍 检查第${index + 1}条数据的箱型:`, row.seFreiPriceCtns);
    if (row.seFreiPriceCtns && Array.isArray(row.seFreiPriceCtns)) {
      row.seFreiPriceCtns.forEach((ctn: any) => {
        if (ctn.ctnCodeId) {
          aiCtnTypes.add(String(ctn.ctnCodeId));
        }
      });
    }
  });

  console.log('📊 AI 数据中发现的箱型 IDs:', Array.from(aiCtnTypes));

  // 将 AI 数据中的箱型添加到 addedCtnTypes
  const newAddedCtnTypes: Array<{ ctnCodeId: string; ctnName: string }> = [];
  aiCtnTypes.forEach((ctnCodeId) => {
    // 检查是否已添加
    const exists = addedCtnTypes.value.some(
      (ctn) => String(ctn.ctnCodeId) === String(ctnCodeId),
    );

    if (!exists) {
      // 查找箱型名称
      const ctnOption = allCtnOptions.value.find(
        (c) => String(c.ctnCodeId) === String(ctnCodeId),
      );
      if (ctnOption) {
        newAddedCtnTypes.push({
          ctnCodeId: ctnOption.ctnCodeId,
          ctnName: ctnOption.ctnName,
        });
      } else {
        console.warn(`⚠️ 未找到箱型ID ${ctnCodeId} 对应的名称`);
      }
    }
  });

  // 如果有新的箱型需要添加
  if (newAddedCtnTypes.length > 0) {
    addedCtnTypes.value.push(...newAddedCtnTypes);
    console.log('✅ 添加了', newAddedCtnTypes.length, '个新箱型到列配置');
  }

  // 等待列配置更新
  await nextTick();
  await nextTick();

  // ⚠️ 关键修复：辅助函数 - 将 ID 转换为显示名称（用于 Handsontable 下拉框）
  const convertIdToLabel = (
    id: any,
    type: 'carriers' | 'ports' | 'currencies' | 'clients',
  ): string => {
    if (!id) return '';
    const key = String(id);

    switch (type) {
      case 'carriers':
        return getCarrierName(id);
      case 'ports':
        return getPortName(id);
      case 'currencies':
        return getCurrencyName(id);
      case 'clients':
        return getClientName(id);
      default:
        return String(id);
    }
  };

  // 转换 AI 数据格式以适应表格结构
  const transformedAiData = aiDataList.map((row) => {
    // ⚠️ 关键修复：将所有 ID 字段转换为对应的显示名称（Handsontable 下拉框需要名称而非 ID）
    const carrierName = convertIdToLabel(row.carrierId, 'carriers');
    const polName = convertIdToLabel(row.polId, 'ports');
    const podName = convertIdToLabel(row.podId, 'ports');
    const currencyName = convertIdToLabel(row.currencyId, 'currencies');
    const bookingAgentName = convertIdToLabel(row.bookingAgentId, 'clients');
    const poT1Name = convertIdToLabel(row.poT1Id, 'ports');
    const poT2Name = convertIdToLabel(row.poT2Id, 'ports');

    // 构建行对象，包含所有字段（使用名称而非 ID）
    const transformedRow: any = {
      _rowKey: generateRowKey(),
      _isCopied: false,
      recommend: row.recommend || false,
      carrierId: carrierName, // ✅ 使用名称
      polId: polName, // ✅ 使用名称
      podId: podName, // ✅ 使用名称
      isDirect: (row.isDirect ?? true) ? '是' : '否', // ✅ 转换为"是/否"文本
      poT1Id: poT1Name, // ✅ 使用名称
      poT2Id: poT2Name, // ✅ 使用名称
      polFreeDays: row.polFreeDays,
      podFreeDays: row.podFreeDays,
      poddem: row.poddem,
      poddet: row.poddet,
      voyage: row.voyage || '',
      contractNo: row.contractNo || '',
      etd: row.etd || '',
      closeDocTime: row.closeDocTime || '',
      closingTime: row.closingTime || '',
      etdDayOfWeek: row.etdDayOfWeek,
      etdDayTime: row.etdDayTime || '',
      closeDocDayOfWeek: row.closeDocDayOfWeek,
      closeDocDayTime: row.closeDocDayTime || '',
      closingDayOfWeek: row.closingDayOfWeek,
      closingDayTime: row.closingDayTime || '',
      validTimeStart: row.validTimeStart
        ? dayjs(row.validTimeStart).format('YYYY-MM-DD')
        : '',
      validTimeEnd: row.validTimeEnd
        ? dayjs(row.validTimeEnd).format('YYYY-MM-DD')
        : '',
      remark: row.remark || '',
      currencyId: currencyName, // ✅ 使用名称
      bookingAgentId: bookingAgentName, // ✅ 使用名称
      seFreiPriceCtns: row.seFreiPriceCtns || [],
    };

    // ⚠️ 关键修复：为每个箱型设置动态字段值（Handsontable 使用这些字段）
    if (row.seFreiPriceCtns && Array.isArray(row.seFreiPriceCtns)) {
      row.seFreiPriceCtns.forEach((ctn: any) => {
        const dynamicField = `ctn_${String(ctn.ctnCodeId)}`;
        transformedRow[dynamicField] = ctn.cost;
      });
    }

    return transformedRow;
  });

  console.log('🔄 转换后的 AI 数据:', transformedAiData);

  // 替换 dataSource
  dataSource.value = transformedAiData;

  // 等待数据更新后，同步到 Handsontable
  await nextTick();

  if (coreTableRef.value?.hotTableRef?.hotInstance) {
    const hotInstance = coreTableRef.value.hotTableRef.hotInstance;

    // 更新 Handsontable 的数据和列配置
    hotInstance.updateSettings({
      data: transformedAiData,
      columns: hotColumns.value,
    });

    console.log(
      '✅ AI 数据已加载到 Handsontable，共',
      transformedAiData.length,
      '条记录',
    );
  }

  message.success(`已加载 ${transformedAiData.length} 条AI识别的数据`);
}

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
  carriers: Array.from(labelCache.value.carriers.entries()).map(
    ([id, name]) => ({
      label: name,
      value: Number(id),
    }),
  ),
  ports: Array.from(labelCache.value.ports.entries()).map(([id, name]) => ({
    label: name,
    value: id,
  })),
  currencies: Array.from(labelCache.value.currencies.entries()).map(
    ([id, code]) => ({
      label: code,
      value: Number(id),
    }),
  ),
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
    if (coreTableRef.value?.hotTableRef?.hotInstance) {
      const hotInstance = coreTableRef.value.hotTableRef.hotInstance;

      const hotData = hotInstance.getSourceData();

      if (hotData && hotData.length > 0) {
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

        dataSource.value = objectData;
      }
    }

    await actions.handleSubmit(labelToIdMap.value);
  },
  onCancel: () => {
    modalApi.close();
  },
  onOpened: async () => {
    console.log('📦 弹窗已打开');

    // 获取传递的数据
    const data = modalApi.getData<any>();
    aiData.value = data.aiData;
    console.log('当前 AI 数据:', aiData.value);

    // 确保默认箱型已加载
    if (allCtnOptions.value.length === 0) {
      const { defaultCtns } = await initDropdownSources(defaultCurrencyId);
      addedCtnTypes.value = defaultCtns;
    }

    // 等待 DOM 和列配置完全初始化
    await nextTick();
    await nextTick();

    // 如果有 AI 数据，则处理并填充表格
    if (aiData.value && aiData.value.length > 0) {
      console.log(
        '✅ 检测到 AI 数据，开始处理:',
        aiData.value.length,
        '条记录',
      );
      await handleAIData(aiData.value);
    } else {
      // 如果没有 AI 数据且表格为空，则添加一行空数据
      if (dataSource.value.length === 0) {
        addRow(1);
        await nextTick();
      }
    }

    // 确保 Handsontable 使用最新的数据源和列配置
    if (coreTableRef.value?.hotTableRef?.hotInstance) {
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
    if (data.aiData && data.aiData.length > 0) {
      aiData.value = data.aiData;
      // 如果模态框已经打开，立即处理 AI 数据
      if (modalApi.isOpen()) {
        handleAIData(data.aiData);
      }
    }
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
