<script lang="ts" setup>
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';
import type { PaymentSettlementAdminApi } from '#/api/sea-export/payment-settlement-admin';

import { computed, ref, onMounted, nextTick, onUnmounted, h } from 'vue';
import dayjs from 'dayjs';

import {
  Drawer,
  Button,
  message,
  Space,
  Tag,
  Table,
  InputNumber,
} from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';

import { useVbenForm } from '#/adapter/form';
import { CurrencySelect } from '#/adapter/component';
import { getPaymentApplicationPagedListByCurrencyForSettlement } from '#/api/sea-export/payment-settlement-admin';
import ExchangeRateModal from '#/views/fee-management/add-fee-modal/exchange-rate-modal.vue'; // ✅ 新增：汇率录入框

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

// MutationObserver 实例
let tableObserver: MutationObserver | null = null;

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

  // 初始化 MutationObserver
  await nextTick();
  setTimeout(() => {
    initTableObserver();
  }, 200);
}

/** 关闭抽屉 */
function closeDrawer() {
  visible.value = false;
  // 销毁 Observer
  destroyTableObserver();
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
    dataSource.value = (result.items || []).map((row: any) => {
      // ✅ 初始化 settledAmount 字段（前端临时字段，用于用户输入）
      const unsettledAmount =
        (row.settleableUpperLimit ?? 0) + (row.settleableLowerLimit ?? 0);
      row.settledAmount = unsettledAmount;
      return row;
    });

    total.value = result.totalCount || 0;

    // 数据加载完成后，启用列宽拖拽
    await nextTick();
    const tables = document.querySelectorAll('.ant-table-wrapper');
    tables.forEach((table) => {
      enableColumnResize(table as HTMLElement);
    });
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

/** 分页变化 */
async function handlePageChange(pagination: any, _filters: any, _sorter: any) {
  currentPage.value = pagination.current;
  pageSize.value = pagination.pageSize;
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

  // 如果用户没有选择结算币别，尝试从已选费用中自动推断
  if (!selectedCurrencyId.value) {
    // 收集所有已选行中的原币币别ID
    const currencyIds = new Set<number>();

    selectedRows.forEach((row) => {
      if (row.originalCurrencyId) {
        currencyIds.add(row.originalCurrencyId);
      }
    });

    // 如果只有一个唯一的币别，自动设置为结算币别
    if (currencyIds.size === 1) {
      const autoSelectedCurrencyId = Array.from(currencyIds)[0];
      selectedCurrencyId.value = autoSelectedCurrencyId;
      console.log('自动设置结算币别为:', autoSelectedCurrencyId);
      message.success(`自动选择结算币别`);
    }
  }

  // 验证是否选择了结算币别（包括自动设置的情况）
  if (!selectedCurrencyId.value) {
    message.warning('请选择结算币别');
    return;
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
    // ✅ 确保 settledAmount 是数字类型
    const settledAmount = Number(row.settledAmount) || 0;
    console.log(
      `映射行: rowKey=${row.rowKey}, settledAmount=${settledAmount}, userEnteredRate=${row.userEnteredRate}, isNaN=${isNaN(settledAmount)}, !==0=${settledAmount !== 0}`,
    );
    return {
      application: row,
      settledAmount: settledAmount,
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

// ✅ 表格列配置 - 第一层（付费申请+原币组合）
const columns: ColumnsType<PaymentSettlementAdminApi.PaymentApplicationCurrencyForSettlementDto> =
  [
    {
      title: '申请单号',
      dataIndex: 'applicationNo',
      key: 'applicationNo',
      width: 100,
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
    },
    {
      title: '支付要求',
      dataIndex: 'require',
      key: 'require',
      width: 150,
    },
    {
      title: '申请币别',
      dataIndex: 'currencyCode',
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
      align: 'right',
    },
    {
      title: '申请人',
      dataIndex: 'auditUserNickName',
      key: 'auditUserNickName',
      width: 120,
    },
    {
      title: '应付金额',
      key: 'payAmount',
      width: 100,
      align: 'right',
    },
    {
      title: '应收金额',
      key: 'receiveAmount',
      width: 100,
      align: 'right',
    },
    {
      title: '未结算费用',
      key: 'totalUnSettledAmount',
      width: 100,
      align: 'right',
    },
    {
      title: '本次结算金额',
      key: 'settledAmount',
      width: 120,
      align: 'right',
    },
    {
      title: '归属组织',
      key: 'companyName',
      width: 130,
    },
    {
      title: '提交时间',
      dataIndex: 'submitTime',
      key: 'submitTime',
      width: 190,
    },
    {
      title: '最晚付款时间',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 150,
    },
  ];

// ✅ 第二层列配置（费用明细 orderFees）
const orderFeeColumns: ColumnsType<PaymentSettlementAdminApi.OrderFeeForSelectionDto> =
  [
    {
      title: '委托编号',
      key: 'commissionNum',
      width: 150,
      customRender: ({ record }) => {
        return record.transportOrder?.commissionNum || '-';
      },
    },
    {
      title: '主提单号',
      key: 'mblNum',
      width: 150,
      customRender: ({ record }) => {
        return record.transportOrder?.mblNum || '-';
      },
    },
    {
      title: '收付类型',
      dataIndex: 'paySide',
      key: 'paySide',
      width: 100,
    },
    {
      title: '费用名称',
      dataIndex: ['feeCode', 'cnName'],
      key: 'feeCodeName',
      width: 120,
    },
    {
      title: '币别',
      dataIndex: ['currency', 'code'],
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
      align: 'right',
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      align: 'right',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
    },
    {
      title: '未开票金额',
      dataIndex: 'unInvoicedAmount',
      key: 'unInvoicedAmount',
      width: 120,
      align: 'right',
    },
    {
      title: '已开票金额',
      dataIndex: 'invoicedAmount',
      key: 'invoicedAmount',
      width: 120,
      align: 'right',
    },
    {
      title: '已结算金额',
      dataIndex: 'settledAmount',
      key: 'settledAmount',
      width: 120,
      align: 'right',
    },
    {
      title: '未结算金额',
      dataIndex: 'unSettledAmount',
      key: 'unSettledAmount',
      width: 120,
      align: 'right',
    },
    {
      title: '已付费申请',
      dataIndex: 'rqstPaymentAmount',
      key: 'rqstPaymentAmount',
      width: 120,
    },
    {
      title: '未付费申请',
      dataIndex: 'unRqstPaymentAmount',
      key: 'unRqstPaymentAmount',
      width: 120,
      align: 'right',
    },
  ];

/** 为表格添加列宽拖拽功能 */
function enableColumnResize(tableElement: HTMLElement | null) {
  if (!tableElement) return;

  const headers = tableElement.querySelectorAll('th');

  headers.forEach((header) => {
    if (
      header.classList.contains('ant-table-selection-column') ||
      header.classList.contains('ant-table-expand-icon-th')
    ) {
      return;
    }

    if (header.querySelector('.column-resizer')) {
      return;
    }

    const resizer = document.createElement('div');
    resizer.className = 'column-resizer';
    resizer.style.cssText = `
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 5px;
      cursor: col-resize;
      background-color: transparent;
      transition: background-color 0.2s;
      z-index: 10;
    `;

    resizer.addEventListener('mouseenter', () => {
      resizer.style.backgroundColor = '#d9d9d9';
    });

    resizer.addEventListener('mouseleave', () => {
      resizer.style.backgroundColor = 'transparent';
    });

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = header.offsetWidth;
      resizer.style.backgroundColor = '#1890ff';

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      e.preventDefault();
    });

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const diff = e.clientX - startX;
      const newWidth = Math.max(80, startWidth + diff);
      header.style.width = `${newWidth}px`;
      header.style.minWidth = `${newWidth}px`;
      header.style.maxWidth = `${newWidth}px`;
    };

    const handleMouseUp = () => {
      isResizing = false;
      resizer.style.backgroundColor = 'transparent';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    header.style.position = 'relative';
    header.appendChild(resizer);
  });
}

/** 为所有可见的表格启用列宽拖拽 */
function enableResizeForAllTables() {
  const tables = document.querySelectorAll('.ant-table-wrapper');
  tables.forEach((table) => {
    enableColumnResize(table as HTMLElement);
  });
}

/** 初始化 MutationObserver 监听表格变化 */
function initTableObserver() {
  if (tableObserver) return;

  tableObserver = new MutationObserver((mutations) => {
    let hasNewTable = false;

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          if (
            node.classList?.contains('ant-table-wrapper') ||
            node.querySelector?.('.ant-table-wrapper')
          ) {
            hasNewTable = true;
          }
        }
      });
    });

    if (hasNewTable) {
      setTimeout(() => {
        enableResizeForAllTables();
      }, 50);
    }
  });

  const drawerContent = document.querySelector('.ant-drawer-body');
  if (drawerContent) {
    tableObserver.observe(drawerContent, {
      childList: true,
      subtree: true,
    });
  }
}

/** 销毁 MutationObserver */
function destroyTableObserver() {
  if (tableObserver) {
    tableObserver.disconnect();
    tableObserver = null;
  }
}
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
          placeholder="请选择结算币别"
          allow-clear
          :disabled="hasExistingFees"
          style="width: 200px"
        />
        <span style="font-size: 12px; color: #999">
          请选择用于本次结算的币别
        </span>
      </div>
    </div>

    <Table
      :columns="columns"
      :data-source="dataSource"
      :loading="loading"
      size="small"
      :pagination="{
        current: currentPage,
        pageSize: pageSize,
        total: total,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条`,
      }"
      @change="handlePageChange"
      row-key="rowKey"
      :row-selection="{
        type: 'checkbox',
        selectedRowKeys: selectedRowKeys,
        onChange: handleRowSelectionChange,
      }"
      bordered
      :expandable="{
        defaultExpandAllRows: false,
        expandIconColumnIndex: 0,
      }"
    >
      <!-- ✅ 展开行渲染 - 显示费用明细 -->
      <template #expandedRowRender="{ record }">
        <div
          v-if="!record.orderFees || record.orderFees.length === 0"
          style="padding: 16px; color: #999"
        >
          暂无费用明细
        </div>
        <Table
          v-else
          :columns="orderFeeColumns"
          :data-source="record.orderFees"
          row-key="id"
          :pagination="false"
          size="small"
          bordered
          :scroll="{ x: 1200 }"
        />
      </template>

      <!-- 第一层：付费申请+原币组合 -->
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'applicationNo'">
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
          {{ record.currency?.code || '原币' }}
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
          {{ formatAmount(record.payAmount) }}
        </template>

        <template v-else-if="column.key === 'receiveAmount'">
          {{ formatAmount(record.receiveAmount) }}
        </template>

        <template v-else-if="column.key === 'totalUnSettledAmount'">
          {{ formatAmount(record.totalUnSettledAmount) }}
        </template>

        <template v-else-if="column.key === 'settledAmount'">
          <InputNumber
            v-model:value="record.settledAmount"
            :min="record.settleableLowerLimit || 0"
            :max="record.settleableUpperLimit || 0"
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
        </template>

        <template v-else-if="column.key === 'companyName'">
          {{ record.orgs?.at(-1)?.name || '-' }}
        </template>
      </template>
    </Table>

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
/* 列宽拖拽手柄样式 */
:deep(.column-resizer) {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  width: 5px;
  cursor: col-resize;
  background-color: transparent;
  transition: background-color 0.2s;
}

:deep(.column-resizer:hover) {
  background-color: #d9d9d9;
}

:deep(th) {
  position: relative;
  user-select: none;
}
</style>
