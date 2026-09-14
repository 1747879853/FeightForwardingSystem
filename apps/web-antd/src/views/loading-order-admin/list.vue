<script lang="ts" setup>
import type { LoadingOrderAdminApi } from '#/api/sea-export/loading-order-admin';

import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, message, Modal, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getLoadingOrderPagedList } from '#/api/sea-export/loading-order-admin';
import { $t } from '#/locales';
import { toIsoEndOfDay, toIsoStartOfDay } from '#/utils';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';
import {
  applyDefaultSortable,
  createPagedListQuery,
} from '#/utils/paged-list-query';

import {
  getLoadingOrderStatusMeta,
  useColumns,
  useGridFormSchema,
} from './data';

defineOptions({ name: 'LoadingOrderList' });

const router = useRouter();

const isEmptyBizId = (id: unknown) => {
  if (id == null || id === '') return true;
  const text = String(id);
  return text === '0' || text === '00000000-0000-0000-0000-000000000000';
};

const getRangeValue = (
  value: unknown,
): [unknown | undefined, unknown | undefined] => {
  return Array.isArray(value)
    ? [value[0] as unknown, value[1] as unknown]
    : [undefined, undefined];
};

const normalizeQuery = (formValues: Record<string, unknown>) => {
  const { creationTimeRange, ...rest } = formValues;
  const [creationTimeStart, creationTimeEnd] = getRangeValue(creationTimeRange);

  const trimText = (value: unknown) =>
    typeof value === 'string' ? value.trim() || undefined : value;

  return {
    ...rest,
    loadingOrderNum: trimText(rest.loadingOrderNum),
    mblNum: trimText(rest.mblNum),
    commissionNum: trimText(rest.commissionNum),
    vessel: trimText(rest.vessel),
    innerVoyno: trimText(rest.innerVoyno),
    creationTimeStart: toIsoStartOfDay(creationTimeStart),
    creationTimeEnd: toIsoEndOfDay(creationTimeEnd),
    creationTimeRange: undefined,
  };
};

const handleSubmitUserClick = (
  row: LoadingOrderAdminApi.LoadingOrderListDto,
) => {
  const name = row.submitUserName?.trim();
  if (!name) return;

  const phone = row.submitUserPhone?.trim();
  if (!phone) {
    message.warning($t('seaExport.loadingOrder.list.submitUserPhoneEmpty'));
    return;
  }

  Modal.confirm({
    title: $t('seaExport.loadingOrder.list.submitUserName'),
    content: `${name}  ${phone}`,
    okText: $t('seaExport.loadingOrder.list.callPhone'),
    onOk: () => {
      window.location.href = `tel:${phone}`;
    },
  });
};

const handleRowDblclick = ({
  row,
}: {
  row: LoadingOrderAdminApi.LoadingOrderListDto;
}) => {
  if (isEmptyBizId(row.seaExportId)) {
    message.warning($t('seaExport.loadingOrder.list.seaExportDeleted'));
    return;
  }
  router.push(`/sea-exports/${String(row.seaExportId)}/edit?tab=loadingOrder`);
};

const [Grid, gridApi] =
  useVbenVxeGrid<LoadingOrderAdminApi.LoadingOrderListDto>({
    formOptions: {
      schema: useGridFormSchema(),
      submitOnChange: false,
      showCollapseButton: true,
      collapsed: true,
      commonConfig: {
        labelWidth: 86,
      },
      wrapperClass: 'grid-cols-6',
    },
    gridEvents: {
      cellDblclick: handleRowDblclick,
    },
    gridOptions: {
      align: 'left',
      columns: applyDefaultSortable(useColumns()),
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
          query: createPagedListQuery(getLoadingOrderPagedList, {
            defaultSort: 'CreationTime DESC',
            mapParams: normalizeQuery,
          }),
        },
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

useRefreshListOnFormReturn('LoadingOrderList', handleRefresh);
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('seaExport.loadingOrder.list.title')">
      <template #status="{ row }">
        <Tag :color="getLoadingOrderStatusMeta(row.status).color">
          {{ getLoadingOrderStatusMeta(row.status).label }}
        </Tag>
      </template>
      <template #submitUser="{ row }">
        <span v-if="!row.submitUserName">-</span>
        <Button
          v-else
          type="link"
          size="small"
          class="!px-0"
          @click.stop="handleSubmitUserClick(row)"
        >
          {{ row.submitUserName }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
