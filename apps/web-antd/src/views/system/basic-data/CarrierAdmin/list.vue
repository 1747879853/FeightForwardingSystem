<script lang="ts" setup>
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { CarrierAdminApi } from '#/api/system/base-data/carrier-admin';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteCarrier,
  getCarrierPagedList,
} from '#/api/system/base-data/carrier-admin';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

const handleCreate = () => {
  formModalApi.setData(null).open();
};

const handleEdit = (row: CarrierAdminApi.CarrierDto) => {
  formModalApi.setData({ id: row.id }).open();
};

const handleDelete = async (row: CarrierAdminApi.CarrierDto) => {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.cnName || row.enName]),
    duration: 0,
    key: 'action_process_msg',
  });

  try {
    await deleteCarrier(row.id);
    message.success({
      content: $t('ui.actionMessage.deleteSuccess', [row.cnName || row.enName]),
      key: 'action_process_msg',
    });
    handleRefresh();
  } catch {
    hideLoading();
  }
};

const handleActionClick = ({
  code,
  row,
}: OnActionClickParams<CarrierAdminApi.CarrierDto>) => {
  switch (code) {
    case 'delete': {
      handleDelete(row);
      break;
    }
    case 'edit': {
      handleEdit(row);
      break;
    }
  }
};

const resolveLogoUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${window.location.origin}${url}`;
  return `${window.location.origin}/${url}`;
};

const [Grid, gridApi] = useVbenVxeGrid<CarrierAdminApi.CarrierDto>({
  formOptions: {
    schema: useGridFormSchema(),
    submitOnChange: true,
    showCollapseButton: false,
  },
  gridOptions: {
    columns: useColumns(handleActionClick),
    height: 'auto',
    keepSource: true,
    pagerConfig: {
      enabled: true,
    },
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, any>,
        ) => {
          return await getCarrierPagedList({
            PageIndex: page.currentPage,
            PageSize: page.pageSize,
            ...formValues,
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
});

const handleRefresh = () => {
  gridApi.query();
};
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />
    <Grid :table-title="$t('system.basicData.carrier.list')">
      <template #toolbar-tools>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{
            $t('ui.actionTitle.create', [$t('system.basicData.carrier.name')])
          }}
        </Button>
      </template>
      <template #logo="{ row }">
        <span class="flex w-full justify-center">
          <img
            v-if="row?.logo?.url"
            :src="resolveLogoUrl(row.logo.url)"
            :alt="row?.cnName || row?.enName || 'carrier-logo'"
            class="h-8 w-8 rounded object-contain"
          />
          <span v-else>-</span>
        </span>
      </template>
    </Grid>
  </Page>
</template>
