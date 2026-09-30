<script lang="ts" setup>
import type { BankStatementAdminApi } from '#/api/settlement-management/bank-statement-admin';
import type { ReceiveSettlementAdminApi } from '#/api/settlement-management/receive-settlement-admin';

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Card,
  DropdownButton,
  Input,
  Menu,
  MenuItem,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { getBankStatementReceiveSettlementPagedList } from '#/api/settlement-management/bank-statement-admin';

import {
  formatAmount,
  formatDateTime,
  getReceiveSettlementPaySideColor,
  getReceiveSettlementPaySideLabel,
  getReceiveSettlementStatusColor,
  getReceiveSettlementStatusLabel,
  getReceiveSettlementTypeColor,
  getReceiveSettlementTypeLabel,
  isInvoiceReceiveSettlement,
} from '../form-data';

const UNBOUND_INVOICE_ISSUE_LABEL = '无发票开出（已冲红解绑）';

const props = defineProps<{
  bankStatementId: string;
  canCreateSettlement?: boolean;
  currencyCode?: string;
  /** 流水详情内嵌收费结算，按发票行展开用 */
  detailReceiveSettlements?: BankStatementAdminApi.BankStatementReceiveSettlementDto[];
  remainingAmount: number;
}>();

const emit = defineEmits<{
  create: [mode: 'fee' | 'invoice'];
  edit: [row: BankStatementAdminApi.ReceiveSettlementListDto];
}>();

const settlementList = ref<BankStatementAdminApi.ReceiveSettlementListDto[]>(
  [],
);
const loading = ref(false);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const settlementNoFilter = ref('');
const tableBodyHeight = ref(240);
const tableWrapRef = ref<HTMLElement>();
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const isFiltering = computed(() => Boolean(settlementNoFilter.value.trim()));
const tablePagination = computed(() => {
  if (total.value <= pageSize.value) return false;
  return {
    current: currentPage.value,
    pageSize: pageSize.value,
    total: total.value,
    showSizeChanger: true,
    showTotal: (value: number) => `共 ${value} 张核销单`,
    onChange: handlePageChange,
  };
});
const tableScroll = computed(() => ({
  x: 1450,
  y: Math.max(tableBodyHeight.value, 120),
}));

/** 详情收费结算按 id 索引，给列表展开取 invoiceIssues */
const detailSettlementMap = computed(() => {
  const map = new Map<
    string,
    BankStatementAdminApi.BankStatementReceiveSettlementDto
  >();
  for (const settlement of props.detailReceiveSettlements ?? []) {
    if (settlement.id) map.set(String(settlement.id), settlement);
  }
  return map;
});

const invoiceIssueFeeColumns = [
  {
    key: 'feeCodeName',
    dataIndex: 'feeCodeName',
    title: '费用名称',
    ellipsis: true,
  },
  {
    key: 'paySide',
    dataIndex: 'paySide',
    title: '收付',
    width: 72,
  },
  {
    key: 'currencyCode',
    dataIndex: 'currencyCode',
    title: '币别',
    width: 72,
  },
  {
    key: 'settledAmount',
    dataIndex: 'settledAmount',
    title: '结算金额',
    width: 110,
    align: 'right' as const,
  },
  {
    key: 'originalSettledAmount',
    dataIndex: 'originalSettledAmount',
    title: '原始结算金额',
    width: 120,
    align: 'right' as const,
  },
];

const feeItemColumns = [
  {
    key: 'feeCodeName',
    dataIndex: 'feeCodeName',
    title: '费用名称',
    ellipsis: true,
  },
  {
    key: 'paySide',
    dataIndex: 'paySide',
    title: '收付',
    width: 72,
  },
  {
    key: 'currencyCode',
    dataIndex: 'currencyCode',
    title: '原币',
    width: 72,
  },
  {
    key: 'settledAmount',
    dataIndex: 'settledAmount',
    title: '原币结算额',
    width: 130,
    align: 'right' as const,
  },
  {
    key: 'exchangeRate',
    dataIndex: 'exchangeRate',
    title: '汇率',
    width: 100,
    align: 'right' as const,
  },
  {
    key: 'originalSettledAmount',
    dataIndex: 'originalSettledAmount',
    title: '折合流水币',
    width: 130,
    align: 'right' as const,
  },
];

function canExpandRow(record: BankStatementAdminApi.ReceiveSettlementListDto) {
  if (isInvoiceReceiveSettlement(record.type)) {
    return getInvoiceIssues(record).length > 0;
  }
  return getFeeItems(record).length > 0;
}

const expandable = computed(() => ({
  rowExpandable: (record: BankStatementAdminApi.ReceiveSettlementListDto) =>
    canExpandRow(record),
}));

const columns = [
  {
    key: 'settlementNo',
    dataIndex: 'settlementNo',
    title: '核销单号',
    minWidth: 180,
    ellipsis: true,
  },
  {
    key: 'type',
    dataIndex: 'type',
    title: '核销方式',
    width: 110,
  },
  {
    key: 'status',
    dataIndex: 'status',
    title: '状态',
    width: 96,
  },
  {
    key: 'actualSettled',
    dataIndex: 'actualSettled',
    title: '本次结算',
    width: 150,
    align: 'right' as const,
  },
  {
    key: 'originalSettledAmount',
    dataIndex: 'originalSettledAmount',
    title: '原始结算金额',
    width: 150,
    align: 'right' as const,
  },
  {
    key: 'diffAmount',
    dataIndex: 'diffAmount',
    title: '差值',
    width: 130,
    align: 'right' as const,
  },
  {
    key: 'itemCount',
    dataIndex: 'itemCount',
    title: '明细',
    width: 80,
    align: 'right' as const,
  },
  {
    key: 'settlementTime',
    dataIndex: 'settlementTime',
    title: '核销时间',
    width: 150,
    customRender: ({ text }: { text: string }) => formatDateTime(text),
  },
  {
    key: 'creatorUserName',
    dataIndex: 'creatorUserName',
    title: '创建人',
    width: 110,
    ellipsis: true,
  },
  {
    key: 'remark',
    dataIndex: 'remark',
    title: '备注',
    minWidth: 160,
    ellipsis: true,
  },
];

function formatSettlementAmount(value: number | undefined | null) {
  const amountText = formatAmount(value ?? 0);
  return props.currencyCode
    ? `${amountText} ${props.currencyCode}`
    : amountText;
}

function formatOptionalSettlementAmount(value: number | undefined | null) {
  if (value === undefined || value === null) return '-';
  return formatSettlementAmount(value);
}

function formatOptionalPlainAmount(value: number | undefined | null) {
  if (value === undefined || value === null) return '-';
  return formatAmount(value);
}

/** 差值为 0 时弱化；非 0 用警示色，便于扫到汇率或金额不一致的核销单 */
function diffAmountTone(value: number | null | undefined) {
  if (value === undefined || value === null || Number.isNaN(value)) return '';
  return Math.abs(value) < 0.005 ? 'amount-cell--muted' : 'amount-cell--warn';
}

function getDetailSettlement(
  record: BankStatementAdminApi.ReceiveSettlementListDto,
) {
  return detailSettlementMap.value.get(String(record.id));
}

function getInvoiceIssues(
  record: BankStatementAdminApi.ReceiveSettlementListDto,
): ReceiveSettlementAdminApi.ReceiveSettlementInvoiceIssueDto[] {
  return getDetailSettlement(record)?.invoiceIssues ?? [];
}

function getFeeItems(
  record: BankStatementAdminApi.ReceiveSettlementListDto,
): ReceiveSettlementAdminApi.ReceiveSettlementItemDetailDto[] {
  return getDetailSettlement(record)?.receiveSettlementItems ?? [];
}

function mapFeeItemRows(
  record: BankStatementAdminApi.ReceiveSettlementListDto,
) {
  return getFeeItems(record).map((fee) => ({
    key: fee.id,
    feeCodeName: fee.orderFee?.feeCode?.cnName || '-',
    paySide: fee.orderFee?.paySide,
    currencyCode: fee.orderFee?.currency?.code,
    settledAmount: fee.settledAmount,
    exchangeRate: fee.exchangeRate,
    originalSettledAmount: fee.originalSettledAmount,
  }));
}

function formatExchangeRate(value: null | number | undefined) {
  if (
    value === undefined ||
    value === null ||
    !Number.isFinite(Number(value))
  ) {
    return '-';
  }
  return Number(value).toFixed(4);
}

function issueApplicationNo(
  issue: ReceiveSettlementAdminApi.ReceiveSettlementInvoiceIssueDto,
) {
  if (issue.id == null || issue.id === '') return UNBOUND_INVOICE_ISSUE_LABEL;
  return issue.applicationNo || '-';
}

function mapIssueFeeRows(
  issue: ReceiveSettlementAdminApi.ReceiveSettlementInvoiceIssueDto,
) {
  return (issue.items ?? []).map((fee) => ({
    key: `${issue.id ?? 'unbound'}::${fee.orderFeeId}`,
    feeCodeName: fee.orderFee?.feeCode?.cnName || '-',
    paySide: fee.orderFee?.paySide,
    currencyCode: fee.orderFee?.currency?.code,
    settledAmount: fee.settledAmount,
    originalSettledAmount: fee.originalSettledAmount,
  }));
}

function updateTableBodyHeight() {
  const wrap = tableWrapRef.value;
  if (!wrap) return;
  const header = wrap.querySelector('.ant-table-thead') as HTMLElement | null;
  const pagination = wrap.querySelector(
    '.ant-table-pagination',
  ) as HTMLElement | null;
  const headerHeight = header?.offsetHeight ?? 39;
  const paginationHeight = pagination ? pagination.offsetHeight + 16 : 0;
  tableBodyHeight.value = Math.max(
    wrap.clientHeight - headerHeight - paginationHeight,
    120,
  );
}

async function loadReceiveSettlements() {
  if (!props.bankStatementId) return;
  loading.value = true;
  try {
    const result = await getBankStatementReceiveSettlementPagedList({
      bankStatementId: props.bankStatementId,
      settlementNo: settlementNoFilter.value.trim() || undefined,
      pageIndex: currentPage.value,
      pageSize: pageSize.value,
    });
    settlementList.value = result.items ?? [];
    total.value = result.totalCount ?? 0;
  } finally {
    loading.value = false;
    await nextTick();
    updateTableBodyHeight();
  }
}

function handleSearch() {
  currentPage.value = 1;
  loadReceiveSettlements();
}

function clearSearch() {
  settlementNoFilter.value = '';
  handleSearch();
}

function handlePageChange(page: number, size: number) {
  currentPage.value = page;
  pageSize.value = size;
  loadReceiveSettlements();
}

function openSettlement(row: Record<string, any>) {
  emit('edit', row as BankStatementAdminApi.ReceiveSettlementListDto);
}

function requestCreate(mode: 'fee' | 'invoice') {
  emit('create', mode);
}

function handleCreateMenu({ key }: { key: string | number }) {
  requestCreate(String(key) === 'invoice' ? 'invoice' : 'fee');
}

watch(settlementNoFilter, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(handleSearch, 300);
});

onMounted(() => {
  loadReceiveSettlements();
});

watch(
  tableWrapRef,
  (el, _prev, onCleanup) => {
    if (!el) return;
    const observer = new ResizeObserver(() => updateTableBodyHeight());
    observer.observe(el);
    nextTick(updateTableBodyHeight);
    onCleanup(() => observer.disconnect());
  },
  { flush: 'post' },
);

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer);
});

defineExpose({
  refresh: loadReceiveSettlements,
});
</script>

<template>
  <Card size="small" class="settlement-card">
    <template #title>
      <div class="settlement-card__title">
        <span>关联核销单</span>
        <span class="settlement-card__count">{{ total }}</span>
      </div>
    </template>

    <template #extra>
      <div class="settlement-toolbar">
        <Input
          v-model:value="settlementNoFilter"
          placeholder="搜索核销单号"
          allow-clear
          class="settlement-search"
          @press-enter="handleSearch"
        >
          <template #prefix>
            <IconifyIcon icon="mdi:magnify" class="size-4 text-gray-400" />
          </template>
        </Input>

        <DropdownButton
          v-if="canCreateSettlement"
          type="primary"
          @click="requestCreate('fee')"
        >
          新建核销
          <template #overlay>
            <Menu @click="handleCreateMenu">
              <MenuItem key="fee">按费用核销</MenuItem>
              <MenuItem key="invoice">按发票核销</MenuItem>
            </Menu>
          </template>
        </DropdownButton>
      </div>
    </template>

    <div
      v-if="!loading && settlementList.length === 0"
      class="settlement-empty"
    >
      <div class="settlement-empty__icon">
        <IconifyIcon
          :icon="
            isFiltering
              ? 'mdi:file-search-outline'
              : 'mdi:clipboard-text-outline'
          "
          class="size-6"
        />
      </div>
      <div class="settlement-empty__content">
        <h3>{{ isFiltering ? '未找到匹配的核销单' : '暂无关联核销单' }}</h3>
        <p v-if="isFiltering">换一个核销单号，或清除搜索条件后重试。</p>
        <p v-else>
          当前剩余可核销
          <strong>{{ formatSettlementAmount(remainingAmount) }}</strong>
        </p>
        <div class="settlement-empty__actions">
          <Button v-if="isFiltering" size="small" @click="clearSearch">
            清除搜索
          </Button>
          <template v-else-if="canCreateSettlement">
            <Button size="small" @click="requestCreate('fee')">
              按费用核销
            </Button>
            <Button size="small" @click="requestCreate('invoice')">
              按发票核销
            </Button>
          </template>
        </div>
      </div>
    </div>

    <div v-else ref="tableWrapRef" class="settlement-table-wrap">
      <Table
        :columns="columns"
        :data-source="settlementList"
        :loading="loading"
        :pagination="tablePagination"
        :expandable="expandable"
        :custom-row="
          (record) => ({
            onDblclick: () => openSettlement(record),
            title: '双击查看或编辑核销单',
          })
        "
        row-key="id"
        size="small"
        :scroll="tableScroll"
        class="settlement-table"
      >
        <template #expandIcon="{ expanded, record, onExpand }">
          <button
            v-if="canExpandRow(record)"
            type="button"
            class="ant-table-row-expand-icon"
            :class="
              expanded
                ? 'ant-table-row-expand-icon-expanded'
                : 'ant-table-row-expand-icon-collapsed'
            "
            @click="
              (event) => {
                event.stopPropagation();
                onExpand(record, event);
              }
            "
          />
        </template>
        <template #expandedRowRender="{ record }">
          <div
            v-if="!isInvoiceReceiveSettlement(record.type)"
            class="invoice-issue-expand"
          >
            <Table
              v-if="getFeeItems(record).length > 0"
              :columns="feeItemColumns"
              :data-source="mapFeeItemRows(record)"
              :pagination="false"
              row-key="key"
              size="small"
              class="invoice-issue-fee-table"
            >
              <template #bodyCell="{ column, record: fee }">
                <template v-if="column.key === 'paySide'">
                  <Tag :color="getReceiveSettlementPaySideColor(fee.paySide)">
                    {{ getReceiveSettlementPaySideLabel(fee.paySide) }}
                  </Tag>
                </template>
                <template v-else-if="column.key === 'currencyCode'">
                  <Tag v-if="fee.currencyCode">{{ fee.currencyCode }}</Tag>
                  <span v-else>-</span>
                </template>
                <template v-else-if="column.key === 'settledAmount'">
                  {{ formatOptionalPlainAmount(fee.settledAmount) }}
                  <span v-if="fee.currencyCode"> {{ fee.currencyCode }}</span>
                </template>
                <template v-else-if="column.key === 'exchangeRate'">
                  {{ formatExchangeRate(fee.exchangeRate) }}
                </template>
                <template v-else-if="column.key === 'originalSettledAmount'">
                  {{
                    formatOptionalSettlementAmount(fee.originalSettledAmount)
                  }}
                </template>
              </template>
            </Table>
            <div v-else class="invoice-issue-empty">暂无费用明细</div>
          </div>
          <div v-else class="invoice-issue-expand">
            <div
              v-for="issue in getInvoiceIssues(record)"
              :key="String(issue.id ?? 'unbound')"
              class="invoice-issue-block"
            >
              <div class="invoice-issue-block__header">
                <span class="invoice-issue-block__title">
                  {{ issueApplicationNo(issue) }}
                </span>
                <span v-if="issue.invoiceNo" class="invoice-issue-block__meta">
                  发票号 {{ issue.invoiceNo }}
                </span>
                <span class="invoice-issue-block__meta">
                  本组原始结算
                  {{
                    formatOptionalSettlementAmount(issue.originalSettledAmount)
                  }}
                </span>
              </div>
              <Table
                :columns="invoiceIssueFeeColumns"
                :data-source="mapIssueFeeRows(issue)"
                :pagination="false"
                row-key="key"
                size="small"
                class="invoice-issue-fee-table"
              >
                <template #bodyCell="{ column, record: fee }">
                  <template v-if="column.key === 'paySide'">
                    <Tag :color="getReceiveSettlementPaySideColor(fee.paySide)">
                      {{ getReceiveSettlementPaySideLabel(fee.paySide) }}
                    </Tag>
                  </template>
                  <template v-else-if="column.key === 'currencyCode'">
                    <Tag v-if="fee.currencyCode">{{ fee.currencyCode }}</Tag>
                    <span v-else>-</span>
                  </template>
                  <template v-else-if="column.key === 'settledAmount'">
                    {{ formatOptionalPlainAmount(fee.settledAmount) }}
                  </template>
                  <template v-else-if="column.key === 'originalSettledAmount'">
                    {{ formatOptionalPlainAmount(fee.originalSettledAmount) }}
                  </template>
                </template>
              </Table>
            </div>
            <div
              v-if="getInvoiceIssues(record).length === 0"
              class="invoice-issue-empty"
            >
              暂无发票开出明细
            </div>
          </div>
        </template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'type'">
            <Tag :color="getReceiveSettlementTypeColor(record.type)">
              {{ getReceiveSettlementTypeLabel(record.type) }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <Tag :color="getReceiveSettlementStatusColor(record.status)">
              {{ getReceiveSettlementStatusLabel(record.status) }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'settlementNo'">
            <Tooltip
              :title="`双击查看或编辑核销单 ${record.settlementNo || ''}`"
            >
              <span class="settlement-no">{{
                record.settlementNo || '-'
              }}</span>
            </Tooltip>
          </template>
          <template v-else-if="column.key === 'actualSettled'">
            <span class="amount-cell amount-cell--emphasis">
              {{ formatSettlementAmount(record.actualSettled) }}
            </span>
          </template>
          <template v-else-if="column.key === 'originalSettledAmount'">
            <span class="amount-cell">
              {{ formatOptionalSettlementAmount(record.originalSettledAmount) }}
            </span>
          </template>
          <template v-else-if="column.key === 'diffAmount'">
            <span
              class="amount-cell"
              :class="diffAmountTone(record.diffAmount)"
            >
              {{ formatOptionalSettlementAmount(record.diffAmount) }}
            </span>
          </template>
          <template v-else-if="column.key === 'itemCount'">
            {{ record.itemCount ?? 0 }} 条
          </template>
          <template v-else-if="column.key === 'remark'">
            <Tooltip v-if="record.remark" :title="record.remark">
              <span class="ellipsis-cell">{{ record.remark }}</span>
            </Tooltip>
            <span v-else>-</span>
          </template>
        </template>
      </Table>
    </div>
  </Card>
</template>

<style scoped lang="scss">
.settlement-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  min-height: 0;
  border-color: #e3e8ef;

  :deep(.ant-card-head) {
    flex: none;
    min-height: 48px;
    padding-inline: 16px;
    background: #fbfcfe;
  }

  :deep(.ant-card-body) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 0;
  }
}

.settlement-card__title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 600;
  color: #202936;
}

.settlement-card__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 20px;
  padding-inline: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #667487;
  background: #eef2f6;
  border-radius: 10px;
}

.settlement-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
}

.settlement-search {
  width: 220px;
}

.settlement-empty {
  display: flex;
  flex: 1;
  gap: 16px;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  padding: 32px 24px;
  color: #5d6b7c;
}

.settlement-empty__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  color: #7a8797;
  background: #f0f3f7;
  border-radius: 50%;
}

.settlement-empty__content {
  h3 {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 600;
    color: #303b49;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: #7a8797;
  }

  strong {
    font-variant-numeric: tabular-nums;
    color: #c56a08;
  }
}

.settlement-empty__actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.settlement-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.settlement-table {
  :deep(.ant-table-thead > tr > th) {
    color: #667487;
    background: #f7f9fb;
  }

  :deep(.ant-table-tbody > tr) {
    cursor: pointer;
  }

  :deep(.ant-table-pagination) {
    margin: 8px 16px;
  }
}

.settlement-no {
  font-weight: 500;
  color: #1677ff;
}

.amount-cell {
  display: block;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.amount-cell--emphasis {
  font-weight: 600;
  color: #283442;
}

.amount-cell--muted {
  color: #98a2b3;
}

.amount-cell--warn {
  font-weight: 600;
  color: #d46b08;
}

.invoice-issue-expand {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 8px 8px 36px;
}

.invoice-issue-block {
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #e8eef4;
  border-radius: 8px;
}

.invoice-issue-block__header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: baseline;
  margin-bottom: 8px;
}

.invoice-issue-block__title {
  font-weight: 600;
  color: #303b49;
}

.invoice-issue-block__meta {
  font-size: 12px;
  color: #7a8797;
}

.invoice-issue-fee-table {
  :deep(.ant-table-thead > tr > th) {
    padding: 6px 8px;
    background: #eef2f6;
  }

  :deep(.ant-table-tbody > tr > td) {
    padding: 6px 8px;
  }

  :deep(.ant-table-tbody > tr) {
    cursor: default;
  }
}

.invoice-issue-empty {
  padding: 8px 0;
  font-size: 13px;
  color: #7a8797;
}

.ellipsis-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
  white-space: nowrap;
}

@media (max-width: 760px) {
  .settlement-card {
    :deep(.ant-card-head) {
      align-items: flex-start;
      padding-block: 12px;
    }

    :deep(.ant-card-extra) {
      width: 100%;
      padding-top: 8px;
      margin-inline-start: 0;
    }
  }

  .settlement-toolbar {
    width: 100%;
  }

  .settlement-search {
    flex: 1;
    width: auto;
  }
}
</style>
