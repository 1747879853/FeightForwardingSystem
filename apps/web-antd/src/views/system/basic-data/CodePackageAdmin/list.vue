<script lang="ts" setup>
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { CodePackageAdminApi } from '#/api/system/base-data/code-package-admin';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { codePackageListCache } from '#/adapter/component/biz-select/cache/code-package-cache';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteCodePackage,
  getCodePackagePagedList,
} from '#/api/system/base-data/code-package-admin';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

const handleCreate = () => {
  formDrawerApi.setData(null).open();
};

const handleEdit = (row: CodePackageAdminApi.CodePackageDto) => {
  formDrawerApi.setData({ id: row.id }).open();
};

const handleDelete = async (row: CodePackageAdminApi.CodePackageDto) => {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.name]),
    duration: 0,
    key: 'action_process_msg',
  });

  try {
    await deleteCodePackage(row.id);
    message.success({
      content: $t('ui.actionMessage.deleteSuccess', [row.name]),
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
}: OnActionClickParams<CodePackageAdminApi.CodePackageDto>) => {
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

const [Grid, gridApi] = useVbenVxeGrid<CodePackageAdminApi.CodePackageDto>({
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
        query: createPagedListQuery(getCodePackagePagedList),
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
  void codePackageListCache.ensure({ force: true });
};
</script>

<template>
  <Page auto-content-height>
    <FormDrawer @success="handleRefresh" />
    <Grid :table-title="$t('system.basicData.codePackage.list')">
      <template #toolbar-tools>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{
            $t('ui.actionTitle.create', [
              $t('system.basicData.codePackage.name'),
            ])
          }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
