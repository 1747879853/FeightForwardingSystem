<script lang="ts" setup>
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { CodeIssueTypeAdminApi } from '#/api/system/base-data/code-issue-type-admin';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteCodeIssueType,
  getCodeIssueTypePagedList,
} from '#/api/system/base-data/code-issue-type-admin';
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

const handleEdit = (row: CodeIssueTypeAdminApi.CodeIssueTypeDto) => {
  formModalApi.setData({ id: row.id }).open();
};

const handleDelete = async (row: CodeIssueTypeAdminApi.CodeIssueTypeDto) => {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.billType || row.enName]),
    duration: 0,
    key: 'action_process_msg',
  });

  try {
    await deleteCodeIssueType(row.id);
    message.success({
      content: $t('ui.actionMessage.deleteSuccess', [
        row.billType || row.enName,
      ]),
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
}: OnActionClickParams<CodeIssueTypeAdminApi.CodeIssueTypeDto>) => {
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

const [Grid, gridApi] = useVbenVxeGrid<CodeIssueTypeAdminApi.CodeIssueTypeDto>({
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
          return await getCodeIssueTypePagedList({
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
    <Grid :table-title="$t('system.basicData.codeIssueType.list')">
      <template #toolbar-tools>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{
            $t('ui.actionTitle.create', [
              $t('system.basicData.codeIssueType.name'),
            ])
          }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
