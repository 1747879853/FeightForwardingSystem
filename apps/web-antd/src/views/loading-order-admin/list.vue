<script lang="ts" setup>
import type { LoadingOrderAdminApi } from '#/api/sea-export/loading-order-admin';

import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { message, Tag } from 'ant-design-vue';

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
  LOADING_ORDER_SORT_FIELD_MAP,
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
            defaultSort: 'EstimatedArrivalTime DESC',
            fieldMap: LOADING_ORDER_SORT_FIELD_MAP,
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
        <Tag
          class="loading-status"
          :class="`loading-status--${getLoadingOrderStatusMeta(row.status).color}`"
          :bordered="false"
        >
          {{ getLoadingOrderStatusMeta(row.status).label }}
        </Tag>
      </template>
    </Grid>
  </Page>
</template>

<style scoped>
.loading-status {
  margin-inline-end: 0;
  font-weight: 500;
  color: #475569;
  background: #f1f5f9;
}

.loading-status--orange {
  color: #92400e;
  background: #fff7e6;
}

.loading-status--processing {
  color: #1d4ed8;
  background: #eff6ff;
}

.loading-status--success {
  color: #166534;
  background: #edf7ef;
}
</style>
