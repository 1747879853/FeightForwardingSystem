<script lang="ts" setup>
import type { GroupFieldDef } from '#/components/list-grouping';

import { computed, onActivated, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Space } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  CommissionOrderAdminApi,
  deleteCommissionOrder,
  getCommissionOrderGroupedList,
  getCommissionOrderPagedList,
  submitCommissionOrder,
  unSubmitCommissionOrder,
} from '#/api/commission/commission-order-admin';
import {
  GroupingSettings,
  GroupingTabs,
  useListGrouping,
} from '#/components/list-grouping';
import { $t } from '#/locales';
import { useTableConfigStore } from '#/store/table-config';
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

// ==================== 分组统计 ====================

const tableConfigStore = useTableConfigStore();

/** 分组设置持久化 key（销售/操作列表共用组件，按路由名区分各自的配置） */
const groupConfigName = computed(
  () => `group_config_${String(route.name ?? 'CommissionSalesList')}`,
);

const loadGroupField = async (): Promise<number | undefined> => {
  await tableConfigStore.loadGroupConfigsOnce();
  const hit = tableConfigStore.getGroupConfigByName(groupConfigName.value);
  if (!hit?.setting) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(hit.setting) as { field?: null | number };
    return typeof parsed?.field === 'number' ? parsed.field : undefined;
  } catch {
    return undefined;
  }
};

const saveGroupField = (fieldValue: number | undefined) => {
  const setting = JSON.stringify({ field: fieldValue ?? null });
  const hit = tableConfigStore.getGroupConfigByName(groupConfigName.value);
  if (hit) {
    void tableConfigStore.editGroupConfig({
      id: hit.id,
      name: groupConfigName.value,
      setting,
    });
  } else {
    void tableConfigStore.addGroupConfig({
      name: groupConfigName.value,
      setting,
    });
  }
};

const { CommissionOrderGroupField: GroupField } = CommissionOrderAdminApi;

/**
 * 提成单列表分组字段配置。
 * 本页提成类型由路由固定（销售/操作），故只提供提成人与提成月两个维度；
 * 提成月分组项 id 为该月1号的完整日期，点击后同时回填提成月起止去查该月列表。
 */
const COMMISSION_GROUP_FIELDS: GroupFieldDef<CommissionOrderAdminApi.CommissionOrderGroupField>[] =
  [
    {
      value: GroupField.User,
      label: $t('commissionOrder.group.user'),
      paramKey: 'userId',
      searchField: 'userId',
    },
    {
      value: GroupField.AccountDate,
      label: $t('commissionOrder.group.accountDate'),
      paramKey: 'accountDateStart',
      searchField: 'accountDateRange',
    },
  ];

const grouping =
  useListGrouping<CommissionOrderAdminApi.CommissionOrderGroupField>({
    fields: COMMISSION_GROUP_FIELDS,
    getGridApi: () => gridApi,
    fetchGroups: async (baseParams, field) => {
      // 与分页列表同一套筛选条件（含路由固定的提成类型），只是换成分组接口
      const items = await getCommissionOrderGroupedList({
        ...baseParams,
        groupField: field,
      });
      return items ?? [];
    },
    persist: {
      load: loadGroupField,
      save: saveGroupField,
    },
  });

const onGroupFieldChange = (
  value: CommissionOrderAdminApi.CommissionOrderGroupField | undefined,
) => {
  if (value === undefined) {
    grouping.disable();
  } else {
    grouping.enableField(value);
  }
};

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
  const baseParams = {
    ...rest,
    accountDateEnd: toMonth(end),
    accountDateStart: toMonth(start),
    // 列表固定按路由注入的提成类型筛选；分组统计与列表同一套条件，同样带上
    commissionType: commissionType.value,
  };
  const decorated = grouping.decorateListParams(baseParams);
  // 提成月分组：分组项 id 为该月1号的完整日期，同时回填提成月起止（后端只取年月、含当月）
  const selectedId = grouping.selectedItemId.value;
  if (
    grouping.enabledField.value?.value === GroupField.AccountDate &&
    typeof selectedId === 'string' &&
    selectedId
  ) {
    decorated.accountDateStart = selectedId;
    decorated.accountDateEnd = selectedId;
  }
  return decorated;
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
      // 关闭自动加载：由 onMounted 先恢复持久化的分组字段再 submitForm 首查，
      // 避免分组恢复与首查竞态导致分组数据拉不到
      autoLoad: false,
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

onMounted(async () => {
  // 先恢复持久化的分组字段（仅设置状态，不查询），确保首查即带上分组维度，
  // 从而在同一次查询中拉取分组数据
  await grouping.restorePersistedField();
  // 用 submitForm 触发首查：它会把当前表单值写入「最近提交值」，
  // 后续分页/排序走 gridApi.query 时才能带上同一套条件
  await gridApi.formApi.submitForm();
});

// 列表页 keepAlive，分组统计不做缓存：每次重新进入列表都拉取一遍分组数据。
// 首次激活与 onMounted 首查重合，跳过以避免重复请求。
let firstActivate = true;
onActivated(() => {
  if (firstActivate) {
    firstActivate = false;
    return;
  }
  grouping.refreshGroupData();
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <!-- 工具栏左侧插槽始终挂载，避免开启分组时 table-title 与插槽切换导致 vxe options 重算 -->
      <template #toolbar-actions>
        <GroupingTabs
          v-if="grouping.isGrouping.value"
          :items="grouping.groupItems.value"
          :selected-id="grouping.selectedItemId.value"
          :loading="grouping.loading.value"
          @select="grouping.selectItem"
        />
        <div v-else class="mr-1 pl-1 text-[1rem]">
          {{ pageTitle }}
        </div>
      </template>
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
          <GroupingSettings
            :fields="grouping.fields"
            :value="grouping.enabledField.value?.value"
            @change="onGroupFieldChange"
          />
        </Space>
      </template>
    </Grid>

    <CreateModalComp @success="handleRefresh" />
    <DetailModalComp />
    <ActionModalComp @success="handleRefresh" />
  </Page>
</template>
