<script lang="ts" setup>
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';
import type { PaymentSettlementAdminApi } from '#/api/sea-export/payment-settlement-admin';

import { computed, ref } from 'vue';
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
import { getPaymentApplicationPagedListByCurrencyForSettlement } from '#/api/sea-export/payment-settlement-admin';
// CurrencySelect 独立结算币别选择暂注释，结算币别由父表单 / 选中行推导
import NestedDataTable from '#/components/nested-data-table/nested-data-table.vue';
import { normalizeKeysParam } from '#/utils/keys-search';
import {
  toIsoEndOfDay,
  toIsoStartOfDay,
  toIsoString,
} from '#/utils/date-range-iso';

import { useSearchSchema, getStatusTagProps } from './data';
interface Props {
  /** 付费结算ID（编辑时传入，用于排除该结算单已关联的组合） */
  paymentSettlementId?: string;
  /** 结算对象ID */
  settlementId?: string;
  /**
   * 结算单的结算币别ID。
   * 对应接口 `settlementCurrencyId`：建单/加明细场景必传，用于后端过滤可选行。
   */
  currencyId?: number;
  /** 是否已有费用（用于控制筛选条件是否可修改） */
  hasExistingFees?: boolean;
  /**
   * 已在结算单中的「申请+原币」行 key（`paymentApplicationId_originalCurrencyId`），
   * 用于禁用已选组合；同一申请的其他原币仍可选。
   */
  existingRowKeys?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  existingRowKeys: () => [],
});

const emit = defineEmits<{
  confirm: [
    applications: Array<{
      application: PaymentSettlementAdminApi.PaymentApplicationCurrencyForSettlementDto;
      settledPrice: number; // 本行结算净额（结算币别）
    }>,
    selectedCurrencyId?: number, // 结算币别ID
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

  // 结算对象回显；结算币别走 selectedCurrencyId（≠ 搜索表单 currencyId/原币过滤）
  const formValues: Record<string, unknown> = {};

  if (props.settlementId) {
    formValues.settlementId = props.settlementId;

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
    } catch (error) {
      console.error('加载结算对象信息失败:', error);
    }
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

/** 调用选择列表接口；失败时自动再试 1 次 */
async function requestSettlementApplicationList(
  params: PaymentApplicationAdminApi.PaymentApplicationSettlementQueryParams,
) {
  try {
    return await getPaymentApplicationPagedListByCurrencyForSettlement(params);
  } catch (firstError) {
    console.warn('选择付费申请列表检索失败，自动重试 1 次', firstError);
    return await getPaymentApplicationPagedListByCurrencyForSettlement(params);
  }
}

/** 获取数据（按「付费申请+原币」扁平行） */
async function fetchData() {
  loading.value = true;
  try {
    const formValues = await searchFormApi.getValues();
    const [submitTimeStart, submitTimeEnd] = formValues.submitTimeRange || [];
    const [endTimeStart, endTimeEnd] = formValues.endTimeRange || [];

    // 结算币别 ≠ 搜索表单「原币币别」过滤；建单/加明细有结算币别时必传
    const settlementCurrencyId = selectedCurrencyId.value ?? props.currencyId;

    const params: PaymentApplicationAdminApi.PaymentApplicationSettlementQueryParams =
      {
        paymentSettlementId: props.paymentSettlementId,
        keyword: formValues.keyword,
        keys: normalizeKeysParam(formValues.keys),
        applicationNo: formValues.applicationNo,
        settlementId: formValues.settlementId,
        // 原币币别过滤（不传=全部；0=仅原币申请；>0=只返回该原币行）
        currencyId: formValues.currencyId,
        settlementCurrencyId,
        creatorUserId: formValues.creatorUserId,
        submitTimeStart: toIsoString(submitTimeStart),
        submitTimeEnd: toIsoString(submitTimeEnd),
        endTimeStart: toIsoStartOfDay(endTimeStart),
        endTimeEnd: toIsoEndOfDay(endTimeEnd),
        pageIndex: currentPage.value,
        pageSize: pageSize.value,
      };

    const result = await requestSettlementApplicationList(params);

    dataSource.value = (result.items || []).map((row: any) => {
      // 结满一行时直接用 totalUnSettledPrice 作为 settledPrice（结算币别）
      row.settledPrice = row.totalUnSettledPrice ?? 0;
      if (row.currency == null) {
        row.currency = {
          code: row.originalCurrency?.code || row.originalCurrencyCode,
        };
      }

      // 行 key：优先后端 rowKey，否则本地拼「申请id_原币id」
      row.rowKey =
        row.rowKey ||
        [row.paymentApplicationId, row.originalCurrencyId ?? 'null'].join('_');

      if (!row.orderFees) {
        row.orderFees = [];
      }

      return row;
    });

    total.value = result.totalCount || 0;
  } catch (error: any) {
    message.error(error?.message || '获取数据失败');
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

  // 结算币别：优先已锁定（编辑/已有明细），否则从选中行推导
  let settlementCurrency =
    selectedCurrencyId.value ?? props.currencyId ?? undefined;

  if (settlementCurrency == null) {
    const derivedIds = new Set<number>();
    for (const row of selectedRows) {
      // 固定币别申请 → 申请币别；原币申请 → 本行原币
      const id =
        row.currencyId != null && row.currencyId !== undefined
          ? Number(row.currencyId)
          : Number(row.originalCurrencyId);
      if (!Number.isFinite(id)) {
        message.warning('选中行缺少有效币别，无法确定结算币别');
        return;
      }
      derivedIds.add(id);
    }
    if (derivedIds.size !== 1) {
      message.warning(
        '选中行无法推导出唯一结算币别，请只选择同一结算币别下可结算的行',
      );
      return;
    }
    settlementCurrency = Array.from(derivedIds)[0];
  }

  // 校验每行是否可在该结算币别下结算（与后端规则一致）
  for (const row of selectedRows) {
    const isOriginalApp = row.currencyId == null || row.currencyId === undefined;
    if (isOriginalApp) {
      if (Number(row.originalCurrencyId) !== Number(settlementCurrency)) {
        message.warning(
          `付费申请【${row.applicationNo}】是原币申请，只能结算原币为结算币别的费用`,
        );
        return;
      }
    } else if (Number(row.currencyId) !== Number(settlementCurrency)) {
      message.warning(
        `付费申请【${row.applicationNo}】的申请币别与结算币别不一致，不能结算`,
      );
      return;
    }
  }

  selectedCurrencyId.value = settlementCurrency;
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

function getCurrencyCodeDisplay(record: any): string {
  // 原币申请：展示本行原币；固定币别申请：展示申请币别
  if (record.currencyId == null || record.currencyId === undefined) {
    return (
      record.originalCurrency?.code || record.originalCurrencyCode || '-'
    );
  }
  return record.currency?.code || '-';
}

// ✅ 全选状态计算（仅针对可选行）
const isAllSelected = computed(() => {
  const selectable = dataSource.value.filter(
    (item) => !props.existingRowKeys?.includes(item.rowKey),
  );
  return (
    selectable.length > 0 &&
    selectable.every((item) => selectedRowKeys.value.includes(item.rowKey))
  );
});

// ✅ 半选状态计算
const isIndeterminate = computed(() => {
  const selectable = dataSource.value.filter(
    (item) => !props.existingRowKeys?.includes(item.rowKey),
  );
  const selectedCount = selectable.filter((item) =>
    selectedRowKeys.value.includes(item.rowKey),
  ).length;
  return selectedCount > 0 && selectedCount < selectable.length;
});

// ✅ 全选/取消全选（跳过已在结算单中的组合）
function toggleAllSelection(checked: boolean) {
  if (checked) {
    selectedRowKeys.value = dataSource.value
      .filter((item) => !props.existingRowKeys?.includes(item.rowKey))
      .map((item) => item.rowKey);
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
    dataIndex: 'creatorUserName',
    key: 'creatorUserName',
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
    dataIndex: 'rqstPaymentAmount',
    key: 'rqstPaymentAmount',
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
              :disabled="props.existingRowKeys?.includes(record.rowKey)"
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
              v-if="props.existingRowKeys?.includes(record.rowKey)"
              color="orange"
              size="small"
            >
              已选
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
        <template v-else-if="column.key === 'creatorUserName'">
          {{ record.creatorUserName || '-' }}
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
              (props.existingRowKeys?.includes(record.rowKey) ?? false)
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
        <template v-else-if="column.key === 'rqstPaymentAmount'">
          {{ formatAmount(feeRecord.rqstPaymentAmount) }}
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
