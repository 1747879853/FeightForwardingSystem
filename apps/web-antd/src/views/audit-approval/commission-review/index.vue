<script lang="ts" setup>
import { computed, h, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';

import { Button, message, Modal, Space, Textarea } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { TaskType } from '#/api/audit-approval/payment-review-admin';
import {
  auditCommissionOrder,
  CommissionOrderAdminApi,
  getCommissionOrderPagedList,
  rejectCommissionOrder,
} from '#/api/commission/commission-order-admin';
import { useWorkflowTimeline } from '#/components/workflow-timeline';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';
import ActionModal from '#/views/commission/action-modal.vue';
import DetailModal from '#/views/commission/detail-modal.vue';

import {
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

const [ActionModalComp, actionModalApi] = useVbenModal({
  connectedComponent: ActionModal,
  destroyOnClose: true,
});

const openDetail = (row: CommissionOrderAdminApi.CommissionOrderDto) => {
  detailModalApi.setData({
    commissionType: row.commissionType,
    id: row.id,
  });
  detailModalApi.open();
};

const openAction = (
  row: CommissionOrderAdminApi.CommissionOrderDto,
  mode: 'audit' | 'reject',
) => {
  actionModalApi.setData({
    finalAmount: row.finalAmount,
    id: row.id,
    mode,
  });
  actionModalApi.open();
};

// ==================== 选中行与状态判定 ====================

/** 待审核：审核中才可审（通过/驳回） */
const isPendingAudit = (row: CommissionOrderAdminApi.CommissionOrderDto) =>
  row.status === Status.Submitted;

/** 可审核后驳回：审核中与审核通过都能驳（已发放的不可驳） */
const canPostReject = (row: CommissionOrderAdminApi.CommissionOrderDto) =>
  row.status === Status.Approved || row.status === Status.Submitted;

const selectedRows = ref<CommissionOrderAdminApi.CommissionOrderDto[]>([]);

const syncSelectedRows = () => {
  selectedRows.value = (gridApi.grid?.getCheckboxRecords?.() ??
    []) as CommissionOrderAdminApi.CommissionOrderDto[];
};

const hasPendingAuditSelection = computed(() =>
  selectedRows.value.some(isPendingAudit),
);

const hasPostRejectSelection = computed(() =>
  selectedRows.value.some(canPostReject),
);

// ==================== 行操作 ====================

const onActionClick = ({
  code,
  row,
}: {
  code: string;
  row: CommissionOrderAdminApi.CommissionOrderDto;
}) => {
  switch (code) {
    case 'audit': {
      openAction(row, 'audit');
      break;
    }
    case 'detail': {
      openDetail(row);
      break;
    }
    case 'reject': {
      openAction(row, 'reject');
      break;
    }
    default: {
      break;
    }
  }
};

const handleRowDblclick = ({
  row,
  column,
}: {
  column?: { type?: string };
  row: CommissionOrderAdminApi.CommissionOrderDto;
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

const [Grid, gridApi] =
  useVbenVxeGrid<CommissionOrderAdminApi.CommissionOrderDto>({
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
    },
    gridOptions: {
      checkboxConfig: {
        highlight: true,
        // 点击整行即可勾选，便于批量审核与驳回
        trigger: 'row',
      },
      columns: useCommissionReviewColumns({ onActionClick }),
      height: 'auto',
      keepSource: true,
      pagerConfig: {
        enabled: true,
      },
      proxyConfig: {
        ajax: {
          query: createPagedListQuery(getCommissionOrderPagedList, {
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

const reloadGrid = async () => {
  await gridApi.reload();
  syncSelectedRows();
};

// ==================== 批量审核 ====================

/** 逐单调用审核接口（后端只支持单条），失败的条数汇总提示 */
const batchAudit = async (success: boolean, remark: string, ids: string[]) => {
  const results = await Promise.allSettled(
    ids.map((id) =>
      auditCommissionOrder({ id, remark: remark || undefined, success }),
    ),
  );
  const failedCount = results.filter((r) => r.status === 'rejected').length;
  if (failedCount === 0) {
    message.success($t('ui.actionMessage.operationSuccess'));
  } else {
    message.warning(
      t('batchPartialFailed', {
        failed: failedCount,
        success: ids.length - failedCount,
      }),
    );
  }
  await reloadGrid();
};

/** 逐单调用审核后驳回接口 */
const batchReject = async (remark: string, ids: string[]) => {
  const results = await Promise.allSettled(
    ids.map((id) => rejectCommissionOrder({ id, remark })),
  );
  const failedCount = results.filter((r) => r.status === 'rejected').length;
  if (failedCount === 0) {
    message.success($t('ui.actionMessage.operationSuccess'));
  } else {
    message.warning(
      t('batchPartialFailed', {
        failed: failedCount,
        success: ids.length - failedCount,
      }),
    );
  }
  await reloadGrid();
};

const openRemarkConfirm = (options: {
  danger?: boolean;
  emptyMessage: string;
  onConfirm: (remark: string, ids: string[]) => Promise<void>;
  pickRows: () => CommissionOrderAdminApi.CommissionOrderDto[];
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
    <Grid :table-title="t('title')">
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
        </Space>
      </template>
    </Grid>

    <DetailModalComp />
    <ActionModalComp @success="reloadGrid" />
  </Page>
</template>
