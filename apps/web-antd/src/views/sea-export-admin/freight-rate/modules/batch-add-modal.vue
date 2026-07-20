<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type {
  AddSeFreiPriceInput,
  SeFreiPriceCtnEditDto,
} from '#/api/sea-export/freight-rate-admin';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { Plus, Copy, IconifyIcon } from '@vben/icons';

import {
  Button,
  message,
  Select,
  Space,
  InputNumber,
  Input,
  DatePicker,
  Radio,
  Switch,
  TimePicker,
  Tooltip,
  DropdownButton,
  Menu,
  MenuItem,
  Modal as AntModal,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import CarrierSelect from '#/adapter/component/biz-select/carrier-select.vue';
import PortSelect from '#/adapter/component/biz-select/port-select.vue';
import CurrencySelect from '#/adapter/component/biz-select/currency-select.vue';
import ClientSelect from '#/adapter/component/biz-select/client-select.vue';
import { getCtnCodePagedList as getBaseCtnCodes } from '#/api/system/base-data/ctn-code-admin';
import { getCurrencyPagedList } from '#/api/system/base-data/currency-admin';
import { batchAddSimpleSeFreiPrice } from '#/api/sea-export/freight-rate-admin';
import { $t } from '#/locales';

const emit = defineEmits<{
  success: [];
}>();

// 不再接收AI识别的数据作为props
// const props = defineProps<{
//   aiData?: any[];
// }>();

// 添加一个响应式变量存储AI数据
const aiData = ref<any[] | undefined>(undefined);

// 箱型列表（用于动态列）
interface CtnTypeOption {
  ctnCodeId: number;
  ctnName: string;
}

const addedCtnTypes = ref<CtnTypeOption[]>([]);

// 下拉选项数据
const allCtnOptions = ref<CtnTypeOption[]>([]);

// USD 币别 ID（默认值）
const defaultCurrencyId = ref<number | undefined>(undefined);

// 当前选中的箱型ID（用于Select组件）
const selectedCtnId = ref<number | undefined>(undefined);

// 表格数据 - 由 Grid 直接管理
let rowKeyCounter = 0;

// 选中的行 keys
const selectedRowKeys = ref<(string | number)[]>([]);

// 加载状态
const loading = ref(false);

// 定义模态框
const [Modal, modalApi] = useVbenModal({
  title: $t('seaExport.freightRate.batchAdd'),
  confirmLoading: false,
  width: 1300,
  onConfirm: async () => {
    await handleSubmit();
  },
  onCancel: () => {
    modalApi.close();
  },
  onOpened: async () => {
    console.log('弹窗已打开');
    const data = modalApi.getData<any>();
    aiData.value = data.aiData;
    console.log('当前AI数据:', aiData.value);

    // 确保默认箱型已加载
    if (allCtnOptions.value.length === 0) {
      await loadSelectOptions();
      console.log(
        '默认箱型加载完成，当前箱型数量:',
        addedCtnTypes.value.length,
      );
    }

    // 如果有AI识别的数据，则使用AI数据填充表格
    if (aiData.value && aiData.value.length > 0) {
      console.log('检测到AI数据，开始处理:', aiData.value.length, '条记录');
      // 处理AI数据中的箱型，添加到addedCtnTypes中
      const aiCtnTypes = new Set<number>();
      aiData.value.forEach((row: any) => {
        if (row.seFreiPriceCtns && Array.isArray(row.seFreiPriceCtns)) {
          row.seFreiPriceCtns.forEach((ctn: any) => {
            if (ctn.ctnCodeId && ctn.ctnCodeId > 0) {
              aiCtnTypes.add(ctn.ctnCodeId);
            }
          });
        }
      });

      // 将AI数据中出现的有效箱型添加到addedCtnTypes中
      const newAddedCtnTypes: CtnTypeOption[] = [];
      aiCtnTypes.forEach((ctnCodeId) => {
        // 检查是否已添加
        if (!addedCtnTypes.value.some((ctn) => ctn.ctnCodeId === ctnCodeId)) {
          // 查找箱型名称
          const ctnOption = allCtnOptions.value.find(
            (ctn) => ctn.ctnCodeId === ctnCodeId,
          );
          if (ctnOption) {
            newAddedCtnTypes.push({
              ctnCodeId: ctnOption.ctnCodeId,
              ctnName: ctnOption.ctnName,
            });
          }
        }
      });

      // 如果有新的箱型需要添加
      if (newAddedCtnTypes.length > 0) {
        addedCtnTypes.value.push(...newAddedCtnTypes);
      }

      // 无论是否有新箱型，都等待列配置更新
      await nextTick();
      await nextTick();

      // 一次性加载AI识别的数据
      gridApi.grid?.loadData(aiData.value);
      message.success(`已加载 ${aiData.value.length} 条AI识别的数据`);
    } else {
      // 弹窗打开时，如果表格为空则添加一行
      const currentData = gridApi.grid?.getFullData() || [];
      console.log('准备添加行，当前数据行数:', currentData.length);
      if (currentData.length === 0) {
        handleAddRow();
        console.log('已添加第一行');
      }
    }
  },
});

onMounted(async () => {
  // 确保默认箱型已加载
  if (allCtnOptions.value.length === 0) {
    await loadSelectOptions();
    console.log('默认箱型加载完成，当前箱型数量:', addedCtnTypes.value.length);
  }
});

// 监听AI数据变化，当props.aiData更新时处理数据
watch(
  () => aiData.value,
  (newAiData) => {
    console.log('监听到AI数据变化:', newAiData);
    if (newAiData && newAiData.length > 0) {
      console.log('处理新的AI数据，共', newAiData.length, '条');
      // 延迟处理，确保表格已初始化
      setTimeout(() => {
        handleAIData(newAiData);
      }, 100); // 添加短暂延迟，确保组件完全初始化
    }
  },
  { deep: true, immediate: true },
);

// 初始化下拉选项
async function loadSelectOptions() {
  try {
    const ctns = await getBaseCtnCodes({
      PageIndex: 1,
      PageSize: 1000,
      Sorting: 'OrderNo',
    });
    allCtnOptions.value =
      ctns?.items?.map((item) => ({
        ctnCodeId: item.id,
        ctnName: item.ctnName || '',
      })) || [];

    // 自动添加默认箱型（status为0且isDefault为true）
    const defaultCtns = ctns?.items?.filter(
      (item) => item.status === 0 && item.isDefault === true,
    );

    if (defaultCtns && defaultCtns.length > 0) {
      addedCtnTypes.value = defaultCtns.map((item) => ({
        ctnCodeId: item.id,
        ctnName: item.ctnName || '',
      }));
      console.log('已加载默认箱型:', addedCtnTypes.value);
    }

    // 加载币别列表，查找 USD 的 ID
    try {
      const currencies = await getCurrencyPagedList({
        PageIndex: 1,
        PageSize: 100,
      });
      const usdCurrency = currencies?.items?.find(
        (item) => item.code?.toUpperCase() === 'USD',
      );
      if (usdCurrency) {
        defaultCurrencyId.value = usdCurrency.id;
        console.log('USD 币别 ID:', defaultCurrencyId.value);

        // 将 USD 的 label 存入缓存，避免显示为"币别(ID)"
        updateLabelCache(
          'currencies',
          usdCurrency.id,
          usdCurrency.code || 'USD',
        );
      }
    } catch (error) {
      console.error('加载币别列表失败:', error);
    }
  } catch (error) {
    console.error('加载箱型选项失败:', error);
    message.error('加载箱型选项失败');
  }
}

// 生成唯一行 key
function generateRowKey() {
  return `freight_${Date.now()}_${++rowKeyCounter}`;
}

// 创建默认行数据
function createDefaultRow(isCopied: boolean = false) {
  return {
    _rowKey: generateRowKey(),
    _isCopied: isCopied, // 标识是否为复制的行
    recommend: false,
    carrierId: undefined,
    polId: undefined,
    podId: undefined,
    isDirect: true,
    poT1Id: undefined,
    poT2Id: undefined,
    polFreeDays: undefined,
    podFreeDays: undefined,
    poddem: undefined,
    poddet: undefined,
    voyage: '',
    contractNo: '',
    // 日期时间模式字段
    etd: '',
    closeDocTime: '',
    closingTime: '',
    // 星期模式字段
    etdDayOfWeek: undefined,
    etdDayTime: '',
    closeDocDayOfWeek: undefined,
    closeDocDayTime: '',
    closingDayOfWeek: undefined,
    closingDayTime: '',
    validTimeStart: '',
    validTimeEnd: '',
    remark: '',
    currencyId: defaultCurrencyId.value, // 默认设置为 USD
    bookingAgentId: undefined, // 订舱代理ID
    seFreiPriceCtns: [] as Array<{ ctnCodeId: number; cost?: number }>,
  };
}

// 新增行 - 默认新增1行
function handleAddRow() {
  addRows(1);
}

// 新增多行
function addRows(count: number) {
  const newRows = [];

  for (let i = 0; i < count; i++) {
    const newRow = createDefaultRow();

    // 如果已经有添加的箱型，为新行初始化这些箱型的空数据
    if (addedCtnTypes.value.length > 0) {
      newRow.seFreiPriceCtns = addedCtnTypes.value.map((ctn) => ({
        ctnCodeId: ctn.ctnCodeId,
        cost: undefined,
      }));
    }

    newRows.push(newRow);
  }

  // 一次性批量插入所有行
  gridApi.grid?.insertAt(newRows, -1); // -1 表示插入到末尾

  message.success(`已新增 ${count} 行`);
}

// 自定义行数弹窗
const customRowCountVisible = ref(false);
const customRowCount = ref<number>(1);

function showCustomRowCountModal() {
  customRowCount.value = 1;
  customRowCountVisible.value = true;
}

async function handleConfirmCustomRowCount() {
  if (!customRowCount.value || customRowCount.value <= 0) {
    message.warning('请输入有效的行数');
    return;
  }

  if (customRowCount.value > 100) {
    message.warning('单次最多新增100行');
    return;
  }

  customRowCountVisible.value = false;
  addRows(customRowCount.value);
}

// 删除选中行
function handleDeleteRows() {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请先选择要删除的行');
    return;
  }

  const records = gridApi.grid?.getCheckboxRecords?.() || [];

  AntModal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${records.length} 行数据吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: () => {
      records.forEach((row: any) => {
        gridApi.grid?.remove(row);
      });

      selectedRowKeys.value = [];
      message.success('删除成功');
    },
  });
}

// 复制选中行
function handleCopyRows() {
  const records = gridApi.grid?.getCheckboxRecords?.() || [];

  if (records.length === 0) {
    message.warning('请先选择要复制的行');
    return;
  }

  // 收集所有复制的行
  const newRows = records.map((row: any) => {
    // 深拷贝行数据，避免引用问题
    return JSON.parse(
      JSON.stringify({
        _rowKey: generateRowKey(),
        _isCopied: true, // 标记为复制的行
        recommend: row.recommend,
        carrierId: row.carrierId,
        polId: row.polId,
        podId: row.podId,
        isDirect: row.isDirect,
        poT1Id: row.poT1Id,
        poT2Id: row.poT2Id,
        polFreeDays: row.polFreeDays,
        podFreeDays: row.podFreeDays,
        poddem: row.poddem,
        poddet: row.poddet,
        voyage: row.voyage,
        contractNo: row.contractNo, // 添加约号字段
        etd: row.etd,
        etdDayOfWeek: row.etdDayOfWeek,
        etdDayTime: row.etdDayTime,
        closeDocTime: row.closeDocTime,
        closeDocDayOfWeek: row.closeDocDayOfWeek,
        closeDocDayTime: row.closeDocDayTime,
        closingTime: row.closingTime,
        closingDayOfWeek: row.closingDayOfWeek,
        closingDayTime: row.closingDayTime,
        validTimeStart: row.validTimeStart,
        validTimeEnd: row.validTimeEnd,
        remark: row.remark,
        currencyId: row.currencyId,
        bookingAgentId: row.bookingAgentId,
        seFreiPriceCtns: row.seFreiPriceCtns ? [...row.seFreiPriceCtns] : [],
      }),
    );
  });

  // 一次性批量插入所有复制的行
  gridApi.grid?.insertAt(newRows, -1);

  message.success(`已复制 ${records.length} 行`);
}

// 处理是否直达字段变化
function handleIsDirectChange(row: any, value: boolean) {
  // 如果设置为直达（true），则清空中转港的值
  if (value) {
    row.poT1Id = undefined;
    row.poT2Id = undefined;
  }
}

// 添加箱型列
function handleAddCtnType(value: any) {
  if (!value) return;

  // 直接使用 value，不进行 Number 转换，避免大数精度丢失
  const ctnCodeId = value;

  // 检查是否已添加（使用字符串比较）
  if (
    addedCtnTypes.value.some(
      (ctn) => String(ctn.ctnCodeId) === String(ctnCodeId),
    )
  ) {
    message.warning('该箱型已添加');
    return;
  }

  // 使用字符串比较查找箱型
  const ctn = allCtnOptions.value.find(
    (c) => String(c.ctnCodeId) === String(ctnCodeId),
  );
  if (!ctn) {
    message.error('未找到箱型信息');
    return;
  }

  addedCtnTypes.value.push({ ...ctn });

  // 为所有行添加该箱型的空值 - 直接操作 Grid 中的数据
  const records = gridApi.grid?.getFullData() || [];
  records.forEach((row: any) => {
    row.seFreiPriceCtns.push({
      ctnCodeId: ctn.ctnCodeId,
      cost: undefined, // 初始值为 undefined，由用户输入
    });
  });

  // 清空选中的箱型ID，方便下次选择
  selectedCtnId.value = undefined;

  message.success('添加箱型成功');
}

// 获取可用的箱型选项（排除已添加的）
const availableCtnOptions = computed(() => {
  const addedIds = new Set(addedCtnTypes.value.map((c) => String(c.ctnCodeId)));
  return allCtnOptions.value.filter((c) => !addedIds.has(String(c.ctnCodeId)));
});

// 箱型选项模糊搜索过滤函数
function filterCtnOption(input: string, option: any) {
  if (!input) return true;
  const ctnName = option?.ctnName || '';
  return ctnName.toLowerCase().includes(input.toLowerCase());
}

// 更新某行的箱型成本
function updateCtnCost(row: any, ctnCodeId: any, cost: number | undefined) {
  if (!row) return;

  // 使用字符串比较查找箱型数据，避免大数精度丢失
  let ctnData = row.seFreiPriceCtns.find(
    (c: any) => String(c.ctnCodeId) === String(ctnCodeId),
  );
  if (!ctnData) {
    ctnData = { ctnCodeId, cost };
    row.seFreiPriceCtns.push(ctnData);
  } else {
    ctnData.cost = cost;
  }
}

// 获取某行的箱型成本
function getCtnCost(row: any, ctnCodeId: any): number | undefined {
  if (!row || !row.seFreiPriceCtns) return undefined;

  const ctnData = row.seFreiPriceCtns.find(
    (c: any) => String(c.ctnCodeId) === String(ctnCodeId),
  );
  return ctnData?.cost;
}

// 设置某行的箱型成本
function setCtnCost(row: any, ctnCodeId: any, cost: number | undefined) {
  console.log('设置箱型成本:', { row, ctnCodeId, cost });
  if (!row || !row.seFreiPriceCtns) return;

  // 使用字符串比较查找箱型数据，避免大数精度丢失
  const ctnIndex = row.seFreiPriceCtns.findIndex(
    (c: any) => String(c.ctnCodeId) === String(ctnCodeId),
  );

  if (ctnIndex !== -1) {
    // 如果找到了，直接更新 cost
    row.seFreiPriceCtns[ctnIndex].cost = cost;
  } else {
    // 如果没找到，添加新的箱型数据
    row.seFreiPriceCtns.push({
      ctnCodeId,
      cost,
    });
  }
}

// 构建动态列配置
function buildColumns(): VxeTableGridOptions['columns'] {
  const columns: any[] = [
    {
      type: 'seq',
      title: '序号',
      width: 60,
    },
    {
      type: 'checkbox',
      width: 60,
    },
    {
      field: 'carrierId',
      title: '船公司',
      width: 260,

      slots: { default: 'carrierId' },
    },
    {
      field: 'polId',
      title: '起运港',
      width: 280,

      slots: { default: 'polId' },
    },
    {
      field: 'podId',
      title: '目的港',
      width: 280,

      slots: { default: 'podId' },
    },
    {
      field: 'currencyId',
      title: '币别',
      width: 100,

      slots: { default: 'currencyId' },
    },
    {
      field: 'bookingAgentId',
      title: '订舱代理',
      width: 200,
      slots: { default: 'bookingAgentId' },
    },
    {
      field: 'isDirect',
      title: '是否直达',
      width: 100,

      slots: { default: 'isDirect' },
    },
    {
      field: 'poT1Id',
      title: '中转港1',
      width: 200,
      slots: { default: 'poT1Id' },
    },
    {
      field: 'poT2Id',
      title: '中转港2',
      width: 200,
      slots: { default: 'poT2Id' },
    },
    {
      field: 'polFreeDays',
      title: '起运港免用箱',
      width: 110,
      slots: { default: 'polFreeDays' },
    },
    {
      field: 'podFreeDaysCombined',
      title: '目的港免箱使天数',
      width: 320,
      slots: {
        default: 'podFreeDaysCombined',
        header: 'podFreeDaysCombinedHeader',
      },
    },
    {
      field: 'voyage',
      title: '航程',
      width: 120,
      slots: { default: 'voyage' },
    },
    {
      field: 'contractNo',
      title: '约号',
      width: 280,
      slots: { default: 'contractNo' },
    },
    {
      field: 'dateTimeMode',
      title: '日期时间',
      width: 720,
      slots: { default: 'dateTimeMode' },
    },
    {
      field: 'weekMode',
      title: '星期模式',
      width: 680,
      slots: { default: 'weekMode' },
    },
    {
      field: 'validTimeStart',
      title: '有效起始日期',
      width: 150,
      slots: { default: 'validTimeStart' },
    },
    {
      field: 'validTimeEnd',
      title: '有效截止日期',
      width: 150,
      slots: { default: 'validTimeEnd' },
    },
    {
      field: 'remark',
      title: '备注',
      width: 400,
      slots: { default: 'remark' },
    },
  ];

  // 添加动态箱型列
  addedCtnTypes.value.forEach((ctn) => {
    columns.push({
      field: `ctn_${String(ctn.ctnCodeId)}`,
      title: ctn.ctnName,
      width: 120,

      slots: { default: 'ctnCost', header: 'ctnHeader' },
    });
  });

  return columns;
}

// Grid 实例
const [Grid, gridApi] = useVbenVxeGrid<any>({
  gridOptions: {
    columns: buildColumns(),
    data: [], // 初始为空数组
    height: 400,
    rowConfig: {
      keyField: '_rowKey',
      //isHover: true,
    },
    rowStyle: ({ row }: any) => {
      if (row._isCopied) {
        return {
          backgroundColor: '#fff7e6',
        };
      }
      return {};
    },
    checkboxConfig: {
      highlight: true,
      reserve: true,
    },
    pagerConfig: {
      enabled: false,
    },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: false,
      search: false,
      zoom: false,
    },
  },
  gridEvents: {
    checkboxChange: ({ checked }: any) => {
      const records = (gridApi.grid?.getCheckboxRecords?.() ?? []) as any[];
      selectedRowKeys.value = records.map((r: any) => r._rowKey);
    },
    checkboxAll: ({ checked }: any) => {
      const records = (gridApi.grid?.getCheckboxRecords?.() ?? []) as any[];
      selectedRowKeys.value = records.map((r: any) => r._rowKey);
    },
  },
});

// 编辑状态管理 - 用于懒加载下拉框
const editingStates = ref<Map<string, Set<string>>>(new Map());

// Label缓存 - 存储已选择的label值，避免重复调用API
// 注意：所有ID都使用字符串作为key，避免大数精度丢失（JavaScript Number安全整数上限为2^53-1）
const labelCache = ref({
  carriers: new Map<string, string>(),
  ports: new Map<string, string>(),
  currencies: new Map<string, string>(),
  clients: new Map<string, string>(),
});

// 检查某行的某个字段是否处于编辑状态
function isEditing(rowKey: string, field: string): boolean {
  return editingStates.value.get(rowKey)?.has(field) || false;
}

// 开始编辑某个字段
function startEditing(rowKey: string, field: string) {
  if (!editingStates.value.has(rowKey)) {
    editingStates.value.set(rowKey, new Set());
  }
  editingStates.value.get(rowKey)!.add(field);
}

// 结束编辑某个字段
function stopEditing(rowKey: string, field: string) {
  const rowStates = editingStates.value.get(rowKey);
  if (rowStates) {
    rowStates.delete(field);
    if (rowStates.size === 0) {
      editingStates.value.delete(rowKey);
    }
  }
}

// 获取船公司名称（从缓存或返回ID）
function getCarrierName(carrierId: number | string | undefined): string {
  if (!carrierId) return '-';
  // 使用字符串作为key查询，避免大数精度丢失
  const key = String(carrierId);
  return labelCache.value.carriers.get(key) || `船公司(${carrierId})`;
}

// 获取港口名称（从缓存或返回ID）
function getPortName(portId: number | string | undefined): string {
  if (!portId) return '-';
  // 使用字符串作为key查询，避免大数精度丢失
  const key = String(portId);
  const cachedName = labelCache.value.ports.get(key);
  return cachedName || `港口(${portId})`;
}

// 获取币别名称（从缓存或返回ID）
function getCurrencyName(currencyId: number | string | undefined): string {
  if (!currencyId) return '-';
  // 使用字符串作为key查询，避免大数精度丢失
  const key = String(currencyId);
  return labelCache.value.currencies.get(key) || `币别(${currencyId})`;
}

// 获取客户名称（从缓存或返回ID）
function getClientName(clientId: number | string | undefined): string {
  if (!clientId) return '-';
  const clientIdStr = String(clientId);
  return labelCache.value.clients.get(clientIdStr) || `客户(${clientId})`;
}

// 更新label缓存（在Select的@change事件中调用）
function updateLabelCache(
  type: 'carriers' | 'ports' | 'currencies' | 'clients',
  id: number | string,
  label: string,
) {
  // 统一使用字符串作为key，避免大数精度丢失
  const key = String(id);
  if (type === 'clients') {
    labelCache.value.clients.set(key, label);
  } else {
    labelCache.value[type].set(key, label);
  }
}

// 格式化日期显示
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  return dateStr;
}

// 格式化时间显示
function formatTime(timeStr: string | undefined): string {
  if (!timeStr) return '-';
  return timeStr;
}

// 格式化星期显示
function formatWeekDay(dayOfWeek: number | undefined): string {
  if (dayOfWeek === undefined || dayOfWeek === null) return '-';
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weekDays[dayOfWeek] || '-';
}

// 监听箱型变化，更新列配置
watch(
  addedCtnTypes,
  async (newVal) => {
    console.log('箱型列表变化:', newVal);
    // 等待 DOM 更新
    await nextTick();
    // 获取当前 Grid 中的数据，避免丢失
    const currentData = gridApi.grid?.getData() || []; // 使用getData()替代getFullData()
    console.log('更新列配置，当前数据行数:', currentData.length);

    // 更新列配置
    gridApi.setGridOptions({
      columns: buildColumns(),
      data: currentData, // 保留当前数据
    });

    console.log('列配置已更新');
  },
  { deep: true },
);

// 处理AI数据的函数
async function handleAIData(aiData: any[]) {
  console.log('开始处理AI数据:', aiData);

  // 确保下拉选项已加载
  if (allCtnOptions.value.length === 0) {
    await loadSelectOptions();
  }

  // 处理AI数据中的箱型，添加到addedCtnTypes中
  const aiCtnTypes = new Set<number>();
  aiData.forEach((row: any, index: number) => {
    console.log(`处理第${index + 1}行AI数据:`, row);
    if (row.seFreiPriceCtns && Array.isArray(row.seFreiPriceCtns)) {
      console.log(
        `第${index + 1}行包含${row.seFreiPriceCtns.length}个箱型数据`,
      );
      row.seFreiPriceCtns.forEach((ctn: any, ctnIndex: number) => {
        console.log(`  第${ctnIndex + 1}个箱型数据:`, ctn);
        if (ctn.ctnCodeId && ctn.ctnCodeId > 0) {
          console.log(`    添加箱型ID:`, ctn.ctnCodeId);
          aiCtnTypes.add(Number(ctn.ctnCodeId)); // 确保转换为数字类型
        }
      });
    }
  });

  console.log('AI数据中发现的箱型ID集合:', Array.from(aiCtnTypes));

  // 将AI数据中出现的有效箱型添加到addedCtnTypes中
  const newAddedCtnTypes: CtnTypeOption[] = [];
  aiCtnTypes.forEach((ctnCodeId) => {
    // 检查是否已添加
    const exists = addedCtnTypes.value.some(
      (ctn) => ctn.ctnCodeId === ctnCodeId,
    );
    console.log(`箱型ID ${ctnCodeId} 是否已存在:`, exists);

    if (!exists) {
      // 查找箱型名称
      const ctnOption = allCtnOptions.value.find(
        (ctn) => ctn.ctnCodeId === ctnCodeId,
      );
      if (ctnOption) {
        console.log(`找到箱型信息:`, ctnOption);
        newAddedCtnTypes.push({
          ctnCodeId: ctnOption.ctnCodeId,
          ctnName: ctnOption.ctnName,
        });
      } else {
        console.warn(`未找到箱型ID为 ${ctnCodeId} 的箱型信息`);
      }
    }
  });

  // 如果有新的箱型需要添加
  if (newAddedCtnTypes.length > 0) {
    console.log('添加新的箱型到addedCtnTypes:', newAddedCtnTypes);
    addedCtnTypes.value.push(...newAddedCtnTypes);
  } else {
    console.log('没有新的箱型需要添加');
  }

  // 等待列配置更新
  console.log('等待列配置更新...');
  await nextTick();
  await nextTick();

  // 转换AI数据格式以适应表格结构
  const transformedAiData = aiData.map((row, index) => {
    // 为每行生成唯一_key
    const transformedRow = {
      _rowKey: generateRowKey(),
      _isCopied: false,
      recommend: row.recommend || false,
      carrierId: row.carrierId || undefined,
      polId: row.polId || undefined,
      podId: row.podId ? Number(row.podId) : undefined, // 确保转换为数字类型
      isDirect: row.isDirect ?? true,
      poT1Id: row.poT1Id ? Number(row.poT1Id) : undefined,
      poT2Id: row.poT2Id ? Number(row.poT2Id) : undefined,
      polFreeDays: row.polFreeDays || undefined,
      podFreeDays: row.podFreeDays || undefined,
      poddem: row.poddem || undefined,
      poddet: row.poddet || undefined,
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
      validTimeStart: row.validTimeStart || '',
      validTimeEnd: row.validTimeEnd || '',
      remark: row.remark || '',
      currencyId: row.currencyId ? Number(row.currencyId) : undefined,
      bookingAgentId: row.bookingAgentId || undefined,
      seFreiPriceCtns: row.seFreiPriceCtns
        ? row.seFreiPriceCtns.map((ctn: any) => ({
            ctnCodeId: ctn.ctnCodeId ? Number(ctn.ctnCodeId) : undefined,
            cost: ctn.price || undefined,
          }))
        : [],
    };
    return transformedRow;
  });

  console.log('转换后的AI数据:', transformedAiData);

  console.log('准备加载AI数据到表格，数据量:', transformedAiData.length);
  console.log('当前表格实例:', gridApi.grid);

  // 一次性加载AI识别的数据，替换现有数据
  if (gridApi.grid) {
    gridApi.grid.reloadData(transformedAiData);
    console.log(`已加载 ${transformedAiData.length} 条AI识别的数据到表格`);
    message.success(`已加载 ${transformedAiData.length} 条AI识别的数据`);
  } else {
    console.error('表格实例不存在，无法加载数据');
  }
}

// 验证表单
function validateForm(): boolean {
  // 从 Grid 获取最新数据
  const gridRecords = (gridApi.grid?.getFullData() || []) as any[];

  if (gridRecords.length === 0) {
    message.warning('请至少添加一行数据');
    return false;
  }

  for (let i = 0; i < gridRecords.length; i++) {
    const row = gridRecords[i];
    const rowNum = i + 1;

    console.log(`第 ${rowNum} 行数据:`, row);

    if (!row.carrierId) {
      message.warning(`第 ${rowNum} 行：请选择船公司`);
      return false;
    }
    if (!row.polId) {
      message.warning(`第 ${rowNum} 行：请选择起运港`);
      return false;
    }
    if (!row.podId) {
      message.warning(`第 ${rowNum} 行：请选择目的港`);
      return false;
    }
    if (!row.currencyId) {
      message.warning(`第 ${rowNum} 行：请选择币别`);
      return false;
    }
    if (!row.validTimeStart) {
      message.warning(`第 ${rowNum} 行：请选择有效起始日期`);
      return false;
    }
    if (!row.validTimeEnd) {
      message.warning(`第 ${rowNum} 行：请选择有效截止日期`);
      return false;
    }
  }

  return true;
}

// 处理日期时间模式切换 - 切换到日期模式时清空星期模式
function handleSwitchToDateTimeMode(row: any) {
  row.etdDayOfWeek = undefined;
  row.etdDayTime = '';
  row.closeDocDayOfWeek = undefined;
  row.closeDocDayTime = '';
  row.closingDayOfWeek = undefined;
  row.closingDayTime = '';
}

// 处理星期模式切换 - 切换到星期模式时清空日期模式
function handleSwitchToWeekMode(row: any) {
  row.etd = '';
  row.closeDocTime = '';
  row.closingTime = '';
}

// 提交表单
async function handleSubmit() {
  if (!validateForm()) {
    return;
  }

  loading.value = true;
  try {
    // 从 Grid 获取最新数据
    const gridRecords = (gridApi.grid?.getFullData() || []) as any[];

    console.log('Grid 中的数据:', gridRecords);

    // 转换数据格式
    const submitData: AddSeFreiPriceInput[] = gridRecords.map((row) => {
      // 构建箱型报价列表 - 只包含已录入运费的箱型
      const seFreiPriceCtns: SeFreiPriceCtnEditDto[] = row.seFreiPriceCtns
        .filter((ctn: any) => ctn.cost !== undefined && ctn.cost !== null)
        .map((ctn: any) => ({
          ctnCodeId: ctn.ctnCodeId,
          cost: ctn.cost,
        }));

      // 构建日期时间模式数据（如果填写了任意一个日期字段）
      const seFreiPriceDays =
        row.etd || row.closeDocTime || row.closingTime
          ? [
              {
                etd: row.etd || undefined,
                closeDocTime: row.closeDocTime || undefined,
                closingTime: row.closingTime || undefined,
              },
            ]
          : [];

      // 构建星期模式数据（如果填写了任意一个星期字段）
      const seFreiPriceWeekDays =
        row.etdDayOfWeek !== undefined ||
        row.closeDocDayOfWeek !== undefined ||
        row.closingDayOfWeek !== undefined
          ? [
              {
                etdDayOfWeek: row.etdDayOfWeek,
                etdDayTime: row.etdDayTime || undefined,
                closeDocDayOfWeek: row.closeDocDayOfWeek,
                closeDocDayTime: row.closeDocDayTime || undefined,
                closingDayOfWeek: row.closingDayOfWeek,
                closingDayTime: row.closingDayTime || undefined,
              },
            ]
          : [];

      return {
        recommend: row.recommend || false,
        carrierId: row.carrierId,
        polId: row.polId,
        podId: row.podId,
        isDirect: row.isDirect,
        poT1Id: row.poT1Id,
        poT2Id: row.poT2Id,
        polFreeDays: row.polFreeDays,
        podFreeDays: row.podFreeDays,
        poddem: row.poddem,
        poddet: row.poddet,
        voyage: row.voyage,
        contractNo: row.contractNo,
        validTimeStart: row.validTimeStart,
        validTimeEnd: row.validTimeEnd,
        remark: row.remark,
        currencyId: row.currencyId,
        bookingAgentId: row.bookingAgentId || null,
        seFreiPriceCtns,
        seFreiPriceFees: [], // 批量新增不包含附加费
        seFreiPriceDays,
        seFreiPriceWeekDays,
      };
    });

    console.log('提交数据:', submitData);

    // TODO: 调用批量新增 API
    await batchAddSimpleSeFreiPrice(submitData);

    message.success('批量新增成功');
    modalApi.close();
    emit('success');
  } catch (error) {
    console.error('批量新增失败:', error);
    message.error('批量新增失败');
  } finally {
    loading.value = false;
  }
}

// 重置表单
function resetForm() {
  // 清空 Grid 数据
  gridApi.grid?.loadData([]);
  addedCtnTypes.value = [];
  selectedRowKeys.value = [];
  rowKeyCounter = 0;
  // 清空编辑状态
  editingStates.value.clear();
}

// 暴露方法给父组件
defineExpose({
  open: () => {
    console.log('打开模态框');
    // 确保默认箱型已加载
    if (allCtnOptions.value.length === 0) {
      loadSelectOptions();
    }
    modalApi.open();
  },
  close: () => {
    modalApi.close();
  },
  setData: (data: { aiData?: any[] }) => {
    console.log('收到外部设置的AI数据:', data);
    // 如果有AI数据，更新props中的aiData
    if (data.aiData && data.aiData.length > 0) {
      console.log('开始处理AI数据，共', data.aiData.length, '条记录');
      // 将AI数据保存到响应式变量中
      aiData.value = data.aiData;
      console.log('将AI数据保存到响应式变量中', aiData.value);
    } else {
      console.log('没有AI数据需要处理');
    }
  },
});
</script>

<template>
  <Modal
    :title="$t('seaExport.freightRate.batchAdd')"
    class="w-[1300px]"
    :confirm-loading="loading"
  >
    <div class="batch-add-container">
      <!-- 工具栏 -->
      <div class="mb-4 flex items-center justify-between">
        <Space>
          <DropdownButton type="primary" @click="handleAddRow">
            <template #icon>
              <Plus class="size-4" />
            </template>
            新增行
            <template #overlay>
              <Menu>
                <MenuItem @click="addRows(5)"> 新增 5 行 </MenuItem>
                <MenuItem @click="addRows(10)"> 新增 10 行 </MenuItem>
                <MenuItem @click="showCustomRowCountModal">
                  新增自定义行数
                </MenuItem>
              </Menu>
            </template>
          </DropdownButton>
          <Button
            :disabled="selectedRowKeys.length === 0"
            @click="handleCopyRows"
          >
            <Copy class="size-4" />
            复制选中行
          </Button>
          <Button
            danger
            :disabled="selectedRowKeys.length === 0"
            @click="handleDeleteRows"
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
            :filter-option="filterCtnOption"
            :options="availableCtnOptions"
            :field-names="{ label: 'ctnName', value: 'ctnCodeId' }"
            @change="handleAddCtnType"
          />
        </Space>
      </div>

      <!-- 表格 -->
      <Grid>
        <!-- 船公司 -->
        <template #carrierId="{ row }">
          <div v-if="isEditing(row._rowKey, 'carrierId')" class="w-full">
            <CarrierSelect
              v-model="row.carrierId"
              style="width: 100%"
              @blur="stopEditing(row._rowKey, 'carrierId')"
              @change="
                (val: any, option: any) => {
                  if (option?.rawLabel) {
                    updateLabelCache('carriers', val, option.rawLabel);
                  }
                  stopEditing(row._rowKey, 'carrierId');
                }
              "
            />
          </div>
          <div
            v-else
            class="min-w-[80px] cursor-pointer rounded border border-dashed border-blue-300 bg-blue-50 px-2 py-1 text-center text-sm transition-all hover:border-blue-500 hover:bg-blue-100"
            @click="startEditing(row._rowKey, 'carrierId')"
          >
            {{ getCarrierName(row.carrierId) }}
          </div>
        </template>

        <!-- 起运港 -->
        <template #polId="{ row }">
          <div v-if="isEditing(row._rowKey, 'polId')" class="w-full">
            <PortSelect
              v-model="row.polId"
              style="width: 100%"
              @blur="stopEditing(row._rowKey, 'polId')"
              @change="
                (val: any, option: any) => {
                  if (option?.rawLabel) {
                    updateLabelCache('ports', val, option.rawLabel);
                  }
                  stopEditing(row._rowKey, 'polId');
                }
              "
            />
          </div>
          <div
            v-else
            class="min-w-[80px] cursor-pointer rounded border border-dashed border-blue-300 bg-blue-50 px-2 py-1 text-center text-sm transition-all hover:border-blue-500 hover:bg-blue-100"
            @click="startEditing(row._rowKey, 'polId')"
          >
            {{ getPortName(row.polId) }}
          </div>
        </template>

        <!-- 目的港 -->
        <template #podId="{ row }">
          <div v-if="isEditing(row._rowKey, 'podId')" class="w-full">
            <PortSelect
              v-model="row.podId"
              style="width: 100%"
              @blur="stopEditing(row._rowKey, 'podId')"
              @change="
                (val: any, option: any) => {
                  if (option?.rawLabel) {
                    updateLabelCache('ports', val, option.rawLabel);
                  }
                  stopEditing(row._rowKey, 'podId');
                }
              "
            />
          </div>
          <div
            v-else
            class="min-w-[80px] cursor-pointer rounded border border-dashed border-blue-300 bg-blue-50 px-2 py-1 text-center text-sm transition-all hover:border-blue-500 hover:bg-blue-100"
            @click="startEditing(row._rowKey, 'podId')"
          >
            {{ getPortName(row.podId) }}
          </div>
        </template>

        <!-- 币别 -->
        <template #currencyId="{ row }">
          <div v-if="isEditing(row._rowKey, 'currencyId')" class="w-full">
            <CurrencySelect
              v-model="row.currencyId"
              style="width: 100%"
              @blur="stopEditing(row._rowKey, 'currencyId')"
              @change="
                (val: any, option: any) => {
                  if (option?.rawLabel) {
                    updateLabelCache('currencies', val, option.rawLabel);
                  }
                  stopEditing(row._rowKey, 'currencyId');
                }
              "
            />
          </div>
          <div
            v-else
            class="min-w-[80px] cursor-pointer rounded border border-dashed border-blue-300 bg-blue-50 px-2 py-1 text-center text-sm transition-all hover:border-blue-500 hover:bg-blue-100"
            @click="startEditing(row._rowKey, 'currencyId')"
          >
            {{ getCurrencyName(row.currencyId) }}
          </div>
        </template>

        <!-- 订舱代理 -->
        <template #bookingAgentId="{ row }">
          <div v-if="isEditing(row._rowKey, 'bookingAgentId')" class="w-full">
            <ClientSelect
              v-model="row.bookingAgentId"
              style="width: 100%"
              placeholder="请选择订舱代理"
              allow-clear
              industry-category="o"
              @blur="stopEditing(row._rowKey, 'bookingAgentId')"
              @change="
                (val: any, option: any) => {
                  if (option?.rawLabel) {
                    updateLabelCache('clients', val, option.rawLabel);
                  }
                  stopEditing(row._rowKey, 'bookingAgentId');
                }
              "
            />
          </div>
          <div
            v-else
            class="min-w-[80px] cursor-pointer rounded border border-dashed border-blue-300 bg-blue-50 px-2 py-1 text-center text-sm transition-all hover:border-blue-500 hover:bg-blue-100"
            @click="startEditing(row._rowKey, 'bookingAgentId')"
          >
            {{ getClientName(row.bookingAgentId) }}
          </div>
        </template>

        <!-- 是否直达 -->
        <template #isDirect="{ row }">
          <Switch
            v-model:checked="row.isDirect"
            checked-children="是"
            un-checked-children="否"
            @change="(val: any) => handleIsDirectChange(row, val)"
          />
        </template>

        <!-- 中转港1 -->
        <template #poT1Id="{ row }">
          <div v-if="isEditing(row._rowKey, 'poT1Id')" class="w-full">
            <PortSelect
              v-model="row.poT1Id"
              style="width: 100%"
              allow-clear
              :disabled="row.isDirect"
              @blur="stopEditing(row._rowKey, 'poT1Id')"
              @change="
                (val: any, option: any) => {
                  if (option?.rawLabel) {
                    updateLabelCache('ports', val, option.rawLabel);
                  }
                  stopEditing(row._rowKey, 'poT1Id');
                }
              "
            />
          </div>
          <div
            v-else
            class="min-w-[80px] cursor-pointer rounded border border-dashed border-blue-300 bg-blue-50 px-2 py-1 text-center text-sm transition-all hover:border-blue-500 hover:bg-blue-100"
            :class="{ 'cursor-not-allowed opacity-50': row.isDirect }"
            @click="!row.isDirect && startEditing(row._rowKey, 'poT1Id')"
          >
            {{ row.isDirect ? '-' : getPortName(row.poT1Id) }}
          </div>
        </template>

        <!-- 中转港2 -->
        <template #poT2Id="{ row }">
          <div v-if="isEditing(row._rowKey, 'poT2Id')" class="w-full">
            <PortSelect
              v-model="row.poT2Id"
              style="width: 100%"
              allow-clear
              :disabled="row.isDirect"
              @blur="stopEditing(row._rowKey, 'poT2Id')"
              @change="
                (val: any, option: any) => {
                  if (option?.rawLabel) {
                    updateLabelCache('ports', val, option.rawLabel);
                  }
                  stopEditing(row._rowKey, 'poT2Id');
                }
              "
            />
          </div>
          <div
            v-else
            class="min-w-[80px] cursor-pointer rounded border border-dashed border-blue-300 bg-blue-50 px-2 py-1 text-center text-sm transition-all hover:border-blue-500 hover:bg-blue-100"
            :class="{ 'cursor-not-allowed opacity-50': row.isDirect }"
            @click="!row.isDirect && startEditing(row._rowKey, 'poT2Id')"
          >
            {{ row.isDirect ? '-' : getPortName(row.poT2Id) }}
          </div>
        </template>

        <!-- 起运港免用箱天数 -->
        <template #polFreeDays="{ row }">
          <InputNumber
            v-model:value="row.polFreeDays"
            style="width: 100%"
            :min="0"
            placeholder="请输入"
          />
        </template>

        <!-- 目的港免箱使天数合并编辑 -->
        <template #podFreeDaysCombined="{ row }">
          <div class="flex items-center justify-center gap-2 p-1">
            <!-- 免堆期 (DEM) -->
            <InputNumber
              v-model:value="row.poddem"
              style="width: 60px"
              :min="0"
              placeholder="DEM"
            />

            <span class="text-sm text-gray-400">+</span>

            <!-- 免用箱期 (DET) -->
            <InputNumber
              v-model:value="row.podFreeDays"
              style="width: 60px"
              :min="0"
              placeholder="DET"
            />

            <span class="text-sm text-gray-400">=</span>

            <!-- 免箱使期（自动计算或手动输入） -->
            <InputNumber
              v-model:value="row.poddet"
              style="width: 60px"
              :min="0"
              placeholder="-"
              class="font-medium"
            />
          </div>
        </template>

        <!-- 目的港免箱使天数列头 -->
        <template #podFreeDaysCombinedHeader>
          <div class="flex items-center gap-1">
            <span>目的港免箱使天数</span>
            <Tooltip title="免堆期 (DEM) + 免用箱期 (DET) = 免箱使期">
              <IconifyIcon
                icon="mdi:information-outline"
                class="size-4 cursor-help text-gray-500"
              />
            </Tooltip>
          </div>
        </template>

        <!-- 航程 -->
        <template #voyage="{ row }">
          <Input v-model:value="row.voyage" placeholder="请输入" />
        </template>

        <!-- 约号 -->
        <template #contractNo="{ row }">
          <Input
            v-model:value="row.contractNo"
            placeholder="请输入约号"
            :maxlength="128"
          />
        </template>

        <!-- 日期时间模式（开船日期、截单时间、截关时间） -->
        <template #dateTimeMode="{ row }">
          <div class="flex gap-2">
            <!-- 开船日期 -->
            <div class="flex items-center gap-2">
              <span class="shrink-0 text-xs text-gray-500">开船:</span>
              <div v-if="isEditing(row._rowKey, 'etd')" class="w-[180px]">
                <DatePicker
                  v-model:value="row.etd"
                  style="width: 100%"
                  placeholder="选择日期"
                  value-format="YYYY-MM-DD"
                  format="YYYY-MM-DD"
                  :disabled="!!row.etdDayOfWeek"
                  allow-clear
                  @blur="stopEditing(row._rowKey, 'etd')"
                  @change="handleSwitchToDateTimeMode(row)"
                />
              </div>
              <div
                v-else
                class="min-w-[100px] cursor-pointer rounded border border-dashed border-purple-300 bg-purple-50 px-2 py-1 text-center text-sm transition-all hover:border-purple-500 hover:bg-purple-100"
                :class="{ 'cursor-not-allowed opacity-50': !!row.etdDayOfWeek }"
                @click="!row.etdDayOfWeek && startEditing(row._rowKey, 'etd')"
              >
                {{ formatDate(row.etd) }}
              </div>
            </div>
            <!-- 截单时间 -->
            <div class="flex items-center gap-2">
              <span class="shrink-0 text-xs text-gray-500">截单:</span>
              <div
                v-if="isEditing(row._rowKey, 'closeDocTime')"
                class="w-[180px]"
              >
                <DatePicker
                  v-model:value="row.closeDocTime"
                  style="width: 100%"
                  show-time
                  :time-picker-props="{ format: 'HH:mm' }"
                  placeholder="选择日期和时间"
                  value-format="YYYY-MM-DD HH:mm"
                  format="YYYY-MM-DD HH:mm"
                  :disabled="!!row.closeDocDayOfWeek"
                  allow-clear
                  @blur="stopEditing(row._rowKey, 'closeDocTime')"
                  @change="handleSwitchToDateTimeMode(row)"
                />
              </div>
              <div
                v-else
                class="min-w-[100px] cursor-pointer rounded border border-dashed border-purple-300 bg-purple-50 px-2 py-1 text-center text-sm transition-all hover:border-purple-500 hover:bg-purple-100"
                :class="{
                  'cursor-not-allowed opacity-50': !!row.closeDocDayOfWeek,
                }"
                @click="
                  !row.closeDocDayOfWeek &&
                  startEditing(row._rowKey, 'closeDocTime')
                "
              >
                {{ formatDate(row.closeDocTime) }}
              </div>
            </div>
            <!-- 截关时间 -->
            <div class="flex items-center gap-2">
              <span class="shrink-0 text-xs text-gray-500">截关:</span>
              <div
                v-if="isEditing(row._rowKey, 'closingTime')"
                class="w-[180px]"
              >
                <DatePicker
                  v-model:value="row.closingTime"
                  style="width: 100%"
                  show-time
                  :time-picker-props="{ format: 'HH:mm' }"
                  placeholder="选择日期和时间"
                  value-format="YYYY-MM-DD HH:mm"
                  format="YYYY-MM-DD HH:mm"
                  :disabled="!!row.closingDayOfWeek"
                  allow-clear
                  @blur="stopEditing(row._rowKey, 'closingTime')"
                  @change="handleSwitchToDateTimeMode(row)"
                />
              </div>
              <div
                v-else
                class="min-w-[100px] cursor-pointer rounded border border-dashed border-purple-300 bg-purple-50 px-2 py-1 text-center text-sm transition-all hover:border-purple-500 hover:bg-purple-100"
                :class="{
                  'cursor-not-allowed opacity-50': !!row.closingDayOfWeek,
                }"
                @click="
                  !row.closingDayOfWeek &&
                  startEditing(row._rowKey, 'closingTime')
                "
              >
                {{ formatDate(row.closingTime) }}
              </div>
            </div>
          </div>
        </template>

        <!-- 星期模式（开船日期、截单时间、截关时间） -->
        <template #weekMode="{ row }">
          <div class="flex gap-2">
            <!-- 开船日期（仅星期） -->
            <div class="flex items-center gap-2">
              <span class="shrink-0 text-xs text-gray-500">开船:</span>
              <div
                v-if="isEditing(row._rowKey, 'etdDayOfWeek')"
                class="w-[100px]"
              >
                <Select
                  v-model:value="row.etdDayOfWeek"
                  style="width: 100%"
                  placeholder="星期"
                  :disabled="!!row.etd"
                  allow-clear
                  @blur="stopEditing(row._rowKey, 'etdDayOfWeek')"
                  @change="handleSwitchToWeekMode(row)"
                >
                  <Select.Option :value="0">周日</Select.Option>
                  <Select.Option :value="1">周一</Select.Option>
                  <Select.Option :value="2">周二</Select.Option>
                  <Select.Option :value="3">周三</Select.Option>
                  <Select.Option :value="4">周四</Select.Option>
                  <Select.Option :value="5">周五</Select.Option>
                  <Select.Option :value="6">周六</Select.Option>
                </Select>
              </div>
              <div
                v-else
                class="min-w-[80px] cursor-pointer rounded border border-dashed border-purple-300 bg-purple-50 px-2 py-1 text-center text-sm transition-all hover:border-purple-500 hover:bg-purple-100"
                :class="{ 'cursor-not-allowed opacity-50': !!row.etd }"
                @click="!row.etd && startEditing(row._rowKey, 'etdDayOfWeek')"
              >
                {{ formatWeekDay(row.etdDayOfWeek) }}
              </div>
            </div>
            <!-- 截单时间（星期+时间） -->
            <div class="flex items-center gap-2">
              <span class="shrink-0 text-xs text-gray-500">截单:</span>
              <div class="flex flex-1 items-center gap-1">
                <div
                  v-if="isEditing(row._rowKey, 'closeDocDayOfWeek')"
                  class="w-[70px]"
                >
                  <Select
                    v-model:value="row.closeDocDayOfWeek"
                    style="width: 100%"
                    placeholder="星期"
                    :disabled="!!row.closeDocTime"
                    allow-clear
                    @blur="stopEditing(row._rowKey, 'closeDocDayOfWeek')"
                    @change="handleSwitchToWeekMode(row)"
                  >
                    <Select.Option :value="0">周日</Select.Option>
                    <Select.Option :value="1">周一</Select.Option>
                    <Select.Option :value="2">周二</Select.Option>
                    <Select.Option :value="3">周三</Select.Option>
                    <Select.Option :value="4">周四</Select.Option>
                    <Select.Option :value="5">周五</Select.Option>
                    <Select.Option :value="6">周六</Select.Option>
                  </Select>
                </div>
                <div
                  v-else
                  class="w-[70px] cursor-pointer rounded border border-dashed border-purple-300 bg-purple-50 px-2 py-1 text-center text-sm transition-all hover:border-purple-500 hover:bg-purple-100"
                  :class="{
                    'cursor-not-allowed opacity-50': !!row.closeDocTime,
                  }"
                  @click="
                    !row.closeDocTime &&
                    startEditing(row._rowKey, 'closeDocDayOfWeek')
                  "
                >
                  {{ formatWeekDay(row.closeDocDayOfWeek) }}
                </div>
                <div
                  v-if="isEditing(row._rowKey, 'closeDocDayTime')"
                  class="w-[90px]"
                >
                  <TimePicker
                    v-model:value="row.closeDocDayTime"
                    style="width: 100%"
                    placeholder="时间"
                    format="HH:mm"
                    value-format="HH:mm"
                    :disabled="
                      !row.closeDocDayOfWeek && row.closeDocDayOfWeek !== 0
                    "
                    allow-clear
                    @blur="stopEditing(row._rowKey, 'closeDocDayTime')"
                  />
                </div>
                <div
                  v-else
                  class="w-[90px] cursor-pointer rounded border border-dashed border-purple-300 bg-purple-50 px-2 py-1 text-center text-sm transition-all hover:border-purple-500 hover:bg-purple-100"
                  @click="startEditing(row._rowKey, 'closeDocDayTime')"
                >
                  {{ formatTime(row.closeDocDayTime) }}
                </div>
              </div>
            </div>
            <!-- 截关时间（星期+时间） -->
            <div class="flex items-center gap-2">
              <span class="shrink-0 text-xs text-gray-500">截关:</span>
              <div class="flex flex-1 items-center gap-1">
                <div
                  v-if="isEditing(row._rowKey, 'closingDayOfWeek')"
                  class="w-[70px]"
                >
                  <Select
                    v-model:value="row.closingDayOfWeek"
                    style="width: 100%"
                    placeholder="星期"
                    :disabled="!!row.closingTime"
                    allow-clear
                    @blur="stopEditing(row._rowKey, 'closingDayOfWeek')"
                    @change="handleSwitchToWeekMode(row)"
                  >
                    <Select.Option :value="0">周日</Select.Option>
                    <Select.Option :value="1">周一</Select.Option>
                    <Select.Option :value="2">周二</Select.Option>
                    <Select.Option :value="3">周三</Select.Option>
                    <Select.Option :value="4">周四</Select.Option>
                    <Select.Option :value="5">周五</Select.Option>
                    <Select.Option :value="6">周六</Select.Option>
                  </Select>
                </div>
                <div
                  v-else
                  class="w-[70px] cursor-pointer rounded border border-dashed border-purple-300 bg-purple-50 px-2 py-1 text-center text-sm transition-all hover:border-purple-500 hover:bg-purple-100"
                  :class="{
                    'cursor-not-allowed opacity-50': !!row.closingTime,
                  }"
                  @click="
                    !row.closingTime &&
                    startEditing(row._rowKey, 'closingDayOfWeek')
                  "
                >
                  {{ formatWeekDay(row.closingDayOfWeek) }}
                </div>
                <div
                  v-if="isEditing(row._rowKey, 'closingDayTime')"
                  class="w-[90px]"
                >
                  <TimePicker
                    v-model:value="row.closingDayTime"
                    style="width: 100%"
                    placeholder="时间"
                    format="HH:mm"
                    value-format="HH:mm"
                    :disabled="
                      !row.closingDayOfWeek && row.closingDayOfWeek !== 0
                    "
                    allow-clear
                    @blur="stopEditing(row._rowKey, 'closingDayTime')"
                  />
                </div>
                <div
                  v-else
                  class="w-[90px] cursor-pointer rounded border border-dashed border-purple-300 bg-purple-50 px-2 py-1 text-center text-sm transition-all hover:border-purple-500 hover:bg-purple-100"
                  @click="startEditing(row._rowKey, 'closingDayTime')"
                >
                  {{ formatTime(row.closingDayTime) }}
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 有效起始日期 -->
        <template #validTimeStart="{ row }">
          <div v-if="isEditing(row._rowKey, 'validTimeStart')" class="w-full">
            <DatePicker
              v-model:value="row.validTimeStart"
              style="width: 100%"
              placeholder="选择日期"
              value-format="YYYY-MM-DD"
              @blur="stopEditing(row._rowKey, 'validTimeStart')"
            />
          </div>
          <div
            v-else
            class="min-w-[100px] cursor-pointer rounded border border-dashed border-purple-300 bg-purple-50 px-2 py-1 text-center text-sm transition-all hover:border-purple-500 hover:bg-purple-100"
            @click="startEditing(row._rowKey, 'validTimeStart')"
          >
            {{ formatDate(row.validTimeStart) }}
          </div>
        </template>

        <!-- 有效截止日期 -->
        <template #validTimeEnd="{ row }">
          <div v-if="isEditing(row._rowKey, 'validTimeEnd')" class="w-full">
            <DatePicker
              v-model:value="row.validTimeEnd"
              style="width: 100%"
              placeholder="选择日期"
              value-format="YYYY-MM-DD"
              @blur="stopEditing(row._rowKey, 'validTimeEnd')"
            />
          </div>
          <div
            v-else
            class="min-w-[100px] cursor-pointer rounded border border-dashed border-purple-300 bg-purple-50 px-2 py-1 text-center text-sm transition-all hover:border-purple-500 hover:bg-purple-100"
            @click="startEditing(row._rowKey, 'validTimeEnd')"
          >
            {{ formatDate(row.validTimeEnd) }}
          </div>
        </template>

        <!-- 备注 -->
        <template #remark="{ row }">
          <Input v-model:value="row.remark" placeholder="请输入" />
        </template>

        <!-- �箱型列头 -->
        <template #ctnHeader="{ column }">
          <span>{{ column.title }}</span>
        </template>

        <!-- 箱型成本 -->
        <template #ctnCost="{ row, column }">
          <InputNumber
            :value="getCtnCost(row, column.field.replace('ctn_', ''))"
            @change="
              (val: any) =>
                setCtnCost(
                  row,
                  column.field.replace('ctn_', ''),
                  typeof val === 'number' ? val : undefined,
                )
            "
            style="width: 100%"
            :min="0"
            :precision="2"
            placeholder="0.00"
          />
        </template>
      </Grid>

      <!-- 提示信息 -->
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

    <!-- 自定义行数弹窗 -->
    <AntModal
      v-model:open="customRowCountVisible"
      title="设置新增行数"
      @ok="handleConfirmCustomRowCount"
    >
      <div class="py-4">
        <label class="mb-2 block text-sm font-medium text-gray-700">
          请输入要新增的行数：
        </label>
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
  :deep(.vxe-table) {
    .vxe-body--column {
      padding: 4px;
    }

    input,
    .ant-select,
    .ant-input-number {
      width: 100%;
    }
  }
}
</style>
