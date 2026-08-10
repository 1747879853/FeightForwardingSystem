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
import ExchangeRateModal from '#/views/fee-management/add-fee-modal/exchange-rate-modal.vue'; // ✅ 新增：汇率录入框
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
      settledAmount: number; // 本行结算的净额（原币）
    }>,
    selectedCurrencyId?: number, // 用户在抽屉中选择的结算币别ID
  ];
}>();

const visible = ref(false);
const loading = ref(false);
const selectedRowKeys = ref<string[]>([]);
// ✅ 使用any类型数组，因为需要添加前端临时字段settledAmount
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

// ✅ 新增：汇率录入框相关状态
const exchangeRateModalOpen = ref(false);
const pendingApplications = ref<any[]>([]);
const pendingCurrencies = ref<
  Array<{ currencyId: number; currencyCode: string }>
>([]);
const settlementCurrencyName = ref('');

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

    const params: PaymentApplicationAdminApi.PaymentApplicationSettlementQueryParams =
      {
        paymentSettlementId: props.paymentSettlementId,
        keyword: formValues.keyword,
        applicationNo: formValues.applicationNo,
        settlementId: formValues.settlementId,
        currencyId: formValues.currencyId,
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

    const result =
      await getPaymentApplicationPagedListByCurrencyForSettlement(params);

    // ✅ 新接口返回的是扁平化的「申请+原币」组合，直接赋值
    dataSource.value = (result.items || []).map((row: any, index: number) => {
      // ✅ 初始化 settledAmount 字段（前端临时字段，用于用户输入）
      // 用户输入的是申请币别金额，所以需要将原币的未结算费用转换为申请币别金额
      const unsettledAmountOriginal =
        (row.settleableUpperLimit ?? 0) + (row.settleableLowerLimit ?? 0);

      // 如果是固定币别申请，需要转换为申请币别金额
      if (row.currencyId) {
        row.settledAmount = unsettledAmountOriginal * (row.rate || 1);
      } else {
        // 原币申请，直接使用原币金额
        row.settledAmount = unsettledAmountOriginal;
      }

      // ✅ 如果currency.code是"原币"，则用originalCurrencyCode替代
      if (row.currency == null) {
        row.currency = { code: row.originalCurrencyCode };
      }

      // ✅ 设置rowKey用于NestedDataTable的行标识 - 使用组合键确保唯一性
      // 格式：paymentApplicationId_currencyId_originalCurrencyId
      // 这样可以区分同一个申请的不同币别组合
      const uniqueKey = [
        row.paymentApplicationId,
        row.currencyId ?? 'null',
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

  // ✅ 调试：打印选中行的settledAmount值
  console.log('=== getSelectedRows 返回的数据 ===');
  selected.forEach((row, index) => {
    console.log(`行${index + 1}:`, {
      rowKey: row.rowKey,
      settledAmount: row.settledAmount,
      settledAmountType: typeof row.settledAmount,
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

  // ✅ 收集所有涉及的原币币别（排除与结算币别相同的）
  const originalCurrencyIds = new Set<number>();
  selectedRows.forEach((row) => {
    if (row.originalCurrencyId !== selectedCurrencyId.value) {
      originalCurrencyIds.add(row.originalCurrencyId);
    }
  });

  // 如果有不同的原币币别，需要先录入汇率
  if (originalCurrencyIds.size > 0) {
    // 暂存数据
    pendingApplications.value = selectedRows;

    // 获取币别信息用于显示
    try {
      const { getCurrencyDetail } =
        await import('#/api/system/base-data/currency-admin');

      pendingCurrencies.value = await Promise.all(
        Array.from(originalCurrencyIds).map(async (currencyId) => {
          const detail = await getCurrencyDetail(String(currencyId));
          return {
            currencyId,
            currencyCode: detail.code || `币别${currencyId}`,
          };
        }),
      );

      // 获取结算币别名称
      const settlementCurrencyDetail = await getCurrencyDetail(
        String(selectedCurrencyId.value),
      );
      settlementCurrencyName.value = settlementCurrencyDetail.code || '';

      // 打开汇率录入框
      exchangeRateModalOpen.value = true;
    } catch (error) {
      console.error('获取币别信息失败:', error);
      message.error('获取币别信息失败');
    }
  } else {
    // 所有币别都与结算币别相同，直接返回
    returnSelectedApplications(selectedRows);
  }
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
      settledAmount: row.settledAmount,
      userEnteredRate: row.userEnteredRate, // ✅ 打印用户输入的汇率
      settleableUpperLimit: row.settleableUpperLimit,
      settleableLowerLimit: row.settleableLowerLimit,
    });
  });

  // 构造返回数据，并过滤掉结算金额为0的行
  const mappedData = selectedRows.map((row) => {
    // ✅ 确保 settledAmount 是数字类型（用户输入的是申请币别金额）
    const settledAmountInSettlementCurrency = Number(row.settledAmount) || 0;

    // ✅ 将申请币别金额转换为原币金额（用于后端存储）
    let settledAmountInOriginalCurrency = 0;
    if (row.currencyId) {
      // 固定币别申请：申请币别金额 ÷ 汇率 = 原币金额
      settledAmountInOriginalCurrency =
        settledAmountInSettlementCurrency / (row.rate || 1);
    } else {
      // 原币申请：直接使用
      settledAmountInOriginalCurrency = settledAmountInSettlementCurrency;
    }

    console.log(
      `映射行: rowKey=${row.rowKey}, 申请币别金额=${settledAmountInSettlementCurrency}, 汇率=${row.rate}, 原币金额=${settledAmountInOriginalCurrency}, userEnteredRate=${row.userEnteredRate}`,
    );

    return {
      application: row,
      settledAmount: settledAmountInOriginalCurrency, // ✅ 提交给后端的是原币金额
      userEnteredRate: row.userEnteredRate, // ✅ 保留用户输入的汇率
    };
  });

  console.log('=== 映射后的数据（过滤前）===', mappedData);

  const result = mappedData.filter((item) => {
    // 过滤掉结算金额为0或未填写的行
    const shouldKeep = item.settledAmount !== 0 && !isNaN(item.settledAmount);
    console.log(
      `过滤检查: settledAmount=${item.settledAmount}, shouldKeep=${shouldKeep}`,
    );
    return shouldKeep;
  });

  console.log('=== 过滤后的数据 ===', result);

  // 如果过滤后没有数据，提示用户
  if (result.length === 0) {
    // ✅ 提供更详细的错误提示
    const zeroAmountRows = selectedRows.filter(
      (row) => !row.settledAmount || Number(row.settledAmount) === 0,
    );
    const rowDetails = zeroAmountRows
      .map(
        (row) =>
          `${row.applicationNo} (${row.originalCurrencyCode}): ${row.settledAmount || '未填写'}`,
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

/** 汇率录入框确认 */
async function handleExchangeRateConfirm(rateMap: Map<number, number>) {
  exchangeRateModalOpen.value = false;

  console.log('=== 汇率录入框确认 ===');
  console.log('rateMap:', rateMap);
  console.log('pendingApplications:', pendingApplications.value);

  // ✅ 将汇率信息附加到选中的应用数据上
  const applicationsWithRates = pendingApplications.value.map((row) => {
    const userRate = rateMap.get(row.originalCurrencyId);
    console.log(
      `应用 ${row.applicationNo}, 原币ID: ${row.originalCurrencyId}, 用户输入汇率: ${userRate}`,
    );

    return {
      ...row,
      userEnteredRate: userRate, // 用户输入的汇率
    };
  });

  console.log('applicationsWithRates:', applicationsWithRates);

  // 返回带汇率的申请数据
  returnSelectedApplications(applicationsWithRates);

  // 清空暂存数据
  pendingApplications.value = [];
  pendingCurrencies.value = [];
  settlementCurrencyName.value = '';
}

/** 汇率录入框取消 */
function handleExchangeRateCancel() {
  exchangeRateModalOpen.value = false;
  pendingApplications.value = [];
  pendingCurrencies.value = [];
  settlementCurrencyName.value = '';
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

// ✅ 根据申请币别转换并格式化金额
function formatAmountWithConversion(
  record: any,
  fieldName:
    | 'payAmount'
    | 'receiveAmount'
    | 'totalUnSettledAmount'
    | 'settledAmount' = 'payAmount',
): string {
  const amount = record[fieldName];
  if (amount === undefined || amount === null) return '-';

  // 如果申请币别是原币（currencyId为null），直接显示原币金额
  if (!record.currencyId) {
    return formatAmount(amount);
  }

  // 否则转换为申请币别金额：原币金额 × 汇率
  const convertedAmount = amount * (record.rate || 1);
  return formatAmount(convertedAmount);
}

// ✅ 获取本次结算金额的最小值（申请币别）
function getSettledAmountMin(record: any): number {
  const minOriginal = record.settleableLowerLimit || 0;
  // 如果是原币申请，直接返回原币最小值
  if (!record.currencyId) {
    return minOriginal;
  }
  // 否则转换为申请币别最小值
  return minOriginal * (record.rate || 1);
}

// ✅ 获取本次结算金额的最大值（申请币别）
function getSettledAmountMax(record: any): number {
  const maxOriginal = record.settleableUpperLimit || 0;
  // 如果是原币申请，直接返回原币最大值
  if (!record.currencyId) {
    return maxOriginal;
  }
  // 否则转换为申请币别最大值
  return maxOriginal * (record.rate || 1);
}

// ✅ 格式化原币金额（用于提示）
function formatOriginalAmount(record: any): string {
  const settledAmount = (record as any).settledAmount || 0;
  // 如果是原币申请，直接返回
  if (!record.currencyId) {
    return formatAmount(settledAmount);
  }
  // 否则转换回原币金额：申请币别金额 ÷ 汇率
  const originalAmount = settledAmount / (record.rate || 1);
  return formatAmount(originalAmount);
}

// ✅ 获取币别显示文本
function getCurrencyCodeDisplay(record: any): string {
  // 如果申请币别是原币（currencyId为null），显示原币的币别code
  if (!record.currencyId) {
    return record.originalCurrencyCode || '-';
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
    width: 50,
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
    width: 130,
    ellipsis: true,
  },
  {
    title: '支付要求',
    dataIndex: 'require',
    key: 'require',
    width: 150,
    ellipsis: true,
  },
  {
    title: '申请币别',
    key: 'currencyCode',
    width: 100,
  },
  {
    title: '原币币别',
    dataIndex: 'originalCurrencyCode',
    key: 'originalCurrencyCode',
    width: 100,
  },
  {
    title: '汇率',
    dataIndex: 'rate',
    key: 'rate',
    width: 80,
    align: 'right' as const,
  },
  {
    title: '申请人',
    dataIndex: 'auditUserNickName',
    key: 'auditUserNickName',
    width: 120,
    ellipsis: true,
  },
  {
    title: '应付金额',
    key: 'payAmount',
    width: 100,
    align: 'right' as const,
  },
  {
    title: '应收金额',
    key: 'receiveAmount',
    width: 100,
    align: 'right' as const,
  },
  {
    title: '未结算费用',
    key: 'totalUnSettledAmount',
    width: 100,
    align: 'right' as const,
  },
  {
    title: '本次结算金额',
    key: 'settledAmount',
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
  {
    title: '最晚付款时间',
    dataIndex: 'endTime',
    key: 'endTime',
    width: 130,
  },
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
    title: '币别',
    key: 'currencyCode',
    width: 80,
  },
  {
    title: '单位',
    dataIndex: 'unit',
    key: 'unit',
    width: 80,
  },
  {
    title: '数量',
    dataIndex: 'quantity',
    key: 'quantity',
    width: 80,
    align: 'right' as const,
  },
  {
    title: '单价',
    dataIndex: 'unitPrice',
    key: 'unitPrice',
    width: 100,
    align: 'right' as const,
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 120,
    align: 'right' as const,
  },
  {
    title: '未开票金额',
    dataIndex: 'unInvoicedAmount',
    key: 'unInvoicedAmount',
    width: 120,
    align: 'right' as const,
  },
  {
    title: '已开票金额',
    dataIndex: 'invoicedAmount',
    key: 'invoicedAmount',
    width: 120,
    align: 'right' as const,
  },
  {
    title: '已结算金额',
    dataIndex: 'settledAmount',
    key: 'settledAmount',
    width: 120,
    align: 'right' as const,
  },
  {
    title: '未结算金额',
    dataIndex: 'unSettledAmount',
    key: 'unSettledAmount',
    width: 120,
    align: 'right' as const,
  },
];
</script>

<template>
  <Drawer
    v-model:open="visible"
    title="选择付费申请（按原币）"
    width="90%"
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
    <div
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
          <span style="margin-right: 4px; color: #ff4d4f">*</span>
          结算币别：
        </span>
        <CurrencySelect
          v-model="selectedCurrencyId"
          placeholder="请先选择费用，结算币别将自动设置"
          allow-clear
          disabled
          style="width: 200px"
        />
        <span style="font-size: 12px; color: #999">
          结算币别固定与申请币别一致，不可修改
        </span>
      </div>
    </div>

    <NestedDataTable
      :columns="outerColumns"
      :data-source="dataSource"
      fill-height
      :inner-columns="innerColumns"
      inner-data-key="orderFees"
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
          {{ record.originalCurrencyCode }}
        </template>
        <template v-else-if="column.key === 'rate'">
          {{ record.rate ? record.rate.toFixed(4) : '-' }}
        </template>
        <template v-else-if="column.key === 'auditUserNickName'">
          {{ record.auditUserNickName || '-' }}
        </template>
        <template v-else-if="column.key === 'payAmount'">
          {{ formatAmountWithConversion(record) }}
        </template>
        <template v-else-if="column.key === 'receiveAmount'">
          {{ formatAmountWithConversion(record, 'receiveAmount') }}
        </template>
        <template v-else-if="column.key === 'totalUnSettledAmount'">
          {{ formatAmountWithConversion(record, 'totalUnSettledAmount') }}
        </template>
        <template v-else-if="column.key === 'settledAmount'">
          <InputNumber
            v-model:value="record.settledAmount"
            :min="getSettledAmountMin(record)"
            :max="getSettledAmountMax(record)"
            :precision="2"
            placeholder="请输入"
            style="width: 100%"
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
          <div
            v-if="record.currencyId"
            style="margin-top: 2px; font-size: 12px; color: #999"
          >
            原币金额: {{ formatOriginalAmount(record) }}
          </div>
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
              console.log('🔍 点击展开图标:', {
                rowKey: record.rowKey,
                applicationNo: record.applicationNo,
                hasOrderFees: Array.isArray(record.orderFees),
                orderFeesLength: record.orderFees?.length || 0,
                expanded: expanded,
              });
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

    <!-- ✅ 汇率录入框 -->
    <ExchangeRateModal
      v-model:open="exchangeRateModalOpen"
      :currencies="pendingCurrencies"
      :settlement-currency-id="selectedCurrencyId"
      :settlement-currency-name="settlementCurrencyName"
      @confirm="handleExchangeRateConfirm"
      @cancel="handleExchangeRateCancel"
    />
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
</style>
