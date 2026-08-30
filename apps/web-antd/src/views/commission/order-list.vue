<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Space } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  CommissionOrderAdminApi,
  deleteCommissionOrder,
  getCommissionOrderPagedList,
  submitCommissionOrder,
  unSubmitCommissionOrder,
} from '#/api/commission/commission-order-admin';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';

import { useGridFormSchema, useListColumns } from './data';
import ActionModal from './action-modal.vue';
import CreateModal from './create-modal.vue';
import DetailModal from './detail-modal.vue';

defineOptions({ name: 'CommissionOrderList' });

const route = useRoute();

const { CommissionOrderStatus: Status } = CommissionOrderAdminApi;

type OrderRow = CommissionOrderAdminApi.CommissionOrderDto;

/** 提成类型：由路由 meta 注入（销售提成=0 / 操作提成=1） */
const commissionType = computed<CommissionOrderAdminApi.CommissionType>(
  () =>
    (route.meta.commissionType as
      | CommissionOrderAdminApi.CommissionType
      | undefined) ?? CommissionOrderAdminApi.CommissionType.Sales,
);

const pageTitle = computed(() =>
  commissionType.value === CommissionOrderAdminApi.CommissionType.Operation
    ? $t('commissionOrder.menu.operationCommission')
    : $t('commissionOrder.menu.salesCommission'),
);

// ==================== 弹窗 ====================

const [CreateModalComp, createModalApi] = useVbenModal({
  connectedComponent: CreateModal,
  destroyOnClose: true,
});

const [DetailModalComp, detailModalApi] = useVbenModal({
  connectedComponent: DetailModal,
  destroyOnClose: true,
});

const [ActionModalComp] = useVbenModal({
  connectedComponent: ActionModal,
  destroyOnClose: true,
});

const onAdd = () => {
  createModalApi.setData({ commissionType: commissionType.value });
  createModalApi.open();
};

const openDetail = (row: OrderRow) => {
  detailModalApi.setData({
    commissionType: commissionType.value,
    id: row.id,
  });
  detailModalApi.open();
};

// ==================== 选中行与状态判定 ====================

type RowPredicate = (row: OrderRow) => boolean;

/** 可提交/可删除：录入与驳回状态 */
const canSubmitOrDelete = (row: OrderRow) =>
  row.status === Status.Draft || row.status === Status.Rejected;

/** 可撤销提交：审核中 */
const canUnsubmit = (row: OrderRow) => row.status === Status.Submitted;

const selectedRows = ref<OrderRow[]>([]);

const syncSelectedRows = () => {
  selectedRows.value = (gridApi.grid?.getCheckboxRecords?.() ??
    []) as OrderRow[];
};

const hasAny = (predicate: RowPredicate) => selectedRows.value.some(predicate);

const hasSubmitSelection = computed(() => hasAny(canSubmitOrDelete));
const hasUnsubmitSelection = computed(() => hasAny(canUnsubmit));

// ==================== 工具栏操作 ====================

/** 逐单调用（后端只支持单条），失败的条数汇总提示 */
const batchRun = async (
  ids: string[],
  run: (id: string) => Promise<unknown>,
  successMessage: string,
) => {
  const results = await Promise.allSettled(ids.map((id) => run(id)));
  const failedCount = results.filter((r) => r.status === 'rejected').length;
  if (failedCount === 0) {
    message.success(successMessage);
  } else {
    message.warning(
      $t('commissionOrder.action.batchPartialFailed', {
        failed: failedCount,
        success: ids.length - failedCount,
      }),
    );
  }
  handleRefresh();
};

const handleSubmit = () => {
  const rows = selectedRows.value.filter(canSubmitOrDelete);
  if (rows.length === 0) return;
  Modal.confirm({
    title: `${$t('commissionOrder.actions.submit')}（${rows.length}）`,
    content: $t('commissionOrder.actions.submitConfirm'),
    async onOk() {
      await batchRun(
        rows.map((r) => r.id),
        (id) => submitCommissionOrder({ id }),
        $t('commissionOrder.action.submitSuccess'),
      );
    },
  });
};

const handleUnsubmit = () => {
  const rows = selectedRows.value.filter(canUnsubmit);
  if (rows.length === 0) return;
  Modal.confirm({
    title: `${$t('commissionOrder.actions.unsubmit')}（${rows.length}）`,
    content: $t('commissionOrder.actions.unsubmitConfirm'),
    async onOk() {
      await batchRun(
        rows.map((r) => r.id),
        (id) => unSubmitCommissionOrder({ id }),
        $t('commissionOrder.action.unsubmitSuccess'),
      );
    },
  });
};

const handleDelete = () => {
  const rows = selectedRows.value.filter(canSubmitOrDelete);
  if (rows.length === 0) return;
  Modal.confirm({
    title: `${$t('commissionOrder.actions.delete')}（${rows.length}）`,
    content: $t('commissionOrder.actions.deleteConfirm'),
    okButtonProps: { danger: true },
    async onOk() {
      await batchRun(
        rows.map((r) => r.id),
        (id) => deleteCommissionOrder(id),
        $t('commissionOrder.action.deleteSuccess'),
      );
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
  const { accountDateRange, ...rest } = formValues;
  const [start, end] = getRangeValue(accountDateRange);
  return {
    ...rest,
    accountDateEnd: toMonth(end),
    accountDateStart: toMonth(start),
  };
};

const fetchList = async (params: Record<string, any>) => {
  const result = await getCommissionOrderPagedList({
    ...params,
    commissionType: commissionType.value,
  });
  // 数据刷新（查询/刷新/翻页）后勾选会被清空，同步清空选中行，避免工具栏按钮状态与实际勾选不一致
  selectedRows.value = [];
  return result;
};

const [Grid, gridApi] = useVbenVxeGrid<OrderRow>({
  gridEvents: {
    cellDblclick: handleRowDblclick,
    checkboxAll: syncSelectedRows,
    checkboxChange: syncSelectedRows,
    // trigger: 'row' 下单击行只触发 current-change 不触发 checkbox-change，需同步，否则按钮状态不跟随勾选
    currentRowChange: syncSelectedRows,
  },
  formOptions: {
    collapsed: true,
    schema: useGridFormSchema(),
    showCollapseButton: true,
    submitOnChange: true,
    wrapperClass: 'grid-cols-6',
  },
  gridOptions: {
    checkboxConfig: {
      highlight: true,
      // 点击整行即可勾选，便于工具栏批量操作
      trigger: 'row',
    },
    columns: useListColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: {
      enabled: true,
    },
    proxyConfig: {
      ajax: {
        query: createPagedListQuery(fetchList, {
          defaultSort: 'AccountDate DESC, CreationTime DESC',
          mapParams,
        }),
      },
    },
    rowConfig: {
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

const handleRefresh = () => {
  gridApi.query();
};
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="pageTitle">
      <template #toolbar-tools>
        <Space>
          <Button
            v-access:code="'Admin.CommissionOrder.Submit'"
            :disabled="!hasSubmitSelection"
            @click="handleSubmit"
          >
            {{ $t('commissionOrder.actions.submit') }}
          </Button>
          <Button
            v-access:code="'Admin.CommissionOrder.Submit'"
            :disabled="!hasUnsubmitSelection"
            @click="handleUnsubmit"
          >
            {{ $t('commissionOrder.actions.unsubmit') }}
          </Button>
          <Button
            v-access:code="'Admin.CommissionOrder.Delete'"
            danger
            :disabled="!hasSubmitSelection"
            @click="handleDelete"
          >
            {{ $t('commissionOrder.actions.delete') }}
          </Button>
          <Button
            v-access:code="'Admin.CommissionOrder.Add'"
            type="primary"
            @click="onAdd"
          >
            <Plus class="size-5" />
            {{ $t('commissionOrder.actions.create') }}
          </Button>
        </Space>
      </template>
    </Grid>

    <CreateModalComp @success="handleRefresh" />
    <DetailModalComp />
    <ActionModalComp @success="handleRefresh" />
  </Page>
</template>
