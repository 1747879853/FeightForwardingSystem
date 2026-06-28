<script lang="ts" setup>
import type { PaymentReviewAdminApi } from '#/api/audit-approval/payment-review-admin';

import { h, ref } from 'vue';

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

const [Grid, gridApi] = useVbenVxeGrid<PaymentReviewAdminApi.PayAppTaskItemDto>(
  {
    formOptions: {
      schema: usePaymentReviewFormSchema(),
      submitOnChange: true,
      showCollapseButton: true,
      collapsed: true,
      compact: true,
      wrapperClass: 'grid-cols-2',
    },
    gridEvents: {
      cellClick: handleRowClick,
    },
    gridOptions: {
      columns: usePaymentReviewColumns(),
      height: 'auto',
      keepSource: true,
      checkboxConfig: {
        highlight: true,
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

function getAllRows(): PaymentReviewAdminApi.PayAppTaskItemDto[] {
  return (gridApi.grid?.getTableData?.().tableData ??
    []) as PaymentReviewAdminApi.PayAppTaskItemDto[];
}

const doAudit = async (approve: boolean, remark: string, ids: string[]) => {
  await payAppAudit({ success: approve, remark, ids });
  message.success($t('ui.actionMessage.operationSuccess'));
  gridApi.reload();
};

const doReject = async (remark: string, ids: string[]) => {
  await payAppReject({ remark, ids });
  message.success($t('ui.actionMessage.operationSuccess'));
  gridApi.reload();
};

const showAuditConfirm = () => {
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
      const rows = getAllRows();
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
      const rows = getAllRows();
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
              <Button type="primary" @click="showAuditConfirm">
                {{ $t('auditApproval.task.allPass') }}
              </Button>
              <Button danger @click="showRejectConfirm">
                {{ t('batchReject') }}
              </Button>
            </Space>
          </template>
        </Grid>
      </template>
    </DetailPanel>
  </Page>
</template>
