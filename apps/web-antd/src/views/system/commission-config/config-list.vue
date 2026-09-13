<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useAccess } from '@vben/access';
import { useVbenModal } from '@vben/common-ui';
import { Info, Plus } from '@vben/icons';

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

import CommissionConfigModal from './commission-config-modal.vue';
import {
  useCommissionConfigColumns,
  useCommissionConfigFormSchema,
} from './data';

defineOptions({ name: 'SystemCommissionConfigList' });

const props = defineProps<{
  commissionType: CommissionConfigAdminApi.CommissionType;
}>();

const perm = createAbpPermission('Admin.CommissionConfig');
const { hasAccessByCodes } = useAccess();
const canEdit = computed(() => hasAccessByCodes([perm.edit]));

type ConfigRow = CommissionConfigAdminApi.CommissionConfigDto;

const typeLabel = computed(() =>
  $t(
    props.commissionType === CommissionConfigAdminApi.CommissionType.Sales
      ? 'commissionOrder.menu.salesCommission'
      : 'commissionOrder.menu.operationCommission',
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

const selectedCount = computed(() => selectedRows.value.length);

// ==================== 弹窗 ====================

const [CommissionConfigModalComponent, commissionConfigModalApi] = useVbenModal(
  {
    connectedComponent: CommissionConfigModal,
    destroyOnClose: true,
  },
);

function onAdd() {
  commissionConfigModalApi
    .setData({ commissionType: props.commissionType })
    .open();
}

function onEdit(record: ConfigRow) {
  commissionConfigModalApi
    .setData({
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
  });
  // 数据刷新（查询/刷新/翻页）后勾选会被清空，同步清空选中行，避免工具栏按钮状态与实际勾选不一致
  selectedRows.value = [];
  return result;
};

const [Grid, gridApi] = useVbenVxeGrid<ConfigRow>({
  formOptions: {
    schema: useCommissionConfigFormSchema(),
    submitOnChange: true,
    showCollapseButton: false,
    wrapperClass: 'grid-cols-4',
  },
  gridEvents: {
    cellDblclick: handleRowDblclick,
    checkboxAll: syncSelectedRows,
    checkboxChange: syncSelectedRows,
    // trigger: 'row' 下单击行只触发 current-change 不触发 checkbox-change，需同步，否则按钮状态不跟随勾选
    currentRowChange: syncSelectedRows,
  },
  gridOptions: {
    // 两个 Tab 各一个实例，id 区分，避免列配置持久化互相覆盖
    id: `system-commission-config-${props.commissionType}`,
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
  <div class="cc-list">
    <CommissionConfigModalComponent @success="handleModalSuccess" />

    <div class="cc-list__meta">
      <div class="cc-list__meta-main">
        <span class="cc-list__type-badge">{{ typeLabel }}</span>
        <span class="cc-list__hint">
          <Info class="cc-list__hint-icon" />
          {{ $t('commission.listOperateHint') }}
        </span>
      </div>
      <span
        class="cc-list__selected"
        :class="{ 'cc-list__selected--active': selectedCount > 0 }"
      >
        {{ $t('commission.selectedCount', { count: selectedCount }) }}
      </span>
    </div>

    <Grid class="cc-list__grid min-h-0 flex-1">
      <template #toolbar-tools>
        <Space :size="8" class="cc-list__actions">
          <Button
            v-access:code="perm.edit"
            :disabled="!singleRow"
            class="cc-list__btn"
            @click="handleEdit"
          >
            {{ $t('common.edit') }}
          </Button>
          <Button
            v-access:code="perm.delete"
            danger
            :disabled="!singleRow"
            class="cc-list__btn"
            @click="handleDelete"
          >
            {{ $t('common.delete') }}
          </Button>
          <Button
            v-access:code="perm.add"
            type="primary"
            class="cc-list__btn cc-list__btn--primary"
            @click="onAdd"
          >
            <Plus class="size-4" />
            {{ $t('ui.actionTitle.create', [typeLabel]) }}
          </Button>
        </Space>
      </template>
    </Grid>
  </div>
</template>

<style scoped>
.cc-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  overflow: hidden;
}

.cc-list__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 8%) 0%,
    hsl(var(--primary) / 3%) 55%,
    hsl(var(--background)) 100%
  );
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.cc-list__meta-main {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.cc-list__type-badge {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 12%);
  border-radius: 999px;
}

.cc-list__hint {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.cc-list__hint-icon {
  width: 13px;
  height: 13px;
  color: hsl(var(--primary));
}

.cc-list__selected {
  padding: 2px 10px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 999px;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.cc-list__selected--active {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-color: hsl(var(--primary) / 28%);
}

.cc-list__grid {
  min-height: 0;
}

.cc-list__grid :deep(.vxe-grid) {
  border-radius: 10px;
}

.cc-list__grid :deep(.vxe-toolbar) {
  padding-block: 8px;
}

.cc-list__grid :deep(.vxe-body--row.row--hover),
.cc-list__grid :deep(.vxe-body--row.row--current) {
  background-color: hsl(var(--primary) / 5%) !important;
}

.cc-list__grid :deep(.vxe-body--row.row--checked) {
  background-color: hsl(var(--primary) / 8%) !important;
}

.cc-list__btn {
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.cc-list__btn:not(:disabled):hover {
  transform: translateY(-1px);
}

.cc-list__btn--primary:not(:disabled):hover {
  box-shadow: 0 4px 10px hsl(var(--primary) / 25%);
}
</style>
