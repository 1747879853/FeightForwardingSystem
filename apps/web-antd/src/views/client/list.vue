<script lang="ts" setup>
import type { ClientAdminApi } from '#/api/sea-export/client-admin';

import { computed, h, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, Form, FormItem, Input, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteClient,
  getClientPagedList,
  addDishonest,
  cancelDishonest,
} from '#/api/sea-export/client-admin';
import { $t } from '#/locales';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';
import { createPagedListQuery } from '#/utils/paged-list-query';

import { useColumns, useGridFormSchema } from './base/data';

// 添加权限检查相关导入
import { useAccessStore } from '@vben/stores';

const router = useRouter();

// 获取权限存储
const accessStore = useAccessStore();

const handleCreate = () => {
  router.push('/clients/create');
};

const handleEdit = (row: ClientAdminApi.ClientDto) => {
  router.push(`/clients/${row.id}/edit`);
};

const handleRowDblclick = ({
  row,
  column,
}: {
  row: ClientAdminApi.ClientDto;
  column?: { type?: string };
}) => {
  if (column?.type === 'checkbox') {
    return;
  }
  // 只有有编辑权限时才允许双击编辑
  if (hasEditPermission.value) {
    handleEdit(row);
  }
};

const selectedRows = ref<ClientAdminApi.ClientDto[]>([]);

const canEdit = computed(() => selectedRows.value.length === 1);
const canDelete = computed(() => selectedRows.value.length > 0);
const canAddDishonest = computed(
  () => selectedRows.value.length === 1 && !selectedRows.value[0]?.isDishonest,
);
const canCancelDishonest = computed(
  () => selectedRows.value.length === 1 && selectedRows.value[0]?.isDishonest,
);

// 添加新建权限检查
const canCreate = computed(() => {
  return accessStore.accessCodes.includes('Admin.Client.Add');
});

// 添加编辑权限检查
const hasEditPermission = computed(() => {
  return accessStore.accessCodes.includes('Admin.Client.Edit');
});

// 添加删除权限检查  
const hasDeletePermission = computed(() => {
  return accessStore.accessCodes.includes('Admin.Client.Delete');
});

// 更新编辑和删除的可用性计算属性
const canEditWithPermission = computed(() => canEdit.value && hasEditPermission.value);
const canDeleteWithPermission = computed(() => canDelete.value && hasDeletePermission.value);

const syncSelectedRows = () => {
  selectedRows.value =
    (gridApi.grid?.getCheckboxRecords?.() as ClientAdminApi.ClientDto[]) ?? [];
};

const clearSelection = () => {
  selectedRows.value = [];
  gridApi.grid?.clearCheckboxRow?.();
  gridApi.grid?.clearCheckboxReserve?.();
};

const getRowName = (row: ClientAdminApi.ClientDto) => {
  return row.name || row.fullName || row.code || `${row.id}`;
};

const handleEditSelected = () => {
  if (!canEdit.value) {
    message.warning($t('seaExport.export.pleaseSelectOne'));
    return;
  }
  handleEdit(selectedRows.value[0]!);
};

const handleDeleteSelected = () => {
  if (!canDelete.value) {
    message.warning($t('seaExport.export.pleaseSelectOne'));
    return;
  }

  const names = selectedRows.value.map((row) => getRowName(row));
  const displayName = names.length === 1 ? names[0]! : `${names.length}条记录`;

  Modal.confirm({
    title: $t('ui.actionTitle.delete', [$t('seaExport.client.name')]),
    content: $t('ui.actionMessage.deleteConfirm', [displayName]),
    okType: 'danger',
    async onOk() {
      const hideLoading = message.loading({
        content: $t('ui.actionMessage.deleting', [displayName]),
        duration: 0,
        key: 'action_process_msg',
      });

      try {
        await deleteClient({
          ids: selectedRows.value.map((row) => row.id),
        });
        message.success({
          content: $t('ui.actionMessage.deleteSuccess', [displayName]),
          key: 'action_process_msg',
        });
        handleRefresh();
      } catch {
        hideLoading();
      }
    },
  });
};

const handleAddDishonest = async () => {
  if (!canAddDishonest.value) {
    message.warning($t('seaExport.export.pleaseSelectOne'));
    return;
  }

  const row = selectedRows.value[0]!;
  const displayName = getRowName(row);

  // 创建表单引用和响应式数据
  let formRef: any = null;
  const formData = ref({
    dishonestRemark: '',
  });

  Modal.confirm({
    title: '加入失信',
    width: 600,
    content: h('div', { style: 'margin-top: 16px;' }, [
      h(
        'p',
        {
          style: 'margin-bottom: 16px; color: #595959;',
        },
        `确定要将客户 "${displayName}" 加入失信名单吗？`,
      ),
      h(
        Form,
        {
          ref: (refInstance: any) => {
            formRef = refInstance;
          },
          model: formData.value,
          layout: 'vertical',
        },
        [
          h(
            FormItem,
            {
              label: '失信备注',
              required: true,
              rules: [
                { required: true, message: '请输入失信备注', trigger: 'blur' },
                {
                  max: 1024,
                  message: '失信备注长度不能超过1024个字符',
                  trigger: 'blur',
                },
              ],
            },
            [
              h(Input.TextArea, {
                value: formData.value.dishonestRemark,
                placeholder: '请输入失信原因或备注信息（必填，最多1024字符）',
                rows: 4,
                maxlength: 1024,
                showCount: true,
                onChange: (e: Event) => {
                  formData.value.dishonestRemark = (
                    e.target as HTMLTextAreaElement
                  ).value;
                },
                style: 'width: 100%;',
              }),
            ],
          ),
        ],
      ),
    ]),
    okType: 'danger',
    okText: '确定',
    cancelText: '取消',
    async onOk() {
      // 验证表单
      try {
        await formRef?.validate();
      } catch (error) {
        return Promise.reject();
      }

      // 二次验证：确保备注不为空且符合长度要求
      const remark = formData.value.dishonestRemark?.trim();
      if (!remark) {
        message.error('失信备注不能为空');
        return Promise.reject();
      }

      if (remark.length > 1024) {
        message.error('失信备注长度不能超过1024');
        return Promise.reject();
      }

      const hideLoading = message.loading({
        content: `正在将 "${displayName}" 加入失信...`,
        duration: 0,
        key: 'action_process_msg',
      });

      try {
        await addDishonest({
          id: row.id,
          dishonestRemark: remark,
        });
        message.success({
          content: `成功将 "${displayName}" 加入失信`,
          key: 'action_process_msg',
        });
        handleRefresh();
      } catch (error) {
        hideLoading();
        return Promise.reject();
      }
    },
  });
};

const handleCancelDishonest = async () => {
  if (!canCancelDishonest.value) {
    message.warning($t('seaExport.export.pleaseSelectOne'));
    return;
  }

  const row = selectedRows.value[0]!;
  const displayName = getRowName(row);

  Modal.confirm({
    title: '取消失信',
    content: `确定要将客户 "${displayName}" 从失信名单中移除吗？`,
    okType: 'danger',
    async onOk() {
      const hideLoading = message.loading({
        content: `正在将 "${displayName}" 移出失信...`,
        duration: 0,
        key: 'action_process_msg',
      });

      try {
        await cancelDishonest({
          id: row.id,
        });
        message.success({
          content: `成功将 "${displayName}" 移出失信`,
          key: 'action_process_msg',
        });
        handleRefresh();
      } catch {
        hideLoading();
      }
    },
  });
};

const fetchClientPagedList = (params: Record<string, any>) => {
  clearSelection();
  return getClientPagedList(params);
};

const [Grid, gridApi] = useVbenVxeGrid<ClientAdminApi.ClientDto>({
  gridEvents: {
    checkboxAll: syncSelectedRows,
    checkboxChange: syncSelectedRows,
    cellDblclick: handleRowDblclick,
  },
  formOptions: {
    schema: useGridFormSchema(),
    collapsed: true,
    submitOnChange: true,
    showCollapseButton: true,
    wrapperClass: 'grid-cols-6',
  },
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    checkboxConfig: {
      highlight: true,
      reserve: false,
      trigger: 'default',
    },
    rowConfig: {
      keyField: 'id',
    },
    pagerConfig: {
      enabled: true,
    },
    proxyConfig: {
      ajax: {
        query: createPagedListQuery(fetchClientPagedList),
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
  clearSelection();
  gridApi.query();
};

useRefreshListOnFormReturn('ClientList', handleRefresh);
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('seaExport.client.list')">
      <template #toolbar-tools>
        <Button v-if="canAddDishonest" class="mr-2" @click="handleAddDishonest">
          加入失信
        </Button>
        <Button
          v-if="canCancelDishonest"
          class="mr-2"
          @click="handleCancelDishonest"
        >
          取消失信
        </Button>
        <Button
          class="mr-2"
          :disabled="!canDeleteWithPermission"
          danger
          @click="handleDeleteSelected"
        >
          {{ $t('common.delete') }}
        </Button>
        <Button class="mr-2" :disabled="!canEditWithPermission" @click="handleEditSelected">
          {{ $t('common.edit') }}
        </Button>
        <Button 
          type="primary" 
          :disabled="!canCreate"
          @click="handleCreate"
        >
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>