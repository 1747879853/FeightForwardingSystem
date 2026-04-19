<script lang="ts" setup>
import type { PaymentReviewAdminApi } from '#/api/audit-approval/payment-review-admin';

import { h } from 'vue';

import dayjs from 'dayjs';

import { Page } from '@vben/common-ui';

import {
  Button,
  DropdownButton,
  Menu,
  MenuItem,
  message,
  Modal,
  Space,
  Textarea,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getPayAppTaskList,
  payAppAudit,
  payAppReject,
} from '#/api/audit-approval/payment-review-admin';
import { $t } from '#/locales';

import { usePaymentReviewColumns, usePaymentReviewFormSchema } from './data';

const t = (key: string) => $t(`auditApproval.paymentReview.${key}`);

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
      wrapperClass: 'grid-cols-4',
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
      },
      pagerConfig: {
        enabled: true,
      },
      proxyConfig: {
        ajax: {
          query: async (
            { page }: { page: { currentPage: number; pageSize: number } },
            formValues: Record<string, unknown>,
          ) => {
            return await getPayAppTaskList({
              PageIndex: page.currentPage,
              PageSize: page.pageSize,
              ...normalizeQuery(formValues),
            });
          },
        },
      },
      toolbarConfig: {
        custom: true,
        export: false,
        refresh: { code: 'query' },
        zoom: true,
      },
    },
  },
);

function getSelectedRows(): PaymentReviewAdminApi.PayAppTaskItemDto[] {
  return (gridApi.grid?.getCheckboxRecords?.() ??
    []) as PaymentReviewAdminApi.PayAppTaskItemDto[];
}

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

const showAuditConfirm = (approve: boolean, type: 'all' | 'selected') => {
  let modalRemark = '';
  Modal.confirm({
    title: approve
      ? $t('auditApproval.task.okPass')
      : $t('auditApproval.task.noPass'),
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
      const rows = type === 'all' ? getAllRows() : getSelectedRows();
      if (rows.length === 0) {
        message.warning($t('ui.actionMessage.selectRequired'));
        return;
      }
      const ids = rows.map((r) => r.id);
      await doAudit(approve, modalRemark, ids);
    },
  });
};

const showRejectConfirm = (type: 'all' | 'selected') => {
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
      const rows = type === 'all' ? getAllRows() : getSelectedRows();
      if (rows.length === 0) {
        message.warning($t('ui.actionMessage.selectRequired'));
        return;
      }
      const ids = rows.map((r) => r.id);
      await doReject(modalRemark, ids);
    },
  });
};

const handleAuditMenuClick = (e: any) => {
  if (e.key === 'selectPass') {
    showAuditConfirm(true, 'selected');
  }
};

const handleRejectMenuClick = (e: any) => {
  if (e.key === 'selectReject') {
    showRejectConfirm('selected');
  }
};
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="t('title')">
      <template #toolbar-tools>
        <Space>
          <DropdownButton type="primary" @click="showAuditConfirm(true, 'all')">
            {{ $t('auditApproval.task.allPass') }}
            <template #overlay>
              <Menu @click="handleAuditMenuClick">
                <MenuItem key="selectPass">
                  {{ $t('auditApproval.task.selectPass') }}
                </MenuItem>
              </Menu>
            </template>
          </DropdownButton>

          <DropdownButton danger @click="showRejectConfirm('all')">
            {{ t('batchReject') }}
            <template #overlay>
              <Menu @click="handleRejectMenuClick">
                <MenuItem key="selectReject">
                  {{ t('selectReject') }}
                </MenuItem>
              </Menu>
            </template>
          </DropdownButton>
        </Space>
      </template>
    </Grid>
  </Page>
</template>
