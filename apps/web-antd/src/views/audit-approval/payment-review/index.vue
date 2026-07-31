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
} from '#/api/audit-approval/payment-review-admin';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';

import DetailPanel from './detail-panel.vue';
import { usePaymentReviewColumns, usePaymentReviewFormSchema } from './data';

const t = (key: string) => $t(`auditApproval.paymentReview.${key}`);

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

const hasSelection = computed(() => selectedRows.value.length > 0);

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

const showAuditConfirm = () => {
  if (!hasSelection.value) {
    message.warning($t('ui.actionMessage.selectRequired'));
    return;
  }
  let modalRemark = '';
  Modal.confirm({
    title: $t('auditApproval.task.okPass'),
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
    async onOk() {
      const rows = getSelectedRows();
      if (rows.length === 0) {
        message.warning($t('ui.actionMessage.selectRequired'));
        return;
      }
      const ids = rows.map((r) => r.id);
      await doAudit(true, modalRemark, ids);
    },
  });
};

const showRejectConfirm = () => {
  if (!hasSelection.value) {
    message.warning($t('ui.actionMessage.selectRequired'));
    return;
  }
  let modalRemark = '';
  Modal.confirm({
    title: t('rejectConfirmTitle'),
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
    okButtonProps: { danger: true },
    async onOk() {
      const rows = getSelectedRows();
      if (rows.length === 0) {
        message.warning($t('ui.actionMessage.selectRequired'));
        return;
      }
      const ids = rows.map((r) => r.id);
      await doReject(modalRemark, ids);
    },
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
                :disabled="!hasSelection"
                @click="showAuditConfirm"
              >
                {{ t('auditPass') }}
              </Button>
              <Button
                danger
                :disabled="!hasSelection"
                @click="showRejectConfirm"
              >
                {{ t('selectReject') }}
              </Button>
            </Space>
          </template>
        </Grid>
      </template>
    </DetailPanel>
  </Page>
</template>
