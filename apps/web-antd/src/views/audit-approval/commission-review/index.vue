<script lang="ts" setup>
import type { GroupFieldDef } from '#/components/list-grouping';

import { computed, h, onActivated, onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';

import { Button, message, Modal, Space, Textarea } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { TaskType } from '#/api/audit-approval/payment-review-admin';
import {
  batchAuditCommissionOrder,
  batchRejectCommissionOrder,
  CommissionOrderAdminApi,
  getCommissionOrderTaskGroupedList,
  getCommissionOrderTaskList,
} from '#/api/commission/commission-order-admin';
import {
  GroupingSettings,
  GroupingTabs,
  useListGrouping,
} from '#/components/list-grouping';
import { useWorkflowTimeline } from '#/components/workflow-timeline';
import { $t } from '#/locales';
import { useTableConfigStore } from '#/store/table-config';
import { createPagedListQuery } from '#/utils/paged-list-query';
import DetailModal from '#/views/commission/detail-modal.vue';

import {
  type CommissionReviewRow,
  useCommissionReviewColumns,
  useCommissionReviewFormSchema,
} from './data';

defineOptions({ name: 'CommissionReview' });

const t = (key: string, params?: Record<string, number | string>) => {
  const messageKey = `auditApproval.commissionReview.${key}`;
  return params ? $t(messageKey, params) : $t(messageKey);
};

const auditCode = 'Admin.CommissionOrder.Audit';

const { CommissionOrderStatus: Status } = CommissionOrderAdminApi;

const { open: openWorkflowTimeline } = useWorkflowTimeline();

// ==================== 弹窗（复用提成单模块组件） ====================

const [DetailModalComp, detailModalApi] = useVbenModal({
  connectedComponent: DetailModal,
  destroyOnClose: true,
});

const openDetail = (row: CommissionReviewRow) => {
  detailModalApi.setData({
    commissionType: row.commissionType,
    id: row.id,
  });
  detailModalApi.open();
};

// ==================== 分组统计 ====================

const tableConfigStore = useTableConfigStore();

/** 分组设置持久化 key（与列表路由名 CommissionReview 对齐） */
const GROUP_CONFIG_NAME = 'group_config_CommissionReview';

const loadGroupField = async (): Promise<number | undefined> => {
  await tableConfigStore.loadGroupConfigsOnce();
  const hit = tableConfigStore.getGroupConfigByName(GROUP_CONFIG_NAME);
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
  const hit = tableConfigStore.getGroupConfigByName(GROUP_CONFIG_NAME);
  if (hit) {
    void tableConfigStore.editGroupConfig({
      id: hit.id,
      name: GROUP_CONFIG_NAME,
      setting,
    });
  } else {
    void tableConfigStore.addGroupConfig({ name: GROUP_CONFIG_NAME, setting });
  }
};

const { CommissionOrderGroupField: GroupField } = CommissionOrderAdminApi;

/**
 * 提成审核页分组字段配置（与后端 CommissionOrderGroupField 对齐，三种维度全支持）。
 * 分组统计与待我审核列表同一套筛选条件、同样不过数据权限，分组条数与列表 TotalCount 对得上。
 * 提成月分组项 id 为该月1号的完整日期，点击后同时回填提成月起止去查该月列表。
 */
const REVIEW_GROUP_FIELDS: GroupFieldDef<CommissionOrderAdminApi.CommissionOrderGroupField>[] =
  [
    {
      value: GroupField.CommissionType,
      label: $t('commissionOrder.group.commissionType'),
      paramKey: 'commissionType',
      searchField: 'commissionType',
    },
    {
      value: GroupField.User,
      label: $t('commissionOrder.group.user'),
      paramKey: 'commissionUserId',
      searchField: 'commissionUserId',
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
    fields: REVIEW_GROUP_FIELDS,
    getGridApi: () => gridApi,
    fetchGroups: async (baseParams, field) => {
      // 与待我审核列表同一套筛选条件，只是换成分组接口
      const items = await getCommissionOrderTaskGroupedList({
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

// ==================== 选中行与状态判定 ====================

/** 待审核：审核中才可审（通过/驳回） */
const isPendingAudit = (row: CommissionReviewRow) =>
  row.status === Status.Submitted;

/** 可审核后驳回：审核中与审核通过都能驳（已发放的不可驳） */
const canPostReject = (row: CommissionReviewRow) =>
  row.status === Status.Approved || row.status === Status.Submitted;

const selectedRows = ref<CommissionReviewRow[]>([]);

const syncSelectedRows = () => {
  selectedRows.value = (gridApi.grid?.getCheckboxRecords?.() ??
    []) as CommissionReviewRow[];
};

const hasPendingAuditSelection = computed(() =>
  selectedRows.value.some(isPendingAudit),
);

const hasPostRejectSelection = computed(() =>
  selectedRows.value.some(canPostReject),
);

// ==================== 行双击打开详情 ====================

const handleRowDblclick = ({
  row,
  column,
}: {
  column?: { type?: string };
  row: CommissionReviewRow;
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

/** 待我审核列表：提成单信息平铺为行，行 id 保持提成单id（审核/驳回接口传它）；任务级字段另存 */
const mapTaskRow = (
  task: CommissionOrderAdminApi.CommissionOrderTaskDto,
): CommissionReviewRow => ({
  ...task.commissionOrder,
  taskId: task.id,
  taskStatus: task.taskStatus,
  myStatus: task.myStatus,
});

/** 数据刷新（查询/刷新/翻页）后勾选会被清空，同步清空选中行，避免工具栏按钮状态与实际勾选不一致 */
const fetchList = async (params: Record<string, any>) => {
  const result = await getCommissionOrderTaskList(params);
  selectedRows.value = [];
  return {
    items: (result.items ?? []).map(mapTaskRow),
    totalCount: result.totalCount ?? 0,
  };
};

const [Grid, gridApi] = useVbenVxeGrid<CommissionReviewRow>({
  formOptions: {
    collapsed: true,
    compact: true,
    schema: useCommissionReviewFormSchema(),
    showCollapseButton: true,
    submitOnChange: true,
    wrapperClass: 'grid-cols-6',
  },
  gridEvents: {
    cellDblclick: handleRowDblclick,
    checkboxAll: syncSelectedRows,
    checkboxChange: syncSelectedRows,
    // trigger: 'row' 下单击行只触发 current-change 不触发 checkbox-change，需同步，否则按钮状态不跟随勾选
    currentRowChange: syncSelectedRows,
  },
  gridOptions: {
    checkboxConfig: {
      highlight: true,
      // 点击整行即可勾选，便于批量审核与驳回
      trigger: 'row',
    },
    columns: useCommissionReviewColumns(),
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
          // 待我审核列表默认按提交时间倒序，最新提上来的在前（后端默认 CreationTime DESC）
          defaultSort: 'CreationTime DESC',
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

const reloadGrid = async () => {
  await gridApi.reload();
  syncSelectedRows();
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

// ==================== 批量审核 ====================

/** 批量审核：全部校验通过才执行，有一张不满足就整批报错、一条都不改 */
const batchAudit = async (success: boolean, remark: string, ids: string[]) => {
  const result = await batchAuditCommissionOrder({
    ids,
    remark: remark || undefined,
    success,
  });
  message.success(
    t('batchAuditSuccess', { count: result?.count ?? ids.length }),
  );
  await reloadGrid();
};

/** 批量审核后驳回：一批共用同一条驳回原因，全部校验通过才执行 */
const batchReject = async (remark: string, ids: string[]) => {
  const result = await batchRejectCommissionOrder({ ids, remark });
  message.success(
    t('batchRejectSuccess', { count: result?.count ?? ids.length }),
  );
  await reloadGrid();
};

const openRemarkConfirm = (options: {
  danger?: boolean;
  emptyMessage: string;
  onConfirm: (remark: string, ids: string[]) => Promise<void>;
  pickRows: () => CommissionReviewRow[];
  remarkRequired: boolean;
  title: string;
}) => {
  let modalRemark = '';
  Modal.confirm({
    title: options.title,
    content: () =>
      h('div', {}, [
        h(Textarea, {
          modelValue: modalRemark,
          onChange: (val: any) => {
            modalRemark = val.target?.value || val;
          },
          rows: 3,
          maxlength: 1024,
          placeholder: $t('auditApproval.task.remarkPlaceholder'),
          style: 'margin-top: 8px;',
        }),
      ]),
    icon: null,
    width: 520,
    centered: true,
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    okButtonProps: options.danger ? { danger: true } : undefined,
    async onOk() {
      if (options.remarkRequired && !modalRemark.trim()) {
        message.warning($t('commissionOrder.action.rejectRemarkRequired'));
        return Promise.reject(new Error('remark required'));
      }
      const rows = options.pickRows();
      if (rows.length === 0) {
        message.warning(options.emptyMessage);
        return Promise.reject(new Error(options.emptyMessage));
      }
      await options.onConfirm(
        modalRemark.trim(),
        rows.map((r) => r.id),
      );
    },
  });
};

/** 通过 → AuditAsync(success: true)，仅审核中的提成单 */
const showAuditConfirm = () => {
  if (!hasPendingAuditSelection.value) {
    message.warning(t('noPendingAudit'));
    return;
  }
  openRemarkConfirm({
    title: $t('auditApproval.task.okPass'),
    pickRows: () => selectedRows.value.filter(isPendingAudit),
    emptyMessage: t('noPendingAudit'),
    onConfirm: (remark, ids) => batchAudit(true, remark, ids),
    remarkRequired: false,
  });
};

/** 驳回 → AuditAsync(success: false)，审核中的提成单，驳回原因必填 */
const showRejectConfirm = () => {
  if (!hasPendingAuditSelection.value) {
    message.warning(t('noPendingAudit'));
    return;
  }
  openRemarkConfirm({
    title: t('rejectConfirmTitle'),
    danger: true,
    pickRows: () => selectedRows.value.filter(isPendingAudit),
    emptyMessage: t('noPendingAudit'),
    onConfirm: (remark, ids) => batchAudit(false, remark, ids),
    remarkRequired: true,
  });
};

/** 审核后驳回 → RejectAsync，审核中与审核通过都能驳，驳回原因必填 */
const showPostRejectConfirm = () => {
  if (!hasPostRejectSelection.value) {
    message.warning(t('noPostRejectable'));
    return;
  }
  openRemarkConfirm({
    title: t('postRejectConfirmTitle'),
    danger: true,
    pickRows: () => selectedRows.value.filter(canPostReject),
    emptyMessage: t('noPostRejectable'),
    onConfirm: (remark, ids) => batchReject(remark, ids),
    remarkRequired: true,
  });
};

/** 审批流程：单选行查看工作流时间线 */
const handleViewWorkflow = () => {
  const rows = selectedRows.value;
  if (rows.length !== 1) {
    message.warning(t('workflowSelectionRequired'));
    return;
  }
  const row = rows[0];
  if (!row) return;
  openWorkflowTimeline({
    entityId: row.id,
    taskType: TaskType.CommissionOrder,
  });
};
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
          {{ t('title') }}
        </div>
      </template>
      <template #toolbar-tools>
        <Space>
          <Button
            v-access:code="auditCode"
            type="primary"
            :disabled="!hasPendingAuditSelection"
            @click="showAuditConfirm"
          >
            {{ t('auditPass') }}
          </Button>
          <Button
            v-access:code="auditCode"
            danger
            :disabled="!hasPendingAuditSelection"
            @click="showRejectConfirm"
          >
            {{ t('selectReject') }}
          </Button>
          <Button
            v-access:code="auditCode"
            danger
            ghost
            :disabled="!hasPostRejectSelection"
            @click="showPostRejectConfirm"
          >
            {{ t('postReject') }}
          </Button>
          <Button @click="handleViewWorkflow">{{ t('workflow') }}</Button>
          <GroupingSettings
            :fields="grouping.fields"
            :value="grouping.enabledField.value?.value"
            @change="onGroupFieldChange"
          />
        </Space>
      </template>
    </Grid>

    <DetailModalComp />
  </Page>
</template>
