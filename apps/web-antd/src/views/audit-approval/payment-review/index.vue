<script lang="ts" setup>
import type { PaymentReviewAdminApi } from '#/api/audit-approval/payment-review-admin';

import { computed, h, ref } from 'vue';

import dayjs from 'dayjs';

import { Page } from '@vben/common-ui';

import { Button, message, Modal, Space, Textarea } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getPayAppTaskList,
  payAppAudit,
  payAppReject,
  TaskStatus,
} from '#/api/audit-approval/payment-review-admin';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';

import DetailPanel from './detail-panel.vue';
import { usePaymentReviewColumns, usePaymentReviewFormSchema } from './data';

const t = (key: string) => $t(`auditApproval.paymentReview.${key}`);

/** AuditAsync：待审任务；RejectAsync：已通过（或整单仍在审、本人节点已过） */
function isPendingAudit(row: PaymentReviewAdminApi.PayAppTaskItemDto) {
  return row.taskStatus === TaskStatus.Auditing;
}

function canRejectAfterPass(row: PaymentReviewAdminApi.PayAppTaskItemDto) {
  return (
    row.taskStatus === TaskStatus.Passed ||
    (row.taskStatus === TaskStatus.Auditing &&
      row.myStatus === TaskStatus.Passed)
  );
}

/** 当前选中行对应的付费申请ID（驱动右侧详情渲染） */
const selectedPaymentApplicationId = ref<string | undefined>(undefined);

function handleRowClick({
  row,
}: {
  row: PaymentReviewAdminApi.PayAppTaskItemDto;
}) {
  selectedPaymentApplicationId.value = row.paymentApplicationId;
  const grid = gridApi.grid as any;
  grid?.setCurrentRow?.(row);
}

const toIsoString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const parsed = dayjs(value as string | Date);
  return parsed.isValid() ? parsed.toISOString() : undefined;
};

const getRangeValue = (
  value: unknown,
): [unknown | undefined, unknown | undefined] => {
  return Array.isArray(value)
    ? [value[0] as unknown, value[1] as unknown]
    : [undefined, undefined];
};

const normalizeQuery = (formValues: Record<string, unknown>) => {
  const [submitTimeStart, submitTimeEnd] = getRangeValue(
    formValues.SubmitTimeRange,
  );
  const [endTimeStart, endTimeEnd] = getRangeValue(formValues.EndTimeRange);
  const [auditTimeStart, auditTimeEnd] = getRangeValue(
    formValues.AuditTimeRange,
  );

  return {
    ...formValues,
    SubmitTimeStart: toIsoString(submitTimeStart),
    SubmitTimeEnd: toIsoString(submitTimeEnd),
    EndTimeStart: toIsoString(endTimeStart),
    EndTimeEnd: toIsoString(endTimeEnd),
    AuditTimeStart: toIsoString(auditTimeStart),
    AuditTimeEnd: toIsoString(auditTimeEnd),
    SubmitTimeRange: undefined,
    EndTimeRange: undefined,
    AuditTimeRange: undefined,
  };
};

const selectedRows = ref<PaymentReviewAdminApi.PayAppTaskItemDto[]>([]);

const syncSelectedRows = () => {
  selectedRows.value = getCheckboxRecords();
};

const hasPendingAuditSelection = computed(() =>
  selectedRows.value.some(isPendingAudit),
);
const hasPassRejectSelection = computed(() =>
  selectedRows.value.some(canRejectAfterPass),
);

const [Grid, gridApi] = useVbenVxeGrid<PaymentReviewAdminApi.PayAppTaskItemDto>(
  {
    formOptions: {
      schema: usePaymentReviewFormSchema(),
      submitOnChange: true,
      showCollapseButton: true,
      collapsed: true,
      compact: true,
      wrapperClass: 'grid-cols-5',
    },
    gridEvents: {
      cellClick: handleRowClick,
      checkboxAll: syncSelectedRows,
      checkboxChange: syncSelectedRows,
    },
    gridOptions: {
      columns: usePaymentReviewColumns(),
      height: 'auto',
      keepSource: true,
      checkboxConfig: {
        highlight: true,
        // 点击整行即可勾选/取消，便于批量审核与驳回
        trigger: 'row',
      },
      rowConfig: {
        keyField: 'id',
        isCurrent: true,
        isHover: true,
      },
      pagerConfig: {
        enabled: true,
      },
      proxyConfig: {
        ajax: {
          query: createPagedListQuery(getPayAppTaskList, {
            // 与后端任务实体可排序字段对齐；默认 CreationTime
            defaultSort: 'CreationTime DESC',
            fieldMap: {
              taskStatus: 'TaskStatus',
              auditTime: 'AuditTime',
              auditUserName: 'AuditUserId',
              creatorUserName: 'CreatorUserId',
              remark: 'Remark',
            },
            mapParams: normalizeQuery,
          }),
        },
      },
      toolbarConfig: {
        custom: true,
        export: false,
        refresh: { code: 'query' },
        zoom: false,
      },
    },
  },
);

function getCheckboxRecords(): PaymentReviewAdminApi.PayAppTaskItemDto[] {
  return (gridApi.grid?.getCheckboxRecords?.() ??
    []) as PaymentReviewAdminApi.PayAppTaskItemDto[];
}

function getSelectedRows(): PaymentReviewAdminApi.PayAppTaskItemDto[] {
  return selectedRows.value;
}

const reloadGrid = async () => {
  await gridApi.reload();
  syncSelectedRows();
};

const doAudit = async (approve: boolean, remark: string, ids: string[]) => {
  await payAppAudit({ success: approve, remark, ids });
  message.success($t('ui.actionMessage.operationSuccess'));
  await reloadGrid();
};

const doReject = async (remark: string, ids: string[]) => {
  await payAppReject({ remark, ids });
  message.success($t('ui.actionMessage.operationSuccess'));
  await reloadGrid();
};

const openRemarkConfirm = (options: {
  title: string;
  danger?: boolean;
  onConfirm: (remark: string, ids: string[]) => Promise<void>;
  pickRows: () => PaymentReviewAdminApi.PayAppTaskItemDto[];
  emptyMessage: string;
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
          placeholder: $t('auditApproval.task.remarkPlaceholder'),
          maxlength: 100,
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
      const rows = options.pickRows();
      if (rows.length === 0) {
        message.warning(options.emptyMessage);
        return Promise.reject(new Error(options.emptyMessage));
      }
      await options.onConfirm(
        modalRemark,
        rows.map((r) => r.id),
      );
    },
  });
};

/** 通过 → AuditAsync(success: true)，仅待审任务 */
const showAuditConfirm = () => {
  if (!hasPendingAuditSelection.value) {
    message.warning(t('noPendingAudit'));
    return;
  }
  openRemarkConfirm({
    title: $t('auditApproval.task.okPass'),
    pickRows: () => getSelectedRows().filter(isPendingAudit),
    emptyMessage: t('noPendingAudit'),
    onConfirm: (remark, ids) => doAudit(true, remark, ids),
  });
};

/** 驳回 → AuditAsync(success: false)，审核中点「不通过」 */
const showRejectConfirm = () => {
  if (!hasPendingAuditSelection.value) {
    message.warning(t('noPendingAudit'));
    return;
  }
  openRemarkConfirm({
    title: t('rejectConfirmTitle'),
    danger: true,
    pickRows: () => getSelectedRows().filter(isPendingAudit),
    emptyMessage: t('noPendingAudit'),
    onConfirm: (remark, ids) => doAudit(false, remark, ids),
  });
};

/** 审核后驳回 → RejectAsync，通过后再反悔 */
const showPassRejectConfirm = () => {
  if (!hasPassRejectSelection.value) {
    message.warning(t('noPassRejectable'));
    return;
  }
  openRemarkConfirm({
    title: t('passRejectConfirmTitle'),
    danger: true,
    pickRows: () => getSelectedRows().filter(canRejectAfterPass),
    emptyMessage: t('noPassRejectable'),
    onConfirm: (remark, ids) => doReject(remark, ids),
  });
};
</script>

<template>
  <Page auto-content-height>
    <DetailPanel :payment-application-id="selectedPaymentApplicationId">
      <template #list>
        <Grid :table-title="t('title')">
          <template #toolbar-tools>
            <Space>
              <Button
                type="primary"
                :disabled="!hasPendingAuditSelection"
                @click="showAuditConfirm"
              >
                {{ t('auditPass') }}
              </Button>
              <Button
                danger
                :disabled="!hasPendingAuditSelection"
                @click="showRejectConfirm"
              >
                {{ t('selectReject') }}
              </Button>
              <Button
                danger
                ghost
                :disabled="!hasPassRejectSelection"
                @click="showPassRejectConfirm"
              >
                {{ t('passReject') }}
              </Button>
            </Space>
          </template>
        </Grid>
      </template>
    </DetailPanel>
  </Page>
</template>
