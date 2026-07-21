<script lang="ts" setup>
import dayjs from 'dayjs';
import {
  computed,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  watch,
} from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import { ChevronDown, History, Plus, Users } from '@vben/icons';

import {
  Alert,
  AutoComplete,
  Badge,
  Button,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  Menu,
  message,
  Modal,
  MonthPicker,
  Select,
  Spin,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { getSeaExportDetail } from '#/api/sea-export/sea-export-admin';
import {
  getCurrencyEnumOptions,
  getCurrencyEnumSymbolOptions,
} from '#/views/sea-export-admin/orderFee/data';
import { $t } from '#/locales';

import OrderFeeTable from '#/views/sea-export-admin/orderFee/modules/order-fee-table.vue';
import type { DisplayFieldConfig } from '#/views/sea-export-admin/orderFee/modules/display-fields-config-modal.vue';
import { useDisplayFieldConfig } from '#/views/sea-export-admin/orderFee/composables/use-display-field-config';

import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';

import type { ChangeOrderAdminApi } from '#/api/sea-export/change-order-admin';
import {
  EditAsync,
  GetDetail,
  GetPagedList,
} from '#/api/sea-export/change-order-admin';

defineOptions({
  name: 'ChangeOrder',
});

const route = useRoute();

const editId = computed(() => {
  const id = route.params.id;
  return id ? String(id) : undefined;
});

const pageLoading = ref(false);
const submitting = ref(false);
const transportOrderId = ref<string>();
const activeFeeTab = ref('receivable');
const hasUnsavedChanges = ref(false);
const lastSavedAt = ref<string>();
const isLoadingChangeOrder = ref(false);

/** 更改单列表（无费用），供顶部选择器与历史抽屉共用 */
const changeOrderList = ref<ChangeOrderAdminApi.ChangeOrderDto[]>([]);
/** 顶部选择器下拉开关 */
const selectorOpen = ref(false);
/** 历史更改单抽屉开关与筛选条件 */
const historyOpen = ref(false);
const historyKeyword = ref('');
const historyStatus = ref<'all' | 'locked' | 'unlocked'>('all');

/** 拉取当前运输单下的更改单列表 */
const loadChangeOrderList = async () => {
  if (!transportOrderId.value) {
    changeOrderList.value = [];
    return;
  }
  const res = await GetPagedList({
    PageIndex: 1,
    PageSize: 100,
    Sorting: 'Id',
    TransportOrderId: transportOrderId.value,
  });
  changeOrderList.value = (res.items ?? []).map((item) => ({
    ...item,
    accountDate: dayjs(item.accountDate).format('YYYY-MM'),
  }));
};

/** 更改单状态（当前仅有费用锁定维度） */
const getChangeOrderStatus = (item: { feeLocked?: boolean }) =>
  item?.feeLocked
    ? { text: '已锁定', color: 'default' as const }
    : { text: '未锁定', color: 'success' as const };

/** 历史抽屉：关键字 + 状态筛选后的列表 */
const filteredHistory = computed(() => {
  const kw = historyKeyword.value.trim().toLowerCase();
  return changeOrderList.value.filter((item) => {
    const matchKw =
      !kw ||
      (item.reason ?? '').toLowerCase().includes(kw) ||
      (item.accountDate ?? '').toLowerCase().includes(kw);
    const matchStatus =
      historyStatus.value === 'all' ||
      (historyStatus.value === 'locked' ? item.feeLocked : !item.feeLocked);
    return matchKw && matchStatus;
  });
});

/** 常用更改原因（支持自由输入） */
const commonReasonOptions = [
  { value: '漏录费用' },
  { value: '代理费调整' },
  { value: '汇率调整' },
  { value: '客户要求' },
  { value: '供应商补费' },
  { value: '其他' },
];

/** 订单信息：默认折叠仅展示关键字段，点击展开全部 */
const orderInfoExpanded = ref(false);

/**
 * 货代海出业务重要性排序（有无值都按此序展示）
 * 单据标识 → 客户船司 → 船名航次 → 港口船期 → 截单节点 → 组织条款 → 货量货描
 */
const ORDER_INFO_PRIORITY_KEYS = [
  'mblNum',
  'bookingNum',
  'commissionNum',
  'clientName',
  'carrierName',
  'vessel',
  'innerVoyno',
  'polName',
  'podName',
  'etd',
  'atd',
  'eta',
  'receivePortName',
  'deliverPortName',
  'poT1Name',
  'poT2Name',
  'closingTime',
  'closeVgmTime',
  'closeDocTime',
  'closeManifestTime',
  'teamName',
  'codeSourceName',
  'codeServiceName',
  'codeFrtName',
  'noPkgs',
  'kgs',
  'cbm',
  'goodsDes',
] as const;

/** 折叠态展示的前若干个关键字段（按重要性，不论有无值） */
const KEY_ORDER_INFO_KEYS = ORDER_INFO_PRIORITY_KEYS.slice(0, 10);

const sortByOrderInfoPriority = <T extends { key: string }>(items: T[]) => {
  const rank = new Map(
    ORDER_INFO_PRIORITY_KEYS.map((key, index) => [key, index]),
  );
  return [...items].sort(
    (a, b) =>
      (rank.get(a.key) ?? ORDER_INFO_PRIORITY_KEYS.length) -
      (rank.get(b.key) ?? ORDER_INFO_PRIORITY_KEYS.length),
  );
};

/** 更改原因校验 */
const reasonInputRef = ref<any>(null);
const showReasonError = ref(false);

/** 页签费用条数徽标样式（中性色，不用红色告警色） */
const feeBadgeStyle = {
  backgroundColor: '#e6f0ff',
  color: '#1677ff',
  boxShadow: 'none',
};

/** 左侧表单：相关方信息（发货人、收货人、通知人等） */
// const [PartyInfoForm, partyInfoFormApi] = useVbenForm({
//   layout: 'vertical',
//   compact: true,
//   schema: usePartyInfoFormSchema(),
//   showDefaultActions: false,
//   wrapperClass: 'flex flex-col',
// });

/** ISO 字符串转正常日期格式 */
const formatNormalDate = (
  val: string | null | undefined,
  format = 'YYYY-MM-DD HH:mm:ss',
) => {
  if (!val) return '--';
  const d = dayjs(val);
  return d.isValid() ? d.format(format) : '--';
};

const formValues = ref<any>();
const to = ref<Record<string, any>>();

// 所有可用的显示字段配置（顺序按货代重要性；可见性仍可读共享配置）
const allDisplayFields: DisplayFieldConfig[] = [
  { key: 'mblNum', label: $t('seaExport.export.mblNum'), visible: true },
  {
    key: 'bookingNum',
    label: $t('seaExport.export.bookingNum'),
    visible: true,
  },
  {
    key: 'commissionNum',
    label: $t('seaExport.export.commissionNum'),
    visible: true,
  },
  { key: 'clientName', label: $t('seaExport.export.clientId'), visible: true },
  {
    key: 'carrierName',
    label: $t('seaExport.export.carrierId'),
    visible: true,
  },
  { key: 'vessel', label: $t('seaExport.export.vessel'), visible: true },
  {
    key: 'innerVoyno',
    label: $t('seaExport.export.innerVoyno'),
    visible: true,
  },
  { key: 'polName', label: $t('seaExport.export.polId'), visible: true },
  { key: 'podName', label: $t('seaExport.export.podId'), visible: true },
  { key: 'etd', label: $t('seaExport.export.etd'), visible: true },
  { key: 'atd', label: $t('seaExport.export.atd'), visible: true },
  { key: 'eta', label: $t('seaExport.export.eta'), visible: true },
  {
    key: 'receivePortName',
    label: $t('seaExport.export.receivePortId'),
    visible: true,
  },
  {
    key: 'deliverPortName',
    label: $t('seaExport.export.deliverPortId'),
    visible: true,
  },
  {
    key: 'poT1Name',
    label: $t('seaExport.export.poT1Id'),
    visible: true,
  },
  {
    key: 'poT2Name',
    label: $t('seaExport.export.poT2Id'),
    visible: true,
  },
  {
    key: 'closingTime',
    label: $t('seaExport.export.closingTime'),
    visible: true,
  },
  {
    key: 'closeVgmTime',
    label: $t('seaExport.export.closeVgmTime'),
    visible: true,
  },
  {
    key: 'closeDocTime',
    label: $t('seaExport.export.closeDocTime'),
    visible: true,
  },
  {
    key: 'closeManifestTime',
    label: $t('seaExport.export.closeManifestTime'),
    visible: true,
  },
  { key: 'teamName', label: $t('seaExport.export.teamId'), visible: true },
  {
    key: 'codeSourceName',
    label: $t('seaExport.export.codeSourceId'),
    visible: true,
  },
  {
    key: 'codeServiceName',
    label: $t('seaExport.export.codeServiceId'),
    visible: true,
  },
  {
    key: 'codeFrtName',
    label: $t('seaExport.export.codeFrtId'),
    visible: true,
  },
  { key: 'noPkgs', label: $t('seaExport.export.noPkgs'), visible: true },
  { key: 'kgs', label: $t('seaExport.export.kgs'), visible: true },
  { key: 'cbm', label: $t('seaExport.export.cbm'), visible: true },
  { key: 'goodsDes', label: $t('seaExport.export.goodsDes'), visible: true },
];

// 读取与应收应付页共享的显示字段配置（更改单页不再提供配置入口）
const { displayFieldConfig } = useDisplayFieldConfig(
  allDisplayFields,
  'order_fee_display_config',
);

const displayList = computed(() => {
  if (!formValues.value || !to.value) return [];

  const result: Array<{ key: string; name: string; value: any }> = [];

  displayFieldConfig.value.forEach((field) => {
    if (!field.visible) return;

    let value: any = '--';

    // 根据 key 获取对应的值
    switch (field.key) {
      case 'mblNum':
        value = to.value?.mblNum || '--';
        break;
      case 'bookingNum':
        value = to.value?.bookingNum || '--';
        break;
      case 'receivePortName':
        value = formValues.value?.receivePortRemark || '--';
        break;
      case 'polName':
        value = formValues.value?.polRemark || '--';
        break;
      case 'poT1Name':
        value = formValues.value?.poT1Remark || '--';
        break;
      case 'poT2Name':
        value = formValues.value?.poT2Remark || '--';
        break;
      case 'podName':
        value = formValues.value?.podRemark || '--';
        break;
      case 'deliverPortName':
        value = formValues.value?.deliverPortRemark || '--';
        break;
      case 'codeSourceName':
        value = to.value?.codeSourceName || '--';
        break;
      case 'commissionNum':
        value = to.value?.commissionNum || '--';
        break;
      case 'clientName':
        value = to.value?.clientName || '--';
        break;
      case 'teamName':
        value = to.value?.teamName || '--';
        break;
      case 'vessel':
        value = formValues.value?.vessel || '--';
        break;
      case 'innerVoyno':
        value = formValues.value?.innerVoyno || '--';
        break;
      case 'carrierName':
        value =
          formValues.value?.carrierCnShortName ||
          formValues.value?.carrierName ||
          '--';
        break;
      case 'etd':
        value = formatNormalDate(formValues.value?.etd);
        break;
      case 'atd':
        value = formatNormalDate(formValues.value?.atd);
        break;
      case 'eta':
        value = formatNormalDate(formValues.value?.eta);
        break;
      case 'closingTime':
        value = formatNormalDate(formValues.value?.closingTime);
        break;
      case 'closeVgmTime':
        value = formatNormalDate(formValues.value?.closeVgmTime);
        break;
      case 'closeDocTime':
        value = formatNormalDate(formValues.value?.closeDocTime);
        break;
      case 'closeManifestTime':
        value = formatNormalDate(formValues.value?.closeManifestTime);
        break;
      case 'signingTime':
        value = formatNormalDate(formValues.value?.signingTime);
        break;
      case 'codeServiceName':
        value = formValues.value?.codeServiceName || '--';
        break;
      case 'codeFrtName':
        value = formValues.value?.codeFrtName || '--';
        break;
      case 'noPkgs':
        value = to.value?.noPkgs || '--';
        break;
      case 'kgs':
        value = to.value?.kgs || '--';
        break;
      case 'cbm':
        value = to.value?.cbm || '--';
        break;
      case 'goodsDes':
        value = to.value?.goodsDes || '--';
        break;
    }

    result.push({
      key: field.key,
      name: field.label,
      value,
    });
  });

  return sortByOrderInfoPriority(result);
});

/** 折叠态：按重要性取前若干关键字段（不论有无值） */
const keyOrderInfo = computed(() => {
  const keySet = new Set<string>(KEY_ORDER_INFO_KEYS);
  return displayList.value.filter((item) => keySet.has(item.key));
});

/** 展开态：全部可见字段，仍按重要性排序（不论有无值） */
const expandedOrderInfo = computed(() => displayList.value);

const changeOrder = ref<any>(null);
const isChangeOrderLocked = computed(() =>
  Boolean(changeOrder.value?.feeLocked),
);
/** 尚未保存到服务端的新建更改单 */
const isNewDraft = computed(
  () => Boolean(changeOrder.value) && !changeOrder.value?.id,
);
/** 是否允许保存：新建草稿或存在未保存修改，且未锁定 */
const canSaveChangeOrder = computed(
  () =>
    Boolean(changeOrder.value) &&
    !isChangeOrderLocked.value &&
    (isNewDraft.value || hasUnsavedChanges.value),
);
const currentChangeOrderLabel = computed(() => {
  if (!changeOrder.value) return '选择更改单';
  if (!changeOrder.value.id) return '新建更改单';
  const period = changeOrder.value.accountDate || '';
  const reason = changeOrder.value.reason?.trim() || '未填写原因';
  return `${period} · ${reason}`;
});

const PayOrderFeeRef = ref<any>(null);
const RecOrderFeeRef = ref<any>(null);

// 处理刷新对立表格事件（收付互生后调用）
const handleRefreshOppositeTable = (type: number) => {
  console.log('🔄 [changeOrder] 收到刷新对立表格事件，当前类型:', type);

  if (type === 0) {
    // 当前是应收表，需要刷新生成的应付表
    console.log('✅ 刷新生成的应付表格');
    PayOrderFeeRef.value?.getTableDate(changeOrder.value?.id);
  } else {
    // 当前是应付表，需要刷新生成的应收表
    console.log('✅ 刷新生成的应收表格');
    RecOrderFeeRef.value?.getTableDate(changeOrder.value?.id);
  }
};

/**
 * 存在未保存修改时给出「保存并切换 / 放弃修改 / 取消」三选一（自定义弹窗承载）。
 */
const dirtyDecision = ref<{
  resolve: (v: 'cancel' | 'discard' | 'save') => void;
  visible: boolean;
}>({ visible: false, resolve: () => {} });

/** 打开三选一弹窗，返回用户决定 */
const askDirtyDecision = () =>
  new Promise<'cancel' | 'clean' | 'discard' | 'save'>((resolve) => {
    if (!hasUnsavedChanges.value) {
      resolve('clean');
      return;
    }
    dirtyDecision.value = {
      visible: true,
      resolve: (v) => {
        dirtyDecision.value.visible = false;
        resolve(v);
      },
    };
  });

/** 统一的“可否离开当前更改单”守卫 */
const ensureCanLeaveCurrent = async () => {
  const decision = await askDirtyDecision();
  if (decision === 'cancel') return false;
  if (decision === 'save') {
    const ok = await saveRow();
    return ok; // 保存失败则停留
  }
  return true; // clean 或 discard
};

/** 真正加载某条更改单（含费用），不做未保存拦截 */
const applyChangeOrder = async (curChangeOrder: any) => {
  isLoadingChangeOrder.value = true;
  changeOrder.value = curChangeOrder ?? null;
  hasUnsavedChanges.value = false;

  try {
    if (!changeOrder.value?.id) {
      RecFeeList.value = [];
      PayFeeList.value = [];
      recAmountMap.value = {};
      payAmountMap.value = {};
    } else {
      await getOrderFeeNumber();
    }
    await nextTick();
    const id = changeOrder.value?.id ?? '';
    RecOrderFeeRef.value?.getTableDate(id);
    PayOrderFeeRef.value?.getTableDate(id);
  } finally {
    // 费用表异步回填，稍作延时再放开脏检测，避免加载被误判为修改
    setTimeout(() => {
      isLoadingChangeOrder.value = false;
    }, 400);
  }
};

/** 选择某条更改单：受未保存保护 */
const setCurrentChangeOrder = async (curChangeOrder: any) => {
  selectorOpen.value = false;
  if (curChangeOrder && curChangeOrder.id === changeOrder.value?.id) return;
  const ok = await ensureCanLeaveCurrent();
  if (!ok) return;
  await applyChangeOrder(curChangeOrder);
};

/** 新建更改单：进入详情区录入态 */
const startNewChangeOrder = async (preset?: {
  accountDate?: string;
  reason?: string;
  remark?: string;
}) => {
  selectorOpen.value = false;
  const ok = await ensureCanLeaveCurrent();
  if (!ok) return;
  activeFeeTab.value = 'receivable';
  await applyChangeOrder({
    id: undefined,
    accountDate: preset?.accountDate || dayjs().format('YYYY-MM'),
    reason: preset?.reason || '',
    remark: preset?.remark || '',
  });
};

const loadSeaExportData = async () => {
  if (!editId.value) return;

  //pageLoading.value = true;
  try {
    const detail = await getSeaExportDetail(editId.value);
    transportOrderId.value = detail.transportOrder?.id;
    formValues.value = detail;
    to.value = detail.transportOrder;
    console.log('detail', formValues.value);
  } finally {
    pageLoading.value = false;
  }
};
const saveRow = async (): Promise<boolean> => {
  if (!changeOrder.value) {
    message.warning('请先新建或选择一张更改单');
    return false;
  }
  if (isChangeOrderLocked.value) {
    message.warning('该更改单已锁定，仅可查看');
    return false;
  }
  if (!changeOrder.value.reason?.trim()) {
    showReasonError.value = true;
    message.warning('请填写更改原因后再保存');
    await nextTick();
    reasonInputRef.value?.focus?.();
    return false;
  }
  showReasonError.value = false;
  submitting.value = true;
  const data = {
    id: changeOrder.value.id,
    transportOrderId: transportOrderId.value || '',
    accountDate: dayjs(changeOrder.value.accountDate).format('YYYY-MM'),
    reason: changeOrder.value.reason,
    remark: changeOrder.value.remark,
    orderFees: [
      ...RecFeeList.value.map((item) => {
        return {
          ...item,
          changeOrderId: changeOrder.value.id,
          paySide: 0,
        };
      }),
      ...PayFeeList.value.map((item) => {
        return {
          ...item,
          changeOrderId: changeOrder.value.id,
          paySide: 1,
        };
      }),
    ],
  };
  try {
    const id = await EditAsync(data);
    changeOrder.value.id ||= id;
    hasUnsavedChanges.value = false;
    lastSavedAt.value = dayjs().format('HH:mm');
    await loadChangeOrderList();
    message.success('更改单及全部应收、应付费用已保存');
    return true;
  } catch {
    // 保存失败：保留用户输入，不清空、不切换
    return false;
  } finally {
    submitting.value = false;
  }
};

let RecFeeList = ref<OrderFeeAdminApi.OrderFeeEditDto[]>([]);
let PayFeeList = ref<OrderFeeAdminApi.OrderFeeEditDto[]>([]);

let recAmountMap: any = ref({} as any);
let payAmountMap: any = ref({} as any);

const transCurrency = (currencyId: number) => {
  const option = getCurrencyEnumOptions().find((o) => o.value === currencyId);
  return option ? option.label : currencyId;
};
const transCurrencySymbol = (currencyId: number) => {
  const option = getCurrencyEnumSymbolOptions().find(
    (o) => o.value === currencyId,
  );
  return option ? option.label : currencyId;
};
const getOrderFeeNumber = async () => {
  const res = await GetDetail(changeOrder.value.id);
  let dataSourceRec = res.orderFees.filter((item) => item.paySide === 0);
  recAmountMap.value = {};
  const currencyIdList = dataSourceRec.map((item) => item.currencyId) || [];
  currencyIdList.forEach((item) => {
    let list = dataSourceRec.filter((item2) => item2.currencyId === item);
    let totalRecAmount = list.reduce((acc, cur) => {
      return acc + (cur.amount || 0);
    }, 0);
    let totalRMBRecAmount = list.reduce((acc, cur) => {
      return acc + (cur.amount || 0) * (cur.exchangeRate || 1);
    }, 0);
    let exchangeRate = list[0]?.exchangeRate;
    let currencyName = list[0]?.currencyName;
    let currencyId = list[0]?.currencyId;
    if (currencyId !== undefined) {
      recAmountMap.value[currencyId] = {
        totalRecAmount,
        totalRMBRecAmount,
        exchangeRate,
        currencyName,
        currencyId,
      };
    }
    console.log('recAmountMap', recAmountMap);
  });
  let dataSourcePay = res.orderFees.filter((item) => item.paySide === 1);
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
    let currencyName = list[0]?.currencyName;
    let currencyId = list[0]?.currencyId;
    if (currencyId !== undefined) {
      payAmountMap.value[currencyId] = {
        totalPayAmount,
        totalRMBPayAmount,
        exchangeRate,
        currencyName,
        currencyId,
      };
    }
    console.log('payAmountMap', payAmountMap);
  });
};
/** 金额千分位 + 两位小数 */
const formatMoney = (val: number) =>
  (val || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** 分币种的应收/应付/利润明细（用于展开查看） */
const currencyBreakdown = computed(() => {
  const keys = new Set([
    ...Object.keys(recAmountMap.value),
    ...Object.keys(payAmountMap.value),
  ]);
  return [...keys].map((key) => {
    const rec = recAmountMap.value[key];
    const pay = payAmountMap.value[key];
    const currencyId = Number(rec?.currencyId ?? pay?.currencyId ?? key);
    const recAmount = rec?.totalRecAmount || 0;
    const payAmount = pay?.totalPayAmount || 0;
    return {
      currencyId,
      symbol: transCurrencySymbol(currencyId),
      currencyName: transCurrency(currencyId),
      recAmount,
      payAmount,
      profit: recAmount - payAmount,
    };
  });
});

/** 仅非本位币（原币展示用） */
const foreignCurrencyBreakdown = computed(() =>
  currencyBreakdown.value.filter((c) => c.currencyId !== 1),
);

/** 存在非本位币且缺少汇率时，本位币利润无法完整计算 */
const hasMissingRate = computed(() =>
  [...RecFeeList.value, ...PayFeeList.value].some(
    (fee: any) =>
      fee.currencyId && Number(fee.currencyId) !== 1 && !fee.exchangeRate,
  ),
);

/** 汇总栏（本位币） */
const profitSummary = computed(() => {
  const receivable = Object.values(recAmountMap.value).reduce(
    (acc: number, cur: any) => acc + (cur?.totalRMBRecAmount || 0),
    0,
  );
  const payable = Object.values(payAmountMap.value).reduce(
    (acc: number, cur: any) => acc + (cur?.totalRMBPayAmount || 0),
    0,
  );
  const profit = receivable - payable;
  return {
    receivable,
    payable,
    profit,
    profitRate: receivable
      ? `${((profit / receivable) * 100).toFixed(2)}%`
      : '--',
  };
});
const syncFee = (obj: any) => {
  if (obj.type === 0) {
    RecFeeList.value = obj.orderFees;
  } else {
    PayFeeList.value = obj.orderFees;
  }
};
const syncAmount = (obj: { amountMap: Record<string, any>; type: number }) => {
  if (obj.type === 0) {
    recAmountMap.value = obj.amountMap;
  } else {
    payAmountMap.value = obj.amountMap;
  }
};
const markUnsaved = () => {
  if (
    !isLoadingChangeOrder.value &&
    changeOrder.value &&
    !isChangeOrderLocked.value
  ) {
    hasUnsavedChanges.value = true;
  }
};
watch(changeOrder, markUnsaved, { deep: true });
watch(
  () => changeOrder.value?.reason,
  (val) => {
    if (val?.trim()) showReasonError.value = false;
  },
);

/** Ctrl/Cmd + S 保存当前更改单 */
const handleKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    if (!changeOrder.value || isChangeOrderLocked.value) return;
    e.preventDefault();
    saveRow();
  }
};

/** 离开页面前的未保存提示 */
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (hasUnsavedChanges.value) {
    e.preventDefault();
    e.returnValue = '';
  }
};

/** transportOrderId 就绪后加载更改单列表 */
watch(transportOrderId, async (id) => {
  if (!id) return;
  await nextTick();
  await loadChangeOrderList();
});

const bindGlobalListeners = () => {
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('beforeunload', handleBeforeUnload);
};
const unbindGlobalListeners = () => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('beforeunload', handleBeforeUnload);
};
onMounted(() => {
  loadSeaExportData();
  bindGlobalListeners();
});
onActivated(bindGlobalListeners);
onDeactivated(unbindGlobalListeners);
onBeforeUnmount(unbindGlobalListeners);
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="pageLoading">
      <div class="mx-2 flex flex-col gap-4">
        <!-- 顶部通铺：订单信息（默认关键字段，点击展开；字段值单行不换行） -->
        <section
          class="order-info-bar"
          :class="{ 'order-info-bar--expanded': orderInfoExpanded }"
        >
          <button
            type="button"
            class="order-info-bar__toggle"
            :aria-expanded="orderInfoExpanded"
            @click="orderInfoExpanded = !orderInfoExpanded"
          >
            <span class="order-info-bar__title">
              <Users class="size-3.5 shrink-0 opacity-70" />
              {{ $t('seaExport.export.formCardInfo') }}
            </span>

            <span v-if="!orderInfoExpanded" class="order-info-bar__summary">
              <template v-if="keyOrderInfo.length">
                <span
                  v-for="item in keyOrderInfo"
                  :key="item.key"
                  class="order-info-chip"
                  :class="{
                    'order-info-chip--empty':
                      !item.value || item.value === '--',
                  }"
                >
                  <span class="order-info-chip__label">{{ item.name }}</span>
                  <span
                    class="order-info-chip__value"
                    :title="String(item.value || '--')"
                  >
                    <img
                      v-if="
                        item.key === 'carrierName' &&
                        (formValues?.carrierLogo?.url ||
                          formValues?.carrier?.logo?.url)
                      "
                      :src="
                        formValues?.carrierLogo?.url ||
                        formValues?.carrier?.logo?.url
                      "
                      :alt="formValues?.carrierName || 'carrier-logo'"
                      class="order-info-chip__logo"
                    />
                    {{ item.value || '--' }}
                  </span>
                </span>
              </template>
              <span v-else class="order-info-bar__empty">暂无订单信息</span>
            </span>

            <span class="order-info-bar__expand">
              {{ orderInfoExpanded ? '收起' : '展开' }}
              <ChevronDown
                class="order-info-bar__chevron"
                :class="{ 'order-info-bar__chevron--up': orderInfoExpanded }"
              />
            </span>
          </button>

          <div v-if="orderInfoExpanded" class="order-info-bar__body">
            <div class="order-info-bar__grid">
              <div
                v-for="item in expandedOrderInfo"
                :key="item.key"
                class="order-info-field"
                :class="{
                  'order-info-field--empty': !item.value || item.value === '--',
                }"
              >
                <span class="order-info-field__label">{{ item.name }}</span>
                <span
                  class="order-info-field__value"
                  :title="String(item.value || '--')"
                >
                  <img
                    v-if="
                      item.key === 'carrierName' &&
                      (formValues?.carrierLogo?.url ||
                        formValues?.carrier?.logo?.url)
                    "
                    :src="
                      formValues?.carrierLogo?.url ||
                      formValues?.carrier?.logo?.url
                    "
                    :alt="formValues?.carrierName || 'carrier-logo'"
                    class="order-info-chip__logo"
                  />
                  {{ item.value || '--' }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div class="w-change-order-auto flex min-w-0 flex-1 flex-col gap-4">
          <section class="change-order-editor">
            <div class="editor-header">
              <div class="editor-head-left min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <!-- 当前更改单选择器 -->
                  <Dropdown
                    v-model:open="selectorOpen"
                    :trigger="['click']"
                    placement="bottomLeft"
                  >
                    <button
                      type="button"
                      class="co-selector"
                      :title="currentChangeOrderLabel"
                    >
                      <span class="co-selector__label">{{
                        currentChangeOrderLabel
                      }}</span>
                      <ChevronDown class="size-4 shrink-0 opacity-60" />
                    </button>
                    <template #overlay>
                      <div class="co-menu" @click.stop>
                        <div class="co-menu__title">选择更改单</div>
                        <Menu
                          v-if="changeOrderList.length"
                          class="co-menu__menu"
                          :selected-keys="
                            changeOrder?.id ? [changeOrder.id] : []
                          "
                          @click="
                            ({ key }) =>
                              setCurrentChangeOrder(
                                changeOrderList.find((c) => c.id === key),
                              )
                          "
                        >
                          <Menu.Item
                            v-for="item in changeOrderList"
                            :key="item.id"
                          >
                            <div class="co-row">
                              <span class="co-row__period">{{
                                item.accountDate
                              }}</span>
                              <span
                                class="co-row__reason"
                                :title="item.reason || '未填写原因'"
                                >{{ item.reason || '未填写原因' }}</span
                              >
                              <Tag
                                :color="getChangeOrderStatus(item).color"
                                class="co-row__status"
                                >{{ getChangeOrderStatus(item).text }}</Tag
                              >
                              <span
                                v-if="
                                  item.id === changeOrder?.id &&
                                  hasUnsavedChanges
                                "
                                class="co-row__flag co-row__flag--unsaved"
                                >未保存</span
                              >
                              <span
                                v-else-if="item.id === changeOrder?.id"
                                class="co-row__flag"
                                >当前</span
                              >
                            </div>
                          </Menu.Item>
                        </Menu>
                        <div v-else class="co-menu__empty">
                          <Empty
                            :image="Empty.PRESENTED_IMAGE_SIMPLE"
                            description="暂无更改单"
                          />
                        </div>
                        <Divider class="co-menu__divider" />
                        <div class="co-menu__footer">
                          <Button
                            v-if="!isNewDraft"
                            type="link"
                            size="small"
                            @click="startNewChangeOrder()"
                          >
                            <Plus class="size-4" /> 新建更改单
                          </Button>
                          <Button
                            type="link"
                            size="small"
                            @click="
                              selectorOpen = false;
                              historyOpen = true;
                            "
                          >
                            <History class="size-4" /> 查看全部
                          </Button>
                        </div>
                      </div>
                    </template>
                  </Dropdown>

                  <!-- 状态标签 -->
                  <Tag v-if="isNewDraft" color="blue">草稿</Tag>
                  <Tag
                    v-if="changeOrder"
                    :color="isChangeOrderLocked ? 'default' : 'success'"
                  >
                    {{ isChangeOrderLocked ? '已锁定' : '未锁定' }}
                  </Tag>
                  <Tag v-if="submitting" color="processing">正在保存…</Tag>
                  <Tag v-else-if="hasUnsavedChanges" color="orange">
                    有未保存修改
                  </Tag>
                  <Tag v-else-if="changeOrder && !isNewDraft" color="green">
                    已保存{{ lastSavedAt ? ` · ${lastSavedAt}` : '' }}
                  </Tag>
                </div>
              </div>

              <div class="editor-actions">
                <Button v-if="!isNewDraft" @click="startNewChangeOrder()">
                  <Plus class="size-4" /> 新建
                </Button>
                <Tooltip
                  :title="canSaveChangeOrder ? '' : '当前没有需要保存的修改'"
                >
                  <Button
                    type="primary"
                    :loading="submitting"
                    :disabled="!canSaveChangeOrder"
                    @click="saveRow"
                  >
                    保存更改单
                  </Button>
                </Tooltip>
              </div>
            </div>

            <Alert
              v-if="isChangeOrderLocked"
              class="mb-3"
              type="warning"
              show-icon
              message="该更改单已锁定，费用仅可查看。"
              :description="
                changeOrder?.feeLockedUserName
                  ? `锁定人：${changeOrder.feeLockedUserName}${changeOrder.feeLockedTime ? `，锁定时间：${formatNormalDate(changeOrder.feeLockedTime)}` : ''}`
                  : '如需修改，请联系财务解锁。'
              "
            />

            <div v-if="!changeOrder" class="empty-editor">
              请点击「新建」创建更改单，或从上方选择器选择已有更改单后录入费用。
            </div>
            <template v-else>
              <Form
                layout="vertical"
                class="change-order-basic-form"
                :disabled="isChangeOrderLocked"
              >
                <Form.Item
                  label="会计期间"
                  required
                  class="co-field co-field--date"
                >
                  <MonthPicker
                    v-model:value="changeOrder.accountDate"
                    value-format="YYYY-MM"
                    format="YYYY-MM"
                    placeholder="选择会计期间"
                    class="w-full"
                  />
                </Form.Item>
                <Form.Item
                  label="更改原因"
                  required
                  class="co-field co-field--reason"
                  :validate-status="showReasonError ? 'error' : ''"
                >
                  <AutoComplete
                    ref="reasonInputRef"
                    v-model:value="changeOrder.reason"
                    :options="commonReasonOptions"
                    placeholder="必填，可选择常用原因或自由输入"
                    class="w-full"
                    :filter-option="false"
                    allow-clear
                  />
                </Form.Item>
                <Form.Item label="备注" class="co-field co-field--remark">
                  <Input
                    v-model:value="changeOrder.remark"
                    placeholder="选填，可备注本次更改的补充说明"
                    allow-clear
                    class="w-full"
                  />
                </Form.Item>
              </Form>
            </template>

            <!-- 应收/应付：页签切换置于费用表 toolbar 左侧 -->
            <div v-if="changeOrder" class="fee-tables">
              <OrderFeeTable
                v-show="activeFeeTab === 'receivable'"
                :type="0"
                mode="changeOrder"
                :readonly="isChangeOrderLocked"
                :parent-change-order-id="changeOrder?.id"
                :order-detail="formValues"
                ref="RecOrderFeeRef"
                @sync-fee="syncFee"
                @change="markUnsaved"
                @update-amount="syncAmount"
                @refresh-opposite-table="() => handleRefreshOppositeTable(0)"
              >
                <template #toolbar-actions>
                  <div class="fee-tab-switch">
                    <button
                      type="button"
                      class="fee-tab-switch__item"
                      :class="{
                        'fee-tab-switch__item--active':
                          activeFeeTab === 'receivable',
                      }"
                      @click="activeFeeTab = 'receivable'"
                    >
                      应收费用
                      <Badge
                        :count="RecFeeList.length"
                        show-zero
                        :number-style="feeBadgeStyle"
                      />
                    </button>
                    <button
                      type="button"
                      class="fee-tab-switch__item"
                      :class="{
                        'fee-tab-switch__item--active':
                          activeFeeTab === 'payable',
                      }"
                      @click="activeFeeTab = 'payable'"
                    >
                      应付费用
                      <Badge
                        :count="PayFeeList.length"
                        show-zero
                        :number-style="feeBadgeStyle"
                      />
                    </button>
                  </div>
                </template>
              </OrderFeeTable>
              <OrderFeeTable
                v-show="activeFeeTab === 'payable'"
                :type="1"
                mode="changeOrder"
                :readonly="isChangeOrderLocked"
                :parent-change-order-id="changeOrder?.id"
                :order-detail="formValues"
                ref="PayOrderFeeRef"
                @sync-fee="syncFee"
                @change="markUnsaved"
                @update-amount="syncAmount"
                @refresh-opposite-table="() => handleRefreshOppositeTable(1)"
              >
                <template #toolbar-actions>
                  <div class="fee-tab-switch">
                    <button
                      type="button"
                      class="fee-tab-switch__item"
                      :class="{
                        'fee-tab-switch__item--active':
                          activeFeeTab === 'receivable',
                      }"
                      @click="activeFeeTab = 'receivable'"
                    >
                      应收费用
                      <Badge
                        :count="RecFeeList.length"
                        show-zero
                        :number-style="feeBadgeStyle"
                      />
                    </button>
                    <button
                      type="button"
                      class="fee-tab-switch__item"
                      :class="{
                        'fee-tab-switch__item--active':
                          activeFeeTab === 'payable',
                      }"
                      @click="activeFeeTab = 'payable'"
                    >
                      应付费用
                      <Badge
                        :count="PayFeeList.length"
                        show-zero
                        :number-style="feeBadgeStyle"
                      />
                    </button>
                  </div>
                </template>
              </OrderFeeTable>
            </div>

            <div v-if="changeOrder" class="profit-summary">
              <div class="profit-summary__main">
                <div class="profit-summary__item">
                  <span class="profit-summary__label">应收合计</span>
                  <span class="profit-summary__value green"
                    >¥ {{ formatMoney(profitSummary.receivable) }}</span
                  >
                </div>
                <div class="profit-summary__item">
                  <span class="profit-summary__label">应付合计</span>
                  <span class="profit-summary__value yellow"
                    >¥ {{ formatMoney(profitSummary.payable) }}</span
                  >
                </div>
                <div class="profit-summary__item">
                  <span class="profit-summary__label">预计利润</span>
                  <span
                    class="profit-summary__value"
                    :class="profitSummary.profit >= 0 ? 'blue' : 'red'"
                    >¥ {{ formatMoney(profitSummary.profit) }}</span
                  >
                </div>
                <div class="profit-summary__item">
                  <span class="profit-summary__label">利润率</span>
                  <span class="profit-summary__value blue">{{
                    profitSummary.profitRate
                  }}</span>
                </div>
              </div>
              <div
                v-if="foreignCurrencyBreakdown.length"
                class="profit-summary__by-currency"
              >
                <span class="profit-summary__chip-label">原币</span>
                <span
                  v-for="c in foreignCurrencyBreakdown"
                  :key="c.currencyId"
                  class="profit-summary__chip"
                >
                  {{ c.currencyName }} 应收 {{ c.symbol
                  }}{{ formatMoney(c.recAmount) }} / 应付 {{ c.symbol
                  }}{{ formatMoney(c.payAmount) }}
                </span>
              </div>
              <Alert
                v-if="hasMissingRate"
                class="profit-summary__alert"
                type="warning"
                show-icon
                banner
                message="缺少外币汇率，暂时无法计算本位币金额，请补齐汇率后再核对利润。"
              />
            </div>
          </section>
        </div>
      </div>
    </Spin>

    <!-- 未保存三选一：保存并切换 / 放弃修改 / 取消 -->
    <Modal
      :open="dirtyDecision.visible"
      title="有未保存的修改"
      :mask-closable="false"
      :footer="null"
      width="440px"
      @cancel="dirtyDecision.resolve('cancel')"
    >
      <p class="mb-4 text-gray-600">
        当前更改单存在未保存的费用或信息，请选择如何处理。
      </p>
      <div class="flex justify-end gap-2">
        <Button @click="dirtyDecision.resolve('cancel')">取消</Button>
        <Button danger @click="dirtyDecision.resolve('discard')">
          放弃修改
        </Button>
        <Button type="primary" @click="dirtyDecision.resolve('save')">
          保存并切换
        </Button>
      </div>
    </Modal>

    <!-- 历史更改单抽屉 -->
    <Drawer
      v-model:open="historyOpen"
      :title="`历史更改单（${changeOrderList.length}）`"
      placement="right"
      :width="420"
    >
      <div class="mb-3 flex gap-2">
        <Input
          v-model:value="historyKeyword"
          placeholder="搜索更改原因 / 会计期间"
          allow-clear
        />
        <Select v-model:value="historyStatus" style="width: 120px">
          <Select.Option value="all">全部状态</Select.Option>
          <Select.Option value="unlocked">未锁定</Select.Option>
          <Select.Option value="locked">已锁定</Select.Option>
        </Select>
      </div>
      <Empty
        v-if="!filteredHistory.length"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
        description="没有匹配的更改单"
      />
      <div v-else class="history-list">
        <button
          v-for="item in filteredHistory"
          :key="item.id"
          type="button"
          class="history-item"
          :class="{ 'history-item--active': item.id === changeOrder?.id }"
          @click="
            historyOpen = false;
            setCurrentChangeOrder(item);
          "
        >
          <div class="history-item__head">
            <span class="history-item__period">{{ item.accountDate }}</span>
            <Tag :color="getChangeOrderStatus(item).color">{{
              getChangeOrderStatus(item).text
            }}</Tag>
            <span v-if="item.id === changeOrder?.id" class="history-item__flag"
              >当前</span
            >
          </div>
          <div class="history-item__reason">
            {{ item.reason || '未填写原因' }}
          </div>
          <div class="history-item__meta">
            <span
              >创建：{{
                formatNormalDate(item.creationTime, 'YYYY-MM-DD HH:mm')
              }}</span
            >
            <span v-if="item.feeLockedUserName">
              锁定：{{ item.feeLockedUserName }}
              {{ formatNormalDate(item.feeLockedTime, 'MM-DD HH:mm') }}
            </span>
          </div>
        </button>
      </div>
    </Drawer>
  </Page>
</template>

<style scoped lang="scss">
@media (width <= 1200px) {
  .change-order-basic-form {
    grid-template-columns: 1fr 1fr;
  }

  .change-order-basic-form .co-field--remark {
    grid-column: 1 / -1;
  }
}

.change-order-basic-form {
  display: grid;
  grid-template-columns:
    180px minmax(320px, 1.4fr)
    minmax(280px, 1fr);
  gap: 0 16px;
  padding: 12px 16px 4px;

  :deep(.ant-form-item) {
    margin-bottom: 8px;
  }

  // 更改原因为核心字段，占位更突出
  .co-field--reason :deep(.ant-form-item-label > label) {
    font-weight: 600;
  }
}

.w-full {
  width: 100%;
}

.profit-summary {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  background: #fafcff;
  border-top: 1px solid #f0f0f0;
}

.profit-summary__main {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 32px;
}

.profit-summary__item {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.profit-summary__label {
  font-size: 13px;
  color: #8c8c8c;
}

.profit-summary__value {
  font-size: 16px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.profit-summary__by-currency {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.profit-summary__chip-label {
  font-size: 12px;
  color: #8c8c8c;
}

.profit-summary__chip {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: #595959;
}

.profit-summary__alert {
  margin-top: 4px;
}

.editor-title {
  font-size: 16px;
  font-weight: 600;
}

.editor-head-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.editor-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
}

// 当前更改单选择器按钮
.co-selector {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  max-width: 360px;
  padding: 4px 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    color: #1677ff;
    border-color: #1677ff;
  }
}

.co-selector__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 选择器下拉面板
.co-menu {
  width: 360px;
  padding: 8px 0 4px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgb(0 0 0 / 12%);
}

.co-menu__title {
  padding: 4px 16px 8px;
  font-size: 12px;
  color: #8c8c8c;
}

.co-menu__menu {
  max-height: 280px;
  overflow-y: auto;
  border-inline-end: none !important;
}

.co-menu__empty {
  padding: 12px 0;
}

.co-menu__divider {
  margin: 4px 0;
}

.co-menu__footer {
  display: flex;
  justify-content: space-between;
  padding: 0 8px;
}

.co-row {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.co-row__period {
  flex-shrink: 0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.co-row__reason {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #595959;
  white-space: nowrap;
}

.co-row__status {
  flex-shrink: 0;
  margin-inline-end: 0;
}

.co-row__flag {
  flex-shrink: 0;
  font-size: 12px;
  color: #1677ff;
}

.co-row__flag--unsaved {
  color: #d46b08;
}

// 历史抽屉列表
.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: #f5f9ff;
    border-color: #1677ff;
  }
}

.history-item--active {
  border-color: #1677ff;
  box-shadow: inset 3px 0 0 #1677ff;
}

.history-item__head {
  display: flex;
  gap: 8px;
  align-items: center;
}

.history-item__period {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.history-item__flag {
  margin-inline-start: auto;
  font-size: 12px;
  color: #1677ff;
}

.history-item__reason {
  color: #262626;
}

.history-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 12px;
  color: #8c8c8c;
}

.change-order-editor {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.editor-header {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.editor-hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: #8c8c8c;
}

.empty-editor {
  padding: 56px 24px;
  color: #8c8c8c;
  text-align: center;
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

.red {
  color: #d4380d;
}

.order-info-bar {
  overflow: hidden;
  background: linear-gradient(180deg, #fafbfc 0%, #f7f8fa 100%);
  border: 1px solid #eef0f3;
  border-radius: 8px;
}

.order-info-bar__toggle {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  margin: 0;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  transition: background 0.15s;

  &:hover {
    background: rgb(0 0 0 / 2%);
  }
}

.order-info-bar--expanded .order-info-bar__toggle {
  border-bottom: 1px solid #eef0f3;
}

.order-info-bar__title {
  display: inline-flex;
  flex-shrink: 0;
  gap: 5px;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: #595959;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.order-info-bar__summary {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 4px 0;
  align-items: center;
  min-width: 0;
}

.order-info-chip {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  max-width: 100%;
  padding: 0 10px;
  font-size: 12px;
  line-height: 1.4;

  & + & {
    border-left: 1px solid #e5e7eb;
  }

  &--empty {
    .order-info-chip__label,
    .order-info-chip__value {
      color: #bfbfbf;
    }
  }
}

.order-info-chip__label {
  flex-shrink: 0;
  color: #8c8c8c;
  white-space: nowrap;

  &::after {
    content: '：';
  }
}

/* 字段值强制单行，超长省略，不换行 */
.order-info-chip__value {
  min-width: 0;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  color: #262626;
  white-space: nowrap;
}

.order-info-chip__logo {
  display: inline-block;
  width: 14px;
  height: 14px;
  margin-right: 2px;
  vertical-align: -2px;
  object-fit: contain;
  border-radius: 2px;
}

.order-info-bar__empty {
  font-size: 12px;
  color: #bfbfbf;
}

.order-info-bar__expand {
  display: inline-flex;
  flex-shrink: 0;
  gap: 2px;
  align-items: center;
  margin-left: auto;
  font-size: 12px;
  color: #8c8c8c;
  white-space: nowrap;
}

.order-info-bar__toggle:hover .order-info-bar__expand {
  color: #1677ff;
}

.order-info-bar__chevron {
  width: 14px;
  height: 14px;
  transition: transform 0.2s ease;

  &--up {
    transform: rotate(180deg);
  }
}

.order-info-bar__body {
  padding: 10px 12px 8px;
}

.order-info-bar__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px 20px;
}

.order-info-field {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  font-size: 12px;
  line-height: 1.5;
}

.order-info-field__label {
  flex-shrink: 0;
  color: #8c8c8c;
  white-space: nowrap;

  &::after {
    content: '：';
  }
}

/* 展开态字段值同样单行不换行 */
.order-info-field__value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  color: #262626;
  white-space: nowrap;
}

.order-info-field--empty {
  .order-info-field__label,
  .order-info-field__value {
    color: #bfbfbf;
  }
}

.fee-tables {
  /* 与顶部基本信息表单、标题栏同一水平边距 16px */
  padding: 0 16px;
}

.fee-tab-switch {
  display: inline-flex;
  gap: 2px;
  align-items: center;
  padding: 2px;
  background: #f5f5f5;
  border-radius: 6px;
}

.fee-tab-switch__item {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 4px 12px;
  font-size: 13px;
  line-height: 22px;
  color: #595959;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;
  transition: all 0.15s;

  &:hover {
    color: #1677ff;
  }

  &--active {
    font-weight: 600;
    color: #1677ff;
    background: #fff;
    box-shadow: 0 1px 2px rgb(0 0 0 / 6%);
  }
}
</style>
