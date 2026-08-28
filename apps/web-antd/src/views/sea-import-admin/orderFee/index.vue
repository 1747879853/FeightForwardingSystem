<script lang="ts" setup>
import type { SeaImportAdminApi } from '#/api/sea-import/sea-import-admin';
import {
  getOrderFeePagedList,
  getOrderFeeCount,
} from '#/api/sea-import/order-fee-admin';
import dayjs from 'dayjs';
import { computed, nextTick, onMounted, ref, watch, h } from 'vue';
import { useRouter } from 'vue-router';
import {
  getCurrencyEnumOptions,
  getCurrencyEnumSymbolOptions,
} from '#/views/sea-import-admin/orderFee/data';
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
import { getSeaImportDetail } from '#/api/sea-import/sea-import-admin';
import { useKeepAliveRouteParamId } from '#/composables/use-keep-alive-route-param-id';
import { UserAttribute } from '#/api/system/user-admin';
import { $t } from '#/locales';

import OrderFeeTable from './modules/order-fee-table-handsontable.vue';
import {
  tryOpenPaymentApplicationFromSelectedFees,
  collectOrderFeesForPaymentNav,
} from '#/views/fee-management/payment-application/open-from-order-fees';
import { createAbpPermission } from '#/utils/abp-permission';
import DisplayFieldsConfigModal, {
  type DisplayFieldConfig,
} from './modules/display-fields-config-modal.vue';
import { useDisplayFieldConfig } from './composables/use-display-field-config';
import { buildAttachmentUrl } from '#/utils';
// ✅ 新增：导入下拉框数据源管理
import { useDropdownSources } from './modules/composables/useDropdownSources';

// 导入费用操作相关的 API
import {
  submitOrderFee,
  modifyOrderFee,
  deleteOrderFee,
  OrderFeeTaskWithdraw,
} from '#/api/audit-approval/expense-admin';

defineOptions({
  name: 'OrderFee',
});

const emit = defineEmits<{
  (
    e: 'fee-count-change',
    payload: { recCount: number; payCount: number },
  ): void;
}>();

/** 编辑页保存成功后下发的最新详情：直接替换信息卡片与费用表 order-detail */
const props = defineProps<{
  latestDetail?: SeaImportAdminApi.SeaImportDto;
}>();

const router = useRouter();
const paymentApplicationPerm = createAbpPermission('Admin.PaymentApplication');
const paymentApplicationNavLoading = ref(false);

const editId = useKeepAliveRouteParamId();

const isEdit = computed(() => !!editId.value);

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

// 所有可用的显示字段配置
const allDisplayFields: DisplayFieldConfig[] = [
  { key: 'mblNum', label: $t('seaImport.import.mblNum'), visible: true },
  {
    key: 'commissionNum',
    label: $t('seaImport.import.commissionNum'),
    visible: true,
  },
  { key: 'clientName', label: $t('seaImport.import.clientId'), visible: true },
  { key: 'teamName', label: $t('seaImport.import.teamId'), visible: true },
  { key: 'vessel', label: $t('seaImport.import.vessel'), visible: true },
  {
    key: 'innerVoyno',
    label: $t('seaImport.import.innerVoyno'),
    visible: true,
  },
  {
    key: 'carrierName',
    label: $t('seaImport.import.carrierId'),
    visible: true,
  },
  { key: 'polName', label: $t('seaImport.import.polId'), visible: true },
  { key: 'podName', label: $t('seaImport.import.podId'), visible: true },
  {
    key: 'arrivalDate',
    label: $t('seaImport.import.arrivalDate'),
    visible: true,
  },
  {
    key: 'exchangeBillDate',
    label: $t('seaImport.import.exchangeBillDate'),
    visible: true,
  },
  {
    key: 'pickUpDate',
    label: $t('seaImport.import.pickUpDate'),
    visible: true,
  },
  {
    key: 'customsDeclareDate',
    label: $t('seaImport.import.customsDeclareDate'),
    visible: true,
  },
  {
    key: 'transferStationDate',
    label: $t('seaImport.import.transferStationDate'),
    visible: true,
  },
  {
    key: 'ctnUseDate',
    label: $t('seaImport.import.ctnUseDate'),
    visible: true,
  },
  {
    key: 'freeDays',
    label: $t('seaImport.import.freeDays'),
    visible: true,
  },
  { key: 'noPkgs', label: $t('seaImport.import.noPkgs'), visible: true },
  { key: 'kgs', label: $t('seaImport.import.kgs'), visible: true },
  { key: 'cbm', label: $t('seaImport.import.cbm'), visible: true },
  { key: 'goodsDes', label: $t('seaImport.import.goodsDes'), visible: true },
];

// 使用共享的显示字段配置管理
const { displayFieldConfig, handleConfigConfirm } = useDisplayFieldConfig(
  allDisplayFields,
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

    // 根据 key 获取对应的值
    switch (field.key) {
      case 'mblNum':
        value = to.value?.mblNum || '--';
        break;
      case 'commissionNum':
        value = to.value?.commissionNum || '--';
        break;
      case 'clientName':
        value = to.value?.client?.name || '--';
        break;
      case 'teamName':
        value = to.value?.team?.name || '--';
        break;
      case 'vessel':
        value = formValues.value?.vessel || '--';
        break;
      case 'innerVoyno':
        value = formValues.value?.innerVoyno || '--';
        break;
      case 'carrierName':
        value =
          formValues.value?.carrier?.cnShortName ||
          formValues.value?.carrier?.cnName ||
          '--';
        break;
      case 'polName':
        value = formValues.value?.polRemark || '--';
        break;
      case 'podName':
        value = formValues.value?.podRemark || '--';
        break;
      case 'arrivalDate':
        value = formatNormalDate(to.value?.etd, 'YYYY-MM-DD');
        break;
      case 'exchangeBillDate':
        value = formatNormalDate(
          formValues.value?.exchangeBillDate,
          'YYYY-MM-DD',
        );
        break;
      case 'pickUpDate':
        value = formatNormalDate(formValues.value?.pickUpDate, 'YYYY-MM-DD');
        break;
      case 'customsDeclareDate':
        value = formatNormalDate(
          formValues.value?.customsDeclareDate,
          'YYYY-MM-DD',
        );
        break;
      case 'transferStationDate':
        value = formatNormalDate(
          formValues.value?.transferStationDate,
          'YYYY-MM-DD',
        );
        break;
      case 'ctnUseDate':
        value = formatNormalDate(formValues.value?.ctnUseDate, 'YYYY-MM-DD');
        break;
      case 'freeDays':
        value = formValues.value?.freeDays ?? '--';
        break;
      case 'noPkgs':
        value = to.value?.noPkgs ?? '--';
        break;
      case 'kgs':
        value = to.value?.kgs ?? '--';
        break;
      case 'cbm':
        value = to.value?.cbm ?? '--';
        break;
      case 'goodsDes':
        value = to.value?.goodsDes || '--';
        break;
      default:
        value = '--';
    }

    result.push({
      key: field.key,
      name: field.label,
      value:
        value === null || value === undefined || value === '' ? '--' : value,
    });
  });

  console.log('✅ displayList 生成完成，共', result.length, '个字段');
  return result;
});

const [Form] = useVbenForm({
  schema: [
    {
      component: 'Input',
      fieldName: 'commissionNum',
      label: $t('seaImport.import.commissionNum'),
    },
    {
      component: 'Input',
      fieldName: 'mblNum',
      label: $t('seaImport.import.mblNum'),
    },
  ],
  showDefaultActions: false,
});

// 应收费用数量
const recCount = ref<number>(0);
// 应付费用数量
const payCount = ref<number>(0);

// 应收金额汇总
const recAmountMap = ref<Record<string, any>>({});
// 应付金额汇总
const payAmountMap = ref<Record<string, any>>({});

const recTableRef = ref();
const payTableRef = ref();

// 订单详情数据
const orderDetail = ref<SeaImportAdminApi.SeaImportDto | null>(null);

// 显示字段配置弹窗引用
const configModalRef = ref<any>(null);

// 打开显示字段配置
const openDisplayFieldsConfig = () => {
  configModalRef.value?.open();
};

// 处理显示字段配置确认
const handleDisplayFieldsConfirm = (config: DisplayFieldConfig[]) => {
  handleConfigConfirm(config);
};

// 加载海运进口详情
const loadSeaImportDetail = async () => {
  if (!editId.value) {
    console.warn('⚠️ [loadSeaImportDetail] 没有 editId');
    return;
  }

  try {
    console.log('🔄 [loadSeaImportDetail] 开始加载海运进口详情...');
    pageLoading.value = true;

    const detail = await getSeaImportDetail(editId.value);
    console.log('✅ [loadSeaImportDetail] 加载成功:', detail);

    orderDetail.value = detail;
    formValues.value = detail as any;
    to.value = detail.transportOrder as any;
    transportOrderId.value = detail.id;

    // 设置箱型列表
    if (detail.orderCtns && Array.isArray(detail.orderCtns)) {
      orderCtnList.value = detail.orderCtns.map((ctn: any) => ({
        ctnCodeId: ctn.ctnCodeId,
        ctnCodeName: ctn.ctnCodeName,
      }));
    }

    // ✅ 新增：一次性加载全部客户数据
    await loadAllClients();

    // 加载费用数量统计
    await loadFeeCount();

    console.log('✅ [loadSeaImportDetail] 数据加载完成');
  } catch (error) {
    console.error('❌ [loadSeaImportDetail] 加载失败:', error);
    message.error($t('common.loadFailed'));
  } finally {
    pageLoading.value = false;
  }
};

// 加载费用数量统计
const loadFeeCount = async () => {
  if (!transportOrderId.value) return;

  try {
    const countData = await getOrderFeeCount({
      transportOrderId: transportOrderId.value,
    });

    recCount.value = countData.receivableCount || 0;
    payCount.value = countData.payableCount || 0;

    // 通知父组件费用数量变化
    emit('fee-count-change', {
      recCount: recCount.value,
      payCount: payCount.value,
    });

    console.log('✅ [loadFeeCount] 费用数量:', {
      receivable: recCount.value,
      payable: payCount.value,
    });
  } catch (error) {
    console.error('❌ [loadFeeCount] 加载失败:', error);
  }
};

// 修复：防止循环调用，只更新费用数量，不重新加载表格数据
const refreshFeeTables = () => {
  // 只更新费用数量统计，不调用 getTableDate() 避免循环
  loadFeeCount();
};

// ==================== 外层容器：选中的费用ID管理 ====================

// 存储选中的费用ID（应收+应付）
const selectedFeeIds = ref<string[]>([]);

// 应收和应付表格的引用
const recOrderFeeTableRef = ref();
const payOrderFeeTableRef = ref();

function isFeeDirty() {
  return !!(
    recOrderFeeTableRef.value?.isFeeDirty?.() ||
    payOrderFeeTableRef.value?.isFeeDirty?.()
  );
}

defineExpose({ isFeeDirty });

/**
 * 收集两个表格选中的费用ID
 */
const collectSelectedFeeIds = (): string[] => {
  const recIds = recOrderFeeTableRef.value?.getSelectedFeeIds() || [];
  const payIds = payOrderFeeTableRef.value?.getSelectedFeeIds() || [];
  selectedFeeIds.value = [...recIds, ...payIds];
  return selectedFeeIds.value;
};

/**
 * 处理表格选中变化事件
 */
const handleSelectionChange = (payload: {
  type: number;
  selectedIds: string[];
}) => {
  console.log('📋 收到选中变化事件:', payload);
  collectSelectedFeeIds();
};

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

// ==================== 费用操作功能 ====================

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

    message.success('整票提交成功');
    // 刷新两个表格
    recOrderFeeTableRef.value?.getTableDate();
    payOrderFeeTableRef.value?.getTableDate();
    // 清空选中状态
    selectedFeeIds.value = [];
  } catch (error) {
    console.error('整票提交失败:', error);
    message.error('整票提交失败');
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
  if (selectedFee.feeStatus !== 2) {
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
  if (tableRef?.openModifyModal) {
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
          transportOrderId: editId.value,
          orderFeeIds: feeIds,
          remark: remark,
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

// 返回列表
const handleBack = () => {
  router.back();
};

onMounted(async () => {
  console.log('🚀 [OrderFee] 组件挂载');
  await loadSeaImportDetail();
});

// 基础信息保存成功后，用最新详情整体替换（信息卡片 + 费用表 order-detail 联动）
watch(
  () => props.latestDetail,
  (detail) => {
    if (!detail) return;
    orderDetail.value = detail;
    formValues.value = detail as any;
    to.value = detail.transportOrder as any;
    transportOrderId.value = detail.id;
    if (detail.orderCtns && Array.isArray(detail.orderCtns)) {
      orderCtnList.value = detail.orderCtns.map((ctn: any) => ({
        ctnCodeId: ctn.ctnCodeId,
        ctnCodeName: ctn.ctnCodeName,
      }));
    }
  },
);
</script>

<template>
  <Page auto-content-height class="order-fee-page">
    <Spin :spinning="pageLoading || clientsLoading">
      <div class="mx-2 flex items-stretch gap-6">
        <!-- 左侧信息卡片 -->
        <Card class="flex w-[280px] shrink-0 flex-col">
          <template #title>
            <span class="flex items-center justify-between gap-2">
              <span class="flex items-center gap-2">
                <Users class="size-4" />
                {{ $t('seaExport.export.formCardInfo') }}
              </span>
              <Button
                type="text"
                size="small"
                @click="openDisplayFieldsConfig"
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
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <!-- 右侧操作按钮区域 -->
          <div class="flex justify-end gap-2 px-1">
            <Space>
              <!-- 调试信息 -->
              <span class="text-sm text-gray-500">
                已选中: {{ selectedFeeIds.length }} 条费用
              </span>

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

          <!-- 应收费用表格 -->
          <OrderFeeTable
            ref="recOrderFeeTableRef"
            :type="0"
            :edit-id="editId"
            :order-detail="orderDetail"
            :all-clients-by-industry="allClientsByIndustry"
            @sync-fee="refreshFeeTables"
            @update-amount="(data) => (recAmountMap = data)"
            @refresh-opposite-table="payOrderFeeTableRef?.getTableDate()"
            @selection-change="handleSelectionChange"
          />

          <!-- 应付费用表格 -->
          <OrderFeeTable
            ref="payOrderFeeTableRef"
            :type="1"
            :edit-id="editId"
            :order-detail="orderDetail"
            :all-clients-by-industry="allClientsByIndustry"
            @sync-fee="refreshFeeTables"
            @update-amount="(data) => (payAmountMap = data)"
            @refresh-opposite-table="recOrderFeeTableRef?.getTableDate()"
            @selection-change="handleSelectionChange"
          />
        </div>
      </div>
    </Spin>

    <!-- 显示字段配置弹窗 -->
    <DisplayFieldsConfigModal
      ref="configModalRef"
      :available-fields="displayFieldConfig"
      @confirm="handleDisplayFieldsConfirm"
    />
  </Page>
</template>

<style scoped lang="scss">
.order-fee-page {
  height: 100%;
  overflow: hidden;
}

/* 自定义滚动条样式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f5f5f5;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}
</style>
