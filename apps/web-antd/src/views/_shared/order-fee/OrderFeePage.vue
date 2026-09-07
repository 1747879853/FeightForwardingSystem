<script lang="ts" setup>
import dayjs from 'dayjs';
import {
  computed,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  watch,
  h,
} from 'vue';
import { useRouter } from 'vue-router';
import {
  bindOrderFeeDataI18n,
  getCurrencyEnumOptions,
  getCurrencyEnumSymbolOptions,
} from './data';
import { ORDER_FEE_ADAPTER_KEY, type OrderFeeModuleAdapter } from './types';
import { useOrderFeeI18n } from './use-adapter';
import { Page } from '@vben/common-ui';

import {
  ArrowLeft,
  FileText,
  MapPin,
  Package,
  Save,
  Ship,
  Users,
  Settings,
} from '@vben/icons';

import {
  Button,
  Card,
  message,
  Space,
  Spin,
  Dropdown,
  Menu,
  MenuItem,
  DropdownButton,
  Modal,
  Textarea,
} from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { useKeepAliveRouteParamId } from '#/composables/use-keep-alive-route-param-id';
import { UserAttribute } from '#/api/system/user-admin';
import { $t } from '#/locales';

import OrderFeeTable from './modules/order-fee-table-handsontable.vue';
import DisplayFieldsConfigModal, {
  type DisplayFieldConfig,
} from './modules/display-fields-config-modal.vue';
import { useDisplayFieldConfig } from './composables/use-display-field-config';
import { buildAttachmentUrl } from '#/utils';
// ✅ 新增：导入下拉框数据源管理
import { useDropdownSources } from './modules/composables/useDropdownSources';
import {
  tryOpenPaymentApplicationFromSelectedFees,
  collectOrderFeesForPaymentNav,
} from '#/views/fee-management/payment-application/open-from-order-fees';
import { tryOpenInvoiceApplicationFromSelectedFees } from '#/views/fee-management/invoice-application/open-from-order-fees';
import { createAbpPermission } from '#/utils/abp-permission';

// 导入费用操作相关的 API
import {
  submitOrderFee,
  modifyOrderFee,
  deleteOrderFee,
  OrderFeeTaskWithdraw,
} from '#/api/audit-approval/expense-admin';

const emit = defineEmits<{
  (
    e: 'fee-count-change',
    payload: { recCount: number; payCount: number },
  ): void;
}>();

/** 编辑页保存成功后下发的最新详情：直接替换信息卡片与费用表 order-detail */
const props = defineProps<{
  /** 模块适配器（由薄壳 index.vue 传入，收敛三个模块的差异） */
  adapter: OrderFeeModuleAdapter;
  latestDetail?: any;
}>();

// 为子组件（表格/弹窗/composables）提供适配器
provide(ORDER_FEE_ADAPTER_KEY, props.adapter);

// 绑定模块级 i18n 前缀。必须在 setup 同步执行：子组件（表格等）在 setup 阶段就会
// 构建列定义（useOrderFeeColumns/useOrderFeeDetailColumns），setup 先于 onActivated，
// 等到 activated 再绑会导致 SI/AE 子组件捕获默认的 seaExport 前缀。
bindOrderFeeDataI18n(
  props.adapter.dataI18nPrefix,
  props.adapter.clientI18nModule,
);

// 页面级文案（formCardInfo 等）；本组件是 provide 方，自身 inject 取不到，需显式传入 adapter
const { t } = useOrderFeeI18n(props.adapter);

// KeepAlive 多页共存时，重新激活页面再次绑定，保证页面级模板文案跟随当前激活模块
onActivated(() => {
  bindOrderFeeDataI18n(
    props.adapter.dataI18nPrefix,
    props.adapter.clientI18nModule,
  );
});

const editId = useKeepAliveRouteParamId();

const isEdit = computed(() => !!editId.value);

// ==================== 应收/应付上下拖拽分割 ====================
// 两个费用表格按 flex-grow 比例分配高度，中间拖拽条可手动调整；
// 高度变化会被 OrderFeeTableCore 内部的 ResizeObserver 感知，
// 从而动态重设 Handsontable 高度，无需额外联动代码。
const SPLIT_STORAGE_KEY = 'order-fee-rec-pay-split';
const splitAreaRef = ref<HTMLElement | null>(null);
const recRatio = ref(50); // 应收区占比（%），默认上下均分
const isDragging = ref(false);
let dragMove: ((event: MouseEvent) => void) | null = null;
let dragUp: (() => void) | null = null;

// 恢复用户上次调整的比例（跨会话记忆）
try {
  const saved = Number(localStorage.getItem(SPLIT_STORAGE_KEY));
  if (!Number.isNaN(saved) && saved > 0) {
    recRatio.value = Math.max(20, Math.min(80, saved));
  }
} catch {
  // 本地缓存不可用时回退默认均分
}

const persistSplit = () => {
  try {
    localStorage.setItem(SPLIT_STORAGE_KEY, String(recRatio.value));
  } catch {
    // 忽略写入失败（如隐私模式）
  }
};

const stopSplitDrag = () => {
  const wasDragging = isDragging.value;
  isDragging.value = false;
  if (dragMove) document.removeEventListener('mousemove', dragMove);
  if (dragUp) document.removeEventListener('mouseup', dragUp);
  dragMove = null;
  dragUp = null;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  if (wasDragging) persistSplit();
};

const startSplitDrag = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
  const container = splitAreaRef.value;
  if (!container) return;

  isDragging.value = true;
  const startY = event.clientY;
  const startRatio = recRatio.value;

  dragMove = (moveEvent: MouseEvent) => {
    moveEvent.preventDefault();
    const height = container.getBoundingClientRect().height;
    if (height === 0) return;
    const next = startRatio + ((moveEvent.clientY - startY) / height) * 100;
    recRatio.value = Math.max(20, Math.min(80, next));
  };
  dragUp = stopSplitDrag;
  document.addEventListener('mousemove', dragMove);
  document.addEventListener('mouseup', dragUp);
  document.body.style.cursor = 'row-resize';
  document.body.style.userSelect = 'none';
};

// 双击拖拽条恢复上下均分
const resetSplit = () => {
  recRatio.value = 50;
  persistSplit();
};

onBeforeUnmount(stopSplitDrag);

const pageLoading = ref(false);
const submitting = ref(false);
const transportOrderId = ref<string>();
// ✅ 新增：客户数据加载状态
const clientsLoading = ref(false);

/** ISO 字符串转正常日期格式 */
const formatNormalDate = (
  val: string | null | undefined,
  format = 'YYYY-MM-DD HH:mm:ss',
) => {
  if (!val) return '--';
  const d = dayjs(val);
  return d.isValid() ? d.format(format) : '--';
};

const formValues = ref<Record<string, any>>();
const to = ref<Record<string, any>>();

// ✅ 新增：使用下拉框数据源管理（用于加载客户数据）
const orderCtnList = ref<any[]>([]); // 临时空数组，仅用于初始化
const { allClientsByIndustry, loadAllClients } =
  useDropdownSources(orderCtnList);

// 使用共享的显示字段配置管理
const { displayFieldConfig, handleConfigConfirm } = useDisplayFieldConfig(
  props.adapter.displayFields,
  'order_fee_display_config',
);

// 监听 formValues 变化
watch(
  formValues,
  (newVal) => {
    console.log('\n📦 formValues 变化:', newVal ? '已加载' : '清空');
  },
  { deep: true },
);

// 监听 to 变化
watch(
  to,
  (newVal) => {
    console.log('\n🎯 to 变化:', newVal ? '已加载' : '清空');
  },
  { deep: true },
);

// 根据配置生成显示列表
const displayList = computed(() => {
  console.log('=== displayList 计算 ===');
  console.log('formValues.value:', formValues.value);
  console.log('to.value:', to.value);
  console.log('displayFieldConfig.length:', displayFieldConfig.value.length);
  console.log(
    '可见字段数:',
    displayFieldConfig.value.filter((f) => f.visible).length,
  );

  if (!formValues.value || !to.value) {
    console.warn('⚠️ 数据未加载完成，返回空列表');
    return [];
  }

  const result: Array<{ key: string; name: string; value: any }> = [];

  displayFieldConfig.value.forEach((field) => {
    if (!field.visible) return;

    let value: any = '--';

    // 根据 key 获取对应的值（差异收敛到适配器）
    value = props.adapter.getDisplayValue(
      field.key,
      formValues.value,
      to.value,
    );

    result.push({
      key: field.key,
      name: field.label,
      value,
    });
  });

  console.log('✅ displayList 生成完成:', result.length, '个可见字段');
  console.log(
    '字段列表:',
    result.map((r) => r.name),
  );
  return result;
});

const transCurrency = (currencyId: number) => {
  const option = getCurrencyEnumOptions().find((o) => o.value === currencyId);
  return option ? option.label : currencyId;
};
const transCurrencySymbol = (currencyId: number | string) => {
  const option = getCurrencyEnumSymbolOptions().find(
    (o) => o.value === currencyId || o.key === currencyId,
  );
  return option ? option.label : currencyId;
};

let recAmountMap: any = ref({} as any);
let payAmountMap: any = ref({} as any);
const totalAmount = computed(() => {
  const allKeys = new Set([
    ...Object.keys(recAmountMap.value),
    ...Object.keys(payAmountMap.value),
  ]);
  const total: any = {};

  allKeys.forEach((key) => {
    total[key] = {
      totalPayAmount: payAmountMap.value[key]?.totalPayAmount || 0,
      totalRecAmount: recAmountMap.value[key]?.totalRecAmount || 0,
      totalRMBPayAmount: payAmountMap.value[key]?.totalRMBPayAmount || 0,
      totalRMBRecAmount: recAmountMap.value[key]?.totalRMBRecAmount || 0,
      exchangeRate:
        (payAmountMap.value[key] || recAmountMap.value[key])?.exchangeRate || 1,
      currencyId:
        (payAmountMap.value[key] || recAmountMap.value[key])?.currencyId || 1,
      currencyName:
        (payAmountMap.value[key] || recAmountMap.value[key])?.currencyName ||
        '人民币',
    };
  });
  // 转换为对象数组
  const totalList = Object.keys(total).map((key) => ({
    id: key,
    ...total[key],
  }));
  let list = [];
  console.log('totalList', totalList);
  let totalPay = 0;
  let totalRec = 0;

  totalList.forEach((item) => {
    let recName = `应收${transCurrency(item.currencyId)}:`;
    let recColor = 'green';
    let recAmount = (Number(item.totalRecAmount) || 0).toFixed(2);
    list.push({
      name: recName,
      color: recColor,
      value: transCurrencySymbol(item.currencyId) + recAmount,
    });
    console.log('应收recAmount', item.totalRMBRecAmount);
    totalRec += item.totalRMBRecAmount;

    let payName = `应付${transCurrency(item.currencyId)}:`;
    let payColor = 'yellow';
    let payAmount = (Number(item.totalPayAmount) || 0).toFixed(2);
    list.push({
      name: payName,
      color: payColor,
      value: transCurrencySymbol(item.currencyId) + payAmount,
    });
    totalPay += item.totalRMBPayAmount;

    let profitName = `${transCurrency(item.currencyId)}利润:`;
    let profitColor = 'blue';
    let profitAmount = (
      (Number(item.totalRecAmount) || 0) - (Number(item.totalPayAmount) || 0)
    ).toFixed(2);
    list.push({
      name: profitName,
      color: profitColor,
      value: transCurrencySymbol(item.currencyId) + profitAmount,
    });
  });
  list.push({
    name: '合计利润:',
    color: 'blue',
    value: transCurrencySymbol(1) + (totalRec - totalPay).toFixed(2),
  });
  list.push({
    name: '利润率:',
    color: 'blue',
    value: totalPay
      ? (((totalRec - totalPay) / totalPay) * 100).toFixed(1) + '%'
      : '--',
  });
  console.log(list);
  return list;
});

// 配置弹窗引用
const configModalRef = ref<any>(null);

// 应收和应付表格的引用
const recOrderFeeTableRef = ref<InstanceType<typeof OrderFeeTable>>();
const payOrderFeeTableRef = ref<InstanceType<typeof OrderFeeTable>>();

function isFeeDirty() {
  return !!(
    recOrderFeeTableRef.value?.isFeeDirty?.() ||
    payOrderFeeTableRef.value?.isFeeDirty?.()
  );
}

defineExpose({ isFeeDirty });

// 打开配置弹窗
const openConfigModal = () => {
  configModalRef.value?.open();
};

// 处理刷新对立表格事件（收付互生后调用）
const handleRefreshOppositeTable = (type: number) => {
  console.log(
    '🔄 [handleRefreshOppositeTable] 收到刷新对立表格事件，当前类型:',
    type,
  );

  if (type === 0) {
    // 当前是应收表，需要刷新生成的应付表
    console.log('✅ 刷新生成的应付表格');
    payOrderFeeTableRef.value?.getTableDate();
  } else {
    // 当前是应付表，需要刷新生成的应收表
    console.log('✅ 刷新生成的应收表格');
    recOrderFeeTableRef.value?.getTableDate();
  }
};

const loadOrderDetail = async () => {
  if (!editId.value) return;

  //pageLoading.value = true;
  try {
    const detail = await props.adapter.api.getDetail(editId.value);
    transportOrderId.value = detail.transportOrder?.id;
    formValues.value = detail;
    to.value = detail.transportOrder;
    // console.log('detail', formValues.value);
  } finally {
    pageLoading.value = false;
  }
};

// 基础信息保存成功后，用最新详情整体替换（信息卡片 + 费用表 order-detail 联动）
watch(
  () => props.latestDetail,
  (detail) => {
    if (!detail) return;
    transportOrderId.value = detail.transportOrder?.id;
    formValues.value = detail;
    to.value = detail.transportOrder;
  },
);

const getOrderFeeNumber = async () => {
  let params = {
    TransportOrderId: editId.value,
    PaySide: 0, // 应收
    PageIndex: 1,
    PageSize: 999,
  };
  const res = await props.adapter.api.getOrderFeePagedList(params);
  let dataSourceRec = res.items.filter((item) => item.paySide === 0);
  recAmountMap.value = {};
  const currencyIdList = dataSourceRec.map((item) => item.currencyId);
  currencyIdList.forEach((item) => {
    let list = dataSourceRec.filter((item2) => item2.currencyId === item);
    let totalRecAmount = list.reduce((acc, cur) => {
      return acc + (cur.amount || 0);
    }, 0);
    let totalRMBRecAmount = list.reduce((acc, cur) => {
      return acc + (cur.amount || 0) * (cur.exchangeRate || 1);
    }, 0);
    let exchangeRate = list[0]?.exchangeRate;
    let currencyName = list[0]?.currency?.cnName ?? list[0]?.currency?.code;
    let currencyId = list[0]?.currencyId;
    if (currencyId !== undefined) {
      recAmountMap.value[currencyId] = {
        totalRMBRecAmount,
        totalRecAmount,
        exchangeRate,
        currencyName,
        currencyId,
      };
    }
    //console.log('recAmountMap', recAmountMap);
  });

  // 查询应付费用
  params.PaySide = 1; // 应付
  const resPay = await props.adapter.api.getOrderFeePagedList(params);
  let dataSourcePay = resPay.items.filter((item) => item.paySide === 1);
  payAmountMap.value = {};
  const currencyIdListPay = dataSourcePay.map((item) => item.currencyId);
  currencyIdListPay.forEach((item) => {
    let list = dataSourcePay.filter((item2) => item2.currencyId === item);
    let totalPayAmount = list.reduce((acc, cur) => {
      return acc + (cur.amount || 0);
    }, 0);
    let totalRMBPayAmount = list.reduce((acc, cur) => {
      return acc + (cur.amount || 0) * (cur.exchangeRate || 1);
    }, 0);
    let exchangeRate = list[0]?.exchangeRate;
    let currencyName = list[0]?.currency?.cnName ?? list[0]?.currency?.code;
    let currencyId = list[0]?.currencyId;
    if (currencyId !== undefined) {
      payAmountMap.value[currencyId] = {
        totalRMBPayAmount,
        totalPayAmount,
        exchangeRate,
        currencyName,
        currencyId,
      };
    }
    // console.log('payAmountMap', payAmountMap);
  });
};

/**
 * ✅ 新增：获取业务费用数量统计（应收/应付数量）
 * 使用新的 getOrderFeeCount 接口，性能更优
 */
const getOrderFeeCountStats = async () => {
  if (!editId.value) return;

  try {
    const result = await props.adapter.api.getOrderFeeCount({
      transportOrderId: editId.value,
    });

    console.log('✅ [getOrderFeeCountStats] 费用数量统计:', result);

    // 更新费用数量映射
    feeCountMap.value = {
      0: result.receivableCount, // 应收数量
      1: result.payableCount, // 应付数量
    };

    // 触发父组件事件，同步费用数量
    emit('fee-count-change', {
      recCount: result.receivableCount,
      payCount: result.payableCount,
    });
  } catch (error) {
    console.error('❌ [getOrderFeeCountStats] 获取费用数量失败:', error);
  }
};

// 各方向费用行数（0 应收 / 1 应付），用于同步父级 Tab 数字
const feeCountMap = ref<Record<number, number>>({ 0: 0, 1: 0 });

// 费用表数据变化时，上抛最新应收/应付数量
const handleFeeSync = (data: { type: number; orderFees: any[] }) => {
  feeCountMap.value[data.type] = data.orderFees?.length ?? 0;
  emit('fee-count-change', {
    recCount: feeCountMap.value[0] ?? 0,
    payCount: feeCountMap.value[1] ?? 0,
  });
};

// 处理费用表格的金额更新事件
const handleAmountUpdate = (data: {
  type: number;
  amountMap: Record<string, any>;
}) => {
  console.log('📊 收到金额更新事件:', data);

  if (data.type === 0) {
    // 应收
    recAmountMap.value = { ...data.amountMap };
    console.log('✅ 应收金额已更新:', recAmountMap.value);
  } else if (data.type === 1) {
    // 应付
    payAmountMap.value = { ...data.amountMap };
    console.log('✅ 应付金额已更新:', payAmountMap.value);
  }
};

// ==================== 新增：统一的费用操作功能 ====================

// 存储选中的费用ID（从两个表格收集）
const selectedFeeIds = ref<string[]>([]);

// 从子表格组件收集选中的费用ID
const collectSelectedFeeIds = () => {
  const recIds = recOrderFeeTableRef.value?.getSelectedFeeIds() || [];
  const payIds = payOrderFeeTableRef.value?.getSelectedFeeIds() || [];
  selectedFeeIds.value = [...recIds, ...payIds];
  console.log('📋 收集选中的费用ID:', selectedFeeIds.value);
  return selectedFeeIds.value;
};

// 处理子组件的选中变化事件
const handleSelectionChange = (payload: {
  type: number;
  selectedIds: string[];
}) => {
  console.log('📋 收到选中变化事件:', payload);
  collectSelectedFeeIds();
};

const router = useRouter();
const paymentApplicationPerm = createAbpPermission('Admin.PaymentApplication');
const paymentApplicationNavLoading = ref(false);
const invoiceApplicationPerm = createAbpPermission('Admin.InvoiceApplication');
const invoiceApplicationNavLoading = ref(false);

function collectSelectedFeesForPaymentApplication() {
  collectSelectedFeeIds();
  const recFees = recOrderFeeTableRef.value?.getSelectedFees() || [];
  const payFees = payOrderFeeTableRef.value?.getSelectedFees() || [];
  return collectOrderFeesForPaymentNav(recFees, payFees);
}

function handleCreatePaymentApplication() {
  const fees = collectSelectedFeesForPaymentApplication();
  paymentApplicationNavLoading.value = true;
  void tryOpenPaymentApplicationFromSelectedFees(router, fees).finally(() => {
    paymentApplicationNavLoading.value = false;
  });
}

function handleCreateInvoiceApplication() {
  const feeIds = collectSelectedFeeIds();
  invoiceApplicationNavLoading.value = true;
  void tryOpenInvoiceApplicationFromSelectedFees(router, feeIds).finally(() => {
    invoiceApplicationNavLoading.value = false;
  });
}

// 提取提交费用的公共逻辑
const submitFees = async (recFees: any[], payFees: any[]) => {
  try {
    // 合并所有费用
    const allFees = [...recFees, ...payFees];

    if (allFees.length === 0) {
      message.warning('没有可提交的费用');
      return;
    }

    // 转换为OrderFeeEditDto格式，确保所有必需字段都有值
    const editFees = allFees.map((fee) => ({
      id: fee.id,
      transportOrderId: fee.transportOrderId || editId.value || '',
      paySide: fee.paySide ?? 0,
      feeStatus: fee.feeStatus ?? 0,
      invoiceStatus: fee.invoiceStatus ?? 0,
      feeCodeId: fee.feeCodeId ?? 0,
      settlementId: fee.settlementId || '',
      currencyId: fee.currencyId ?? 0,
      exchangeRate: fee.exchangeRate ?? 1,
      unitPrice: fee.unitPrice ?? 0,
      amount: fee.amount ?? 0,
      unit: fee.unit || '',
      quantity: fee.quantity ?? 0,
      taxRate: fee.taxRate ?? 0,
      noTaxUnitPrice: fee.noTaxUnitPrice ?? 0,
      noTaxAmount: fee.noTaxAmount ?? 0,
      rqstPaymentAmount: fee.rqstPaymentAmount ?? 0,
      invoicedAmount: fee.invoicedAmount ?? 0,
      orderInvoiceAmount: fee.orderInvoiceAmount ?? 0,
      settledAmount: fee.settledAmount ?? 0,
      invoiceBlocked: fee.invoiceBlocked ?? false,
      isConfidential: fee.isConfidential ?? false,
      dataEntryMethod: fee.dataEntryMethod ?? 0,
      remark: fee.remark,
      changeOrderId: fee.changeOrderId,
      taskStatus: fee.taskStatus,
      industryCategory: fee.industryCategory,
      industryCategories: fee.industryCategories,
    }));

    // 构建提交参数 - 需要根据实际API要求构建
    // 注意：submitOrderFee接口需要orderFees数组，包含完整的费用信息
    await submitOrderFee({
      transportOrderId: editId.value,
      orderFees: editFees,
    });

    message.success('提交审核成功');
    // 刷新两个表格
    recOrderFeeTableRef.value?.getTableDate();
    payOrderFeeTableRef.value?.getTableDate();
    // 清空选中状态
    selectedFeeIds.value = [];
  } catch (error) {
    console.error('提交审核失败:', error);
    message.error('提交审核失败');
  }
};

// 整票提交
const handleSubmitAllFees = async () => {
  // 先收集选中的费用ID
  const selectedFeeIds = collectSelectedFeeIds();

  let recFees: any[] = [];
  let payFees: any[] = [];

  if (selectedFeeIds.length === 0) {
    // 如果没有勾选费用，则获取所有未提交的费用（录入状态0和驳回状态5）
    console.log('⚠️ [整票提交] 未勾选任何费用，自动获取未提交的费用');

    const allRecFees = recOrderFeeTableRef.value?.getAllFees() || [];
    const allPayFees = payOrderFeeTableRef.value?.getAllFees() || [];

    // 过滤出未提交的费用：录入状态(0) 和 驳回状态(5)
    recFees = allRecFees.filter(
      (fee) => fee.feeStatus === 0 || fee.feeStatus === 5,
    );
    payFees = allPayFees.filter(
      (fee) => fee.feeStatus === 0 || fee.feeStatus === 5,
    );

    console.log('📊 [整票提交] 未提交费用统计:', {
      应收未提交: recFees.length,
      应付未提交: payFees.length,
      合计: recFees.length + payFees.length,
    });

    if (recFees.length === 0 && payFees.length === 0) {
      message.warning('没有未提交的费用（录入状态或驳回状态）');
      return;
    }

    // 提示用户将提交哪些费用
    const totalUnsubmitted = recFees.length + payFees.length;
    Modal.confirm({
      title: '整票提交确认',
      content: `即将提交 ${totalUnsubmitted} 条未提交的费用（应收${recFees.length}条，应付${payFees.length}条），是否继续？`,
      okText: '确认提交',
      cancelText: '取消',
      onOk: async () => {
        await submitFees(recFees, payFees);
      },
    });
  } else {
    // 如果勾选了费用，则只提交勾选的费用
    console.log('✅ [整票提交] 提交勾选的费用，数量:', selectedFeeIds.length);

    recFees = recOrderFeeTableRef.value?.getSelectedFees() || [];
    payFees = payOrderFeeTableRef.value?.getSelectedFees() || [];

    if (recFees.length === 0 && payFees.length === 0) {
      message.warning('没有可提交的费用');
      return;
    }

    await submitFees(recFees, payFees);
  }
};

// 申请修改
const handleApplyModify = async () => {
  const recFees = recOrderFeeTableRef.value?.getSelectedFees() || [];
  const payFees = payOrderFeeTableRef.value?.getSelectedFees() || [];
  const allFees = [...recFees, ...payFees];

  if (allFees.length === 0) {
    message.warning('请至少选择一条费用');
    return;
  }

  if (allFees.length > 1) {
    message.warning('只能选择一条费用进行修改');
    return;
  }

  // 获取选中的费用
  const selectedFee = allFees[0];

  // 验证费用状态：只有审核通过的费用才能申请修改
  if (selectedFee?.feeStatus !== 2) {
    // 假设 2 是审核通过的状态
    message.warning('只能修改审核通过的费用');
    return;
  }

  // 确定是哪个表格（应收还是应付）
  const isRecFee = recFees.some((fee) => fee.id === selectedFee.id);
  const tableRef = isRecFee
    ? recOrderFeeTableRef.value
    : payOrderFeeTableRef.value;

  // 打开编辑模态框
  if (tableRef?.openModifyModal && selectedFee) {
    tableRef.openModifyModal(selectedFee, formValues.value);
  } else {
    message.error('无法打开编辑模态框');
  }
};

// 申请删除
const handleApplyDelete = async () => {
  const feeIds = collectSelectedFeeIds();
  if (feeIds.length === 0) {
    message.warning('请至少选择一条费用');
    return;
  }

  // 创建一个临时的变量来获取用户输入
  let inputValue = '';

  // 弹出对话框让用户填写删除原因
  const modal = Modal.confirm({
    title: '申请删除',
    content: h(
      'div',
      {
        style: 'margin-top: 8px;',
      },
      [
        h(Textarea, {
          placeholder: '请输入删除原因（最多100字符）',
          maxlength: 100,
          rows: 3,
          onChange: (e: any) => {
            inputValue = e.target.value;
          },
        }),
      ],
    ),
    icon: null,
    width: 520,
    centered: true,
    okText: '确认',
    cancelText: '取消',
    async onOk() {
      const remark = inputValue?.trim();

      if (!remark || remark === '') {
        message.warning('请填写删除原因');
        return Promise.reject();
      }

      try {
        await deleteOrderFee({
          remark: remark,
          transportOrderId: editId.value,
          orderFeeIds: feeIds,
        });

        message.success('申请删除成功');
        // 刷新两个表格
        recOrderFeeTableRef.value?.getTableDate();
        payOrderFeeTableRef.value?.getTableDate();
        // 清空选中状态
        selectedFeeIds.value = [];
      } catch (error) {
        console.error('申请删除失败:', error);
        message.error('申请删除失败');
      }
    },
  });
};

// 撤销提交
const handleWithdraw = async () => {
  const feeIds = collectSelectedFeeIds();
  if (feeIds.length === 0) {
    message.warning('请至少选择一条费用');
    return;
  }

  try {
    await OrderFeeTaskWithdraw({
      orderFeeIds: feeIds,
    });

    message.success('撤销提交成功');
    // 刷新两个表格
    recOrderFeeTableRef.value?.getTableDate();
    payOrderFeeTableRef.value?.getTableDate();
    // 清空选中状态
    selectedFeeIds.value = [];
  } catch (error) {
    console.error('撤销提交失败:', error);
    message.error('撤销提交失败');
  }
};

// 下拉菜单操作
const handleMenuClick = (info: any) => {
  const key = info.key;
  switch (key) {
    case 'submit':
      handleSubmitAllFees();
      break;
    case 'modify':
      handleApplyModify();
      break;
    case 'delete':
      handleApplyDelete();
      break;
    case 'withdraw':
      handleWithdraw();
      break;
  }
};

onMounted(async () => {
  console.log('\n========== 费用页面挂载开始 ==========');
  // ✅ 新增：显示客户数据加载状态
  clientsLoading.value = true;

  loadOrderDetail();
  getOrderFeeNumber();

  // ✅ 新增：使用新接口获取费用数量统计
  getOrderFeeCountStats();

  try {
    // ✅ 新增：在父组件中一次性加载全部客户数据
    await loadAllClients();
  } finally {
    // ✅ 新增：加载完成后隐藏 loading
    clientsLoading.value = false;
    console.log('✅ [onMounted] 客户数据加载完成，已隐藏 loading');
  }

  console.log('========== 页面挂载结束 ==========\n');
});
</script>
<template>
  <Page
    class="order-fee-page"
    auto-content-height
    :height-offset="58"
    content-class="flex flex-col overflow-hidden"
  >
    <Spin
      :spinning="pageLoading || clientsLoading"
      wrapper-class-name="order-fee-spin"
    >
      <div class="mx-2 flex h-full min-h-0 items-stretch gap-6">
        <!-- 垂直方向撑满 -->
        <Card class="form-info-card flex min-h-0 w-[280px] shrink-0 flex-col">
          <template #title>
            <span class="flex items-center justify-between gap-2">
              <span class="flex items-center gap-2">
                <Users class="size-4" />
                {{ t('formCardInfo') }}
              </span>
              <Button
                type="text"
                size="small"
                @click="openConfigModal"
                class="text-gray-500 hover:text-blue-600"
              >
                <Settings class="size-4" />
              </Button>
            </span>
          </template>
          <div
            class="flex flex-1 px-1 py-1"
            v-for="item in displayList"
            :key="item.key"
          >
            <span class="flex w-[85px] font-semibold">
              {{ `${item.name} : ` }}</span
            >
            <span class="flex w-[145px]">
              <span
                v-if="item.key === 'carrierName'"
                class="inline-flex items-center gap-1"
              >
                <img
                  v-if="formValues?.carrierLogo?.url"
                  :src="buildAttachmentUrl(formValues?.carrierLogo?.url)"
                  :alt="formValues?.carrier?.cnName || 'carrier-logo'"
                  class="h-8 w-8 rounded object-contain"
                />
                <span>{{ item.value || '--' }}</span>
              </span>
              <span v-else>{{ item.value || '--' }}</span>
            </span>
          </div>
        </Card>

        <!-- 外层容器：包含应收应付表格和操作按钮 -->
        <div class="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          <!-- 右侧操作按钮区域 -->
          <div class="flex shrink-0 justify-end gap-2 px-1">
            <Space>
              <!-- 调试信息 -->
              <span class="text-sm text-gray-500">
                已选中: {{ selectedFeeIds.length }} 条费用
              </span>

              <Button
                v-access:code="invoiceApplicationPerm.add"
                :disabled="selectedFeeIds.length === 0"
                :loading="invoiceApplicationNavLoading"
                @click="handleCreateInvoiceApplication"
              >
                创建开票申请
              </Button>

              <Button
                v-access:code="paymentApplicationPerm.add"
                :disabled="selectedFeeIds.length === 0"
                :loading="paymentApplicationNavLoading"
                @click="handleCreatePaymentApplication"
              >
                创建付费申请
              </Button>

              <!-- 更多操作下拉菜单 -->
              <DropdownButton type="primary" @click="handleSubmitAllFees">
                整票提交
                <template #overlay>
                  <Menu @click="handleMenuClick">
                    <MenuItem key="modify">{{
                      $t('auditApproval.ApplyModification')
                    }}</MenuItem>
                    <MenuItem key="delete">{{
                      $t('auditApproval.ApplyDeletion')
                    }}</MenuItem>
                    <MenuItem key="withdraw">{{
                      $t('auditApproval.withdraw')
                    }}</MenuItem>
                  </Menu>
                </template>
              </DropdownButton>
            </Space>
          </div>

          <!-- 应收/应付可上下拖拽分割区 -->
          <div
            ref="splitAreaRef"
            class="split-area flex min-h-0 flex-1 flex-col"
            :class="{ 'is-resizing': isDragging }"
          >
            <!-- 应收费用表格 -->
            <OrderFeeTable
              class="min-h-0"
              :style="{ flex: `${recRatio} 1 0%` }"
              ref="recOrderFeeTableRef"
              :type="0"
              :rec-amount-map="recAmountMap"
              :pay-amount-map="payAmountMap"
              :order-detail="formValues"
              :all-clients-by-industry="allClientsByIndustry"
              @update-amount="handleAmountUpdate"
              @sync-fee="handleFeeSync"
              @refresh-opposite-table="() => handleRefreshOppositeTable(0)"
              @selection-change="handleSelectionChange"
            />

            <!-- 上下拖拽条：拖动调整应收/应付高度，双击恢复均分 -->
            <div
              class="drag-handle drag-handle-vertical"
              :class="{ dragging: isDragging }"
              title="拖动调整应收/应付高度，双击恢复均分"
              @mousedown="startSplitDrag"
              @dblclick="resetSplit"
            >
              <div class="drag-line"></div>
            </div>

            <!-- 应付费用表格 -->
            <OrderFeeTable
              class="min-h-0"
              :style="{ flex: `${100 - recRatio} 1 0%` }"
              ref="payOrderFeeTableRef"
              :type="1"
              :rec-amount-map="recAmountMap"
              :pay-amount-map="payAmountMap"
              :order-detail="formValues"
              :all-clients-by-industry="allClientsByIndustry"
              @update-amount="handleAmountUpdate"
              @sync-fee="handleFeeSync"
              @refresh-opposite-table="() => handleRefreshOppositeTable(1)"
              @selection-change="handleSelectionChange"
            />
          </div>

          <div
            class="total-amount flex shrink-0 flex-wrap rounded-md px-4 py-1 shadow"
          >
            <div
              v-for="(item, index) in totalAmount"
              class="mr-4 flex"
              :key="item.name"
            >
              <span class="flex">{{ item.name }}</span>
              <span class="ml-2 flex font-medium" :class="item.color">{{
                item.value
              }}</span>
              <span class="split mx-4 flex" v-show="(index + 1) % 3 === 0"
                >|
              </span>
            </div>
          </div>
        </div>
      </div>
    </Spin>

    <!-- 显示字段配置弹窗 -->
    <DisplayFieldsConfigModal
      ref="configModalRef"
      :available-fields="displayFieldConfig"
      @confirm="handleConfigConfirm"
    />
  </Page>
</template>
<style scoped lang="scss">
.order-fee-page {
  height: 100%;
  overflow: hidden;
}

/* Spin 会截断 height:100% 高度链：内容区是 flex-col，故 Spin 外层 flex:1、内层 container 撑满 */
:deep(.order-fee-spin) {
  flex: 1;
  min-height: 0;
}

:deep(.order-fee-spin > .ant-spin-container) {
  height: 100%;
}

/* 左侧信息卡：填满行高，内容超出时卡片内部滚动，不影响右侧表格自适应 */
.form-info-card {
  min-height: 0;

  :deep(.ant-card-body) {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
}

.select-name {
  flex-direction: row-reverse;
}

/* 应收/应付上下拖拽分割条 */
.split-area.is-resizing {
  user-select: none;
}

/* 拖拽时禁用表格卡片指针事件，避免 Handsontable 捕获鼠标干扰拖拽；拖拽条仍可交互 */
.split-area.is-resizing :deep(.order-fee-card) {
  pointer-events: none;
}

.drag-handle {
  position: relative;
  z-index: 10;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.drag-handle .drag-line {
  background-color: #e4e8ef;
  border-radius: 999px;
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.drag-handle:hover .drag-line,
.drag-handle.dragging .drag-line {
  background-color: #1890ff;
  box-shadow: 0 0 6px rgb(24 144 255 / 30%);
}

.drag-handle.dragging .drag-line {
  box-shadow: 0 0 8px rgb(24 144 255 / 40%);
}

.drag-handle-vertical {
  height: 12px;
  cursor: row-resize;
}

.drag-handle-vertical .drag-line {
  width: 48px;
  height: 4px;
}

.total-amount {
  display: flex;
  flex-wrap: wrap;
  background: #fff;

  .split {
    color: #33333345;
  }
}

.green {
  color: #00b96b;
}

.yellow {
  color: #ffc107;
}

.blue {
  color: #007bff;
}

:deep(.green-btn) {
  color: #fff;
  background-color: #00b96b !important;
  border-color: #00b96b !important;
}

/* 如果需要处理悬停状态 */
:deep(.green-btn:hover),
:deep(.green-btn:focus) {
  color: #fff;
  background-color: #009a55 !important;
  border-color: #009a55 !important;
}

:deep(.yellow-btn) {
  color: #fff;
  background-color: #ffc107 !important;
  border-color: #ffc107 !important;
}

/* 如果需要处理悬停状态 */
:deep(.yellow-btn:hover),
:deep(.yellow-btn:focus) {
  color: #fff;
  background-color: #ffc107 !important;
  border-color: #ffc107 !important;
}

/* 悬停状态 */
.green-dropdown-btn.ant-btn:hover,
.green-dropdown-btn.ant-btn:focus {
  color: #fff;
  background-color: #73d13d;
  border-color: #73d13d;
}

/* 激活/按下状态 */
.green-dropdown-btn.ant-btn:active {
  color: #fff;
  background-color: #389e0d;
  border-color: #389e0d;
}
</style>
