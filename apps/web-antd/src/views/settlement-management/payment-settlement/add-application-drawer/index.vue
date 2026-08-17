<script lang="ts" setup>
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';
import type { PaymentSettlementAdminApi } from '#/api/sea-export/payment-settlement-admin';

import { computed, ref, h } from 'vue';
import dayjs from 'dayjs';

import {
  Drawer,
  Button,
  message,
  Space,
  Tag,
  InputNumber,
  Checkbox,
  Pagination,
} from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { CurrencySelect } from '#/adapter/component';
import { getPaymentApplicationPagedListByCurrencyForSettlement } from '#/api/sea-export/payment-settlement-admin';
// ❌ 已删除：2026-08-10起，不再需要汇率录入弹窗，汇率由后端从付费申请自动获取
import NestedDataTable from '#/components/nested-data-table/nested-data-table.vue';

import { useSearchSchema, getStatusTagProps } from './data';
interface Props {
  /** 付费结算ID（编辑时传入，用于排除已选择的申请） */
  paymentSettlementId?: string;
  /** 结算对象ID */
  settlementId?: string;
  /** 结算币别ID */
  currencyId?: number;
  /** 是否已有费用（用于控制筛选条件是否可修改） */
  hasExistingFees?: boolean;
  /** 已存在的申请ID列表（用于禁用这些申请的输入框） */
  existingApplicationIds?: string[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  confirm: [
    applications: Array<{
      application: PaymentSettlementAdminApi.PaymentApplicationCurrencyForSettlementDto;
      settledPrice: number; // 本行结算的净额（原币）
    }>,
    selectedCurrencyId?: number, // 用户在抽屉中选择的结算币别ID
  ];
}>();

const visible = ref(false);
const loading = ref(false);
const selectedRowKeys = ref<string[]>([]);
// ✅ 使用any类型数组，因为需要添加前端临时字段settledPrice
const dataSource = ref<any[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
// ✅ NestedDataTable 展开行控制
const expandedRowKeys = ref<(string | number)[]>([]);

// 结算币别选择（独立于搜索表单）
const selectedCurrencyId = ref<number | undefined>(undefined);

// ✅ 新增：结算对象选中项（用于 ClientSelect 回显）
const settlementSelectedItems = ref<any[]>([]);

// 查询表单
const [SearchForm, searchFormApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  layout: 'horizontal',
  schema: useSearchSchema(),
  showDefaultActions: false,
  compact: true,
  wrapperClass: 'grid-cols-4',
});

/** 打开抽屉 */
async function openDrawer() {
  visible.value = true;
  selectedRowKeys.value = [];
  currentPage.value = 1;

  // 重置独立的结算币别选择
  selectedCurrencyId.value = props.currencyId;

  // ✅ 重置结算对象选中项
  settlementSelectedItems.value = [];

  // 设置默认值
  await searchFormApi.resetForm();

  // ✅ 先设置结算对象和结算币别的值，并加载客户信息用于回显
  const formValues: any = {};

  if (props.settlementId) {
    formValues.settlementId = props.settlementId;

    // ✅ 加载结算对象信息用于 ClientSelect 回显
    try {
      const { getClientDetail } = await import('#/api/sea-export/client-admin');
      const detail = await getClientDetail(props.settlementId);
      settlementSelectedItems.value = [
        {
          id: detail.id,
          name: detail.name || '',
          fullName: detail.fullName || '',
        },
      ];
      console.log('✅ 加载结算对象信息成功:', settlementSelectedItems.value);
    } catch (error) {
      console.error('❌ 加载结算对象信息失败:', error);
    }
  }

  if (props.currencyId) {
    formValues.currencyId = props.currencyId;
  }

  await searchFormApi.setValues(formValues);

  // ✅ 动态更新 ClientSelect 的 selectedItems 属性
  if (props.settlementId && settlementSelectedItems.value.length > 0) {
    await searchFormApi.updateSchema([
      {
        fieldName: 'settlementId',
        componentProps: {
          selectedItems: settlementSelectedItems.value,
        },
      },
    ]);
  }

  // 如果已有费用，则锁定筛选条件
  if (props.hasExistingFees) {
    // 禁用结算对象字段
    setTimeout(() => {
      // 禁用结算对象字段
      const settlementField = document.querySelector(
        '[data-field="settlementId"]',
      );
      if (settlementField) {
        const input = settlementField.querySelector(
          'input, .ant-select-selector',
        );
        if (input) {
          (input as HTMLElement).setAttribute('disabled', 'true');
          (input as HTMLElement).style.pointerEvents = 'none';
          (input as HTMLElement).style.opacity = '0.6';
        }
      }

      // 禁用结算币别字段
      const currencyField = document.querySelector('[data-field="currencyId"]');
      if (currencyField) {
        const input = currencyField.querySelector(
          'input, .ant-select-selector',
        );
        if (input) {
          (input as HTMLElement).setAttribute('disabled', 'true');
          (input as HTMLElement).style.pointerEvents = 'none';
          (input as HTMLElement).style.opacity = '0.6';
        }
      }

      // 禁用独立的结算币别选择器
      const independentCurrencySelect = document.querySelector(
        '.ant-drawer-body .ant-select:has(.ant-select-selection-item)',
      );
      if (independentCurrencySelect) {
        const selector = independentCurrencySelect.querySelector(
          '.ant-select-selector',
        );
        if (selector) {
          (selector as HTMLElement).style.pointerEvents = 'none';
          (selector as HTMLElement).style.opacity = '0.6';
        }
      }
    }, 100);
  }

  await fetchData();
}

/** 关闭抽屉 */
function closeDrawer() {
  visible.value = false;
}

/** 获取数据 */
async function fetchData() {
  loading.value = true;
  try {
    const formValues = await searchFormApi.getValues();
    const [submitTimeStart, submitTimeEnd] = formValues.submitTimeRange || [];
    const [endTimeStart, endTimeEnd] = formValues.endTimeRange || [];

    // ✅ 确定结算币别：优先使用用户选择的，如果没有则使用props传入的
    const settlementCurrencyId = selectedCurrencyId.value ?? props.currencyId;

    const params: PaymentApplicationAdminApi.PaymentApplicationSettlementQueryParams =
      {
        paymentSettlementId: props.paymentSettlementId,
        keyword: formValues.keyword,
        applicationNo: formValues.applicationNo,
        settlementId: formValues.settlementId,
        settlementCurrencyId: formValues.currencyId,
        //settlementCurrencyId: settlementCurrencyId, // ✅ 可选：如果未传则不过滤结算币别
        creatorUserId: formValues.creatorUserId,
        submitTimeStart: submitTimeStart
          ? dayjs(submitTimeStart).toISOString()
          : undefined,
        submitTimeEnd: submitTimeEnd
          ? dayjs(submitTimeEnd).toISOString()
          : undefined,
        endTimeStart: endTimeStart
          ? dayjs(endTimeStart).toISOString()
          : undefined,
        endTimeEnd: endTimeEnd ? dayjs(endTimeEnd).toISOString() : undefined,
        pageIndex: currentPage.value,
        pageSize: pageSize.value,
      };

    console.log('📤 调用选择付费申请列表接口:', {
      settlementCurrencyId: settlementCurrencyId ?? '未设置（显示所有）',
      params,
    });

    const result =
      await getPaymentApplicationPagedListByCurrencyForSettlement(params);

    // ✅ 新接口返回的是扁平化的「申请+原币」组合，直接赋值
    dataSource.value = (result.items || []).map((row: any, index: number) => {
      console.log('📋 处理数据行:', {
        index,
        rowKey: row.rowKey,
        applicationNo: row.applicationNo,
        originalCurrencyId: row.originalCurrencyId,
        currencyId: row.currencyId,
        settleableUpperLimit: row.settleableUpperLimit,
        settleableLowerLimit: row.settleableLowerLimit,
        settleablePriceUpperLimit: row.settleablePriceUpperLimit,
        settleablePriceLowerLimit: row.settleablePriceLowerLimit,
      });

      // ✅ 初始化 settledPrice 字段（前端临时字段，用于用户输入）
      // 注意：2026-08-10起，用户输入的是结算币别金额（settledPrice），不是原币金额
      // 这里初始化为可结算上限和下限的总和（结算币别口径）
      const totalUnSettledPrice = row.totalUnSettledPrice ?? 0;
      row.settledPrice = totalUnSettledPrice;
      // ✅ 如果currency.code是"原币"，则用originalCurrencyCode替代
      if (row.currency == null) {
        row.currency = { code: row.originalCurrencyCode };
      }

      // ✅ 设置rowKey用于NestedDataTable的行标识 - 使用组合键确保唯一性
      // 格式：paymentApplicationId_originalCurrencyId
      // 这样可以区分同一个申请的不同原币组合
      const uniqueKey = [
        row.paymentApplicationId,
        row.originalCurrencyId ?? 'null',
      ].join('_');
      row.rowKey = uniqueKey;

      // ✅ 确保orderFees字段存在（即使为空数组）
      if (!row.orderFees) {
        row.orderFees = [];
      }

      console.log('✅ 数据行:', {
        rowKey: row.rowKey,
        applicationNo: row.applicationNo,
        hasOrderFees: Array.isArray(row.orderFees),
        orderFeesLength: row.orderFees?.length || 0,
      });

      return row;
    });

    total.value = result.totalCount || 0;
  } catch (error: any) {
    message.error(error.message || '获取数据失败');
  } finally {
    loading.value = false;
  }
}

/** 搜索 */
async function handleSearch() {
  currentPage.value = 1;
  await fetchData();
}

/** 重置 */
async function handleReset() {
  await searchFormApi.resetForm();
  currentPage.value = 1;
  await fetchData();
}

/** 行选择变化 */
function handleRowSelectionChange(selectedRowKeysValue: (string | number)[]) {
  selectedRowKeys.value = selectedRowKeysValue.map((key) => String(key));
}

/** 获取选中的行数据 */
function getSelectedRows() {
  const selected = dataSource.value.filter((item) =>
    selectedRowKeys.value.includes(item.rowKey),
  );

  // ✅ 调试：打印选中行的settledPrice值
  console.log('=== getSelectedRows 返回的数据 ===');
  selected.forEach((row, index) => {
    console.log(`行${index + 1}:`, {
      rowKey: row.rowKey,
      settledPrice: row.settledPrice,
      settledPriceType: typeof row.settledPrice,
      applicationNo: row.applicationNo,
    });
  });

  return selected;
}

/** 确认选择 */
async function handleConfirm() {
  const selectedRows = getSelectedRows();

  if (selectedRows.length === 0) {
    message.warning('请至少选择一个付费申请+原币组合');
    return;
  }

  // ✅ 收集所有已选行中的申请币别ID（currencyId）
  const applicationCurrencyIds = new Set<number | undefined>();
  selectedRows.forEach((row) => {
    applicationCurrencyIds.add(row.currencyId);
  });

  // 检查是否有多种申请币别
  if (applicationCurrencyIds.size > 1) {
    // 有多种申请币别，提示用户
    const currencyList = Array.from(applicationCurrencyIds)
      .map((id) => {
        if (id === undefined || id === null) {
          // 原币申请，显示对应的原币币别
          const originalCode = selectedRows.find(
            (r) => r.currencyId === undefined || r.currencyId === null,
          )?.originalCurrencyCode;
          return `原币(${originalCode || '-'})`;
        }
        return (
          selectedRows.find((r) => r.currencyId === id)?.currency?.code ||
          `币别${id}`
        );
      })
      .filter((val, idx, arr) => arr.indexOf(val) === idx); // 去重

    message.warning(
      `选择的费用包含多种申请币别：${currencyList.join('、')}。请选择申请币别一致的费用进行结算。`,
    );
    return;
  }

  // ✅ 确定唯一的申请币别作为结算币别
  const singleApplicationCurrencyId = Array.from(applicationCurrencyIds)[0];

  if (
    singleApplicationCurrencyId === undefined ||
    singleApplicationCurrencyId === null
  ) {
    // 原币申请：结算币别应该与原币币别一致
    // 收集所有原币币别
    const originalCurrencyIds = new Set<number>();
    selectedRows.forEach((row) => {
      if (row.originalCurrencyId) {
        originalCurrencyIds.add(row.originalCurrencyId);
      }
    });

    if (originalCurrencyIds.size > 1) {
      // 原币申请但有多种原币币别，提示用户
      const currencyCodes = Array.from(originalCurrencyIds)
        .map(
          (id) =>
            selectedRows.find((r) => r.originalCurrencyId === id)
              ?.originalCurrencyCode,
        )
        .filter(Boolean);
      message.warning(
        `原币申请中包含多种原币币别：${currencyCodes.join('、')}。请选择原币币别一致的费用进行结算。`,
      );
      return;
    }

    // 单一原币币别，设置为结算币别
    selectedCurrencyId.value = Array.from(originalCurrencyIds)[0];
    console.log(
      '原币申请，自动设置结算币别为原币币别:',
      selectedCurrencyId.value,
    );
  } else {
    // 固定币别申请，使用申请币别作为结算币别
    selectedCurrencyId.value = singleApplicationCurrencyId;
    console.log(
      '固定币别申请，自动设置结算币别为申请币别:',
      selectedCurrencyId.value,
    );
  }

  // ✅ 2026-08-10起，不再需要汇率录入，直接返回选中的申请
  // 汇率由后端从付费申请明细自动获取
  returnSelectedApplications(selectedRows);
}

/** 返回选中的申请给父组件 */
function returnSelectedApplications(selectedRows: any[]) {
  // ✅ 调试：打印所有选中行的数据
  console.log('=== 选中的行数据 ===');
  selectedRows.forEach((row, index) => {
    console.log(`行${index + 1}:`, {
      rowKey: row.rowKey,
      applicationNo: row.applicationNo,
      originalCurrencyCode: row.originalCurrencyCode,
      settledPrice: row.settledPrice,
      settleableUpperLimit: row.settleableUpperLimit,
      settleableLowerLimit: row.settleableLowerLimit,
    });
  });

  // 构造返回数据，并过滤掉结算金额为0的行
  const mappedData = selectedRows.map((row) => {
    // ✅ 确保 settledPrice 是数字类型（用户输入的是结算币别金额）
    const settledPriceInSettlementCurrency = Number(row.settledPrice) || 0;

    console.log(
      `映射行: rowKey=${row.rowKey}, 结算币别金额=${settledPriceInSettlementCurrency}`,
    );

    return {
      application: row,
      settledPrice: settledPriceInSettlementCurrency, // ✅ 提交给后端的是结算币别金额
    };
  });

  console.log('=== 映射后的数据（过滤前）===', mappedData);

  const result = mappedData.filter((item) => {
    // 过滤掉结算金额为0或未填写的行
    const shouldKeep = item.settledPrice !== 0 && !isNaN(item.settledPrice);
    console.log(
      `过滤检查: settledPrice=${item.settledPrice}, shouldKeep=${shouldKeep}`,
    );
    return shouldKeep;
  });

  console.log('=== 过滤后的数据 ===', result);

  // 如果过滤后没有数据，提示用户
  if (result.length === 0) {
    // ✅ 提供更详细的错误提示
    const zeroAmountRows = selectedRows.filter(
      (row) => !row.settledPrice || Number(row.settledPrice) === 0,
    );
    const rowDetails = zeroAmountRows
      .map(
        (row) =>
          `${row.applicationNo} (${row.originalCurrencyCode}): ${row.settledPrice || '未填写'}`,
      )
      .join('、');

    message.warning(
      `以下行的结算金额为0或未填写，请至少填写一个非零的结算金额：${rowDetails}`,
    );
    return;
  }

  console.log('=== 最终提交的数据 ===', result);
  emit('confirm', result, selectedCurrencyId.value);
  closeDrawer();
}

/** 暴露方法给父组件 */
defineExpose({
  openDrawer,
  closeDrawer,
});

// 格式化时间
function formatDateTime(dateTime: string | undefined | null): string {
  if (!dateTime) return '-';
  return dayjs(dateTime).format('YYYY-MM-DD HH:mm:ss');
}

// 格式化日期（只到天）
function formatDateOnly(dateTime: string | undefined | null): string {
  if (!dateTime) return '-';
  return dayjs(dateTime).format('YYYY-MM-DD');
}

// 获取付费申请状态 Tag 展示
function resolveApplicationStatus(status: number) {
  return getStatusTagProps(status);
}

// 格式化金额
function formatAmount(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-';
  return value.toFixed(2);
}

// ✅ 根据结算币别口径获取金额（不再需要汇率转换）
function formatAmountWithConversion(
  record: any,
  fieldName: 'pay' | 'receive' | 'totalUnSettled' | 'settled',
): string {
  const amount = record[`${fieldName}Price`] ?? record[`${fieldName}Amount`];
  if (amount === undefined || amount === null) return '-';
  return formatAmount(amount);
}

// ✅ 获取本次结算金额的最小值（结算币别口径）
function getsettledPriceMin(record: any): number {
  return record.settleablePriceLowerLimit ?? record.settleableLowerLimit ?? 0;
}

// ✅ 获取本次结算金额的最大值（结算币别口径）
function getsettledPriceMax(record: any): number {
  return record.settleablePriceUpperLimit ?? record.settleableUpperLimit ?? 0;
}

// ✅ 格式化原币金额（用于提示，现在直接使用settleablePrice字段）
function formatOriginalAmount(record: any): string {
  const settledPrice = (record as any).settledPrice || 0;
  return formatAmount(settledPrice);
}

// ✅ 获取币别显示文本
function getCurrencyCodeDisplay(record: any): string {
  // 如果申请币别是原币（currencyId为null），显示原币的币别code
  if (!record.currencyId) {
    return record.originalCurrency?.code || '-';
  }
  // 否则显示申请币别的code
  return record.currency?.code || '-';
}

// ✅ 全选状态计算
const isAllSelected = computed(() => {
  return (
    dataSource.value.length > 0 &&
    dataSource.value.every((item) =>
      selectedRowKeys.value.includes(item.rowKey),
    )
  );
});

// ✅ 半选状态计算
const isIndeterminate = computed(() => {
  const selectedCount = dataSource.value.filter((item) =>
    selectedRowKeys.value.includes(item.rowKey),
  ).length;
  return selectedCount > 0 && selectedCount < dataSource.value.length;
});

// ✅ 全选/取消全选
function toggleAllSelection(checked: boolean) {
  if (checked) {
    selectedRowKeys.value = dataSource.value.map((item) => item.rowKey);
  } else {
    selectedRowKeys.value = [];
  }
}

// ✅ 切换单行选中状态
function toggleRowSelection(rowKey: string, checked: boolean) {
  if (checked) {
    if (!selectedRowKeys.value.includes(rowKey)) {
      selectedRowKeys.value.push(rowKey);
    }
  } else {
    selectedRowKeys.value = selectedRowKeys.value.filter(
      (key) => key !== rowKey,
    );
  }
}

// ✅ 分页变化处理（适配Pagination组件）
function handlePageChange(page: number, size: number) {
  currentPage.value = page;
  pageSize.value = size;
  fetchData();
}

// ✅ NestedDataTable 外层列定义（付费申请+原币组合）
const outerColumns = [
  {
    title: '序号',
    key: 'seq',
    width: 80,
  },
  {
    title: '申请单号',
    dataIndex: 'applicationNo',
    key: 'applicationNo',
    width: 120,
    ellipsis: true,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
  },
  {
    title: '结算对象',
    dataIndex: 'clientName',
    key: 'clientName',
    width: 110,
    ellipsis: true,
  },
  {
    title: '支付要求',
    dataIndex: 'require',
    key: 'require',
    width: 110,
    ellipsis: true,
  },
  {
    title: '申请币别',
    key: 'currencyCode',
    width: 90,
  },
  // {
  //   title: '原币币别',
  //   dataIndex: 'originalCurrencyCode',
  //   key: 'originalCurrencyCode',
  //   width: 100,
  // },
  {
    title: '申请人',
    dataIndex: 'auditUserNickName',
    key: 'auditUserNickName',
    width: 100,
    ellipsis: true,
  },
  {
    title: '应付金额',
    key: 'pay',
    width: 100,
    align: 'right' as const,
  },
  {
    title: '应收金额',
    key: 'receive',
    width: 100,
    align: 'right' as const,
  },
  {
    title: '未结算费用',
    key: 'totalUnSettled',
    width: 100,
    align: 'right' as const,
  },
  {
    title: '本次结算金额',
    key: 'settledPrice',
    width: 140,
    align: 'right' as const,
  },
  {
    title: '归属组织',
    key: 'companyName',
    width: 130,
    ellipsis: true,
  },
  {
    title: '提交时间',
    dataIndex: 'submitTime',
    key: 'submitTime',
    width: 160,
  },
  // {
  //   title: '最晚付款时间',
  //   dataIndex: 'endTime',
  //   key: 'endTime',
  //   width: 130,
  // },
];

// ✅ NestedDataTable 内层列定义（费用明细 orderFees）
const innerColumns = [
  {
    title: '委托编号',
    key: 'commissionNum',
    width: 150,
  },
  {
    title: '主提单号',
    key: 'mblNum',
    width: 150,
  },
  {
    title: '收付类型',
    dataIndex: 'paySide',
    key: 'paySide',
    width: 100,
  },
  {
    title: '费用名称',
    key: 'feeCodeName',
    width: 120,
    ellipsis: true,
  },
  {
    title: '原始币别',
    key: 'currencyCode',
    width: 80,
  },
  // {
  //   title: '单位',
  //   dataIndex: 'unit',
  //   key: 'unit',
  //   width: 80,
  // },
  // {
  //   title: '数量',
  //   dataIndex: 'quantity',
  //   key: 'quantity',
  //   width: 80,
  //   align: 'right' as const,
  // },
  // {
  //   title: '单价',
  //   dataIndex: 'unitPrice',
  //   key: 'unitPrice',
  //   width: 100,
  //   align: 'right' as const,
  // },
  {
    title: '原始金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 120,
    align: 'right' as const,
  },

  {
    title: '申请付款金额',
    dataIndex: 'settledPrice',
    key: 'settledPrice',
    width: 120,
    align: 'right' as const,
  },
];
</script>

<template>
  <Drawer
    v-model:open="visible"
    title="选择付费申请"
    width="80%"
    :footer-style="{ textAlign: 'right' }"
  >
    <div style="margin-bottom: 16px">
      <SearchForm />
      <!-- 查询和重置按钮放在查询条件后面 -->
      <div style="margin-top: 16px; text-align: right">
        <Space>
          <Button @click="handleReset">重置</Button>
          <Button type="primary" @click="handleSearch">查询</Button>
        </Space>
      </div>
    </div>

    <!-- 结算币别选择（独立于搜索表单，明显展示） -->
    <!-- <div
      style="
        padding: 12px 16px;
        margin-bottom: 16px;
        background: #f0f5ff;
        border: 1px solid #adc6ff;
        border-radius: 4px;
      "
    >
      <div style="display: flex; gap: 12px; align-items: center">
        <span style="font-weight: 500; color: #1890ff; white-space: nowrap">
          结算币别：
        </span>
        <CurrencySelect
          v-model="selectedCurrencyId"
          placeholder="请选择结算币别（可选）"
          allow-clear
          :disabled="props.hasExistingFees"
          style="width: 200px"
        />
        <span style="font-size: 12px; color: #999">
          结算币别可选，如果不选择将显示所有符合条件的申请
        </span>
      </div>
    </div> -->

    <NestedDataTable
      :columns="outerColumns"
      :data-source="dataSource"
      :inner-columns="innerColumns"
      inner-data-key="orderFees"
      :max-height="700"
      inner-row-key="id"
      row-key="rowKey"
      :loading="loading"
      v-model:expanded-row-keys="expandedRowKeys"
    >
      <template #outerHeaderCell="{ column }">
        <span v-if="column.key === 'seq'" class="table-sequence-cell">
          <Checkbox
            :checked="isAllSelected"
            :indeterminate="isIndeterminate"
            @change="(e) => toggleAllSelection(e.target.checked)"
          />
          {{ column.title }}
        </span>
        <template v-else>{{ column.title }}</template>
      </template>

      <template #outerBodyCell="{ column, record, index }">
        <template v-if="column.key === 'seq'">
          <span class="table-sequence-cell">
            <Checkbox
              :checked="selectedRowKeys.includes(record.rowKey)"
              @change="
                (e) => toggleRowSelection(record.rowKey, e.target.checked)
              "
            />
            {{ index + 1 + (currentPage - 1) * pageSize }}
          </span>
        </template>
        <template v-else-if="column.key === 'applicationNo'">
          <div style="display: flex; gap: 4px; align-items: center">
            <a>{{ record.applicationNo }}</a>
            <Tag
              v-if="
                props.existingApplicationIds?.includes(
                  record.paymentApplicationId,
                )
              "
              color="orange"
              size="small"
            >
              已有费用
            </Tag>
          </div>
        </template>
        <template v-else-if="column.key === 'status'">
          <Tag v-bind="resolveApplicationStatus(record.status).tagProps">
            {{ resolveApplicationStatus(record.status).label }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'submitTime'">
          {{ formatDateTime(record.submitTime) }}
        </template>
        <template v-else-if="column.key === 'endTime'">
          {{ formatDateOnly(record.endTime) }}
        </template>
        <template v-else-if="column.key === 'clientName'">
          {{ record.settlement?.name || '-' }}
        </template>
        <template v-else-if="column.key === 'require'">
          {{ record.require || '-' }}
        </template>
        <template v-else-if="column.key === 'currencyCode'">
          {{ getCurrencyCodeDisplay(record) }}
        </template>
        <template v-else-if="column.key === 'originalCurrencyCode'">
          {{ record.originalCurrency.code || '-' }}
        </template>
        <template v-else-if="column.key === 'auditUserNickName'">
          {{ record.auditUserNickName || '-' }}
        </template>
        <template v-else-if="column.key === 'pay'">
          <span class="reconciliation-amount pay-amount">
            {{ formatAmountWithConversion(record, 'pay') }}
          </span>
        </template>
        <template v-else-if="column.key === 'receive'">
          <span class="reconciliation-amount receive-amount">
            {{ formatAmountWithConversion(record, 'receive') }}
          </span>
        </template>
        <template v-else-if="column.key === 'totalUnSettled'">
          <span class="reconciliation-amount unsettled-amount">
            {{ formatAmountWithConversion(record, 'totalUnSettled') }}
          </span>
        </template>
        <template v-else-if="column.key === 'settledPrice'">
          <InputNumber
            v-model:value="record.settledPrice"
            :min="getsettledPriceMin(record)"
            :max="getsettledPriceMax(record)"
            :precision="2"
            placeholder="请输入"
            style="width: 100%"
            class="reconciliation-input"
            :disabled="
              !selectedRowKeys.includes(record.rowKey) ||
              (record.settleableUpperLimit === 0 &&
                record.settleableLowerLimit === 0) ||
              (props.existingApplicationIds?.includes(
                record.paymentApplicationId,
              ) ??
                false)
            "
          />
        </template>
        <template v-else-if="column.key === 'companyName'">
          {{ record.orgs?.at(-1)?.name || '-' }}
        </template>
        <template v-else>
          {{ column.dataIndex ? record[column.dataIndex] : '' }}
        </template>
      </template>

      <template #expandColumnTitle></template>
      <template #expandIcon="{ expanded, record, onExpand }">
        <span
          class="expand-toggle cursor-pointer"
          :class="{ 'expand-toggle--expanded': expanded }"
          @click="
            (e) => {
              e.stopPropagation();
              onExpand(record, e);
            }
          "
        >
          &#9654;
        </span>
      </template>

      <template #innerBodyCell="{ column, record: feeRecord }">
        <template v-if="column.key === 'commissionNum'">
          {{ feeRecord.transportOrder?.commissionNum || '-' }}
        </template>
        <template v-else-if="column.key === 'mblNum'">
          {{ feeRecord.transportOrder?.mblNum || '-' }}
        </template>
        <template v-else-if="column.key === 'paySide'">
          <Tag :color="feeRecord.paySide === 0 ? 'blue' : 'orange'">
            {{ feeRecord.paySide === 0 ? '付' : '收' }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'feeCodeName'">
          {{ feeRecord.feeCode?.cnName || '-' }}
        </template>
        <template v-else-if="column.key === 'currencyCode'">
          {{ feeRecord.currency?.code || '-' }}
        </template>
        <template v-else-if="column.key === 'unit'">
          {{ feeRecord.unit || '-' }}
        </template>
        <template v-else-if="column.key === 'quantity'">
          {{ formatAmount(feeRecord.quantity) }}
        </template>
        <template v-else-if="column.key === 'unitPrice'">
          {{ formatAmount(feeRecord.unitPrice) }}
        </template>
        <template v-else-if="column.key === 'amount'">
          {{ formatAmount(feeRecord.amount) }}
        </template>
        <template v-else-if="column.key === 'unInvoicedAmount'">
          {{ formatAmount(feeRecord.unInvoicedAmount) }}
        </template>
        <template v-else-if="column.key === 'invoicedAmount'">
          {{ formatAmount(feeRecord.invoicedAmount) }}
        </template>
        <template v-else-if="column.key === 'settledAmount'">
          {{ formatAmount(feeRecord.settledAmount) }}
        </template>
        <template v-else-if="column.key === 'unSettledAmount'">
          {{ formatAmount(feeRecord.unSettledAmount) }}
        </template>
        <template v-else>
          {{ column.dataIndex ? feeRecord[column.dataIndex] : '' }}
        </template>
      </template>
    </NestedDataTable>

    <!-- 分页器 -->
    <div style="display: flex; justify-content: flex-end; margin-top: 16px">
      <Pagination
        v-model:current="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        show-size-changer
        show-quick-jumper
        :show-total="(total: number) => `共 ${total} 条`"
        @change="handlePageChange"
      />
    </div>

    <template #footer>
      <Space>
        <Button @click="closeDrawer">取消</Button>
        <Button type="primary" @click="handleConfirm">
          确定 (已选 {{ selectedRowKeys.length }} 个)
        </Button>
      </Space>
    </template>
  </Drawer>
</template>

<style scoped>
/* 展开图标样式 */
.expand-toggle {
  display: inline-block;
  font-size: 12px;
  transition: transform 0.2s;
}

.expand-toggle--expanded {
  transform: rotate(90deg);
}

.table-sequence-cell {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 对账信息列醒目样式 */
.reconciliation-amount {
  display: inline-block;
  padding: 2px 6px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 3px;
}

/* 应付金额 - 蓝色 */
.pay-amount {
  color: #1890ff;
  background-color: #e6f7ff;
}

/* 应收金额 - 绿色 */
.receive-amount {
  color: #52c41a;
  background-color: #f6ffed;
}

/* 未结算费用 - 橙色 */
.unsettled-amount {
  color: #fa8c16;
  background-color: #fff7e6;
}

/* 本次结算金额输入框醒目样式 */
.reconciliation-input :deep(.ant-input-number) {
  font-weight: 600;
  border-color: #000;
  box-shadow: 0 0 0 2px rgb(0 0 0 / 10%);
}

.reconciliation-input :deep(.ant-input-number-input) {
  font-weight: 600;
  color: #000;
}
</style>
