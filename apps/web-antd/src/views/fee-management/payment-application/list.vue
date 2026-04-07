<script lang="ts" setup>
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import dayjs from 'dayjs';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getPaymentApplicationPagedList } from '#/api/settlement-management/payment-application-admin';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';

const router = useRouter();

function handleCreate() {
  router.push('/fee-management/payment-application/add');
}

const handleRowDblclick = ({
  row,
}: {
  row: PaymentApplicationAdminApi.PaymentApplicationDto;
}) => {
  router.push(`/fee-management/payment-application/${row.id}/edit`);
};

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

  return {
    ...formValues,
    SubmitTimeStart: toIsoString(submitTimeStart),
    SubmitTimeEnd: toIsoString(submitTimeEnd),
    EndTimeStart: toIsoString(endTimeStart),
    EndTimeEnd: toIsoString(endTimeEnd),
    SubmitTimeRange: undefined,
    EndTimeRange: undefined,
  };
};

const [Grid] = useVbenVxeGrid<PaymentApplicationAdminApi.PaymentApplicationDto>(
  {
    formOptions: {
      schema: useGridFormSchema(),
      submitOnChange: true,
      showCollapseButton: true,
      collapsed: true,
      compact: true,
      wrapperClass: 'grid-cols-4',
    },
    gridEvents: {
      cellDblclick: handleRowDblclick,
    },
    gridOptions: {
      columns: useColumns(),
      height: 'auto',
      keepSource: true,
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
            return await getPaymentApplicationPagedList({
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
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('seaExport.export.paymentApplication.list')">
      <template #toolbar-tools>
        <Button type="primary" @click="handleCreate">
          {{ $t('seaExport.export.paymentApplication.addTitle') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
