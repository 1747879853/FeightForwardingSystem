<script lang="ts" setup>
import type { ClientAdminApi } from '#/api/sea-export/client-admin';

import { computed, h, nextTick, onMounted, ref, watch } from 'vue';
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
  submitClientAudit,
  withdrawClientAudit,
} from '#/api/sea-export/client-admin';
import { useClientAuditConfig } from '#/composables/use-client-audit-config';
import { $t } from '#/locales';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';
import { createPagedListQuery } from '#/utils/paged-list-query';

import {
  canApplyClientModify,
  canEditClient,
  canSubmitClientAudit,
  canWithdrawClientAudit,
  getClientStatusLabel,
} from './base/client-status';
import { useColumns, useGridFormSchema } from './base/data';

// 添加权限检查相关导入
import { useAccessStore } from '@vben/stores';

const router = useRouter();

// 获取权限存储
const accessStore = useAccessStore();

/**
 * 租户配置为 true 时等于「业务侧可搜未审客户」：不显示审核状态列、筛选项
 * 与提交审核等操作按钮。
 *
 * 须等配置就绪后再挂载表格：列持久化会在 mount 时快照 columns，
 * 若先无审核列再异步加列，会被持久化回写冲掉。
 */
const { auditEnabled, ready: auditConfigReady } = useClientAuditConfig();

/** 配置就绪且已写入正确列定义后才挂载 Grid */
const gridBootstrapped = ref(false);

const handleCreate = () => {
  router.push('/clients/create');
};

const handleEdit = (row: ClientAdminApi.ClientDto) => {
  router.push(`/clients/${row.id}/edit`);
};

/** 申请修改复用编辑表单，只多一个必填的申请原因（由表单页在提交时收集） */
const handleApplyModify = (row: ClientAdminApi.ClientDto) => {
  router.push(`/clients/${row.id}/edit?mode=modify`);
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

// 启用审核后只有未提交(0)/已驳回(3)能直接编辑，其余状态后端也会拦
const canEditWithPermission = computed(() => {
  if (!canEdit.value || !hasEditPermission.value) return false;
  if (!auditEnabled.value) return true;
  return canEditClient(selectedRows.value[0]?.clientStatus);
});
const canDeleteWithPermission = computed(
  () => canDelete.value && hasDeletePermission.value,
);

/** 提交审核：批量，选中客户须全部是未提交/已驳回 */
const canSubmitAudit = computed(
  () =>
    auditEnabled.value &&
    hasEditPermission.value &&
    selectedRows.value.length > 0 &&
    selectedRows.value.every((row) => canSubmitClientAudit(row.clientStatus)),
);

/** 撤回：批量，选中客户须全部是待审核/申请修改 */
const canWithdrawAudit = computed(
  () =>
    auditEnabled.value &&
    hasEditPermission.value &&
    selectedRows.value.length > 0 &&
    selectedRows.value.every((row) => canWithdrawClientAudit(row.clientStatus)),
);

/** 申请修改：只能单条，且客户须是已通过/申请修改驳回 */
const canApplyModify = computed(
  () =>
    auditEnabled.value &&
    hasEditPermission.value &&
    selectedRows.value.length === 1 &&
    canApplyClientModify(selectedRows.value[0]?.clientStatus),
);

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
  const row = selectedRows.value[0]!;
  if (auditEnabled.value && !canEditClient(row.clientStatus)) {
    message.warning(
      `客户当前为${getClientStatusLabel(row.clientStatus)}，不可直接编辑，请发起申请修改`,
    );
    return;
  }
  handleEdit(row);
};

const handleSubmitAudit = () => {
  if (!canSubmitAudit.value) {
    message.warning('请选择未提交或已驳回的客户');
    return;
  }
  const rows = [...selectedRows.value];
  const displayName =
    rows.length === 1 ? getRowName(rows[0]!) : `${rows.length}条记录`;
  Modal.confirm({
    title: '提交审核',
    content: `确定提交 "${displayName}" 进入审核流程吗？一条客户生成一个独立审批任务。`,
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    async onOk() {
      await submitClientAudit({ ids: rows.map((row) => row.id) });
      message.success(`已提交 ${rows.length} 条客户审核`);
      handleRefresh();
    },
  });
};

const handleWithdrawAudit = () => {
  if (!canWithdrawAudit.value) {
    message.warning('请选择待审核或申请修改中的客户');
    return;
  }
  const rows = [...selectedRows.value];
  const displayName =
    rows.length === 1 ? getRowName(rows[0]!) : `${rows.length}条记录`;
  Modal.confirm({
    title: '撤回审核',
    content: `确定撤回 "${displayName}" 的审核申请吗？撤回只影响最新一轮，历史轮次留档。`,
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    okType: 'danger',
    async onOk() {
      await withdrawClientAudit({ ids: rows.map((row) => row.id) });
      message.success(`已撤回 ${rows.length} 条客户审核`);
      handleRefresh();
    },
  });
};

const handleApplyModifySelected = () => {
  if (!canApplyModify.value) {
    message.warning('请选择一条已通过或申请修改驳回的客户');
    return;
  }
  handleApplyModify(selectedRows.value[0]!);
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
    // 占位；真正列在 auditConfigReady 后、Grid 挂载前写入
    columns: useColumns({ showClientStatus: false }),
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

function applyClientAuditColumns(enabled: boolean) {
  gridApi.setGridOptions({
    columns: useColumns({ showClientStatus: enabled }),
  });
  gridApi.formApi?.updateSchema([
    { fieldName: 'ClientStatus', hide: !enabled },
  ]);
}

onMounted(async () => {
  await auditConfigReady;
  const enabled = auditEnabled.value;
  // 先写入正确列，再挂载 Grid，避免列持久化用「无审核列」的快照冲掉后续更新
  gridApi.setGridOptions({
    columns: useColumns({ showClientStatus: enabled }),
  });
  gridBootstrapped.value = true;
  await nextTick();
  // formApi 在 Grid mount 后才注入
  gridApi.formApi?.updateSchema([
    { fieldName: 'ClientStatus', hide: !enabled },
  ]);
});

// 会话内刷新配置后同步列/筛选项（表格已挂载）
watch(auditEnabled, (enabled) => {
  if (!gridBootstrapped.value) return;
  applyClientAuditColumns(enabled);
});

useRefreshListOnFormReturn('ClientList', handleRefresh);
</script>

<template>
  <Page auto-content-height>
    <Grid v-if="gridBootstrapped" :table-title="$t('seaExport.client.list')">
      <template #toolbar-tools>
        <Button
          v-if="auditEnabled"
          class="mr-2"
          :disabled="!canSubmitAudit"
          @click="handleSubmitAudit"
        >
          提交审核
        </Button>
        <Button
          v-if="auditEnabled"
          class="mr-2"
          :disabled="!canApplyModify"
          @click="handleApplyModifySelected"
        >
          申请修改
        </Button>
        <Button
          v-if="auditEnabled"
          class="mr-2"
          :disabled="!canWithdrawAudit"
          @click="handleWithdrawAudit"
        >
          撤回
        </Button>
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
        <Button
          class="mr-2"
          :disabled="!canEditWithPermission"
          @click="handleEditSelected"
        >
          {{ $t('common.edit') }}
        </Button>
        <Button type="primary" :disabled="!canCreate" @click="handleCreate">
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
