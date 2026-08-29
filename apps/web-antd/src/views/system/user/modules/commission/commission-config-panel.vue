<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useAccess } from '@vben/access';
import { useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Space } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  CommissionConfigAdminApi,
  deleteCommissionConfig,
  getCommissionConfigPagedList,
} from '#/api/commission/commission-config-admin';
import { $t } from '#/locales';
import { createAbpPermission } from '#/utils/abp-permission';
import { createPagedListQuery } from '#/utils/paged-list-query';

import { useCommissionConfigColumns } from './commission-data';
import CommissionConfigModal from './commission-config-modal.vue';

defineOptions({ name: 'UserCommissionConfigPanel' });

const props = defineProps<{
  userId: number;
  commissionType: CommissionConfigAdminApi.CommissionType;
}>();

const perm = createAbpPermission('Admin.CommissionConfig');
const { hasAccessByCodes } = useAccess();
const canEdit = computed(() => hasAccessByCodes([perm.edit]));

type ConfigRow = CommissionConfigAdminApi.CommissionConfigDto;

const typeLabel = computed(() =>
  $t(
    props.commissionType === CommissionConfigAdminApi.CommissionType.Sales
      ? 'commission.salesTab'
      : 'commission.operationTab',
  ),
);

// ==================== 选中行 ====================

const selectedRows = ref<ConfigRow[]>([]);

const syncSelectedRows = () => {
  selectedRows.value = (gridApi.grid?.getCheckboxRecords?.() ??
    []) as ConfigRow[];
};

/** 编辑/删除为单行操作：仅选中一行时可用 */
const singleRow = computed(() =>
  selectedRows.value.length === 1 ? selectedRows.value[0] : undefined,
);

// ==================== 弹窗 ====================

const [CommissionConfigModalComponent, commissionConfigModalApi] = useVbenModal(
  {
    connectedComponent: CommissionConfigModal,
    destroyOnClose: true,
  },
);

function onAdd() {
  commissionConfigModalApi
    .setData({ userId: props.userId, commissionType: props.commissionType })
    .open();
}

function onEdit(record: ConfigRow) {
  commissionConfigModalApi
    .setData({
      userId: props.userId,
      commissionType: props.commissionType,
      id: record.id,
    })
    .open();
}

// ==================== 工具栏操作 ====================

const handleEdit = () => {
  const row = singleRow.value;
  if (row) {
    onEdit(row);
  }
};

const handleDelete = () => {
  const row = singleRow.value;
  if (!row) {
    return;
  }
  Modal.confirm({
    title: $t('common.delete'),
    content: $t('commission.deleteConfirm', { name: row.name }),
    okButtonProps: { danger: true },
    async onOk() {
      await deleteCommissionConfig(row.id);
      message.success($t('ui.actionMessage.operationSuccess'));
      // 删除后回第一页重载，避免当前页删空后无数据显示
      await gridApi.reload();
    },
  });
};

/** 双击行打开编辑弹窗（无编辑权限时不响应） */
const handleRowDblclick = ({
  row,
  column,
}: {
  row: ConfigRow;
  column?: { type?: string };
}) => {
  if (column?.type === 'checkbox' || !canEdit.value) {
    return;
  }
  onEdit(row);
};

// ==================== 列表查询 ====================

const fetchList = async (params: Record<string, any>) => {
  const result = await getCommissionConfigPagedList({
    ...params,
    commissionType: props.commissionType,
    userId: props.userId,
  });
  // 数据刷新（查询/刷新/翻页）后勾选会被清空，同步清空选中行，避免工具栏按钮状态与实际勾选不一致
  selectedRows.value = [];
  return result;
};

const [Grid, gridApi] = useVbenVxeGrid<ConfigRow>({
  gridEvents: {
    cellDblclick: handleRowDblclick,
    checkboxAll: syncSelectedRows,
    checkboxChange: syncSelectedRows,
    // trigger: 'row' 下单击行只触发 current-change 不触发 checkbox-change，需同步，否则按钮状态不跟随勾选
    currentRowChange: syncSelectedRows,
  },
  gridOptions: {
    checkboxConfig: {
      highlight: true,
      // 点击整行即可勾选，便于工具栏编辑/删除操作
      trigger: 'row',
    },
    columns: useCommissionConfigColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: {
      enabled: true,
    },
    proxyConfig: {
      ajax: {
        query: createPagedListQuery(fetchList, {
          // 后端默认 SortId ASC，不是创建时间倒序
          defaultSort: 'SortId ASC',
        }),
      },
    },
    rowConfig: {
      isCurrent: true,
      isHover: true,
      keyField: 'id',
    },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: { code: 'query' },
      zoom: true,
    },
  },
});

const handleModalSuccess = () => {
  void gridApi.reload();
};
</script>

<template>
  <div class="flex h-full flex-col p-4">
    <CommissionConfigModalComponent @success="handleModalSuccess" />

    <div class="mb-2 text-xs text-gray-400">
      {{ $t('commission.listHint') }}
    </div>

    <Grid class="min-h-0 flex-1">
      <template #toolbar-tools>
        <Space>
          <Button
            v-access:code="perm.edit"
            :disabled="!singleRow"
            @click="handleEdit"
          >
            {{ $t('common.edit') }}
          </Button>
          <Button
            v-access:code="perm.delete"
            danger
            :disabled="!singleRow"
            @click="handleDelete"
          >
            {{ $t('common.delete') }}
          </Button>
          <Button v-access:code="perm.add" type="primary" @click="onAdd">
            <Plus class="size-5" />
            {{ $t('ui.actionTitle.create', [typeLabel]) }}
          </Button>
        </Space>
      </template>
    </Grid>
  </div>
</template>
