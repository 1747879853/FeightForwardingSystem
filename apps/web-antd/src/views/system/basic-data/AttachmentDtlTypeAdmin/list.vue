<script lang="ts" setup>
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { AttachmentDtlTypeAdminApi } from '#/api/system/attachment-dtl-type-admin';

import { onMounted } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getModuleTypeLabelMap } from '#/api/common/lookup';
import {
  deleteAttachmentDtlType,
  getAttachmentDtlTypePagedList,
} from '#/api/system/attachment-dtl-type-admin';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

/** 可变 holder：列 formatter 每次读 .map，映射加载后无需重建列 */
const moduleTypeLabelMapHolder = {
  map: new Map<number, string>(),
};

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

const handleCreate = () => {
  formModalApi.setData(null).open();
};

const handleEdit = (row: AttachmentDtlTypeAdminApi.AttachmentDtlTypeDto) => {
  formModalApi.setData({ id: row.id }).open();
};

const handleDelete = async (
  row: AttachmentDtlTypeAdminApi.AttachmentDtlTypeDto,
) => {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.name || '']),
    duration: 0,
    key: 'action_process_msg',
  });

  try {
    await deleteAttachmentDtlType(row.id);
    message.success({
      content: $t('ui.actionMessage.deleteSuccess', [row.name || '']),
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
}: OnActionClickParams<AttachmentDtlTypeAdminApi.AttachmentDtlTypeDto>) => {
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

const [Grid, gridApi] =
  useVbenVxeGrid<AttachmentDtlTypeAdminApi.AttachmentDtlTypeDto>({
    formOptions: {
      schema: useGridFormSchema(),
      submitOnChange: true,
      showCollapseButton: false,
    },
    gridOptions: {
      columns: useColumns(moduleTypeLabelMapHolder, handleActionClick),
      height: 'auto',
      keepSource: true,
      pagerConfig: {
        enabled: true,
      },
      proxyConfig: {
        autoLoad: false,
        ajax: {
          query: createPagedListQuery(getAttachmentDtlTypePagedList),
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

onMounted(async () => {
  moduleTypeLabelMapHolder.map = await getModuleTypeLabelMap();
  await gridApi.query();
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />
    <Grid :table-title="$t('system.basicData.attachmentDtlType.list')">
      <template #toolbar-tools>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{
            $t('ui.actionTitle.create', [
              $t('system.basicData.attachmentDtlType.name'),
            ])
          }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
