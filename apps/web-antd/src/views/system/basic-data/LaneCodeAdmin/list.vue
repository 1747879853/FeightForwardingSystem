<script lang="ts" setup>
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { LaneCodeAdminApi } from '#/api/system/base-data/lane-code-admin';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteLaneCode,
  getLaneCodePagedList,
} from '#/api/system/base-data/lane-code-admin';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

const handleCreate = () => {
  formModalApi.setData(null).open();
};

const handleEdit = (row: LaneCodeAdminApi.LaneCodeDto) => {
  formModalApi.setData({ id: row.id }).open();
};

const getRowName = (row: LaneCodeAdminApi.LaneCodeDto) => {
  return row.laneName || row.laneEnName || row.code || `${row.id}`;
};

const handleDelete = async (row: LaneCodeAdminApi.LaneCodeDto) => {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [getRowName(row)]),
    duration: 0,
    key: 'action_process_msg',
  });

  try {
    await deleteLaneCode(row.id);
    message.success({
      content: $t('ui.actionMessage.deleteSuccess', [getRowName(row)]),
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
}: OnActionClickParams<LaneCodeAdminApi.LaneCodeDto>) => {
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

const [Grid, gridApi] = useVbenVxeGrid<LaneCodeAdminApi.LaneCodeDto>({
  formOptions: {
    schema: useGridFormSchema(),
    submitOnChange: true,
    showCollapseButton: false,
  },
  gridOptions: {
    columns: useColumns(handleActionClick),
    height: 'auto',
    // 分页改大时只绘制视口内行列，避免整表插槽一次挂载
    virtualXConfig: { enabled: true, gt: 0 },
    virtualYConfig: { enabled: true, gt: 0 },
    rowConfig: {
      keyField: 'id',
      // 虚拟滚动按这个高度算总高；不写会用约 21px，滚不到后面的行
      height: 40,
    },
    pagerConfig: {
      enabled: true,
    },
    proxyConfig: {
      ajax: {
        query: createPagedListQuery(getLaneCodePagedList),
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
    <Grid :table-title="$t('system.basicData.laneCode.list')">
      <template #toolbar-tools>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{
            $t('ui.actionTitle.create', [$t('system.basicData.laneCode.name')])
          }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
