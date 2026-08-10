<script lang="ts" setup>
import type { StatementAdminApi } from '#/api/settlement-management/statement-admin';
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import { computed, nextTick, reactive, ref } from 'vue';

import { useThrottleFn } from '@vueuse/core';
import dayjs from 'dayjs';
import {
  Button,
  Checkbox,
  Drawer,
  InputNumber,
  message,
  Pagination,
  Tag,
} from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { NestedDataTable } from '#/components/nested-data-table';

import { getOrderFeeGroup } from '#/api/settlement-management/statement-admin';

import {
  type AddFeeDrawerProps,
  buildDynamicCurrencyColumns,
  buildOrderRow,
  collectCurrencies,
  type CurrencyInfo,
  type FeeRowData,
  getPaySideLabel,
  type SelectedFeeItem,
  useAddFeeSearchSchema,
  useOrderFixedColumns,
} from './data';

const emit = defineEmits<{
  confirm: [fees: SelectedFeeItem[]];
  'update:settlementCurrencyId': [value: null | number];
  'update:settlementId': [value: string];
}>();

const open = ref(false);
const loading = ref(false);
const drawerProps = ref<AddFeeDrawerProps>({});

const orderList = ref<SeaExportAdminApi.TransportOrderDto[]>([]);
const totalCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

const currencies = ref<CurrencyInfo[]>([]);
const tableRows = ref<Record<string, any>[]>([]);

/** 选中状态：orderId -> Set<feeId> */
const selectionMap = reactive(new Map<string, Set<string>>());
/** 费用输入金额：feeId -> appliedAmount */
const appliedAmountMap = reactive(new Map<string, number>());

const expandedRowKeys = ref<string[]>([]);

// 全选和半选状态计算
const isAllSelected = computed(() => {
  if (tableRows.value.length === 0) return false;
  return tableRows.value.every((row) => isOrderChecked(row.id));
});

const isIndeterminate = computed(() => {
  const checkedCount = tableRows.value.filter((row) =>
    isOrderChecked(row.id),
  ).length;
  return checkedCount > 0 && checkedCount < tableRows.value.length;
});

function toggleAllOrders(checked: boolean) {
  if (checked) {
    // 全选所有订单的所有费用
    for (const row of tableRows.value) {
      const fees = row._fees || [];
      const set = new Set<string>();
      for (const fee of fees) {
        if (!disabledFeeIds.value.has(fee.id)) {
          set.add(fee.id);
          if (!appliedAmountMap.has(fee.id)) {
            appliedAmountMap.set(fee.id, fee.unSettledAmount ?? 0);
          }
        }
      }
      selectionMap.set(row.id, set);
    }
  } else {
    // 取消全选
    selectionMap.clear();
  }
}

const pendingCurrencies = ref<CurrencyInfo[]>([]);
const settlementCurrencyName = ref('');
const currencySelectRef = ref();

const throttledAutoSearch = useThrottleFn(
  async (values: Record<string, any>) => {
    if (!values.SettlementId) return;
    const feeCodeMode = values.feeCodeMode ?? 'include';
    const feeCodeIds = values.FeeCodeIds;
    const hasFeeCodes = Array.isArray(feeCodeIds) && feeCodeIds.length > 0;
    if (feeCodeMode === 'exclude' && !hasFeeCodes) return;
    currentPage.value = 1;
    await checkSearchChanged();
    await fetchData(values);
  },
  800,
);

const [SearchForm, searchFormApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  layout: 'horizontal',
  schema: useAddFeeSearchSchema(),
  showDefaultActions: false,
  submitOnChange: false,
  compact: true,
  wrapperClass: 'grid-cols-4',
  handleValuesChange: (values) => {
    throttledAutoSearch(values);
  },
});

const fixedColumns = useOrderFixedColumns();

const dynamicColumns = computed(() =>
  buildDynamicCurrencyColumns(currencies.value),
);

const allColumns = computed(() => [...fixedColumns, ...dynamicColumns.value]);

// 费用明细内层列定义
const feeInnerColumnsForAddFee = [
  { title: '', dataIndex: 'checkbox', key: 'checkbox', width: 40 },
  {
    title: '结算单位',
    dataIndex: 'settlementName',
    key: 'settlementName',
    width: 140,
  },
  {
    title: '收付类型',
    dataIndex: 'paySide',
    key: 'paySide',
    width: 80,
  },
  {
    title: '费用名称',
    dataIndex: 'feeCodeName',
    key: 'feeCodeName',
    width: 120,
  },
  {
    title: '币别',
    dataIndex: 'currencyCode',
    key: 'currencyCode',
    width: 80,
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 100,
    align: 'right' as const,
  },
  {
    title: '未结金额',
    dataIndex: 'unSettledAmount',
    key: 'unSettledAmount',
    width: 100,
    align: 'right' as const,
  },
  {
    title: '汇率',
    dataIndex: 'exchangeRate',
    key: 'exchangeRate',
    width: 50,
  },
  {
    title: '费用状态',
    dataIndex: 'feeStatus',
    key: 'feeStatus',
    width: 100,
    customRender: ({ record }: any) => {
      const statusMap: Record<number, string> = {
        0: '录入状态',
        1: '提交审核',
        2: '审核通过',
        3: '审核驳回',
      };
      return statusMap[record.feeStatus] || '-';
    },
  },
  {
    title: '结算状态',
    dataIndex: 'settlementStatus',
    key: 'settlementStatus',
    width: 100,
    customRender: ({ record }: any) => {
      const statusMap: Record<number, string> = {
        0: '未结算',
        1: '部分结算',
        2: '已结算',
      };
      return statusMap[record.settlementStatus] || '-';
    },
  },
  {
    title: '备注',
    dataIndex: 'remark',
    key: 'remark',
    width: 120,
  },
];

const disabledFeeIds = computed(
  () => new Set(drawerProps.value.selectedFeeIds ?? []),
);
const isSettlementCurrencyLocked = computed(
  () => (drawerProps.value.selectedFeeIds?.length ?? 0) > 0,
);

async function openDrawer(props: AddFeeDrawerProps = {}) {
  drawerProps.value = props;
  open.value = true;
  resetState();
  await nextTick();
  await searchFormApi.resetForm();
  await nextTick();
  if (props.settlementId) {
    searchFormApi.setValues({ SettlementId: props.settlementId });
  }
  const hasFees = (props.selectedFeeIds?.length ?? 0) > 0;
  searchFormApi.updateSchema([
    {
      fieldName: 'settlementId',
      componentProps: {
        disabled: hasFees,
      },
    },
  ]);
}

function resetState() {
  orderList.value = [];
  totalCount.value = 0;
  currentPage.value = 1;
  currencies.value = [];
  tableRows.value = [];
  selectionMap.clear();
  appliedAmountMap.clear();
  expandedRowKeys.value = [];
}

function clearSelection() {
  selectionMap.clear();
  appliedAmountMap.clear();
}

async function handleSearch() {
  const values = await searchFormApi.getValues();
  if (!values.SettlementId) {
    message.warning('请先选择客户名称');
    return;
  }
  currentPage.value = 1;
  await checkSearchChanged();
  await fetchData(values);
}

async function fetchData(formValues?: Record<string, any>) {
  const values = formValues ?? (await searchFormApi.getValues());
  if (!values.SettlementId) return;

  const [etdStart, etdEnd] = Array.isArray(values.ETDRange)
    ? values.ETDRange
    : [undefined, undefined];

  const feeCodeMode = values.feeCodeMode ?? 'include';
  const feeCodeIds = values.FeeCodeIds;
  const hasFeeCodes = Array.isArray(feeCodeIds) && feeCodeIds.length > 0;

  // 处理操作和销售的多选ID，取第一个作为主要筛选条件（后端可能需要调整支持多选）
  const operatorIds =
    Array.isArray(values.OperatorIds) && values.OperatorIds.length > 0
      ? values.OperatorIds
      : undefined;
  const saleIds =
    Array.isArray(values.SaleIds) && values.SaleIds.length > 0
      ? values.SaleIds
      : undefined;

  const params: StatementAdminApi.OrderFeeGroupQueryParams = {
    SettlementId: values.SettlementId,
    OrgId: values.OrgId,
    Keyword: values.Keyword,
    ETDStart: etdStart ? dayjs(etdStart).toISOString() : undefined,
    ETDEnd: etdEnd ? dayjs(etdEnd).toISOString() : undefined,
    CurrencyId: values.CurrencyId,
    FeeCodeIds:
      feeCodeMode === 'include' && hasFeeCodes ? feeCodeIds : undefined,
    ExceptFeeCodeIds:
      feeCodeMode === 'exclude' && hasFeeCodes ? feeCodeIds : undefined,
    FeeStatus:
      values.FeeStatus !== null && values.FeeStatus !== undefined
        ? values.FeeStatus
        : undefined,
    BizType: values.BizType,
    OperatorIds: operatorIds,
    SaleIds: saleIds,
    SettlementStatus:
      values.SettlementStatus !== null && values.SettlementStatus !== undefined
        ? values.SettlementStatus
        : undefined,
    PageIndex: currentPage.value,
    PageSize: pageSize.value,
  };

  loading.value = true;
  try {
    const result = await getOrderFeeGroup(params);
    orderList.value = result.items ?? [];
    totalCount.value = result.totalCount ?? 0;

    currencies.value = collectCurrencies(orderList.value);
    tableRows.value = orderList.value.map((order) =>
      buildOrderRow(order, currencies.value),
    );
    console.log('Fetched order fee group data:', tableRows.value);
    expandedRowKeys.value = [];
  } finally {
    loading.value = false;
  }
}

async function handlePageChange(page: number, size: number) {
  currentPage.value = page;
  pageSize.value = size;
  await fetchData();
}

// --- Checkbox 联动逻辑 ---

function getOrderFees(orderId: string): OrderFeeAdminApi.OrderFeeDto[] {
  const order = orderList.value.find((o) => o.id === orderId);
  return order?.orderFees ?? [];
}

function isOrderChecked(orderId: string): boolean {
  const fees = getOrderFees(orderId);
  if (fees.length === 0) return false;
  const selected = selectionMap.get(orderId);
  if (!selected) return false;
  return fees.every((f) => selected.has(f.id));
}

function isOrderIndeterminate(orderId: string): boolean {
  const fees = getOrderFees(orderId);
  const selected = selectionMap.get(orderId);
  if (!selected || selected.size === 0) return false;
  const allChecked = fees.every((f) => selected.has(f.id));
  return !allChecked;
}

function toggleOrder(orderId: string, checked: boolean) {
  const fees = getOrderFees(orderId);
  if (checked) {
    const set = new Set<string>();
    for (const fee of fees) {
      set.add(fee.id);
      if (!appliedAmountMap.has(fee.id)) {
        appliedAmountMap.set(fee.id, fee.unSettledAmount ?? 0);
      }
    }
    selectionMap.set(orderId, set);
  } else {
    const disabledIds = disabledFeeIds.value;
    const existing = selectionMap.get(orderId);
    if (existing) {
      const kept = new Set<string>();
      for (const feeId of existing) {
        if (disabledIds.has(feeId)) kept.add(feeId);
      }
      if (kept.size > 0) {
        selectionMap.set(orderId, kept);
      } else {
        selectionMap.delete(orderId);
      }
    }
  }
}

function isFeeChecked(orderId: string, feeId: string): boolean {
  return selectionMap.get(orderId)?.has(feeId) ?? false;
}

function toggleFee(orderId: string, feeId: string, checked: boolean) {
  if (!selectionMap.has(orderId)) {
    selectionMap.set(orderId, new Set());
  }
  const set = selectionMap.get(orderId)!;
  if (checked) {
    set.add(feeId);
    const fee = getOrderFees(orderId).find((f) => f.id === feeId);
    if (fee && !appliedAmountMap.has(feeId)) {
      appliedAmountMap.set(feeId, fee.unSettledAmount ?? 0);
    }
  } else {
    set.delete(feeId);
    if (set.size === 0) {
      selectionMap.delete(orderId);
    }
  }
}

function setAppliedAmount(feeId: string, value: number | null) {
  appliedAmountMap.set(feeId, value ?? 0);
}

// --- 搜索条件变化清空选择 ---
let lastSearchSnapshot = '';

async function checkSearchChanged() {
  const values = await searchFormApi.getValues();
  const snapshot = JSON.stringify({
    SettlementId: values?.SettlementId,
    OrgId: values?.OrgId,
    Keyword: values?.Keyword,
    CurrencyId: values?.CurrencyId,
  });
  if (lastSearchSnapshot && snapshot !== lastSearchSnapshot) {
    clearSelection();
  }
  lastSearchSnapshot = snapshot;
}

// --- 汇总选中费用 ---

function getSelectedFees(): SelectedFeeItem[] {
  const result: SelectedFeeItem[] = [];
  const disabled = disabledFeeIds.value;
  const seen = new Set<string>();
  const hasUserAttribute = (
    userAttribute: number | undefined,
    target: PaymentApplicationAdminApi.UserAttribute,
  ) => typeof userAttribute === 'number' && (userAttribute & target) === target;
  const getOrderUserNamesByAttribute = (
    orderUsers: SeaExportAdminApi.OrderUserDto[] | undefined,
    target: PaymentApplicationAdminApi.UserAttribute,
  ) =>
    (orderUsers ?? [])
      .filter((user) => hasUserAttribute(user.userAttribute, target))
      .map((user) => user.userNickName)
      .filter((name): name is string => Boolean(name))
      .join('、');
  for (const [orderId, feeIds] of selectionMap.entries()) {
    const order = orderList.value.find((o) => o.id === orderId);
    const saleUserNames = getOrderUserNamesByAttribute(
      order?.orderUsers,
      PaymentApplicationAdminApi.UserAttribute.Sale,
    );
    const operationUserNames = getOrderUserNamesByAttribute(
      order?.orderUsers,
      PaymentApplicationAdminApi.UserAttribute.Operation,
    );
    const customerServiceUserNames = getOrderUserNamesByAttribute(
      order?.orderUsers,
      PaymentApplicationAdminApi.UserAttribute.CustomerService,
    );
    const fees = getOrderFees(orderId);
    for (const fee of fees) {
      if (feeIds.has(fee.id) && !disabled.has(fee.id) && !seen.has(fee.id)) {
        seen.add(fee.id);
        result.push({
          feeId: fee.id,
          transportOrderId: fee.transportOrderId,
          commissionNum: order?.commissionNum,
          mblNum: order?.mblNum,
          clientName: order?.client?.name,
          accountDate: order?.accountDate,
          etd: order?.etd,
          saleUserNames,
          operationUserNames,
          customerServiceUserNames,
          paySide: fee.paySide,
          feeCodeId: fee.feeCodeId,
          feeCodeName: fee.feeCode?.cnName ?? undefined,
          currencyId: fee.currencyId,
          currencyName: fee.currency?.cnName ?? fee.currency?.code ?? undefined,
          settlementId: fee.settlementId,
          settlementName: fee.settlement?.name ?? undefined,
          amount: fee.amount,
          settledAmount: fee.settledAmount,
          unSettledAmount: fee.unSettledAmount,
        });
      }
    }
  }
  return result;
}

function resolveSettlementCurrencyName(targetId: number): string {
  const fromCurrencies = currencies.value.find(
    (c) => c.currencyId === targetId,
  );
  if (fromCurrencies) return fromCurrencies.currencyName;
  for (const order of orderList.value) {
    for (const fee of order.orderFees ?? []) {
      if (fee.currencyId === targetId)
        return fee.currency?.cnName ?? fee.currency?.code ?? '';
    }
  }
  if (currencySelectRef.value) {
    const options = currencySelectRef.value.getOptions?.() ?? [];
    const opt = options.find((o: any) => o.value === targetId);
    if (opt) return opt.label;
  }
  return '';
}

function handleConfirm() {
  const selected = getSelectedFees();
  if (selected.length === 0) {
    message.warning('请至少选择一条费用');
    return;
  }
  emitResult(selected);
}

async function emitResult(fees: SelectedFeeItem[]) {
  const values = await searchFormApi.getValues();
  if (values.SettlementId) {
    emit('update:settlementId', String(values.SettlementId));
  }
  emit('confirm', fees);
  open.value = false;
}

function handleCancel() {
  open.value = false;
}

function formatAmount(val: number | undefined | null): string {
  if (val == null) return '';
  return Number(val).toFixed(2);
}

function formatMonth(val: string | undefined | null): string {
  if (!val) return '';
  return dayjs(val).isValid() ? dayjs(val).format('YYYY-MM') : '';
}

function getBizTypeLabel(bizType: number | undefined): string {
  const bizTypeMap: Record<number, string> = {
    0: '海运出口',
    1: '海运进口',
    2: '空运出口',
    3: '空运进口',
    4: '陆运',
    5: '仓储',
  };
  return bizTypeMap[bizType ?? -1] || '-';
}

function getFeeStatusLabel(feeStatus: number | undefined): string {
  const statusMap: Record<number, string> = {
    0: '录入状态',
    1: '提交审核',
    2: '审核通过',
    3: '审核驳回',
  };
  return statusMap[feeStatus ?? -1] || '-';
}

function getSettlementStatusLabel(
  settlementStatus: number | undefined,
): string {
  const statusMap: Record<number, string> = {
    0: '未结算',
    1: '部分结算',
    2: '已结算',
  };
  return statusMap[settlementStatus ?? -1] || '-';
}

function onFeeCheckChange(transportOrderId: string, feeId: string, e: any) {
  toggleFee(transportOrderId, feeId, e.target.checked);
}

function onOrderCheckChange(orderId: string, e: any) {
  toggleOrder(orderId, e.target.checked);
}

function onExpandClick(record: any, e: Event, onExpand: Function) {
  e.stopPropagation();
  onExpand(record, e);
}

function onAppliedAmountChange(feeId: string, val: number | null) {
  setAppliedAmount(feeId, val);
}

function onPageChange(page: number, size: number) {
  handlePageChange(page, size);
}

defineExpose({ open: openDrawer });
</script>

<template>
  <Drawer
    :open="open"
    title="添加费用"
    :width="1600"
    :destroy-on-close="true"
    placement="right"
    @close="handleCancel"
    class="add-fee-drawer"
  >
    <!-- 搜索区域 -->
    <div class="mb-4">
      <SearchForm />
      <div class="mt-2 flex justify-end">
        <Button type="primary" :loading="loading" @click="handleSearch">
          查询
        </Button>
      </div>
    </div>

    <!-- 主体区域 -->
    <div class="mb-2 flex items-center gap-3">
      <div class="text-base font-semibold">费用明细</div>
    </div>

    <!-- 主表格（业务列表） -->
    <div class="fee-order-table-container">
      <NestedDataTable
        :columns="allColumns"
        :data-source="tableRows"
        :loading="loading"
        fill-height
        :inner-columns="feeInnerColumnsForAddFee"
        inner-data-key="_fees"
        inner-row-key="id"
        row-key="id"
        v-model:expanded-row-keys="expandedRowKeys"
      >
        <template #outerHeaderCell="{ column }">
          <span v-if="column.type === 'seq'" class="table-sequence-cell">
            <Checkbox
              :checked="isAllSelected"
              :indeterminate="isIndeterminate"
              @change="(e) => toggleAllOrders(e.target.checked)"
            />
            {{ column.title }}
          </span>
          <template v-else>{{ column.title }}</template>
        </template>

        <template #outerBodyCell="{ column, record, index }">
          <template v-if="column.type === 'seq'">
            <span class="table-sequence-cell">
              <Checkbox
                :checked="isOrderChecked(record.id)"
                :indeterminate="isOrderIndeterminate(record.id)"
                @change="(e) => onOrderCheckChange(record.id, e)"
              />
              {{ index + 1 + (currentPage - 1) * pageSize }}
            </span>
          </template>
          <template
            v-else-if="column.field && column.field.startsWith('currency_')"
          >
            {{ formatAmount(record[column.field]) }}
          </template>
          <template v-else-if="column.field === 'client.name'">
            {{ record.client?.name || '-' }}
          </template>
          <template v-else-if="column.field === 'accountDate'">
            {{ formatMonth(record.accountDate) }}
          </template>
          <template v-else-if="column.field === 'bizType'">
            {{ getBizTypeLabel(record.bizType) }}
          </template>
          <template v-else-if="column.field === 'polName'">
            {{ record.seaExport?.pol?.portName || '-' }}
          </template>
          <template v-else-if="column.field === 'podName'">
            {{ record.seaExport?.pod?.portName || '-' }}
          </template>
          <template v-else>
            {{ column.field ? record[column.field] : '' }}
          </template>
        </template>

        <template #expandColumnTitle></template>
        <template #expandIcon="{ expanded, record, onExpand }">
          <span
            class="expand-toggle cursor-pointer"
            :class="{ 'expand-toggle--expanded': expanded }"
            @click="(e) => onExpandClick(record, e, onExpand)"
          >
            &#9654;
          </span>
        </template>

        <template #innerBodyCell="{ column, record: feeRecord }">
          <template v-if="column.key === 'checkbox'">
            <Checkbox
              :checked="isFeeChecked(feeRecord._orderId, feeRecord.id)"
              :disabled="disabledFeeIds.has(feeRecord.id)"
              @change="
                (e) => onFeeCheckChange(feeRecord._orderId, feeRecord.id, e)
              "
            />
          </template>
          <template v-else-if="column.key === 'paySide'">
            <Tag :color="feeRecord.paySide === 0 ? 'blue' : 'orange'">
              {{ getPaySideLabel(feeRecord.paySide) }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'amount'">
            {{ formatAmount(feeRecord.amount) }}
          </template>
          <template v-else-if="column.key === 'unSettledAmount'">
            {{ formatAmount(feeRecord.amount - feeRecord.settledAmount) }}
          </template>
          <template v-else-if="column.key === 'feeStatus'">
            {{ getFeeStatusLabel(feeRecord.feeStatus) }}
          </template>
          <template v-else-if="column.key === 'settlementStatus'">
            {{ getSettlementStatusLabel(feeRecord.settlementStatus) }}
          </template>
          <template v-else-if="column.key === 'settlementName'">
            {{ feeRecord.settlement?.name ?? '' }}
          </template>
          <template v-else-if="column.key === 'feeCodeName'">
            {{ feeRecord.feeCode?.cnName ?? '' }}
          </template>
          <template v-else-if="column.key === 'currencyCode'">
            {{ feeRecord.currency?.code ?? '' }}
          </template>
          <template v-else>
            {{ column.dataIndex ? feeRecord[column.dataIndex] : '' }}
          </template>
        </template>
      </NestedDataTable>

      <!-- 分页 -->
      <div class="mt-2 flex justify-end">
        <Pagination
          :current="currentPage"
          :page-size="pageSize"
          :total="totalCount"
          size="small"
          show-size-changer
          show-quick-jumper
          @change="onPageChange"
        />
      </div>
    </div>

    <!-- 底部操作栏 -->
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button @click="handleCancel">取消</Button>
        <Button type="primary" @click="handleConfirm">添加对账</Button>
      </div>
    </template>
  </Drawer>
</template>

<style scoped>
/* Drawer内容区域使用flex布局 */
:deep(.add-fee-drawer .ant-drawer-body) {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  overflow: hidden;
}

/* 搜索区域不伸缩 */
:deep(.add-fee-drawer .ant-drawer-body > div:first-child) {
  flex-shrink: 0;
}

/* 标题区域不伸缩 */
:deep(.add-fee-drawer .ant-drawer-body > div:nth-child(2)) {
  flex-shrink: 0;
}

/* 表格容器占满剩余高度 */
.fee-order-table-container {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: calc(100% - 200px);
  min-height: 200px;
  overflow: hidden;
}

/* NestedDataTable占满容器 */
.fee-order-table-container :deep(.nested-data-table) {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.fee-order-table-container :deep(.nested-data-table__scroll) {
  flex: 1;
  min-height: 0;
}

.expand-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  min-width: 14px;
  line-height: 1;
  transform-origin: center;
  transition: transform 0.15s ease;
}

.expand-toggle--expanded {
  transform: rotate(90deg);
}

.table-sequence-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}
</style>
