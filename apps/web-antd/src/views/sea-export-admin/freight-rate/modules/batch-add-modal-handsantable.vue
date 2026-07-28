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

// 导入编辑接口
import { batchEditSimpleSeFreiPrice } from '#/api/sea-export/freight-rate-admin';

// 导入 store
import { useBaseStore } from '#/store/base';

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

// ==================== 编辑模式管理 ====================

// 是否为编辑模式
const isEditMode = ref(false);

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
          ctnCodeId: String(ctnOption.ctnCodeId), // ✅ 转换为字符串类型
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
  const transformedAiData = aiDataList.map((row, index) => {
    console.log(`🔍 转换第 ${index + 1} 条数据:`, { id: row.id, carrierId: row.carrierId });
    
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
      _originalId: row.id, // ✅ 保留原始 ID 用于编辑模式
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

    console.log(`✅ 转换后的第 ${index + 1} 条数据 _originalId:`, transformedRow._originalId);
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

  message.success(`已加载 ${transformedAiData.length} 条数据`);
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
  title: '批量新增运价', // 标题将在模板中动态设置
  confirmLoading: false,
  onConfirm: async () => {
    // ⚠️ 关键修复：在提交前，先从 Handsontable 同步最新数据到 dataSource
    if (coreTableRef.value?.hotTableRef?.hotInstance) {
      const hotInstance = coreTableRef.value.hotTableRef.hotInstance;

      const hotData = hotInstance.getSourceData();
      console.log('🔍 Handsontable getSourceData() 返回的数据类型:', Array.isArray(hotData) ? '数组' : '其他', hotData);
      
      if (hotData && hotData.length > 0) {
        // ⚠️ 关键修复：getSourceData() 返回的是对象数组，不是二维数组
        // 直接使用这些数据，但需要保留额外字段
        const objectData = hotData.map((hotRow: any, rowIndex: number) => {
          const rowObject: any = {};
          
          // 如果 hotRow 已经是对象，直接复制所有字段
          if (typeof hotRow === 'object' && !Array.isArray(hotRow)) {
            Object.assign(rowObject, hotRow);
          } else if (Array.isArray(hotRow)) {
            // 如果是数组（兼容旧逻辑），按列映射
            const columns = hotInstance.getSettings().columns;
            columns.forEach((col: any, index: number) => {
              if (col.data && hotRow[index] !== undefined) {
                rowObject[col.data] = hotRow[index];
              }
            });
          }
          
          // ⚠️ 关键修复：从 dataSource 中保留额外字段（如 _originalId, _rowKey, seFreiPriceCtns 等）
          const originalRow = dataSource.value[rowIndex];
          if (originalRow) {
            // 保留以下关键字段（优先级：原始数据 > Handsontable 数据）
            if (originalRow._originalId && !rowObject._originalId) {
              rowObject._originalId = originalRow._originalId;
            }
            if (originalRow._rowKey && !rowObject._rowKey) {
              rowObject._rowKey = originalRow._rowKey;
            }
            if (originalRow._isCopied !== undefined && rowObject._isCopied === undefined) {
              rowObject._isCopied = originalRow._isCopied;
            }
            if (originalRow.seFreiPriceCtns && !rowObject.seFreiPriceCtns) {
              rowObject.seFreiPriceCtns = originalRow.seFreiPriceCtns;
            }
          }
          
          return rowObject;
        });

        console.log('📊 同步后的数据（检查 _originalId 和其他字段）:', 
          objectData.map((row: any) => ({ 
            _originalId: row._originalId, 
            carrierId: row.carrierId,
            polId: row.polId,
            podId: row.podId
          }))
        );
        
        dataSource.value = objectData;
      }
    }

    // 根据模式调用不同的提交逻辑
    if (isEditMode.value) {
      await handleEditSubmit(labelToIdMap.value);
    } else {
      await actions.handleSubmit(labelToIdMap.value);
      // 新增成功后关闭弹窗（编辑模式在 handleEditSubmit 中已处理）
      modalApi.close();
    }
  },
  onCancel: () => {
    modalApi.close();
  },
  onOpened: async () => {
    console.log('📦 弹窗已打开');

    // 获取传递的数据
    const data = modalApi.getData<any>();
    aiData.value = data.aiData;
    isEditMode.value = data.isEditMode || false; // 设置编辑模式标志
    console.log('当前 AI 数据:', aiData.value);
    console.log('是否为编辑模式:', isEditMode.value);

    // ✅ 关键修复：确保下拉选项已加载
    if (allCtnOptions.value.length === 0) {
      await initDropdownSources(defaultCurrencyId);
    }

    // ✅ 关键修复：每次打开弹窗时都重新初始化默认箱型
    // 从 allCtnOptions 中筛选出 status 为 0 且 isDefault 为 true 的箱型
    // 注意：由于 store 中只缓存了必要字段，这里简化处理，使用所有箱型作为默认箱型
    if (addedCtnTypes.value.length === 0 && allCtnOptions.value.length > 0) {
      // 尝试从 baseStore 获取原始箱型数据以筛选默认箱型
      const baseStore = useBaseStore();
      const defaultCtns = baseStore.ctnOptions.filter(ctn => ctn.isDefault === true).map(ctn => ({
        ctnCodeId: String(ctn.ctnCodeId),
        ctnName: ctn.ctnName,
      }));
      
      addedCtnTypes.value = defaultCtns;
      console.log('✅ 已初始化默认箱型:', addedCtnTypes.value.length, '个');
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
      // 如果没有 AI 数据且表格为空，则添加一行空数据（仅在新增模式下）
      if (dataSource.value.length === 0 && !isEditMode.value) {
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

// ==================== 编辑提交处理 ====================

/**
 * 处理编辑提交
 */
async function handleEditSubmit(labelToIdMapValue: any) {
  console.log('📝 开始编辑提交');

  // 验证表单
  if (!validateForm()) {
    return;
  }

  try {
    // 设置加载状态
    actions.loading.value = true;

    // 准备提交数据
    const submitDataList: any[] = [];

    dataSource.value.forEach((row: any) => {
      // 检查是否有原始 ID（编辑模式必须有 ID）
      if (!row._originalId) {
        console.warn('⚠️ 跳过没有 ID 的行:', row);
        return;
      }

      // 将 Label 转换回 ID
      const carrierId = labelToIdMapValue.carriers.get(row.carrierId);
      const polId = labelToIdMapValue.ports.get(row.polId);
      const podId = labelToIdMapValue.ports.get(row.podId);
      const currencyId = labelToIdMapValue.currencies.get(row.currencyId);
      const bookingAgentId = labelToIdMapValue.clients.get(row.bookingAgentId);
      const poT1Id = labelToIdMapValue.ports.get(row.poT1Id);
      const poT2Id = labelToIdMapValue.ports.get(row.poT2Id);

      // 构建提交数据（使用 SeFreiPriceSimpleEditDto 格式）
      const submitData: any = {
        id: row._originalId,
        recommend: row.recommend,
        carrierId: carrierId ,
        polId: polId ,
        podId: podId ,
        isDirect: row.isDirect === '是',
        poT1Id: poT1Id ,
        poT2Id: poT2Id ,
        polFreeDays: row.polFreeDays,
        podFreeDays: row.podFreeDays,
        poddem: row.poddem,
        poddet: row.poddet,
        voyage: row.voyage || undefined,
        contractNo: row.contractNo || undefined,
        validTimeStart: row.validTimeStart || undefined,
        validTimeEnd: row.validTimeEnd || undefined,
        remark: row.remark || undefined,
        currencyId: currencyId ,
        bookingAgentId: bookingAgentId || null,
      };

      // 处理日期时间模式
      if (row.etd || row.closeDocTime || row.closingTime) {
        submitData.seFreiPriceDays = [
          {
            etd: row.etd || undefined,
            closeDocTime: row.closeDocTime || undefined,
            closingTime: row.closingTime || undefined,
          },
        ];
      }

      // 处理星期模式
      if (
        row.etdDayOfWeek !== undefined ||
        row.closeDocDayOfWeek !== undefined ||
        row.closingDayOfWeek !== undefined
      ) {
        submitData.seFreiPriceWeekDays = [
          {
            etdDayOfWeek: row.etdDayOfWeek,
            etdDayTime: row.etdDayTime || undefined,
            closeDocDayOfWeek: row.closeDocDayOfWeek,
            closeDocDayTime: row.closeDocDayTime || undefined,
            closingDayOfWeek: row.closingDayOfWeek,
            closingDayTime: row.closingDayTime || undefined,
          },
        ];
      }

      // 处理箱型成本 - 从动态字段中提取
      const seFreiPriceCtns: any[] = [];
      Object.keys(row).forEach((key) => {
        if (key.startsWith('ctn_')) {
          const ctnCodeId =key.replace('ctn_', '');
          const cost = row[key];

          if (cost !== undefined && cost !== null && cost !== '') {
            seFreiPriceCtns.push({
              ctnCodeId,
              cost: Number(cost),
            });
          }
        }
      });

      if (seFreiPriceCtns.length > 0) {
        submitData.seFreiPriceCtns = seFreiPriceCtns;
      }

      submitDataList.push(submitData);
    });

    if (submitDataList.length === 0) {
      message.warning('没有需要提交的数据');
      actions.loading.value = false;
      return;
    }

    console.log('📤 提交编辑数据:', submitDataList);

    // 调用批量编辑接口
    await batchEditSimpleSeFreiPrice(submitDataList);

    message.success('批量编辑成功');
    modalApi.close();
    emit('success');
  } catch (error) {
    console.error('❌ 批量编辑失败:', error);
    message.error('批量编辑失败');
  } finally {
    actions.loading.value = false;
  }
}

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
  setData: (data: { aiData?: any[]; isEditMode?: boolean }) => {
    console.log('收到外部设置的数据:', data);
    if (data.aiData && data.aiData.length > 0) {
      aiData.value = data.aiData;
      isEditMode.value = data.isEditMode || false;
      // 如果模态框已经打开，立即处理数据
      handleAIData(data.aiData);
    }
  },
});
</script>

<template>
  <Modal :title="isEditMode ? '编辑数据' : '批量新增运价'" class="w-[1400px]" :confirm-loading="loading">
    <div class="batch-add-container">
      <!-- 仅在新增模式下显示操作按钮 -->
      <div v-if="!isEditMode" class="mb-4 flex items-center justify-between">
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

      <!-- 编辑模式下只显示添加箱型 -->
      <div v-else class="mb-4 flex items-center justify-end">
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
