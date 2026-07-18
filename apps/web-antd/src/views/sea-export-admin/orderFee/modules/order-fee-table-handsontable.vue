<script lang="ts" setup>
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import type { FeeCodeAdminApi } from '#/api/system/base-data/fee-code-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import dayjs from 'dayjs';
import {
  Button,
  Space,
  message,
  DropdownButton,
  MenuItem,
  Menu,
  Modal,
  Textarea,
  Card,
} from 'ant-design-vue';

import { IconifyIcon } from '@vben/icons';

import { $t } from '#/locales';

import { PrintJsonType, usePrintFormat } from '#/components/print-format';

import * as feeConstants from '../data';

// 从父组件导入必要的函数

import { getFeeCodePagedList } from '#/api/system/base-data/fee-code-admin';
import { getClientPagedList } from '#/api/sea-export/client-admin';
import {
  getIndustryCategoryOptions as getIndustryCategoryOptionsFromData,
  getCurrencyEnumOptions,
  useOrderFeeColumns,
  initOrderFeeEnumCache,
  getInvoiceStatusOptions,
  getFeeStatusOptions as getFeeStatusOptionsFromData,
  getDataEntryMethodOptions,
} from '../data';
import {
  changeIsUnfinishedAsync,
  getIsFinishedAsync,
} from '#/api/sea-export/fee-lock-admin';
import weiwanjie from '#/assets/img/base/weiwanjie.png';

// 导入拆分后的组件和 composables
import OrderFeeTableCore from './OrderFeeTableCore.vue';
import OrderFeeEditorModal from './order-fee-editor-modal.vue';
import OrderFeeAuditHistoryModal from './order-fee-audit-history-modal.vue';
import BatchImportFeeModal from './batch-import-fee-modal.vue';
import { useOrderFeeData } from './composables/useOrderFeeData';
import { useOrderFeeActions } from './composables/useOrderFeeActions';
import { useOrderFeeLinkage } from './composables/useOrderFeeLinkage';

const props = defineProps<{
  type: number; // 收付类型 0 应收 1 应付
  mode?: string; // changeOrder 更改单
  parentChangeOrderId?: string; //更改单Id
  recAmountMap?: Record<string, any>; // 应收金额汇总
  payAmountMap?: Record<string, any>; // 应付金额汇总
  orderDetail?: SeaExportAdminApi.SeaExportDto | null; // 父组件传入的订单详情
}>();

const emit = defineEmits([
  'sync-fee',
  'update-amount',
  'refresh-opposite-table',
]);

// ==================== 使用 Composables ====================

// 数据管理
const {
  dataSource,
  selectedRowKeys,
  orderBaseData,
  orderCtnList,
  changeOrderId,
  editId,
  getTableDate,
  syncFee,
  sanitizeOrderFee,
} = useOrderFeeData(props, emit as any);

// 操作逻辑
const actions = useOrderFeeActions(
  props,
  {
    dataSource,
    selectedRowKeys,
    editId,
    getTableDate,
    syncFee,
    sanitizeOrderFee,
  },
  emit as any,
);

// 字段联动逻辑
const linkage = useOrderFeeLinkage(props, {
  dataSource,
  editId,
  orderBaseData,
});

// ==================== 完结状态管理 ====================

// 完结状态管理
const isFinished = ref<boolean>(true); // true表示已完结，false表示未完结
const loadingFinishStatus = ref(false);

/**
 * 获取完结状态
 */
const loadFinishStatus = async () => {
  if (!editId.value) return;

  loadingFinishStatus.value = true;
  try {
    const finished = await getIsFinishedAsync(editId.value);
    isFinished.value = finished;
    console.log('📊 [完结状态] 当前状态:', finished ? '已完结' : '未完结');
  } catch (error) {
    console.error('❌ [完结状态] 获取失败:', error);
  } finally {
    loadingFinishStatus.value = false;
  }
};

/**
 * 切换完结/未完结状态
 */
const toggleFinishStatus = async () => {
  if (!editId.value) {
    message.warning('请先保存业务信息');
    return;
  }

  try {
    const result = await changeIsUnfinishedAsync(editId.value);

    // 切换成功后更新本地状态
    isFinished.value = !isFinished.value;

    message.success({
      content: isFinished.value ? '已设置为已完结' : '已设置为未完结',
      key: 'action_process_msg',
    });

    console.log(
      '✅ [完结状态] 切换成功，当前状态:',
      isFinished.value ? '已完结' : '未完结',
    );
  } catch (error) {
    console.error('❌ [完结状态] 切换失败:', error);
  }
};

// ✅ 已删除：本地 getIndustryCategoryOptions 函数定义，改用从 data.ts 导入的 getIndustryCategoryOptionsFromData

// ==================== 审核历史 ====================

const printing = ref(false);
const { openPrint } = usePrintFormat();

const handlePrint = async () => {
  if (printing.value) return;

  const selected = actions.getSelectedRows();
  if (!selected.length) {
    message.warning('请先勾选要打印的费用');
    return;
  }
  if (selected.some((row) => !actions.isSavedOrderFee(row))) {
    message.warning('请先保存费用后再打印');
    return;
  }

  printing.value = true;
  const hideLoading = message.loading('正在准备打印...', 0);
  try {
    const json = JSON.stringify(
      selected.map((row) => {
        const { _rowKey, ...fee } = row as OrderFeeAdminApi.OrderFeeDto & {
          _rowKey?: string;
        };
        return fee;
      }),
    );
    openPrint({
      printJsonType:
        props.type === 0
          ? PrintJsonType.RecOrderFeeList
          : PrintJsonType.PayOrderFeeList,
      json,
    });
  } catch {
    message.error('打印准备失败，请稍后重试');
  } finally {
    hideLoading();
    printing.value = false;
  }
};

// ==================== 下拉框数据源 ====================

const dropdownSources = ref({
  feeCodeList: [] as Array<{ label: string; value: any }>,
  industryCategoryList: [] as Array<{ label: string; value: any }>,
  currencyList: [] as Array<{ label: string; value: any }>,
  unitList: [] as Array<{ label: string; value: any }>, // 单位列表
});

// ✅ 当前选项缓存（用于结算对象等动态加载的字段）
const currentOptionsCache = ref<Array<{ label: string; value: any }>>([]);

const initDropdownSources = async () => {
  try {
    // ✅ 修正：使用从 data.ts 导入的完整行业类别选项
    const industryOptions = getIndustryCategoryOptionsFromData();
    console.log(
      '🔍 [initDropdownSources] 原始行业类别选项:',
      industryOptions.slice(0, 3),
    );

    // ✅ 修正：使用 key（数值ID）作为存储值，value（字母代码）用于联动
    dropdownSources.value.industryCategoryList = industryOptions.map((opt) => ({
      label: opt.label,
      value: opt.key, // ✅ 使用数值ID作为存储值
      categoryCode: opt.value, // ✅ 保留字母代码用于联动
    }));

    const currencyOptions = getCurrencyEnumOptions().filter(
      (opt) => opt.value !== 9999,
    );
    dropdownSources.value.currencyList = currencyOptions.map((opt) => ({
      label: opt.label,
      value: opt.value,
    }));

    console.log(
      '✅ [initDropdownSources] 行业类别数据:',
      dropdownSources.value.industryCategoryList.length,
      '条',
    );
    console.log(
      '✅ [initDropdownSources] 币种数据:',
      dropdownSources.value.currencyList.length,
      '条',
    );

    // ✅ 添加调试日志，显示行业类别的映射关系
    if (dropdownSources.value.industryCategoryList.length > 0) {
      console.log(
        '📋 [initDropdownSources] 行业类别完整列表:',
        dropdownSources.value.industryCategoryList,
      );
    }
  } catch (error) {
    console.error('❌ [initDropdownSources] 初始化失败:', error);
  }
};

/**
 * 更新单位列表（根据订单箱型动态更新）
 */
const updateUnitList = () => {
  // 从 orderCtnList 获取箱型列表
  const ctnUnits = orderCtnList.value.map((ctn) => ({
    label: ctn.ctnCodeName,
    value: ctn.ctnCodeName,
  }));

  // 添加固定单位选项
  const fixedUnits = [
    { label: '票', value: '票' },
    { label: 'TEU', value: 'TEU' },
    { label: '尺码', value: '尺码' },
    { label: '毛重', value: '毛重' },
    { label: '件数', value: '件数' },
  ];

  // 合并并去重
  const allUnits = [...fixedUnits, ...ctnUnits];
  const uniqueUnits = Array.from(
    new Map(allUnits.map((item) => [item.value, item])).values(),
  );

  dropdownSources.value.unitList = uniqueUnits;
  console.log('📏 [updateUnitList] 单位列表更新:', uniqueUnits.length, '条');
};

// ==================== 辅助函数 ====================

/**
 * 根据费用代码ID获取显示标签
 */
const getFeeCodeLabel = (feeCodeId: any): string => {
  if (!feeCodeId) return '';
  const item = feeCodeList.value.find(
    (f) => f.id === feeCodeId || String(f.id) === String(feeCodeId),
  );
  if (!item) return '';
  const surLabel = item.cnName || item.enName || '';
  return item.code ? `${item.code}-${surLabel}` : surLabel;
};

/**
 * 根据行业类别值获取显示标签
 */
const getIndustryCategoryLabel = (industryCategory: any): string => {
  if (!industryCategory) return '';
  const option = dropdownSources.value.industryCategoryList.find(
    (opt) => opt.value === industryCategory,
  );
  return option?.label || '';
};

/**
 * 根据币种ID获取显示标签
 */
const getCurrencyLabel = (currencyId: any): string => {
  if (!currencyId) return '';

  // 确保类型一致进行比较
  const currencyIdStr = String(currencyId);
  const option = dropdownSources.value.currencyList.find(
    (opt) => String(opt.value) === currencyIdStr,
  );

  console.log(
    '🔍 [getCurrencyLabel] 查找币别:',
    currencyId,
    '→',
    option?.label || '未找到',
  );
  return option?.label || '';
};

/**
 * 根据结算对象ID获取显示标签
 */
const getSettlementLabel = (settlementId: any): string => {
  if (!settlementId) return '';

  // 首先尝试从所有数据行中查找已缓存的客户信息
  for (const row of dataSource.value) {
    const rowAny = row as any;
    if (String(rowAny.settlementId) === String(settlementId)) {
      // 如果该行有缓存的客户名称，优先使用
      if (rowAny.__settlementName) {
        return rowAny.__settlementName;
      }
    }
  }

  // 如果没有缓存，返回 ID（fallback）
  return String(settlementId);
};

/**
 * 根据开票状态值获取显示标签
 */
const getInvoiceStatusLabel = (invoiceStatus: any): string => {
  if (invoiceStatus === undefined || invoiceStatus === null) return '';

  const option = getInvoiceStatusOptions().find(
    (opt) => opt.value === invoiceStatus,
  );
  return option?.label || String(invoiceStatus);
};

/**
 * 根据费用状态值获取显示标签
 */
const getFeeStatusLabel = (feeStatus: any): string => {
  if (feeStatus === undefined || feeStatus === null) return '';

  const option = getFeeStatusOptions().find((opt) => opt.value === feeStatus);
  return option?.label || String(feeStatus);
};

/**
 * 根据数据录入方式值获取显示标签
 */
const getDataEntryMethodLabel = (dataEntryMethod: any): string => {
  if (dataEntryMethod === undefined || dataEntryMethod === null) return '';

  const option = getDataEntryMethodOptions().find(
    (opt) => opt.value === dataEntryMethod,
  );
  return option?.label || String(dataEntryMethod);
};

/**
 * 格式化日期时间显示
 */
const formatDateTime = (dateValue: any): string => {
  if (!dateValue) return '';

  try {
    return dayjs(dateValue).format('YYYY-MM-DD HH:mm:ss');
  } catch (error) {
    console.warn('日期格式化失败:', error);
    return String(dateValue);
  }
};

/**
 * 从订单详情中提取结算对象名称（用于补充缺失的__settlementName）
 */
const extractSettlementNameFromOrder = (settlementId: any): string | null => {
  if (!settlementId || !orderBaseData.value) {
    console.log('⚠️ [extractSettlementNameFromOrder] 缺少必要参数', {
      settlementId,
      hasOrderBaseData: !!orderBaseData.value,
    });
    return null;
  }

  const settlementIdStr = String(settlementId);
  const orderDetail = orderBaseData.value;
  const transportOrder = orderDetail.transportOrder;

  console.log(
    '🔍 [extractSettlementNameFromOrder] 查找结算对象:',
    settlementIdStr,
  );

  // 委托单位（主要客户）
  if (
    transportOrder?.clientId &&
    String(transportOrder.clientId) === settlementIdStr
  ) {
    const name = transportOrder.clientName || null;
    console.log('✅ [extractSettlementNameFromOrder] 匹配委托单位:', name);
    return name;
  }

  // 发货人
  if (
    transportOrder?.shipperId &&
    String(transportOrder.shipperId) === settlementIdStr
  ) {
    try {
      const shipperContent = JSON.parse(transportOrder.shipperContent || '{}');
      const name = shipperContent.name || shipperContent.cnName || null;
      console.log('✅ [extractSettlementNameFromOrder] 匹配发货人:', name);
      return name;
    } catch (e) {
      console.warn('解析发货人信息失败:', e);
    }
  }

  // 收货人
  if (
    transportOrder?.consigneeId &&
    String(transportOrder.consigneeId) === settlementIdStr
  ) {
    try {
      const consigneeContent = JSON.parse(
        transportOrder.consigneeContent || '{}',
      );
      const name = consigneeContent.name || consigneeContent.cnName || null;
      console.log('✅ [extractSettlementNameFromOrder] 匹配收货人:', name);
      return name;
    } catch (e) {
      console.warn('解析收货人信息失败:', e);
    }
  }

  // 通知人
  if (
    transportOrder?.notifierId &&
    String(transportOrder.notifierId) === settlementIdStr
  ) {
    try {
      const notifierContent = JSON.parse(
        transportOrder.notifierContent || '{}',
      );
      const name = notifierContent.name || notifierContent.cnName || null;
      console.log('✅ [extractSettlementNameFromOrder] 匹配通知人:', name);
      return name;
    } catch (e) {
      console.warn('解析通知人信息失败:', e);
    }
  }

  // 第二通知人
  if (
    orderDetail.secondNotifierId &&
    String(orderDetail.secondNotifierId) === settlementIdStr
  ) {
    const name = orderDetail.secondNotifier?.name || null;
    console.log('✅ [extractSettlementNameFromOrder] 匹配第二通知人:', name);
    return name;
  }

  // 目的港代理
  if (
    orderDetail.podAgentId &&
    String(orderDetail.podAgentId) === settlementIdStr
  ) {
    const name = orderDetail.podAgent?.name || null;
    console.log('✅ [extractSettlementNameFromOrder] 匹配目的港代理:', name);
    return name;
  }

  // 订舱代理
  if (
    orderDetail.bookingAgentId &&
    String(orderDetail.bookingAgentId) === settlementIdStr
  ) {
    const name = orderDetail.bookingAgent?.name || null;
    console.log('✅ [extractSettlementNameFromOrder] 匹配订舱代理:', name);
    return name;
  }

  // 船代
  if (
    orderDetail.shipAgentId &&
    String(orderDetail.shipAgentId) === settlementIdStr
  ) {
    const name = orderDetail.shipAgent?.name || null;
    console.log('✅ [extractSettlementNameFromOrder] 匹配船代:', name);
    return name;
  }

  // 场站
  if (orderDetail.yardId && String(orderDetail.yardId) === settlementIdStr) {
    const name = orderDetail.yard?.name || null;
    console.log('✅ [extractSettlementNameFromOrder] 匹配场站:', name);
    return name;
  }

  // 车队
  if (
    transportOrder?.teamId &&
    String(transportOrder.teamId) === settlementIdStr
  ) {
    const name = transportOrder.teamName || null;
    console.log('✅ [extractSettlementNameFromOrder] 匹配车队:', name);
    return name;
  }

  // 报关行
  if (
    transportOrder?.custBrokerId &&
    String(transportOrder.custBrokerId) === settlementIdStr
  ) {
    const name = transportOrder.custBrokerName || null;
    console.log('✅ [extractSettlementNameFromOrder] 匹配报关行:', name);
    return name;
  }

  // 仓库
  if (
    transportOrder?.warehouseId &&
    String(transportOrder.warehouseId) === settlementIdStr
  ) {
    const name = transportOrder.warehouseName || null;
    console.log('✅ [extractSettlementNameFromOrder] 匹配仓库:', name);
    return name;
  }

  // 保险公司
  if (
    transportOrder?.insuranceId &&
    String(transportOrder.insuranceId) === settlementIdStr
  ) {
    const name = transportOrder.insuranceName || null;
    console.log('✅ [extractSettlementNameFromOrder] 匹配保险公司:', name);
    return name;
  }

  console.warn(
    '❌ [extractSettlementNameFromOrder] 未找到匹配的结算对象:',
    settlementIdStr,
  );
  return null;
};

// ==================== 排序功能 ====================

/**
 * 排序状态管理
 */
const sortState = ref<{
  field: string | null;
  order: 'asc' | 'desc' | null;
}>({
  field: null,
  order: null,
});

/**
 * 获取排序图标
 */
const getSortIcon = (field: string) => {
  if (sortState.value.field !== field) {
    return '▼'; // 未排序状态
  }

  if (sortState.value.order === 'asc') {
    return '▲'; // 升序
  }

  if (sortState.value.order === 'desc') {
    return '▼'; // 降序
  }

  return '▼'; // 默认
};

/**
 * 可排序字段列表（计算属性）
 */
const sortableFieldsSet = computed(
  () =>
    new Set([
      'invoiceStatus',
      'combinedFeeStatus',
      'feeCodeId',
      'industryCategory',
      'settlementId',
      'currencyId',
      'exchangeRate',
      'unitPrice',
      'amount',
      'unit',
      'quantity',
      'taxRate',
      'noTaxUnitPrice',
      'noTaxAmount',
      'rqstPaymentAmount',
      'invoicedAmount',
      'orderInvoiceAmount',
      'settledAmount',
      'invoiceBlocked',
      'isConfidential',
      'remark',
      'dataEntryMethod',
      'creatorUserName',
      'creationTime',
    ]),
);

/**
 * 处理列头点击排序
 */
const handleColumnSort = (field: string) => {
  if (!field) return;

  let newOrder: 'asc' | 'desc' | null = 'asc';

  // 如果当前列已经在排序，则切换顺序
  if (sortState.value.field === field) {
    if (sortState.value.order === 'asc') {
      newOrder = 'desc';
    } else if (sortState.value.order === 'desc') {
      // 第三次点击取消排序
      newOrder = null;
    }
  }

  sortState.value = {
    field: newOrder ? field : null,
    order: newOrder,
  };

  // 执行排序
  if (newOrder && field) {
    sortDataSource(field, newOrder);
  } else {
    // 取消排序，恢复原始顺序
    getTableDate();
  }
};

/**
 * 对数据源进行排序
 */
const sortDataSource = (field: string, order: 'asc' | 'desc') => {
  if (!dataSource.value || dataSource.value.length === 0) return;

  const sorted = [...dataSource.value].sort((a: any, b: any) => {
    let aValue = a[field];
    let bValue = b[field];

    // 处理嵌套字段（如 task.creatorUserName）
    if (field.includes('.')) {
      const keys = field.split('.');
      aValue = keys.reduce((obj: any, key: string) => obj?.[key], a);
      bValue = keys.reduce((obj: any, key: string) => obj?.[key], b);
    }

    // 处理空值
    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    // 数字类型排序
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return order === 'asc' ? aValue - bValue : bValue - aValue;
    }

    // 字符串类型排序
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();

    if (aStr < bStr) return order === 'asc' ? -1 : 1;
    if (aStr > bStr) return order === 'asc' ? 1 : -1;
    return 0;
  });

  dataSource.value = sorted;

  console.log('📊 [排序] 字段:', field, '顺序:', order, '行数:', sorted.length);
};

/**
 * 转换vxe-table列配置为handsontable列配置
 */
const hotColumns = computed(() => {
  const vxeColumns = useOrderFeeColumns(props.type);

  if (!vxeColumns || !Array.isArray(vxeColumns)) {
    return [];
  }

  // ✅ 新增:在第一列添加复选框列
  const checkboxColumn: any = {
    data: '_isSelected', // 使用虚拟字段存储选中状态
    title: '', // 表头由 afterGetColHeader 处理
    width: 50,
    type: 'text', // ✅ 修复：改为 text 类型，避免 Handsontable 默认 checkbox 行为
    className: 'htCenter htMiddle', // 居中对齐
    readOnly: true, // ✅ 设置为只读，防止 Handsontable 编辑
    // ✅ 自定义渲染器:在数据行显示复选框
    renderer: function (
      this: any,
      instance: any,
      td: HTMLTableCellElement,
      row: number,
      col: number,
      prop: string,
      value: any,
      cellProperties: any,
    ) {
      // 根据 selectedRowKeys 判断当前行是否应该被选中
      const rowData = dataSource.value[row];
      const rowKey = (rowData as any)?._rowKey;
      const isSelected = rowKey && selectedRowKeys.value.includes(rowKey);

      console.log(
        '🔵 [checkbox renderer] 行:',
        row,
        'rowKey:',
        rowKey,
        'isSelected:',
        isSelected,
      );

      // ✅ 手动创建复选框 DOM
      td.innerHTML = '';
      td.style.textAlign = 'center';
      td.style.verticalAlign = 'middle';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !!isSelected;
      checkbox.style.width = '16px';
      checkbox.style.height = '16px';
      checkbox.style.cursor = 'pointer';
      checkbox.style.pointerEvents = 'none'; // ✅ 阻止复选框自身响应点击，由单元格事件处理

      td.appendChild(checkbox);

      return td;
    },
  };

  // ✅ 新增:在第二列添加序号+开票状态合并列
  const indexColumn: any = {
    data: null, // 不绑定到数据字段
    title: '开票状态',
    width: 120,
    type: 'text',
    className: 'htCenter htMiddle', // 居中对齐
    readOnly: true, // 设置为只读
    // ✅ 自定义渲染器:显示行号 + 开票状态（带颜色和加粗）
    renderer: function (
      this: any,
      instance: any,
      td: HTMLTableCellElement,
      row: number,
      col: number,
      prop: string,
      value: any,
      cellProperties: any,
    ) {
      const rowData = dataSource.value[row];
      const invoiceStatus = (rowData as any)?.invoiceStatus;

      // 获取开票状态标签
      const statusLabel = getInvoiceStatusLabel(invoiceStatus);

      // 根据开票状态确定颜色
      let statusColor = '#262626'; // 默认颜色（未开票）
      if (invoiceStatus === 1) {
        statusColor = '#faad14'; // 黄色 - 部分开票
      } else if (invoiceStatus === 2) {
        statusColor = '#52c41a'; // 绿色 - 已开票
      }

      // 构建HTML：序号在左，开票状态在右（加粗+颜色）
      td.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
          <span style="color: #262626; font-size: 13px;">${row + 1}</span>
          <span style="color: ${statusColor}; font-weight: bold; font-size: 12px;">${statusLabel || ''}</span>
        </div>`;
      return td;
    },
  };

  // 定义可排序的字段列表（参考 order-fee-table.vue）
  const sortableFields = new Set([
    'invoiceStatus',
    'combinedFeeStatus',
    'feeCodeId',
    'industryCategory',
    'settlementId',
    'currencyId',
    'exchangeRate',
    'unitPrice',
    'amount',
    'unit',
    'quantity',
    'taxRate',
    'noTaxUnitPrice',
    'noTaxAmount',
    'rqstPaymentAmount',
    'invoicedAmount',
    'orderInvoiceAmount',
    'settledAmount',
    'invoiceBlocked',
    'isConfidential',
    'remark',
    'dataEntryMethod',
    'creatorUserName',
    'creationTime',
  ]);

  // ✅ 将复选框列和序号列添加到最前面
  const columns = [checkboxColumn, indexColumn];

  // 映射原有列（跳过 invoiceStatus，因为它已合并到序号列）
  const mappedColumns = vxeColumns
    .filter((col) => col.field !== 'invoiceStatus') // ✅ 过滤掉开票状态列
    .map((col) => {
      const hotCol: any = {
        data: col.field,
        title: col.title,
        width: col.width || col.minWidth || 100,
      };

      // 添加排序图标到标题（如果该字段可排序）
      if (col.field && sortableFields.has(col.field)) {
        const sortIcon = getSortIcon(col.field);
        hotCol.title = `${col.title} ${sortIcon}`;
      }

      if (col.field === 'feeCodeId') {
        hotCol.type = 'dropdown';
        // ✅ 使用label作为source，这样下拉框会显示中文名称
        hotCol.source = dropdownSources.value.feeCodeList.map(
          (item) => item.label,
        );
        hotCol.strict = true;
        hotCol.allowInvalid = false;
        // ✅ 添加visibleRows配置，确保下拉框可见
        hotCol.visibleRows = 10;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          const label = getFeeCodeLabel(value);
          td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '请选择'}</span>`;
          return td;
        };
        // ✅ 添加editor配置，确保可以编辑
        hotCol.editor = 'dropdown';
      } else if (col.field === 'industryCategory') {
        hotCol.type = 'dropdown';
        hotCol.source = dropdownSources.value.industryCategoryList.map(
          (item) => item.label,
        );
        hotCol.strict = true;
        hotCol.allowInvalid = false;
        hotCol.visibleRows = 10;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          const label = getIndustryCategoryLabel(value);
          td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '请选择'}</span>`;
          return td;
        };
        hotCol.editor = 'dropdown';
      } else if (col.field === 'settlementId') {
        hotCol.type = 'dropdown';
        // settlementId的source会在双击时动态设置为label数组
        hotCol.source = [];
        hotCol.strict = true;
        hotCol.allowInvalid = false;
        hotCol.visibleRows = 10;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          // ✅ 直接从当前行数据源中获取 __settlementName
          const rowData = dataSource.value[row];
          const settlementName =
            (rowData as any)?.settlementName ||
            (rowData as any)?.__settlementName;

          let label = '';
          if (settlementName) {
            label = settlementName;
            console.log(
              '🎨 [settlementId renderer] 行',
              row,
              '显示名称:',
              label,
            );
          } else if (value) {
            // fallback：如果没有缓存，显示 ID
            label = String(value);
            console.warn(
              '⚠️ [settlementId renderer] 行',
              row,
              '无__settlementName，显示ID:',
              label,
            );
          }

          td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '请选择'}</span>`;
          return td;
        };
        hotCol.editor = 'dropdown';
      } else if (col.field === 'currencyId') {
        hotCol.type = 'dropdown';
        hotCol.source = dropdownSources.value.currencyList.map(
          (item) => item.label,
        );
        hotCol.strict = true;
        hotCol.allowInvalid = false;
        hotCol.visibleRows = 10;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          const label = getCurrencyLabel(value);
          console.log(
            '🎨 [currencyId renderer] 行',
            row,
            '币别ID:',
            value,
            '→ 显示:',
            label || '请选择',
          );
          td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer;">${label || '请选择'}</span>`;
          return td;
        };
        hotCol.editor = 'dropdown';
      } else if (col.field === 'unit') {
        hotCol.type = 'dropdown';
        // unit的source会在双击时动态设置为label数组
        hotCol.source = [];
        hotCol.strict = true;
        hotCol.allowInvalid = false;
        hotCol.visibleRows = 10;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          td.innerHTML = `<span style="color: ${value ? '#262626' : '#999'}; cursor: pointer;">${value || '请选择'}</span>`;
          return td;
        };
        hotCol.editor = 'dropdown';
      } else if (
        col.field === 'combinedFeeStatus' ||
        col.field === 'feeStatus'
      ) {
        // 费用状态 - 显示中文标签(只读),支持修改次数显示和双击事件
        hotCol.type = 'text';
        hotCol.readOnly = true; // ✅ 设置为只读,不允许修改
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          const rowData = dataSource.value[row] as any;
          const label = getFeeStatusLabel(value);

          // 兼容多种大小写的 ModificationCount 字段名
          const modificationCount =
            rowData?.ModificationCount ??
            rowData?.modificationCount ??
            rowData?.MODIFICATIONCOUNT ??
            0;

          // 如果有修改次数,显示 "状态 +N" 格式
          if (modificationCount && modificationCount > 0) {
            td.innerHTML = '';
            td.style.display = 'inline-flex';
            td.style.alignItems = 'center';
            td.style.cursor = 'pointer';
            td.title = `双击查看审核历史(共 ${modificationCount} 次修改)`;

            // 创建状态标签容器
            const statusSpan = document.createElement('span');
            statusSpan.textContent = label || '';
            statusSpan.style.color = '#262626';
            statusSpan.style.marginRight = '0';
            td.appendChild(statusSpan);

            // 创建 +N 标记
            const countSpan = document.createElement('span');
            countSpan.textContent = `+${modificationCount}`;
            countSpan.style.color = '#ff4d4f'; // 红色
            countSpan.style.fontWeight = 'bold'; // 加粗
            countSpan.style.marginLeft = '4px';
            countSpan.style.cursor = 'pointer';
            countSpan.title = `点击查看 ${modificationCount} 次修改记录`;
            td.appendChild(countSpan);
          } else {
            // 否则只显示状态标签
            td.innerHTML = `<span style="color: #262626; cursor: pointer;" title="双击查看审核历史">${label || ''}</span>`;
          }

          return td;
        };
      } else if (
        col.field === 'creationTime' ||
        col.field === 'task.auditTime'
      ) {
        // 录入时间和审核时间 - 格式化日期显示（只读）
        hotCol.type = 'text';
        hotCol.readOnly = true; // ✅ 设置为只读，不允许修改
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          const formattedDate = formatDateTime(value);
          td.innerHTML = `<span style="color: #262626;">${formattedDate}</span>`;
          return td;
        };
      } else if (col.field === 'dataEntryMethod') {
        // 数据录入方式 - 显示中文标签（只读）
        hotCol.type = 'text';
        hotCol.readOnly = true; // ✅ 设置为只读，不允许修改
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          const label = getDataEntryMethodLabel(value);
          td.innerHTML = `<span style="color: #262626;">${label || ''}</span>`;
          return td;
        };
      } else if (
        ['exchangeRate', 'unitPrice', 'amount', 'quantity', 'taxRate'].includes(
          col.field || '',
        )
      ) {
        hotCol.type = 'numeric';
        hotCol.numericFormat = {
          pattern: '0.00',
          culture: 'en-US',
        };
      } else if (
        col.field === 'invoiceBlocked' ||
        col.field === 'isConfidential'
      ) {
        hotCol.type = 'checkbox';
      } else if (
        [
          'noTaxUnitPrice',
          'noTaxAmount',
          'rqstPaymentAmount',
          'invoicedAmount',
          'orderInvoiceAmount',
          'settledAmount',
        ].includes(col.field || '')
      ) {
        // ✅ 不含税单价、不含税金额、申请付款金额、已开票金额、开票申请金额、已结算金额 - 设置为只读
        hotCol.type = 'numeric';
        hotCol.readOnly = true; // ✅ 设置为只读，不允许修改
        hotCol.numericFormat = {
          pattern: '0.00',
          culture: 'en-US',
        };
      } else if (col.field === 'creatorUserName') {
        // ✅ 录入人 - 设置为只读
        hotCol.type = 'text';
        hotCol.readOnly = true; // ✅ 设置为只读，不允许修改
      } else {
        hotCol.type = 'text';
      }

      return hotCol;
    });

  return columns.concat(mappedColumns);
});

// ==================== Handsontable 设置 ====================

const hotSettings = computed(() => ({
  data: dataSource.value,
  columns: hotColumns.value,
  rowHeaders: false, // ✅ 隐藏默认行头,使用自定义复选框列
  colHeaders: true,
  height: 520, // ✅ 修复:减小高度以留出滚动条空间(原600)
  licenseKey: 'non-commercial-and-evaluation',
  contextMenu: true,
  manualColumnResize: true,
  manualRowMove: false,
  stretchH: 'all',
  autoWrapRow: true,
  autoWrapCol: true,
  // ✅ 新增：行渲染器 - 根据费用状态设置行背景色
  // ✅ 新增：在渲染后设置行背景色 - 根据费用状态
  afterRenderer: function (
    this: any,
    td: HTMLTableCellElement,
    row: number,
    col: number,
    prop: string,
    value: any,
    cellProperties: any,
  ) {
    const rowData = dataSource.value[row];

    if (rowData) {
      // ✅ 关键修复：检查单元格是否处于编辑模式
      // 如果正在编辑，跳过自定义渲染，避免原文本和输入框同时显示
      // if (cellProperties?.instance?.getCellEditor(row, col)?.isOpened()) {
      //   console.log('✏️ [afterRenderer] 单元格正在编辑，跳过自定义渲染');
      //   return;
      // }

      // 获取费用状态（优先使用 combinedFeeStatus，其次使用 feeStatus）
      const feeStatus =
        (rowData as any).combinedFeeStatus ?? (rowData as any).feeStatus;

      if (feeStatus !== undefined && feeStatus !== null) {
        // 根据费用状态设置背景色
        const statusOptions = getFeeStatusOptions();
        const statusOption = statusOptions.find(
          (opt) => opt.value === feeStatus,
        );

        if (statusOption?.color) {
          // ✅ 使用 !important 确保背景色不被内联样式覆盖
          td.style.setProperty(
            'background-color',
            statusOption.color + '30',
            'important',
          );
        }
      }
    }
  },
  // ✅ 添加 afterGetColHeader 事件来处理全选复选框
  afterGetColHeader: (col: number, TH: HTMLTableCellElement) => {
    console.log('🔵 [afterGetColHeader] col:', col, 'TH:', TH);

    // 只在第一列（复选框列）的表头添加全选功能
    if (col === 0) {
      // 先清空表头内容
      TH.innerHTML = '';

      // 创建复选框容器
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.height = '100%';

      // 创建全选复选框
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'select-all-checkbox';
      checkbox.style.width = '16px';
      checkbox.style.height = '16px';
      checkbox.style.cursor = 'pointer';

      // 设置初始状态
      const allSelected =
        selectedRowKeys.value.length > 0 &&
        selectedRowKeys.value.length === dataSource.value.length;
      checkbox.checked = allSelected;

      container.appendChild(checkbox);
      TH.appendChild(container);

      console.log('✅ [afterGetColHeader] 已添加全选复选框');

      // 添加点击事件
      checkbox.onclick = (e) => {
        e.stopPropagation();
        const isChecked = checkbox.checked;

        if (isChecked) {
          // 全选
          selectedRowKeys.value = dataSource.value.map(
            (row: any) => row._rowKey,
          );
        } else {
          // 取消全选
          selectedRowKeys.value = [];
        }

        console.log('✅ [全选] 当前选中:', selectedRowKeys.value.length, '行');

        // 刷新表格以更新所有行的复选框状态
        nextTick(() => {
          if (coreTableRef.value?.hotTableRef?.hotInstance) {
            coreTableRef.value.hotTableRef.hotInstance.render();
          }
        });
      };
    }
  },
  afterSelection: (
    row: number,
    column: number,
    row2: number,
    column2: number,
  ) => {
    // ✅ 修复：移除 afterSelection 中的选中逻辑，避免与复选框冲突
    // 不再在这里更新 selectedRowKeys，只通过复选框来控制选中状态
    console.log('ℹ️ [afterSelection] 跳过选中逻辑，仅由复选框控制');
  },
  // 修改afterOnCellMouseDown事件处理
  afterOnCellMouseDown: (
    event: MouseEvent,
    coords: any,
    td: HTMLTableCellElement,
  ) => {
    const columnIndex = coords.col;
    const rowIndex = coords.row;

    console.log('🔵 [afterOnCellMouseDown] 点击事件', {
      rowIndex,
      columnIndex,
      detail: event.detail, // ✅ 用于判断单击还是双击
    });

    // ✅ 处理双击事件 - 当双击费用状态列时打开审核历史弹窗
    if (event.detail === 2 && rowIndex >= 0 && columnIndex >= 0) {
      console.log('🖱️ [afterOnCellMouseDown] 检测到双击事件');

      const columnConfig = hotColumns.value[columnIndex];
      if (!columnConfig) {
        console.warn('⚠️ [afterOnCellMouseDown] 未找到列配置');
        return;
      }

      const field = columnConfig.data;
      console.log('🔵 [afterOnCellMouseDown] 双击字段:', field);

      // 检查是否是费用状态列
      if (field === 'combinedFeeStatus' || field === 'feeStatus') {
        console.log(
          '✅ [afterOnCellMouseDown] 双击费用状态列，准备打开审核历史弹窗',
        );

        // 获取当前行数据
        const rowData = dataSource.value[rowIndex];
        if (!rowData) {
          console.warn('⚠️ [afterOnCellMouseDown] 行数据为空');
          return;
        }

        console.log('📋 [afterOnCellMouseDown] 行数据:', {
          id: rowData.id,
          feeStatus: rowData.feeStatus,
          combinedFeeStatus: rowData.combinedFeeStatus,
          ModificationCount: rowData.ModificationCount,
        });

        // 打开审核历史弹窗
        openAuditHistoryModal(rowData as OrderFeeAdminApi.OrderFeeDto);
        return; // ✅ 双击事件处理完毕，不再执行后续逻辑
      } else if (
        [
          'feeCodeId',
          'industryCategory',
          'settlementId',
          'currencyId',
          'unit',
        ].includes(field)
      ) {
        // ✅ 对于下拉框字段，双击时触发Handsontable原生下拉框
        console.log('✅ [afterOnCellMouseDown] 双击下拉框字段:', field);

        // ✅ 关键修复：立即清空单元格原文本，防止与编辑控件同时显示
        td.innerHTML = '';
        console.log('✏️ [afterOnCellMouseDown] 已清空单元格原文本');

        // 阻止默认行为，防止进入编辑模式
        event.preventDefault();
        event.stopPropagation();

        // ✅ 修正：使用 coreTableRef 获取 hotInstance
        const hotInstance = coreTableRef.value?.hotTableRef?.hotInstance;
        if (!hotInstance) {
          console.warn('⚠️ [afterOnCellMouseDown] hotInstance 不存在');
          console.log(
            '🔍 [afterOnCellMouseDown] coreTableRef:',
            coreTableRef.value,
          );
          console.log(
            '🔍 [afterOnCellMouseDown] hotTableRef:',
            coreTableRef.value?.hotTableRef,
          );
          return;
        }

        console.log('✅ [afterOnCellMouseDown] hotInstance 已获取');
        const colIndex = getColumnIndex(field);

        // ✅ 先设置正确的source选项（使用label作为显示值）
        if (field === 'feeCodeId') {
          const source = dropdownSources.value.feeCodeList.map(
            (item) => item.label,
          );
          console.log(
            '📝 [feeCodeId] 准备设置source:',
            source.length,
            '个选项',
          );
          hotInstance.setCellMeta(rowIndex, colIndex, 'source', source);
          console.log(
            '✅ [afterOnCellMouseDown] 设置费用名称source:',
            source.length,
            '个选项',
          );
        } else if (field === 'industryCategory') {
          const source = dropdownSources.value.industryCategoryList.map(
            (item) => item.label,
          );
          console.log(
            '📝 [industryCategory] 准备设置source:',
            source.length,
            '个选项',
          );
          hotInstance.setCellMeta(rowIndex, colIndex, 'source', source);
          console.log(
            '✅ [afterOnCellMouseDown] 设置行业类别source:',
            source.length,
            '个选项',
          );
        } else if (field === 'currencyId') {
          const source = dropdownSources.value.currencyList.map(
            (item) => item.label,
          );
          console.log(
            '📝 [currencyId] 准备设置source:',
            source.length,
            '个选项',
          );
          hotInstance.setCellMeta(rowIndex, colIndex, 'source', source);
          console.log(
            '✅ [afterOnCellMouseDown] 设置币别source:',
            source.length,
            '个选项',
          );
        } else if (field === 'settlementId') {
          // 结算对象需要根据行业类别动态加载
          const currentRow = dataSource.value[rowIndex];
          let industryCategoryValue = currentRow?.industryCategory;

          // ✅ 确保industryCategoryValue是字符串类型（字母代码）
          if (
            !industryCategoryValue ||
            typeof industryCategoryValue !== 'string'
          ) {
            message.warning('请先选择行业类别');
            return;
          }

          console.log(
            '🔄 [settlementId] 开始加载客户列表，行业类别:',
            industryCategoryValue,
          );

          // 根据行业类别加载客户列表（使用缓存）
          loadClientList(industryCategoryValue)
            .then((options: any[]) => {
              console.log(
                '✅ [settlementId] 客户列表加载完成:',
                options.length,
                '个选项',
              );

              // ✅ 修正：重新获取 hotInstance
              const hotInstance = coreTableRef.value?.hotTableRef?.hotInstance;
              if (!hotInstance) {
                console.warn('⚠️ [settlementId] hotInstance 已失效');
                return;
              }

              console.log('✅ [settlementId] hotInstance 重新获取成功');

              // ✅ 缓存当前选项列表，用于后续label到value的转换
              currentOptionsCache.value = options;

              // ✅ 使用label作为source，这样下拉框会显示中文名称
              const source = options.map((opt: any) => opt.label);

              console.log(
                '📝 [settlementId] 设置source:',
                source.slice(0, 3),
                '...',
              );

              // ✅ 先更新单元格的meta信息
              hotInstance.setCellMeta(rowIndex, colIndex, 'source', source);
              hotInstance.setCellMeta(rowIndex, colIndex, 'type', 'dropdown');
              hotInstance.setCellMeta(rowIndex, colIndex, 'editor', 'dropdown');

              // ✅ 强制刷新单元格以确保meta生效
              hotInstance.render();

              console.log('🎯 [settlementId] 准备打开下拉框');

              // ✅ 加载完成后，触发下拉框显示
              setTimeout(() => {
                try {
                  // 选中单元格
                  hotInstance.selectCell(rowIndex, colIndex);
                  hotInstance.listen();

                  console.log('🔍 [settlementId] 获取编辑器...');

                  // 获取编辑器并打开
                  const editor = hotInstance.getCellEditor(rowIndex, colIndex);

                  if (editor) {
                    console.log('✅ [settlementId] 编辑器类型:', typeof editor);
                    console.log(
                      '✅ [settlementId] 编辑器方法:',
                      Object.keys(editor),
                    );

                    if (typeof editor.open === 'function') {
                      console.log('🚀 [settlementId] 调用 editor.open()');
                      editor.open();
                      console.log('✅ [settlementId] 下拉框已打开');
                    } else {
                      console.warn('⚠️ [settlementId] editor.open 不是函数');
                      // 尝试其他方法
                      if (typeof editor.prepare === 'function') {
                        editor.prepare();
                      }
                      if (typeof editor.setValue === 'function') {
                        // 尝试触发显示
                        const cell = hotInstance.getCell(rowIndex, colIndex);
                        if (cell) {
                          cell.click();
                        }
                      }
                    }
                  } else {
                    console.error(
                      '❌ [settlementId] 编辑器为 null 或 undefined',
                    );
                  }
                } catch (error) {
                  console.error('❌ [settlementId] 打开下拉框失败:', error);
                }
              }, 150);
            })
            .catch((error: any) => {
              console.error(
                '❌ [afterOnCellMouseDown] 加载客户列表失败:',
                error,
              );
              message.error('加载客户列表失败');
            });

          return; // 异步加载，提前返回
        } else if (field === 'unit') {
          // 单位需要从dropdownSources获取
          const source =
            dropdownSources.value.unitList?.map((item: any) => item.label) ||
            [];
          console.log('📝 [unit] 准备设置source:', source.length, '个选项');
          hotInstance.setCellMeta(rowIndex, colIndex, 'source', source);
          console.log(
            '✅ [afterOnCellMouseDown] 设置单位source:',
            source.length,
            '个选项',
          );
        }

        // ✅ 触发Handsontable原生下拉框显示
        console.log('🎯 [afterOnCellMouseDown] 准备打开下拉框，字段:', field);
        setTimeout(() => {
          try {
            hotInstance.listen();
            hotInstance.selectCell(rowIndex, colIndex);

            console.log('🔍 [afterOnCellMouseDown] 获取编辑器...');

            // 使用Handsontable的内置方法触发下拉框
            const editor = hotInstance.getCellEditor(rowIndex, colIndex);
            if (editor && typeof editor.open === 'function') {
              console.log(
                '✅ [afterOnCellMouseDown] 编辑器已获取，调用 open()',
              );
              editor.open();
              console.log('✅ [afterOnCellMouseDown] 下拉框已打开');
            } else {
              console.warn(
                '⚠️ [afterOnCellMouseDown] 编辑器不可用或没有open方法',
              );
              console.log(
                '🔍 [afterOnCellMouseDown] 编辑器类型:',
                typeof editor,
              );
              if (editor) {
                console.log(
                  '🔍 [afterOnCellMouseDown] 编辑器方法:',
                  Object.keys(editor),
                );
              }
            }
          } catch (error) {
            console.error('❌ [afterOnCellMouseDown] 打开下拉框失败:', error);
          }
        }, 50);

        return; // ✅ 下拉框字段处理完毕，不再执行后续逻辑
      } else if (
        [
          'exchangeRate',
          'unitPrice',
          'amount',
          'quantity',
          'taxRate',
          'remark',
        ].includes(field)
      ) {
        td.innerHTML = '';
        console.log('✏️ [afterOnCellMouseDown] 已清空单元格原文本');
      }
    }

    // ✅ 处理复选框列的点击（第一列，索引0）
    if (columnIndex === 0 && rowIndex >= 0) {
      console.log('✅ [afterOnCellMouseDown] 点击复选框列');

      // ✅ 阻止事件冒泡和默认行为，防止 Handsontable 的默认选中逻辑
      event.stopPropagation();
      event.preventDefault();

      const rowData = dataSource.value[rowIndex];
      const rowKey = (rowData as any)?._rowKey;

      if (!rowKey) {
        console.warn('⚠️ [afterOnCellMouseDown] 行数据缺少 _rowKey');
        return;
      }

      // ✅ 根据当前选中状态切换
      const isCurrentlySelected = selectedRowKeys.value.includes(rowKey);

      if (isCurrentlySelected) {
        // 从选中列表移除
        const index = selectedRowKeys.value.indexOf(rowKey);
        if (index > -1) {
          selectedRowKeys.value.splice(index, 1);
        }
        console.log(
          '✅ [复选框] 取消选中，当前选中:',
          selectedRowKeys.value.length,
          '行',
        );
      } else {
        // 添加到选中列表
        selectedRowKeys.value.push(rowKey);
        console.log(
          '✅ [复选框] 选中，当前选中:',
          selectedRowKeys.value.length,
          '行',
        );
      }

      // ✅ 刷新表格以更新复选框状态
      nextTick(() => {
        if (coreTableRef.value?.hotTableRef?.hotInstance) {
          coreTableRef.value.hotTableRef.hotInstance.render();
        }
      });

      return;
    }

    // ✅ 跳过序号列（第二列，索引1），不触发任何操作
    if (columnIndex === 1) {
      console.log('ℹ️ [afterOnCellMouseDown] 点击序号列，跳过');
      return;
    }

    // 处理表头点击（排序）
    if (rowIndex === -1 && columnIndex >= 0) {
      console.log('✅ [afterOnCellMouseDown] 检测到表头点击');

      const columnConfig = hotColumns.value[columnIndex];
      if (!columnConfig || !columnConfig.data) {
        console.warn('⚠️ [afterOnCellMouseDown] 未找到列配置');
        return;
      }

      const field = columnConfig.data;
      console.log('✅ [afterOnCellMouseDown] 字段:', field);

      // 检查该字段是否可排序
      if (!sortableFieldsSet.value.has(field)) {
        console.log('⚠️ [afterOnCellMouseDown] 字段不可排序:', field);
        return;
      }

      console.log('🎯 [afterOnCellMouseDown] 触发排序');

      // 阻止默认行为
      event.preventDefault();
      event.stopPropagation();

      // 触发排序
      handleColumnSort(field);
      return;
    }

    // 处理数据行点击（跳过行头）
    if (rowIndex < 0 || columnIndex < 0) {
      console.log('⚠️ [afterOnCellMouseDown] 跳过非数据单元格');
      return;
    }

    const columnConfig = hotColumns.value[columnIndex];
    if (!columnConfig) return;

    const field = columnConfig.data;
    console.log('🔵 [afterOnCellMouseDown] 单元格点击', {
      field,
      rowIndex,
      columnIndex,
    });

    // 现在单击只执行选中单元格操作，不再触发下拉框
    // 原有的下拉框逻辑已移到双击事件中
  },
  // ✅ 关键修复：添加 afterChange 钩子来触发字段联动逻辑
  afterChange: (changes: any, source: string) => {
    console.log('🔄 [afterChange] 数据变化，source:', source);

    // ✅ 跳过内部操作触发的变化（包括label到value的转换）
    if (
      source === 'loadData' ||
      source === 'updateData' ||
      source === 'labelToValueConversion'
    ) {
      console.log('ℹ️ [afterChange] 跳过', source, '触发的变化');
      return;
    }

    // ✅ 处理下拉框选择后的值转换（将label转换为value）
    let processedChanges = changes; // 默认使用原始changes

    if (changes && Array.isArray(changes)) {
      const hotInstance = coreTableRef.value?.hotTableRef?.hotInstance;
      if (!hotInstance) {
        console.warn('⚠️ [afterChange] hotInstance 不存在');
        return;
      }

      // ✅ 创建一个新的changes数组，将label转换为value
      const convertedChanges = changes.map((change: any) => {
        const [row, prop, oldValue, newValue] = change;

        console.log('📝 [afterChange] 检测到变化:', {
          row,
          prop,
          oldValue,
          newValue,
        });

        // 只处理我们关心的下拉框字段
        if (
          ['feeCodeId', 'industryCategory', 'currencyId', 'unit'].includes(prop)
        ) {
          // newValue 是用户选择的label，需要转换为value
          let sourceList: Array<{ label: string; value: any }> = [];

          if (prop === 'feeCodeId') {
            sourceList = dropdownSources.value.feeCodeList;
          } else if (prop === 'industryCategory') {
            sourceList = dropdownSources.value.industryCategoryList;
          } else if (prop === 'currencyId') {
            sourceList = dropdownSources.value.currencyList;
          } else if (prop === 'unit') {
            sourceList = dropdownSources.value.unitList;
          }

          // 查找对应的value
          const matchedItem = sourceList.find(
            (item) => item.label === newValue,
          );
          if (matchedItem) {
            console.log(
              `✅ [afterChange] ${prop}: label "${newValue}" → value "${matchedItem.value}"`,
            );

            // ✅ 直接修改dataSource中的数据，而不是使用setDataAtCell
            // 这样可以避免再次触发afterChange
            if (dataSource.value[row]) {
              (dataSource.value[row] as any)[prop] = matchedItem.value;
              console.log(
                `✅ [afterChange] 已更新dataSource[${row}].${prop} =`,
                matchedItem.value,
              );
            }

            // ✅ 返回转换后的change，供联动逻辑使用
            return [row, prop, oldValue, matchedItem.value];
          } else {
            console.warn(
              `⚠️ [afterChange] ${prop}: 未找到label "${newValue}" 对应的value`,
            );
            return change; // 返回原始change
          }
        } else if (prop === 'settlementId') {
          // 结算对象特殊处理：需要将label转换为value，并缓存__settlementName
          const sourceList = currentOptionsCache.value || [];
          const matchedItem = sourceList.find(
            (item: any) => item.label === newValue,
          );

          if (matchedItem) {
            console.log(
              `✅ [afterChange] settlementId: label "${newValue}" → value "${matchedItem.value}"`,
            );

            // 直接修改dataSource中的数据
            if (dataSource.value[row]) {
              (dataSource.value[row] as any).settlementId = matchedItem.value;
              (dataSource.value[row] as any).__settlementName = newValue;
              console.log(
                `✅ [afterChange] 已更新dataSource[${row}].settlementId =`,
                matchedItem.value,
              );
            }

            // ✅ 返回转换后的change，供联动逻辑使用
            return [row, prop, oldValue, matchedItem.value];
          } else {
            console.warn(
              `⚠️ [afterChange] settlementId: 未找到label "${newValue}" 对应的value`,
            );
            return change; // 返回原始change
          }
        }

        // 其他字段不做转换
        return change;
      });

      // ✅ 使用转换后的changes数组
      processedChanges = convertedChanges;
    }

    // 获取 Handsontable 实例
    const hotInstance = coreTableRef.value?.hotTableRef?.hotInstance;
    if (!hotInstance) {
      console.warn('⚠️ [afterChange] hotInstance 不存在');
      return;
    }

    // ✅ 关键修复：先执行联动逻辑，再刷新表格
    // 调用 linkage 的 handleAfterChange 处理联动逻辑
    // ✅ 注意：此时processedChanges中的newValue已经是正确的value值（ID）
    linkage.handleAfterChange(processedChanges, source, hotInstance);

    // ✅ 在联动逻辑执行完成后，刷新表格显示
    setTimeout(() => {
      hotInstance.render();
      console.log('✅ [afterChange] 表格刷新完成');
    }, 100);
  },
  observeDOMVisibility: true,
}));

// ==================== API 客户端导入 ====================
import { requestClient } from '#/api/request';

// ==================== 模态框引用 ====================

const modifyModalRef = ref<InstanceType<typeof OrderFeeEditorModal>>();
const auditHistoryModalRef =
  ref<InstanceType<typeof OrderFeeAuditHistoryModal>>();
const batchImportModalRef = ref<InstanceType<typeof BatchImportFeeModal>>();
const coreTableRef = ref<InstanceType<typeof OrderFeeTableCore>>();
const hotTableRef = ref<any>(null);

// ==================== 工具函数 ====================

/**
 * 根据行业类别加载客户列表
 * @param industryCategory 行业类别值
 * @param keyword 搜索关键词
 * @returns 客户选项列表（{label, value}格式）
 */
const loadClientList = async (industryCategory: string, keyword?: string) => {
  try {
    console.log('🔄 [loadClientList] 开始加载，行业类别:', industryCategory);

    // ✅ 使用 API 中定义好的 getClientPagedList 方法
    const response = await getClientPagedList({
      IndustryCategory: industryCategory,
      Keyword: keyword || '',
      PageIndex: 1,
      PageSize: 100,
    });

    const items = response.items || [];
    console.log('✅ [loadClientList] 原始数据:', items.length, '条');

    // ✅ 转换为 {label, value} 格式
    const options = items.map((client: any) => ({
      label: `${client.fullName || client.name || client.code || client.id}`,
      value: client.id,
      ...client, // 保留原始数据以便后续使用
    }));

    console.log('✅ [loadClientList] 转换后:', options.length, '个选项');
    if (options.length > 0) {
      console.log('📋 [loadClientList] 示例选项:', options[0]);
    }

    return options;
  } catch (error) {
    console.error('❌ [loadClientList] 加载客户列表失败:', error);
    message.error('加载客户列表失败');
    return [];
  }
};

/**
 * 根据字段名获取列索引
 * @param field 字段名
 * @returns 列索引
 */
const getColumnIndex = (field: string): number => {
  const index = hotColumns.value.findIndex((col) => col.data === field);
  return index >= 0 ? index : 0;
};

// ==================== 批量导入 ====================

const openBatchImportModal = async () => {
  console.log('🔍 [openBatchImportModal] 检查 editId:', editId.value);

  if (!editId.value) {
    console.warn('⚠️ [openBatchImportModal] editId 为空');
    message.warning('请先保存业务信息');
    return;
  }

  try {
    const orderDetail = orderBaseData.value;

    if (!orderDetail) {
      message.warning('订单详情未加载');
      return;
    }

    batchImportModalRef.value?.modalApi.setData({
      transportOrderId: editId.value,
      paySide: props.type,
      carrierId: orderDetail?.carrierId,
      polId: orderDetail?.polId,
      podId: orderDetail?.podId,
    });

    batchImportModalRef.value?.modalApi.open();
  } catch (error) {
    console.error('❌ [openBatchImportModal] 获取订单详情失败:', error);
    const errorMsg = error instanceof Error ? error.message : '请稍后重试';
    message.error(`获取订单详情失败: ${errorMsg}`);
  }
};

const handleBatchImportConfirm = () => {
  getTableDate();
  syncFee();
  emit('refresh-opposite-table');
};

// ==================== 工具函数补充 ====================

/**
 * 获取费用状态选项
 * @returns 费用状态选项列表
 */
const getFeeStatusOptions = () => {
  return [
    { value: 0, label: '草稿', color: '#FFA500' },
    { value: 1, label: '待审核', color: '#409EFF' },
    { value: 2, label: '已审核', color: '#67C23A' },
    { value: 3, label: '已驳回', color: '#F56C6C' },
  ];
};

/**
 * 获取行业类别选项
 * @returns 行业类别选项列表
 */
const getIndustryCategoryOptions = () => {
  return [
    { key: 'shipping', value: 'S', label: '海运' },
    { key: 'air', value: 'A', label: '空运' },
    { key: 'land', value: 'L', label: '陆运' },
  ];
};

// ==================== 审核历史 ====================

const openAuditHistoryModal = (row: OrderFeeAdminApi.OrderFeeDto) => {
  if (!row) return;
  auditHistoryModalRef.value?.modalApi.setData(row);
  auditHistoryModalRef.value?.modalApi.open();
};

// ==================== 类型定义 ====================

interface DropdownSources {
  feeCodeIdList?: Array<{ value: string; label: string }>;
  industryCategoryList?: Array<{ value: string; label: string }>;
  currencyIdList?: Array<{ value: string; label: string }>;
  unitList?: Array<{ value: string; label: string }>;
}

// ==================== 工具栏操作 ====================

const ImportOther = async (e: any) => {
  switch (e.key) {
    case 'submit': {
      actions.generateOppositeFees();
      break;
    }
  }
};

const SubmittedOther = async (e: any) => {
  switch (e.key) {
    case 'modify': {
      actions.openModifyModal(modifyModalRef, orderBaseData);
      break;
    }
    case 'delete': {
      actions.showDeleteWithRemark();
      break;
    }
  }
};

const handleModalConfirm = (data: {
  originalData: OrderFeeAdminApi.OrderFeeDto | null;
  updatedData: OrderFeeAdminApi.OrderFeeDto | null;
}) => {
  actions.handleModalConfirm(data);
};

// ==================== 费用代码列表 ====================

const feeCodeList = ref<FeeCodeAdminApi.FeeCodeDto[]>([]);

const getFeeCodeList = async () => {
  try {
    let res =
      (await getFeeCodePagedList({ PageIndex: 1, PageSize: 1000 })) || {};
    feeCodeList.value = res.items || [];

    dropdownSources.value.feeCodeList = feeCodeList.value.map((item) => {
      const surLabel = item.cnName || item.enName || '';
      const label = item.code ? `${item.code}-${surLabel}` : surLabel;
      return {
        label: label || item.cnName || item.enName || item.code || '',
        value: item.id,
      };
    });

    console.log(
      '✅ [getFeeCodeList] 费用代码列表加载完成:',
      dropdownSources.value.feeCodeList.length,
      '条',
    );
  } catch (error) {
    console.error('❌ [getFeeCodeList] 加载失败:', error);
  }
};

watch(
  () => feeCodeList.value,
  (newList) => {
    if (newList && newList.length > 0) {
      dropdownSources.value.feeCodeList = newList.map((item) => {
        const surLabel = item.cnName || item.enName || '';
        const label = item.code ? `${item.code}-${surLabel}` : surLabel;
        return {
          label: label || item.cnName || item.enName || item.code || '',
          value: item.id,
        };
      });
    }
  },
  { deep: true },
);

// ==================== 生命周期 ====================

onMounted(async () => {
  initOrderFeeEnumCache();
  await initDropdownSources();
  getTableDate();
  getFeeCodeList();

  // 加载完结状态
  loadFinishStatus();
});

// 监听 orderCtnList 变化，更新单位列表
watch(
  () => orderCtnList.value,
  () => {
    updateUnitList();
  },
  { deep: true },
);

// ✅ 新增：监听 orderBaseData 变化，重新填充结算对象名称
watch(
  () => orderBaseData.value,
  (newOrderDetail) => {
    if (!newOrderDetail || !dataSource.value.length) {
      console.log('⚠️ [watch orderBaseData] 跳过填充，条件不满足', {
        hasOrderDetail: !!newOrderDetail,
        dataSourceLength: dataSource.value.length,
      });
      return;
    }

    console.log('🔄 [watch orderBaseData] 订单详情变化，重新填充结算对象名称');

    let updatedCount = 0;
    // 为现有数据补充结算对象名称
    const enrichedData = dataSource.value.map((row: any) => {
      if (row.settlementId && !row.__settlementName) {
        const settlementName = extractSettlementNameFromOrder(row.settlementId);
        if (settlementName) {
          row.__settlementName = settlementName;
          updatedCount++;
          console.log(
            '✅ [watch orderBaseData] 补充结算对象名称:',
            settlementName,
          );
        }
      }
      return row;
    });

    console.log(
      '📊 [watch orderBaseData] 更新了',
      updatedCount,
      '行数据的结算对象名称',
    );

    // 只有在有更新时才刷新表格
    if (updatedCount > 0) {
      dataSource.value = enrichedData;

      // 等待 Vue 更新后再刷新 Handsontable
      nextTick(() => {
        if (coreTableRef.value?.hotTableRef?.hotInstance) {
          console.log(
            '🔄 [watch orderBaseData] 调用 hotInstance.loadData 刷新表格',
          );
          coreTableRef.value.hotTableRef.hotInstance.loadData(enrichedData);

          nextTick(() => {
            coreTableRef.value?.hotTableRef?.hotInstance?.render();
            console.log('✅ [watch orderBaseData] 表格刷新完成');
          });
        }
      });
    }
  },
  { deep: true },
);

// 监听 dataSource 变化，同步到 Handsontable
watch(
  () => dataSource.value,
  (newData) => {
    console.log(
      '📊 [watch dataSource] 数据源变化，行数:',
      newData?.length || 0,
    );

    nextTick(() => {
      if (coreTableRef.value?.hotTableRef?.hotInstance) {
        console.log('🔄 [watch dataSource] 调用 hotInstance.loadData');

        // ✅ 关键修复：在 loadData 之前，确保所有行都有 __settlementName
        const enrichedData = (newData || []).map((row: any) => {
          if (row.settlementId && !row.__settlementName) {
            console.log(
              '⚠️ [watch dataSource] 发现缺失 __settlementName 的行，尝试补充',
              {
                settlementId: row.settlementId,
                hasOrderBaseData: !!orderBaseData.value,
              },
            );

            // 策略1：尝试从 orderBaseData 中提取结算对象名称
            const settlementName = extractSettlementNameFromOrder(
              row.settlementId,
            );
            if (settlementName) {
              row.__settlementName = settlementName;
              console.log(
                '✅ [watch dataSource] 成功补充结算对象名称:',
                settlementName,
              );
            } else {
              // 策略2：降级 - 尝试从已加载的其他行中查找缓存的名称
              for (const existingRow of dataSource.value) {
                const existingRowAny = existingRow as any;
                if (
                  String(existingRowAny.settlementId) ===
                    String(row.settlementId) &&
                  existingRowAny.__settlementName
                ) {
                  row.__settlementName = existingRowAny.__settlementName;
                  console.log(
                    '✅ [watch dataSource] 从其他行缓存中获取结算对象名称:',
                    existingRowAny.__settlementName,
                  );
                  break;
                }
              }
            }
          }
          return row;
        });

        console.log(
          '📦 [watch dataSource] 准备加载数据， enrichedData 行数:',
          enrichedData.length,
        );
        coreTableRef.value.hotTableRef.hotInstance.loadData(enrichedData);

        // ✅ 额外渲染一次确保视图更新
        nextTick(() => {
          coreTableRef.value?.hotTableRef?.hotInstance?.render();
          console.log('✅ [watch dataSource] 表格渲染完成');
        });
      } else {
        console.warn('⚠️ [watch dataSource] hotInstance 不存在');
      }
    });
  },
  { deep: true },
);

// ✅ 新增：监听 selectedRowKeys 变化，刷新表格以更新复选框状态
watch(
  () => selectedRowKeys.value,
  () => {
    console.log(
      '🔵 [watch selectedRowKeys] 选中状态变化:',
      selectedRowKeys.value.length,
      '行',
    );

    nextTick(() => {
      if (coreTableRef.value?.hotTableRef?.hotInstance) {
        // 重新渲染表格以更新复选框状态
        coreTableRef.value.hotTableRef.hotInstance.render();
      }
    });
  },
  { deep: true },
);

// 监听 editId 变化，重新加载完结状态
watch(
  () => editId.value,
  async (newEditId, oldEditId) => {
    // 只在 editId 真正变化时才重新加载（排除初始化）
    if (newEditId && newEditId !== oldEditId) {
      // 重新加载完结状态
      loadFinishStatus();
    }
  },
);

defineExpose({
  getTableDate,
});
</script>

<template>
  <Card class="order-fee-card">
    <!-- 右上角完结状态图片 -->
    <div v-if="!isFinished" class="finish-status-badge" title="业务未完结">
      <img
        v-show="type === 0"
        :src="weiwanjie"
        alt="未完结"
        class="w-46 h-46"
      />
    </div>

    <div class="px-1">
      <div>
        <div class="order-ctn-table">
          <div class="handsontable-container">
            <div class="table-header">
              <span class="table-title">
                {{
                  type === 0
                    ? $t('seaExport.export.orderFee.receivableCharges')
                    : $t('seaExport.export.orderFee.payableCharges')
                }}
              </span>
              <Space class="toolbar-actions">
                <Button type="primary" @click="actions.addRow">
                  {{ $t('common.create') }}
                </Button>
                <Button
                  type="primary"
                  @click="actions.saveRow"
                  v-show="props.mode !== 'changeOrder'"
                >
                  {{ $t('common.save') }}
                </Button>
                <Button
                  v-show="props.mode !== 'changeOrder'"
                  :loading="printing"
                  @click="handlePrint"
                >
                  <IconifyIcon
                    icon="mdi:printer-outline"
                    class="mr-1 inline-block size-3.5 align-middle"
                  />
                  打印
                </Button>
                <Button
                  danger
                  :disabled="!selectedRowKeys.length"
                  @click="actions.removeSelectedRows"
                >
                  {{ $t('common.delete') }}
                </Button>

                <DropdownButton @click="openBatchImportModal" type="primary">
                  {{ $t('seaExport.export.orderFee.batchImport') }}
                  <template #overlay>
                    <Menu @click="ImportOther">
                      <MenuItem key="submit">
                        {{ type === 0 ? '应收生成应付' : '应付生成应收' }}
                      </MenuItem>
                    </Menu>
                  </template>
                </DropdownButton>

                <DropdownButton
                  @click="actions.Submitted"
                  type="primary"
                  :disabled="!selectedRowKeys.length"
                >
                  {{ $t('auditApproval.status.Submitted') }}
                  <template #overlay>
                    <Menu @click="SubmittedOther">
                      <MenuItem key="modify">
                        {{ $t('auditApproval.ApplyModification') }}
                      </MenuItem>
                      <MenuItem key="delete">
                        {{ $t('auditApproval.ApplyDeletion') }}
                      </MenuItem>
                    </Menu>
                  </template>
                </DropdownButton>

                <Button
                  type="primary"
                  :disabled="!selectedRowKeys.length"
                  @click="actions.orderFeeWithdraw"
                  >{{ $t('auditApproval.withdraw') }}</Button
                >

                <Button
                  v-show="type === 0"
                  type="default"
                  :loading="loadingFinishStatus"
                  @click="toggleFinishStatus"
                >
                  {{ isFinished ? '设为未完结' : '设为已完结' }}
                </Button>
              </Space>
            </div>

            <OrderFeeTableCore
              ref="coreTableRef"
              :data-source="dataSource"
              :selected-row-keys="selectedRowKeys"
              :hot-settings="hotSettings"
              :dropdown-sources="dropdownSources"
              :order-detail="orderBaseData"
              :sortable-fields="sortableFieldsSet"
              :sort-state="sortState"
              @update:selected-row-keys="selectedRowKeys = $event"
              @column-sort="handleColumnSort"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 费用编辑模态框 -->
    <OrderFeeEditorModal
      ref="modifyModalRef"
      :rec-amount-map="recAmountMap || {}"
      :pay-amount-map="payAmountMap || {}"
      :fee-code-list="feeCodeList"
      @confirm="handleModalConfirm"
    />

    <!-- 审核历史模态框 -->
    <OrderFeeAuditHistoryModal ref="auditHistoryModalRef" />

    <!-- 批量引入费用模态框 -->
    <BatchImportFeeModal
      ref="batchImportModalRef"
      @confirm="handleBatchImportConfirm"
    />
  </Card>
</template>

<style scoped lang="scss">
.order-fee-card {
  position: relative; // 为绝对定位的子元素提供定位上下文

  :deep(.ant-card-body) {
    padding: 0 20px 12px !important;
  }

  .order-ctn-table {
    display: flex;
    flex-direction: column;
    height: 575px; // ✅ 调整:增加高度以容纳表头和工具栏
  }

  .handsontable-container {
    display: flex;
    flex-direction: column;
    height: 100%; // ✅ 确保容器占满父元素高度
    min-height: 570px; // ✅ 调整:与表格固定高度+表头高度保持一致(原600)
    overflow: hidden;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
  }

  .table-header {
    display: flex;
    flex-shrink: 0; // ✅ 防止表头被压缩
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #fafafa;
    border-bottom: 1px solid #e8e8e8;

    .table-title {
      font-size: 14px;
      font-weight: 500;
      color: #262626;
    }

    .toolbar-actions {
      display: flex;
      gap: 8px;
    }
  }
}

// 完结状态徽章（右上角绝对定位）
.finish-status-badge {
  position: absolute;
  top: 20px;
  right: 0;
  z-index: 999;

  img {
    display: block;
    width: 104px;
    height: 104px;
    object-fit: contain;
  }
}

// ✅ 新增:复选框列样式
:deep(.handsontable) {
  // 复选框列居中对齐
  td.htCenter {
    vertical-align: middle !important;
    text-align: center !important;
  }

  // 表头复选框样式
  th .select-all-checkbox {
    cursor: pointer;

    &:hover {
      accent-color: #1890ff;
    }
  }

  // 数据行复选框样式
  td input[type='checkbox'] {
    width: 16px;
    height: 16px;
    cursor: pointer;

    &:hover {
      accent-color: #1890ff;
    }

    &:checked {
      accent-color: #1890ff;
    }
  }
}
</style>
