<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';
import type { CurrencyAdminApi } from '#/api/system/base-data/currency-admin';

import { computed, onMounted, ref, watch, h, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getCurrencyEnumOptions,
  getCurrencyEnumSymbolOptions,
  getFeeStatusValueByLabel,
} from '#/views/_shared/order-fee/data';
import { getCurrencyPagedList } from '#/api/system/base-data/currency-admin';
import {
  Button,
  Space,
  Textarea,
  message,
  DropdownButton,
  MenuItem,
  Menu,
  Modal,
  Card,
} from 'ant-design-vue';

import { $t } from '#/locales';

import OrderFeeTable from '#/views/_shared/order-fee/modules/all-order-fee-table.vue';
import {
  OrderFeeAuditAsync,
  OrderFeeRejectedAsync,
} from '#/api/audit-approval/expense-admin';
import {
  ArrowLeft,
  FileText,
  MapPin,
  Package,
  Save,
  Ship,
  Users,
} from '@vben/icons';

const dataSourceRec = ref<ExpenseSubmissionAdminApi.OrderFeeAndTaskDto[]>([]);
const dataSourcePay = ref<ExpenseSubmissionAdminApi.OrderFeeAndTaskDto[]>([]);

const dataSource = computed(() => [
  ...dataSourceRec.value,
  ...dataSourcePay.value,
]);

/**
 * 将费用金额/币别等数值字段转为可用于合计的数字。
 * 申请修改状态的费用明细，字段会被展示层改写为 "原值 => [新值]" 字符串，
 * 合计时应取尚未生效的原值（"=>" 之前的部分）。
 */
const toNumberAmount = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const original = value.split('=>')[0]?.trim() ?? '';
    const num = Number(original);
    if (Number.isFinite(num)) {
      return num;
    }
  }
  return 0;
};

const totalFeeRec = computed(() => {
  console.log(dataSourceRec.value);
  return dataSourceRec.value.reduce(
    (acc, cur) => acc + toNumberAmount(cur.amount),
    0,
  );
});

const selectedRecKeys = ref<(string | number)[]>([]);
const selectedPayKeys = ref<(string | number)[]>([]);

const selectedRowKeys = computed(() => [
  ...selectedRecKeys.value,
  ...selectedPayKeys.value,
]);

const childRecRef = ref<any>(null);
const childPayRef = ref<any>(null);

// 币别符号映射表（从API获取）
const currencySymbolMap = ref<Record<number, string>>({});

// 拖动相关状态
const topHeight = ref<number>(50); // 上半部分高度百分比（垂直布局）
const leftWidth = ref<number>(50); // 左半部分宽度百分比（水平布局）
const isDragging = ref<boolean>(false);
const dragDirection = ref<'vertical' | 'horizontal'>('vertical'); // 拖动方向

// 开始垂直拖动（上下）
const startVerticalDrag = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = true;
  dragDirection.value = 'vertical';

  const container = document.querySelector('.split-container') as HTMLElement;
  if (!container) return;

  const startY = e.clientY;
  const startHeight = topHeight.value;

  const onMouseMove = (moveEvent: MouseEvent) => {
    if (!isDragging.value) return;

    moveEvent.preventDefault();

    // 每次移动时重新获取容器高度，确保准确性
    const containerRect = container.getBoundingClientRect();
    const deltaY = moveEvent.clientY - startY;
    const containerHeight = containerRect.height;

    if (containerHeight === 0) return;

    const deltaPercent = (deltaY / containerHeight) * 100;

    // 限制拖动范围，最小10%，最大90%
    let newHeight = startHeight + deltaPercent;
    newHeight = Math.max(10, Math.min(90, newHeight));

    topHeight.value = newHeight;
  };

  const onMouseUp = () => {
    isDragging.value = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.body.style.cursor = 'row-resize';
  document.body.style.userSelect = 'none';
};

// 开始水平拖动（左右）
const startHorizontalDrag = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = true;
  dragDirection.value = 'horizontal';

  const container = document.querySelector('.split-container') as HTMLElement;
  if (!container) return;

  const startX = e.clientX;
  const startWidth = leftWidth.value;

  const onMouseMove = (moveEvent: MouseEvent) => {
    if (!isDragging.value) return;

    moveEvent.preventDefault();

    // 每次移动时重新获取容器宽度，确保准确性
    const containerRect = container.getBoundingClientRect();
    const deltaX = moveEvent.clientX - startX;
    const containerWidth = containerRect.width;

    if (containerWidth === 0) return;

    const deltaPercent = (deltaX / containerWidth) * 100;

    // 限制拖动范围，最小10%，最大90%
    let newWidth = startWidth + deltaPercent;
    newWidth = Math.max(10, Math.min(90, newWidth));

    leftWidth.value = newWidth;
  };

  const onMouseUp = () => {
    isDragging.value = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
};

const props = defineProps<{
  orderName?: string;
  transportOrderId?: string;
  entityId?: string;
  feeTableType?: string;
  changeOrderId?: string | null; // ✅ 新增：更改单 id，用于精确定位费用任务
}>();

const route = useRoute();
const router = useRouter();

/**
 * 两种打开方式：
 * 1) 嵌在费用审核列表下方：父组件传 transportOrderId / entityId
 * 2) 独立路由 ExpenseDetail：从本页路由参数取 id / entityId
 *
 * 禁止：嵌套模式下用全局 route.params.id 兜底。
 * keepAlive 的费用审核页在切到其它带 :id 的页面（如付费申请编辑）时，
 * 若仍读当前路由 params，会把别人的 id 当成业务单 id 去请求。
 */
const isStandalone = computed(() => route.name === 'ExpenseDetail');
const resolvedTransportOrderId = computed(() => {
  if (isStandalone.value) {
    return String(route.params.id ?? '');
  }
  return props.transportOrderId ? String(props.transportOrderId) : '';
});
const resolvedEntityId = computed(() => {
  if (isStandalone.value) {
    return String(route.params.entityId ?? '');
  }
  return props.entityId ? String(props.entityId) : '';
});
const standaloneTableType = ref<string>('horizontal');

const totalFee = (
  dataSource: ExpenseSubmissionAdminApi.OrderFeeAndTaskDto[],
) => {
  console.log('totalFee', dataSource);
};

const SubmittedOther = async (e: any) => {
  console.log('SubmittedOther', e);
  showConfirmWithRemark(true, e.key);
};
const showConfirmWithRemark = (approve: boolean = true, type: string = '') => {
  let modalRemark = '';
  if (approve) {
    switch (type) {
      case 'all': {
        allPass(approve, modalRemark);
        break;
      }
      case 'selectPass': {
        selectPass(approve, modalRemark);
        break;
      }
      case 'recPass': {
        recPass(approve, modalRemark);
        break;
      }
      case 'payPass': {
        payPass(approve, modalRemark);
        break;
      }
    }

    return;
  }
  // 创建弹窗实例
  Modal.confirm({
    title: approve
      ? $t('auditApproval.task.okPass')
      : $t('auditApproval.task.noPass'),
    content: () =>
      h('div', {}, [
        h(Textarea, {
          modelValue: modalRemark,
          onChange: (val: any) => {
            modalRemark = val.target?.value || val;
            console.log('Textarea changed:', modalRemark);
          },
          rows: 3,
          placeholder: $t('auditApproval.task.remarkPlaceholder'),
          maxlength: 100,
          style: 'margin-top: 8px;',
        }),
      ]),
    icon: null,
    width: 520,
    centered: true,
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    async onOk() {
      switch (type) {
        case 'all': {
          allPass(approve, modalRemark);
          break;
        }
        case 'selectPass': {
          selectPass(approve, modalRemark);
          break;
        }
        case 'recPass': {
          recPass(approve, modalRemark);
          break;
        }
        case 'payPass': {
          payPass(approve, modalRemark);
          break;
        }
      }
    },
    onCancel() {
      modalRemark = '';
    },
  });
};

const showRejectWithRemark = () => {
  // 检查是否有选中的费用
  if (!selectedRowKeys.value.length) {
    message.warning({
      content: $t('auditApproval.task.noPassSelect'),
      key: 'action_process_msg',
    });
    return;
  }

  const keysSet = new Set(selectedRowKeys.value);
  const selectedList = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );

  // 检查选中的费用是否包含已审核通过的费用
  const hasPassedFees = selectedList.some(
    (item) => item.combinedFeeStatus === getFeeStatusValueByLabel('Passed'),
  );

  // 检查选中的费用是否包含待审核的费用
  const hasPendingFees = selectedList.some(
    (item) =>
      item.combinedFeeStatus === getFeeStatusValueByLabel('Submitted') ||
      item.combinedFeeStatus === getFeeStatusValueByLabel('Modification') ||
      item.combinedFeeStatus === getFeeStatusValueByLabel('Deletion'),
  );

  // 如果同时包含已审核和待审核的费用，提示用户不能混合操作
  if (hasPassedFees && hasPendingFees) {
    message.warning({
      content: '不能同时驳回已审核和待审核的费用，请分别选择',
      key: 'action_process_msg',
    });
    return;
  }

  // 如果没有任何可驳回的费用
  if (!hasPassedFees && !hasPendingFees) {
    message.warning({
      content: '选中的费用中没有可驳回的费用',
      key: 'action_process_msg',
    });
    return;
  }

  let modalRemark = '';

  // 根据费用状态确定驳回类型和使用的接口
  const rejectType = hasPassedFees ? '审核后驳回' : '费用驳回';
  const useRejectApi = hasPassedFees; // true: 使用OrderFeeRejectedAsync, false: 使用OrderFeeAuditAsync

  // 创建弹窗实例
  const modal = Modal.confirm({
    title: `${rejectType}`,
    content: () =>
      h('div', {}, [
        h(Textarea, {
          modelValue: modalRemark,
          onChange: (val: any) => {
            modalRemark = val.target?.value || val;
            console.log('Textarea changed:', modalRemark);
          },
          rows: 3,
          placeholder: $t('auditApproval.task.remarkPlaceholder'),
          maxlength: 100,
          style: 'margin-top: 8px;',
        }),
      ]),
    icon: null,
    width: 520,
    centered: true,
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    async onOk() {
      await nextTick(); // 等待 Vue 响应式更新完成

      // 根据费用状态调用不同的接口
      if (useRejectApi) {
        // 已审核通过的费用，使用OrderFeeRejectedAsync接口（审核后驳回）
        Rejected(modalRemark, selectedList);
      } else {
        // 待审核的费用，使用OrderFeeAuditAsync接口（费用驳回）
        RejectPending(modalRemark, selectedList);
      }
    },
    onCancel() {
      modalRemark = '';
    },
  });
};

/**
 * 审核后驳回（针对已审核通过的费用）
 * 调用 OrderFeeRejectedAsync 接口
 */
const Rejected = (
  modalRemark: string,
  selectedList?: ExpenseSubmissionAdminApi.OrderFeeAndTaskDto[],
) => {
  // 如果没有传入选中的列表，则从 selectedRowKeys 中获取
  const list =
    selectedList ||
    (() => {
      if (!selectedRowKeys.value.length) return [];
      const keysSet = new Set(selectedRowKeys.value);
      return (dataSource.value ?? []).filter((row) =>
        keysSet.has((row as any)._rowKey),
      );
    })();

  if (!list.length) return;

  const OrderFeeRejectedAsyncDto: ExpenseSubmissionAdminApi.OrderFeeTaskRejectedDto =
    {
      remark: modalRemark,
      orderFeeIds: list.map((item) => item.id),
    };

  OrderFeeRejectedAsync(OrderFeeRejectedAsyncDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};

/**
 * 费用驳回（针对待审核的费用）
 * 调用 OrderFeeAuditAsync 接口，传入 success=false
 */
const RejectPending = (
  modalRemark: string,
  selectedList?: ExpenseSubmissionAdminApi.OrderFeeAndTaskDto[],
) => {
  // 如果没有传入选中的列表，则从 selectedRowKeys 中获取
  const list =
    selectedList ||
    (() => {
      if (!selectedRowKeys.value.length) return [];
      const keysSet = new Set(selectedRowKeys.value);
      return (dataSource.value ?? []).filter((row) =>
        keysSet.has((row as any)._rowKey),
      );
    })();

  if (!list.length) return;

  const ids = list.map((item) => item.id);

  // 调用统一的审核接口，传入 success=false 表示驳回
  OrderFeeAuditByStatus(false, modalRemark, ids);
};

/**
 * 统一的审核接口调用
 * @param approve 是否通过
 * @param modalRemark 备注
 * @param ids 费用ID列表（包含所有需要审核的费用，不区分状态）
 */
const OrderFeeAuditByStatus = async (
  approve: boolean,
  modalRemark: string,
  ids: string[],
) => {
  if (!ids.length) return;

  console.log('审核费用ID列表:', ids);

  try {
    // 统一调用 OrderFeeAuditAsync 接口
    const dto: ExpenseSubmissionAdminApi.OrderFeeTaskAuditDto = {
      success: approve,
      remark: modalRemark,
      orderFeeIds: ids,
    };

    await OrderFeeAuditAsync(dto);

    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  } catch (error) {
    console.error('审核失败:', error);
    message.error({
      content: $t('ui.actionMessage.operationFailed'),
      key: 'action_process_msg',
    });
  }
};

const selectPass = (approve: boolean, modalRemark: string) => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );
  const ids = list.map((item) => item.id);
  OrderFeeAuditByStatus(approve, modalRemark, ids);
};

const allPass = (approve: boolean, modalRemark: string) => {
  console.log('dataSource.value', dataSource.value);
  const ids = (dataSource.value ?? [])
    .filter(
      (item) =>
        item.combinedFeeStatus === getFeeStatusValueByLabel('Submitted') ||
        item.combinedFeeStatus === getFeeStatusValueByLabel('Modification') ||
        item.combinedFeeStatus === getFeeStatusValueByLabel('Deletion'),
    )
    .map((item) => item.id);
  if (!ids.length) {
    message.warning({
      content: $t('auditApproval.task.noPassSelect'),
      key: 'action_process_msg',
    });
    return;
  }
  OrderFeeAuditByStatus(approve, modalRemark, ids);
};

const recPass = (approve: boolean, modalRemark: string) => {
  // 过滤出应收下已提交待审核的费用（排除已审核和未提交的费用）
  const ids = (dataSourceRec.value ?? [])
    .filter(
      (item) =>
        item.combinedFeeStatus === getFeeStatusValueByLabel('Submitted') ||
        item.combinedFeeStatus === getFeeStatusValueByLabel('Modification') ||
        item.combinedFeeStatus === getFeeStatusValueByLabel('Deletion'),
    )
    .map((item) => item.id);

  if (!ids.length) {
    message.warning({
      content: $t('auditApproval.task.noPassSelect'),
      key: 'action_process_msg',
    });
    return;
  }

  OrderFeeAuditByStatus(approve, modalRemark, ids);
};

const payPass = (approve: boolean, modalRemark: string) => {
  // 过滤出应付下已提交待审核的费用（排除已审核和未提交的费用）
  const ids = (dataSourcePay.value ?? [])
    .filter(
      (item) =>
        item.combinedFeeStatus === getFeeStatusValueByLabel('Submitted') ||
        item.combinedFeeStatus === getFeeStatusValueByLabel('Modification') ||
        item.combinedFeeStatus === getFeeStatusValueByLabel('Deletion'),
    )
    .map((item) => item.id);

  if (!ids.length) {
    message.warning({
      content: $t('auditApproval.task.noPassSelect'),
      key: 'action_process_msg',
    });
    return;
  }

  OrderFeeAuditByStatus(approve, modalRemark, ids);
};

const layout = computed(() => {
  return props.feeTableType || standaloneTableType.value;
});

const changeStandaloneTableType = (type: string) => {
  standaloneTableType.value = type;
};

const getTableDate = (changeOrderId?: string | null) => {
  if (childRecRef.value) {
    childRecRef.value.getTableDate(changeOrderId || null);
  }
  if (childPayRef.value) {
    childPayRef.value.getTableDate(changeOrderId || null);
  }
};
const transCurrencySymbol = (currencyId: number) => {
  // 优先从API获取的映射表中查找
  if (currencySymbolMap.value[currencyId]) {
    return currencySymbolMap.value[currencyId];
  }

  // 如果映射表中没有，则使用默认的硬编码选项
  const option = getCurrencyEnumSymbolOptions().find(
    (o) => o.value === currencyId,
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
  console.log(totalList);
  let totalPay = 0;
  let totalRec = 0;

  totalList.forEach((item) => {
    let recName = `应收${item.currencyName}:`;
    let recColor = 'green';
    let recAmount = (Number(item.totalRecAmount) || 0).toFixed(2);
    list.push({
      name: recName,
      color: recColor,
      value: transCurrencySymbol(item.currencyId) + recAmount,
    });
    totalRec += Number(item.totalRMBRecAmount) || 0;

    let payName = `应付${item.currencyName}:`;
    let payColor = 'yellow';
    let payAmount = (Number(item.totalPayAmount) || 0).toFixed(2);
    list.push({
      name: payName,
      color: payColor,
      value: transCurrencySymbol(item.currencyId) + payAmount,
    });
    totalPay += Number(item.totalRMBPayAmount) || 0;

    let profitName = `${item.currencyName}利润:`;
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
const handleReceivableTableUpdate = (
  data: ExpenseSubmissionAdminApi.OrderFeeAndTaskDto[],
) => {
  dataSourceRec.value = data;

  recAmountMap.value = {};
  const currencyIdList = dataSourceRec.value.map((item) =>
    toNumberAmount(item.currencyId),
  );
  currencyIdList.forEach((item) => {
    if (!item) return;

    let list = dataSourceRec.value.filter(
      (item2) => toNumberAmount(item2.currencyId) === item,
    );
    let totalRecAmount = list.reduce((acc, cur) => {
      return acc + toNumberAmount(cur.amount);
    }, 0);
    let totalRMBRecAmount = list.reduce((acc, cur) => {
      return (
        acc +
        toNumberAmount(cur.amount) * (toNumberAmount(cur.exchangeRate) || 1)
      );
    }, 0);
    let exchangeRate = toNumberAmount(list[0]?.exchangeRate) || 1;
    let currencyName = list[0]?.currency?.cnName ?? list[0]?.currency?.code;
    let currencyId = item;
    recAmountMap.value[item] = {
      totalRecAmount,
      totalRMBRecAmount,
      exchangeRate,
      currencyName,
      currencyId,
    };
    console.log('recAmountMap', recAmountMap);
  });
};

const handlePayableTableUpdate = (
  data: ExpenseSubmissionAdminApi.OrderFeeAndTaskDto[],
) => {
  dataSourcePay.value = data;

  payAmountMap.value = {};
  const currencyIdList = dataSourcePay.value.map((item) =>
    toNumberAmount(item.currencyId),
  );
  currencyIdList.forEach((item) => {
    if (!item) return;

    let list = dataSourcePay.value.filter(
      (item2) => toNumberAmount(item2.currencyId) === item,
    );
    let totalPayAmount = list.reduce((acc, cur) => {
      return acc + toNumberAmount(cur.amount);
    }, 0);
    let totalRMBPayAmount = list.reduce((acc, cur) => {
      return (
        acc +
        toNumberAmount(cur.amount) * (toNumberAmount(cur.exchangeRate) || 1)
      );
    }, 0);
    let exchangeRate = toNumberAmount(list[0]?.exchangeRate) || 1;
    let currencyName = list[0]?.currency?.cnName ?? list[0]?.currency?.code;
    let currencyId = item;
    payAmountMap.value[item] = {
      totalPayAmount,
      totalRMBPayAmount,
      exchangeRate,
      currencyName,
      currencyId,
    };
    console.log('payAmountMap', payAmountMap);
  });
};

const handleReceivableTableSelect = (arr: (string | number)[]) => {
  selectedRecKeys.value = arr;
};
const handlePayableTableSelect = (arr: (string | number)[]) => {
  selectedPayKeys.value = arr;
};

/**
 * 加载所有币别并构建符号映射表
 */
const loadCurrencySymbols = async () => {
  try {
    // 获取所有币别（使用较大的pageSize确保获取全部）
    const result = await getCurrencyPagedList({
      PageIndex: 1,
      PageSize: 1000,
    });

    if (result && result.items) {
      // 构建币别ID到符号的映射
      const symbolMap: Record<number, string> = {};
      result.items.forEach((currency: CurrencyAdminApi.CurrencyDto) => {
        if (currency.id && currency.symbol) {
          symbolMap[currency.id] = currency.symbol;
        }
      });
      currencySymbolMap.value = symbolMap;
      console.log('✅ 已加载币别符号映射:', symbolMap);
    }
  } catch (error) {
    console.error('❌ 加载币别符号失败:', error);
    // 失败时使用默认的硬编码映射
    const defaultOptions = getCurrencyEnumSymbolOptions();
    const symbolMap: Record<number, string> = {};
    defaultOptions.forEach((opt) => {
      symbolMap[opt.value] = opt.label;
    });
    currencySymbolMap.value = symbolMap;
  }
};

// 必须显式暴露
defineExpose({
  getTableDate,
});

// 组件挂载时加载币别符号
onMounted(() => {
  loadCurrencySymbols();
});
</script>

<template>
  <div
    :class="
      isStandalone ? 'expense-detail-standalone' : 'expense-detail-nested'
    "
  >
    <div v-if="isStandalone" class="standalone-toolbar mb-2 flex items-center">
      <Button @click="router.back()">
        <ArrowLeft class="size-4" />
        {{ $t('common.back') }}
      </Button>
      <span class="split mx-4 flex">|</span>
      <Button
        class="mr-2"
        :class="[layout === 'vertical' ? 'green-btn' : '']"
        @click="changeStandaloneTableType('vertical')"
      >
        {{ $t('auditApproval.tableType.vertical') }}
      </Button>
      <Button
        :class="[layout === 'horizontal' ? 'green-btn' : '']"
        @click="changeStandaloneTableType('horizontal')"
      >
        {{ $t('auditApproval.tableType.horizontal') }}
      </Button>
    </div>
    <div class="flex min-h-0 flex-1 items-stretch">
      <!--  -->
      <div class="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
        <Card class="fee-detail-card min-h-0 flex-1">
          <template #title>
            <div class="flex items-center">
              <span class="fee-detail-title mr-2 flex items-center gap-2">
                <Package class="size-4" />
                {{ $t('seaExport.export.orderFee.feeDetail') }}
              </span>
              <div class="my-1 flex items-center justify-between">
                <Space>
                  <!-- <Button type="primary" size="small" :disabled="!selectedRowKeys.length"
                  @click="showConfirmWithRemark(true)">
                  {{ $t('auditApproval.Passed') }}
                </Button> -->
                  <DropdownButton
                    @click="showConfirmWithRemark(true, 'all')"
                    size="small"
                    type="primary"
                  >
                    {{ $t('auditApproval.task.allPass') }}
                    <template #overlay>
                      <Menu @click="SubmittedOther">
                        <MenuItem key="selectPass">
                          {{ $t('auditApproval.task.selectPass') }}
                        </MenuItem>
                        <MenuItem key="recPass">
                          {{ $t('auditApproval.task.recPass') }}
                        </MenuItem>
                        <MenuItem key="payPass">
                          {{ $t('auditApproval.task.payPass') }}
                        </MenuItem>
                      </Menu>
                    </template>
                  </DropdownButton>
                  <Button
                    danger
                    size="small"
                    :disabled="!selectedRowKeys.length"
                    @click="showRejectWithRemark"
                  >
                    {{ $t('auditApproval.Rejected') }}
                  </Button>
                </Space>
              </div>
              <div class="select-name flex flex-1 text-sm font-normal">
                {{ props.orderName }}
              </div>
            </div>
          </template>
          <div
            class="split-container"
            :class="[layout === 'horizontal' ? 'flex-row' : 'flex-col']"
          >
            <!-- 左侧/上侧区域 -->
            <div
              class="left-top-section mt-1"
              :style="{
                height: layout === 'horizontal' ? '100%' : `${topHeight}%`,
                width: layout === 'horizontal' ? `${leftWidth}%` : 'auto',
                flex: layout === 'horizontal' ? `0 0 ${leftWidth}%` : 'none',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }"
            >
              <OrderFeeTable
                @update-table-data="handleReceivableTableUpdate"
                @update-select-data="handleReceivableTableSelect"
                :transportOrderId="resolvedTransportOrderId"
                :entityId="resolvedEntityId"
                :changeOrderId="props.changeOrderId"
                :type="0"
                ref="childRecRef"
              />
            </div>

            <!-- 垂直拖动分隔条（上下布局） -->
            <div
              v-if="layout !== 'horizontal'"
              class="drag-handle drag-handle-vertical"
              :class="{ dragging: isDragging && dragDirection === 'vertical' }"
              @mousedown="startVerticalDrag"
            >
              <div class="drag-line"></div>
            </div>

            <!-- 水平拖动分隔条（左右布局） -->
            <div
              v-if="layout === 'horizontal'"
              class="drag-handle drag-handle-horizontal"
              :class="{
                dragging: isDragging && dragDirection === 'horizontal',
              }"
              @mousedown="startHorizontalDrag"
            >
              <div class="drag-line"></div>
            </div>

            <!-- 右侧/下侧区域 -->
            <div
              class="right-bottom-section mt-1"
              :style="{
                height:
                  layout === 'horizontal' ? '100%' : `${100 - topHeight}%`,
                width: layout === 'horizontal' ? `${100 - leftWidth}%` : 'auto',
                flex:
                  layout === 'horizontal' ? `0 0 ${100 - leftWidth}%` : 'none',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }"
            >
              <OrderFeeTable
                @update-table-data="handlePayableTableUpdate"
                @update-select-data="handlePayableTableSelect"
                :transportOrderId="resolvedTransportOrderId"
                :entityId="resolvedEntityId"
                :changeOrderId="props.changeOrderId"
                :type="1"
                ref="childPayRef"
              />
            </div>
          </div>
        </Card>
        <div class="total-amount flex flex-shrink-0 rounded-lg px-4 py-2">
          <div
            v-for="(item, index) in totalAmount"
            class="mr-4 flex items-center"
            :key="item.name"
          >
            <span class="flex">{{ item.name }}</span>
            <span class="ml-2 flex font-semibold" :class="item.color">{{
              item.value
            }}</span>
            <span class="split mx-4 flex" v-show="(index + 1) % 3 === 0"
              >|
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.select-name {
  flex-direction: row-reverse;
  padding: 2px 10px;
  color: #52607a;
  border-radius: 6px;
}

// 费用明细卡片：强化卡片层次与标题品牌感
.fee-detail-card {
  overflow: hidden;
  border: 1px solid #e8ecf3;
  border-radius: 10px;
  box-shadow:
    0 1px 2px rgb(16 42 83 / 4%),
    0 4px 12px rgb(16 42 83 / 5%);

  :deep(.ant-card-head) {
    background: linear-gradient(90deg, #f4f8ff 0%, #fafbfd 60%, #fff 100%);
    border-bottom: 1px solid #e8ecf3;
  }

  :deep(.ant-card-head-title) {
    padding: 10px 0;
  }

  .fee-detail-title {
    font-size: 15px;
    font-weight: 600;
    color: #1f2d3d;

    :deep(svg) {
      color: #1890ff;
    }
  }
}

.total-amount {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  font-size: 13px;
  color: #52607a;
  background: linear-gradient(90deg, #f7faff 0%, #fff 55%, #f7faff 100%);
  border: 1px solid #e8ecf3;
  box-shadow: 0 2px 8px rgb(16 42 83 / 5%);

  .split {
    color: #d9dee8;
  }
}

.green {
  color: #00a862;
}

.yellow {
  color: #f59e0b;
}

.blue {
  color: #1890ff;
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

// 分隔容器：仅定义基础布局；具体高度由「内嵌 / 独立」两种模式分别驱动（见下方）
.split-container {
  position: relative;
  display: flex;

  &.flex-col {
    flex-direction: column;
  }

  &.flex-row {
    flex-direction: row;
    width: 100%;
  }

  .left-top-section,
  .right-bottom-section {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: all 0.1s ease-out;

    // 确保子组件能够填满父容器
    > * {
      flex: 1;
      min-width: 0;
      min-height: 0;
    }
  }
}

// 内嵌模式（费用审核页 index.vue 下方）：整条高度链由父级 flex 驱动。
// 卡片与分隔容器填满父级分配的剩余空间，费用明细表格高度随分辨率自适应，
// 页面不再出现纵向滚动条（此前固定 400px / calc(100vh) 会在小屏溢出）。
.expense-detail-nested {
  display: flex;
  flex-direction: column;
  min-height: 0;

  .fee-detail-card {
    display: flex;
    flex-direction: column;
    min-height: 0;

    // 卡片头部（标题 + 审核按钮）不参与压缩，始终完整显示
    :deep(.ant-card-head) {
      flex-shrink: 0;
    }

    :deep(.ant-card-body) {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
    }
  }

  .split-container {
    flex: 1;
    min-height: 0;
  }
}

// 独立路由模式（ExpenseDetail）：根节点直接位于带 padding 的布局内容区、无 flex 高度父级，
// 沿用视口高度(100vh)驱动，保持原有行为不变。
.expense-detail-standalone {
  .split-container {
    &.flex-col {
      height: calc(100vh - 300px);
      min-height: 580px;
      max-height: calc(100vh - 200px);
    }

    &.flex-row {
      // ✅ 左右布局时固定高度为 400px
      height: 400px;
    }
  }
}

// 拖动分隔条通用样式：默认弱存在感，悬停/拖拽时高亮反馈
.drag-handle {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;

  &.dragging {
    .drag-line {
      background-color: #1890ff;
      box-shadow: 0 0 8px rgb(24 144 255 / 40%);
    }
  }

  &:hover .drag-line {
    background-color: #1890ff;
    box-shadow: 0 0 6px rgb(24 144 255 / 30%);
  }

  .drag-line {
    background-color: #e4e8ef;
    border-radius: 999px;
    transition: all 0.2s ease;
  }
}

// 垂直拖动分隔条（上下布局）
.drag-handle-vertical {
  height: 12px;
  margin: 4px 0;
  cursor: row-resize;

  &.dragging {
    cursor: row-resize;
  }

  .drag-line {
    width: 48px;
    height: 4px;
  }
}

// 水平拖动分隔条（左右布局）
.drag-handle-horizontal {
  width: 12px;
  margin: 0 4px;
  cursor: col-resize;

  &.dragging {
    cursor: col-resize;
  }

  .drag-line {
    width: 4px;
    height: 48px;
  }
}
</style>
