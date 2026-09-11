<script lang="ts" setup>
import { computed, h, onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';

import { Button, message, Modal, Textarea } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  batchCancelGrantCommissionOrder,
  batchGrantCommissionOrder,
  CommissionOrderAdminApi,
  getCommissionOrderPagedList,
} from '#/api/commission/commission-order-admin';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';
import ActionModal from '#/views/commission/action-modal.vue';
import { formatAmount } from '#/views/commission/data';
import DetailModal from '#/views/commission/detail-modal.vue';

import {
  useCommissionGrantColumns,
  useCommissionGrantFormSchema,
} from './data';

defineOptions({ name: 'CommissionGrant' });

type OrderRow = CommissionOrderAdminApi.CommissionOrderDto;

const { CommissionOrderStatus: Status } = CommissionOrderAdminApi;

/** 提成状态默认「审核通过」；仅早期查询兜底，用户清空后不再回填 */
let statusDefaultApplied = false;

// ==================== 弹窗（复用提成单模块组件） ====================

const [DetailModalComp, detailModalApi] = useVbenModal({
  connectedComponent: DetailModal,
  destroyOnClose: true,
});

const [ActionModalComp, actionModalApi] = useVbenModal({
  connectedComponent: ActionModal,
  destroyOnClose: true,
});

const openDetail = (row: OrderRow) => {
  detailModalApi.setData({
    commissionType: row.commissionType,
    id: row.id,
  });
  detailModalApi.open();
};

// ==================== 选中行与发放 ====================

const selectedRows = ref<OrderRow[]>([]);

const syncSelectedRows = () => {
  selectedRows.value = (gridApi.grid?.getCheckboxRecords?.() ??
    []) as OrderRow[];
};

/** 发放（合并按钮）：至少勾选一行且全部审核通过时可用（列表可按状态筛选，非审核通过的不可发放） */
const canGrant = computed(
  () =>
    selectedRows.value.length > 0 &&
    selectedRows.value.every((row) => row.status === Status.Approved),
);

/** 批量取消发放：至少勾选一行且全部发放完成（发放完成的唯一出口就是批量取消发放） */
const canCancelGrant = computed(
  () =>
    selectedRows.value.length > 0 &&
    selectedRows.value.every((row) => row.status === Status.Granted),
);

/** 合并发放入口：单选走单张发放，多选走批量发放 */
const handleGrant = () => {
  const rows = selectedRows.value;
  if (rows.length === 0) return;
  if (rows.length === 1) {
    // 单张发放：可自由填写实际发放金额，默认应发金额
    const row = rows[0];
    if (!row) return;
    actionModalApi.setData({
      finalAmount: row.finalAmount,
      id: row.id,
      mode: 'grant',
    });
    actionModalApi.open();
    return;
  }
  handleBatchGrant();
};

/** 批量发放：一律按各自应发金额全额发放，发放备注必填 */
const handleBatchGrant = () => {
  const rows = selectedRows.value;
  if (rows.length === 0) {
    message.warning($t('commissionOrder.action.batchGrantNoSelection'));
    return;
  }
  if (!canGrant.value) {
    message.warning($t('commissionOrder.action.batchGrantApprovedOnly'));
    return;
  }
  const totalAmount = rows.reduce(
    (sum, row) => sum + (row.finalAmount ?? 0),
    0,
  );
  let modalRemark = '';
  Modal.confirm({
    title: $t('commissionOrder.action.batchGrantTitle'),
    content: () =>
      h('div', {}, [
        h(
          'p',
          $t('commissionOrder.action.batchGrantHint', {
            amount: formatAmount(totalAmount),
            count: rows.length,
          }),
        ),
        h(Textarea, {
          modelValue: modalRemark,
          onChange: (val: any) => {
            modalRemark = val.target?.value || val;
          },
          rows: 3,
          maxlength: 1024,
          placeholder: $t('commissionOrder.action.batchGrantRemarkPlaceholder'),
          style: 'margin-top: 8px;',
        }),
      ]),
    icon: null,
    width: 520,
    centered: true,
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    async onOk() {
      if (!modalRemark.trim()) {
        message.warning($t('commissionOrder.action.batchGrantRemarkRequired'));
        return Promise.reject(new Error('remark required'));
      }
      try {
        const result = await batchGrantCommissionOrder({
          ids: rows.map((row) => row.id),
          remark: modalRemark.trim(),
        });
        message.success(
          $t('commissionOrder.action.batchGrantSuccess', {
            amount: formatAmount(result?.totalAmount ?? totalAmount),
            count: result?.count ?? rows.length,
          }),
        );
        await gridApi.query();
      } catch {
        // 整批报错（全部校验通过才执行），错误由响应拦截器提示，保持弹窗不关闭
        return Promise.reject(new Error('batch grant failed'));
      }
    },
  });
};

/** 批量取消发放：退回审核通过并清空发放信息（取消不留痕），弹窗展示原发放金额合计供二次确认 */
const handleBatchCancelGrant = () => {
  const rows = selectedRows.value;
  if (rows.length === 0) {
    message.warning($t('commissionOrder.action.batchCancelGrantNoSelection'));
    return;
  }
  if (!canCancelGrant.value) {
    message.warning($t('commissionOrder.action.batchCancelGrantGrantedOnly'));
    return;
  }
  const totalAmount = rows.reduce(
    (sum, row) => sum + (row.grantAmount ?? 0),
    0,
  );
  Modal.confirm({
    title: $t('commissionOrder.action.batchCancelGrantTitle'),
    content: () =>
      h('div', {}, [
        h(
          'p',
          $t('commissionOrder.action.batchCancelGrantHint', {
            amount: formatAmount(totalAmount),
            count: rows.length,
          }),
        ),
        h(
          'p',
          {
            style: 'margin-top: 8px; color: #e6a23c;',
          },
          $t('commissionOrder.action.batchCancelGrantWarning'),
        ),
      ]),
    icon: null,
    width: 520,
    centered: true,
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    okButtonProps: { danger: true },
    async onOk() {
      try {
        const result = await batchCancelGrantCommissionOrder({
          ids: rows.map((row) => row.id),
        });
        // totalAmount 口径文档两处不一（14.2 为被取消金额合计，14.3 说恒为 0），后端返回 0 时回退前端求和
        const total = result?.totalAmount || totalAmount;
        message.success(
          $t('commissionOrder.action.batchCancelGrantSuccess', {
            amount: formatAmount(total),
            count: result?.count ?? rows.length,
          }),
        );
        await gridApi.query();
      } catch {
        // 整批报错（全部校验通过才执行），错误由响应拦截器提示，保持弹窗不关闭
        return Promise.reject(new Error('batch cancel grant failed'));
      }
    },
  });
};

const handleRowDblclick = ({
  row,
  column,
}: {
  row: OrderRow;
  column?: { type?: string };
}) => {
  if (column?.type === 'checkbox') {
    return;
  }
  openDetail(row);
};

// ==================== 列表查询 ====================

const getRangeValue = (
  value: unknown,
): [unknown | undefined, unknown | undefined] => {
  if (!Array.isArray(value)) {
    return [undefined, undefined];
  }
  return [value[0] ?? undefined, value[1] ?? undefined];
};

const toMonth = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }
  const date = dayjs(value as string);
  return date.isValid() ? date.format('YYYY-MM') : undefined;
};

const mapParams = (formValues: Record<string, any>) => {
  const nextValues = { ...formValues };
  if (!statusDefaultApplied && nextValues.status === undefined) {
    nextValues.status = Status.Approved;
  }
  statusDefaultApplied = true;

  const { accountDateRange, ...rest } = nextValues;
  const [start, end] = getRangeValue(accountDateRange);
  return {
    ...rest,
    accountDateEnd: toMonth(end),
    accountDateStart: toMonth(start),
  };
};

// ==================== 底部当页合计 ====================

/** 当前页表格数据，驱动提成金额 / 底薪 / 最终应发 / 实发金额 / 票数合计 */
const currentPageData = ref<OrderRow[]>([]);

const pageTotals = computed(() => {
  let commissionAmount = 0;
  let baseSalary = 0;
  let finalAmount = 0;
  let grantAmount = 0;
  let itemCount = 0;
  currentPageData.value.forEach((row) => {
    commissionAmount += Number(row.commissionAmount) || 0;
    baseSalary += Number(row.baseSalary) || 0;
    finalAmount += Number(row.finalAmount) || 0;
    grantAmount += Number(row.grantAmount) || 0;
    itemCount += Number(row.itemCount) || 0;
  });
  return {
    baseSalary,
    commissionAmount,
    finalAmount,
    grantAmount,
    itemCount,
  };
});

/**
 * 底部合计扁平项（对齐销售/操作提成列表：
 * 「标签: 着色金额」，项间用分隔符）。
 */
const summaryItems = computed(() => {
  if (currentPageData.value.length === 0) return [];
  return [
    {
      color: 'commission',
      name: `${$t('commissionOrder.columns.commissionAmount')}:`,
      value: formatAmount(pageTotals.value.commissionAmount),
    },
    {
      color: 'salary',
      name: `${$t('commissionOrder.columns.baseSalary')}:`,
      value: formatAmount(pageTotals.value.baseSalary),
    },
    {
      color: 'final',
      name: `${$t('commissionOrder.columns.finalAmount')}:`,
      value: formatAmount(pageTotals.value.finalAmount),
    },
    {
      color: 'grant',
      name: `${$t('commissionOrder.columns.grantAmount')}:`,
      value: formatAmount(pageTotals.value.grantAmount),
    },
    {
      color: 'count',
      name: `${$t('commissionOrder.columns.itemCount')}:`,
      value: String(pageTotals.value.itemCount),
    },
  ];
});

/** 提成状态由搜索表单控制（默认审核通过），发放类操作仅对审核通过的行生效 */
const fetchList = async (params: Record<string, any>) => {
  const result = await getCommissionOrderPagedList(params);
  // 数据刷新（查询/刷新/翻页）后勾选会被清空，同步清空选中行，避免发放按钮状态与实际勾选不一致
  selectedRows.value = [];
  // 拦截当前页数据，驱动底部当页合计
  currentPageData.value = (result?.items ?? []) as OrderRow[];
  return result;
};

const [Grid, gridApi] = useVbenVxeGrid<OrderRow>({
  gridEvents: {
    cellDblclick: handleRowDblclick,
    checkboxAll: syncSelectedRows,
    checkboxChange: syncSelectedRows,
    // trigger: 'row' 下单击行只触发 current-change 不触发 checkbox-change，需同步，否则发放按钮状态不跟随勾选
    currentRowChange: syncSelectedRows,
  },
  formOptions: {
    collapsed: true,
    compact: true,
    schema: useCommissionGrantFormSchema(),
    showCollapseButton: true,
    submitOnChange: true,
    wrapperClass: 'grid-cols-6',
  },
  gridOptions: {
    checkboxConfig: {
      highlight: true,
      // 点击整行即可勾选，便于工具栏发放操作
      trigger: 'row',
    },
    columns: useCommissionGrantColumns(),
    height: '100%',
    keepSource: true,
    pagerConfig: {
      enabled: true,
    },
    proxyConfig: {
      // 关闭自动加载：挂载后 submitForm 首查，保证 status 默认「审核通过」写入最近提交值
      autoLoad: false,
      ajax: {
        query: createPagedListQuery(fetchList, {
          defaultSort: 'AccountDate DESC, CreationTime DESC',
          mapParams,
        }),
      },
    },
    rowConfig: {
      isCurrent: true,
      isHover: true,
      keyField: 'id',
    },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: { code: 'query' },
      zoom: true,
    },
  },
});

onMounted(async () => {
  await gridApi.formApi.submitForm();
});
</script>

<template>
  <Page auto-content-height content-class="flex flex-col">
    <Grid
      class="min-h-0 flex-1"
      :table-title="$t('commissionOrder.menu.commissionGrant')"
    >
      <template #toolbar-tools>
        <Button
          v-access:code="'Admin.CommissionOrder.Grant'"
          danger
          :disabled="!canCancelGrant"
          class="mr-2"
          @click="handleBatchCancelGrant"
        >
          {{ $t('commissionOrder.action.batchCancelGrant') }}
        </Button>
        <Button
          v-access:code="'Admin.CommissionOrder.Grant'"
          type="primary"
          :disabled="!canGrant"
          @click="handleGrant"
        >
          {{ $t('commissionOrder.actions.grant') }}
        </Button>
      </template>
    </Grid>

    <!-- 合计放在内容区内：Page 的 p-4 形成相对页面左右与底部的外边距 -->
    <div v-if="summaryItems.length > 0" class="commission-grant-footer-summary">
      <div
        v-for="(item, index) in summaryItems"
        :key="`${item.name}-${index}`"
        class="commission-grant-footer-summary__pair"
      >
        <span class="commission-grant-footer-summary__name">{{
          item.name
        }}</span>
        <span
          class="commission-grant-footer-summary__value"
          :class="`commission-grant-footer-summary__value--${item.color}`"
        >
          {{ item.value }}
        </span>
        <span
          v-show="index < summaryItems.length - 1"
          class="commission-grant-footer-summary__split"
        >
          |
        </span>
      </div>
    </div>
    <div
      v-else
      class="commission-grant-footer-summary commission-grant-footer-summary--empty"
    >
      <span class="commission-grant-footer-summary__name">当页合计：</span>
      <span class="commission-grant-footer-summary__empty-text">暂无数据</span>
    </div>

    <DetailModalComp />
    <ActionModalComp @success="gridApi.query()" />
  </Page>
</template>

<style scoped>
/* 内容区内合计：相对页面的外边距由 Page p-4 提供，自身仅与表格留间距 */
.commission-grant-footer-summary {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 0 4px;
  align-items: center;
  width: 100%;
  min-height: 40px;
  padding: 8px 16px;
  margin-top: 12px;
  font-size: 13px;
  color: #52607a;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 6%) 0%,
    hsl(var(--background)) 55%,
    hsl(var(--primary) / 6%) 100%
  );
  border: 1px solid #e8ecf3;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(16 42 83 / 5%);
}

.commission-grant-footer-summary--empty {
  color: #94a3b8;
}

.commission-grant-footer-summary__pair {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  margin-right: 12px;
}

.commission-grant-footer-summary__name {
  flex-shrink: 0;
}

.commission-grant-footer-summary__value {
  font-weight: 600;
}

.commission-grant-footer-summary__value--commission {
  color: #00a862;
}

.commission-grant-footer-summary__value--salary {
  color: #f59e0b;
}

.commission-grant-footer-summary__value--final {
  color: #1890ff;
}

.commission-grant-footer-summary__value--grant {
  color: #eb2f96;
}

.commission-grant-footer-summary__value--count {
  color: #6366f1;
}

.commission-grant-footer-summary__split {
  margin: 0 4px;
  color: #d9dee8;
}

.commission-grant-footer-summary__empty-text {
  color: #94a3b8;
}
</style>
