<script lang="ts" setup>
import { computed, onActivated, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  auditClient,
  ClientAdminApi,
  getClientAuditPagedList,
} from '#/api/sea-export/client-admin';
import { $t } from '#/locales';
import { consumeListShouldRefresh } from '#/utils/list-refresh-flag';
import { createPagedListQuery } from '#/utils/paged-list-query';
import { openAuditRemarkConfirm } from '#/views/audit-approval/composables/use-audit-remark-confirm';

import ClientStatusCell from './client-status-cell.vue';
import {
  mapClientReviewParams,
  useClientReviewColumns,
  useClientReviewFormSchema,
} from './data';
import { findMyPendingWorkFlowItemId } from './find-pending-item';
import TransferModal from './modules/transfer-modal.vue';

defineOptions({ name: 'ClientReview' });

const { ClientTaskStatus } = ClientAdminApi;

type ClientTaskRow = ClientAdminApi.ClientTaskDto;

const auditCode = 'Admin.Client.Audit';
const router = useRouter();
const userStore = useUserStore();

const t = (key: string) => $t(`auditApproval.clientReview.${key}`);

/** 双击进入客户表单只读审核页（客户提交 / 申请修改同一套，含转交） */
const openAuditPage = (row: ClientTaskRow) => {
  if (!row.client?.id) {
    message.warning('该行没有客户信息');
    return;
  }
  router.push(`/clients/${row.client.id}/edit?mode=audit`);
};

const [TransferModalComp, transferModalApi] = useVbenModal({
  connectedComponent: TransferModal,
  destroyOnClose: true,
});
// ==================== 选中行与按钮可用性 ====================

const selectedRows = ref<ClientTaskRow[]>([]);

const syncSelectedRows = () => {
  selectedRows.value = (gridApi.grid?.getCheckboxRecords?.() ??
    []) as ClientTaskRow[];
};

/** 待我审核：轮到我了才显示通过/驳回 */
const isPendingMyAudit = (row: ClientTaskRow) =>
  row.myTaskStatus === ClientTaskStatus.Auditing;

/** 通过后驳回：任务已通过且我在这条任务里投过通过票 */
const canPostReject = (row: ClientTaskRow) =>
  row.taskStatus === ClientTaskStatus.Passed &&
  row.myTaskStatus === ClientTaskStatus.Passed;

const hasPendingSelection = computed(() =>
  selectedRows.value.some(isPendingMyAudit),
);

const hasPostRejectSelection = computed(() =>
  selectedRows.value.some(canPostReject),
);

// ==================== 列表查询 ====================

const fetchList = async (params: Record<string, any>) => {
  const result = await getClientAuditPagedList(params);
  selectedRows.value = [];
  return {
    items: result.items ?? [],
    totalCount: result.totalCount ?? 0,
  };
};

const handleRowDblclick = ({
  row,
  column,
}: {
  column?: { type?: string };
  row: ClientTaskRow;
}) => {
  if (column?.type === 'checkbox') return;
  openAuditPage(row);
};

const [Grid, gridApi] = useVbenVxeGrid<ClientTaskRow>({
  formOptions: {
    collapsed: true,
    compact: true,
    schema: useClientReviewFormSchema(),
    showCollapseButton: true,
    submitOnChange: true,
    wrapperClass: 'grid-cols-4',
  },
  gridEvents: {
    cellDblclick: handleRowDblclick,
    checkboxAll: syncSelectedRows,
    checkboxChange: syncSelectedRows,
    // trigger: 'row' 下单击行只触发 current-change，需同步，否则按钮状态跟不上勾选
    currentRowChange: syncSelectedRows,
  },
  gridOptions: {
    checkboxConfig: {
      highlight: true,
      trigger: 'row',
    },
    columns: useClientReviewColumns(),
    height: 'auto',
    keepSource: true,
    pagerConfig: { enabled: true },
    proxyConfig: {
      // 关闭自动加载：onMounted 用 submitForm 首查，把默认「待我审核」写入最近提交值
      autoLoad: false,
      ajax: {
        query: createPagedListQuery(fetchList, {
          defaultSort: 'SubmitTime DESC',
          mapParams: mapClientReviewParams,
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

onMounted(async () => {
  await gridApi.formApi.submitForm();
});

onActivated(async () => {
  if (consumeListShouldRefresh('ClientReview')) {
    await reloadGrid();
  }
});

const reloadGrid = async () => {
  await gridApi.reload();
  syncSelectedRows();
};

// ==================== 批量审核 ====================

/**
 * 通过 / 驳回 / 通过后驳回都走同一个 AuditAsync，ids 传客户id。
 * 轮不到当前登录人的那几条后端会跳过而不是整批失败。
 */
const doAudit = async (success: boolean, remark: string, ids: string[]) => {
  await auditClient({ ids, remark: remark || undefined, success });
  message.success(
    success ? `已通过 ${ids.length} 条客户审核` : `已驳回 ${ids.length} 条客户`,
  );
  await reloadGrid();
};

const openConfirm = (options: {
  danger?: boolean;
  emptyMessage: string;
  onConfirm: (remark: string, ids: string[]) => Promise<void>;
  pickRows: () => ClientTaskRow[];
  remarkRequired: boolean;
  title: string;
}) => {
  openAuditRemarkConfirm({
    title: options.title,
    danger: options.danger,
    remarkRequired: options.remarkRequired,
    remarkRequiredMessage: '驳回原因不能为空',
    maxlength: 4096,
    onConfirm: async (remark) => {
      const rows = options.pickRows();
      const ids = [
        ...new Set(
          rows.map((row) => row.client?.id).filter((id): id is string => !!id),
        ),
      ];
      if (ids.length === 0) {
        message.warning(options.emptyMessage);
        return Promise.reject(new Error(options.emptyMessage));
      }
      await options.onConfirm(remark, ids);
    },
  });
};

const showAuditConfirm = () => {
  if (!hasPendingSelection.value) {
    message.warning('请勾选待我审核的客户');
    return;
  }
  openConfirm({
    title: $t('auditApproval.task.okPass'),
    pickRows: () => selectedRows.value.filter(isPendingMyAudit),
    emptyMessage: '请勾选待我审核的客户',
    onConfirm: (remark, ids) => doAudit(true, remark, ids),
    remarkRequired: false,
  });
};

const showRejectConfirm = () => {
  if (!hasPendingSelection.value) {
    message.warning('请勾选待我审核的客户');
    return;
  }
  openConfirm({
    title: '确认驳回',
    danger: true,
    pickRows: () => selectedRows.value.filter(isPendingMyAudit),
    emptyMessage: '请勾选待我审核的客户',
    onConfirm: (remark, ids) => doAudit(false, remark, ids),
    remarkRequired: true,
  });
};

/** 通过后驳回：同一个接口 success 传 false，客户退回已驳回(3)，数据不回滚 */
const showPostRejectConfirm = () => {
  if (!hasPostRejectSelection.value) {
    message.warning('请勾选已审核通过且由我通过的客户');
    return;
  }
  openConfirm({
    title: '确认通过后驳回',
    danger: true,
    pickRows: () => selectedRows.value.filter(canPostReject),
    emptyMessage: '请勾选已审核通过且由我通过的客户',
    onConfirm: (remark, ids) => doAudit(false, remark, ids),
    remarkRequired: true,
  });
};

/** 转交：登录即可，不要挂 Admin.Client.Audit */
const showTransfer = () => {
  if (!hasPendingSelection.value) {
    message.warning('请勾选待我审核的客户');
    return;
  }
  const userId = userStore.userInfo?.userId;
  const itemIds = selectedRows.value
    .filter(isPendingMyAudit)
    .map((row) => findMyPendingWorkFlowItemId(row.workFlowInstance, userId))
    .filter((id): id is string => !!id);
  if (itemIds.length === 0) {
    message.warning('未找到当前待审的工作流明细，请刷新后重试');
    return;
  }
  transferModalApi.setData({ itemIds, permissions: [auditCode] }).open();
};

const pendingSelectedCount = computed(
  () => selectedRows.value.filter(isPendingMyAudit).length,
);

const postRejectSelectedCount = computed(
  () => selectedRows.value.filter(canPostReject).length,
);

const selectionHint = computed(() => {
  if (selectedRows.value.length === 0) {
    return '勾选待审客户后可批量通过 / 驳回 / 转交；双击行进入客户详情审核';
  }
  const parts = [`已选 ${selectedRows.value.length} 条`];
  if (pendingSelectedCount.value > 0) {
    parts.push(`待我审核 ${pendingSelectedCount.value}`);
  }
  if (postRejectSelectedCount.value > 0) {
    parts.push(`可驳回 ${postRejectSelectedCount.value}`);
  }
  return parts.join(' · ');
});
</script>

<template>
  <Page auto-content-height content-class="client-review-page flex flex-col">
    <Grid class="client-review-grid min-h-0 flex-1" :table-title="t('title')">
      <template #toolbar-tools>
        <div class="client-review-toolbar">
          <div class="client-review-toolbar__primary">
            <Button
              v-access:code="auditCode"
              type="primary"
              class="client-review-btn"
              :disabled="!hasPendingSelection"
              @click="showAuditConfirm"
            >
              {{ t('auditPass') }}
            </Button>
            <Button
              v-access:code="auditCode"
              danger
              class="client-review-btn"
              :disabled="!hasPendingSelection"
              @click="showRejectConfirm"
            >
              {{ t('selectReject') }}
            </Button>
            <Button
              v-access:code="auditCode"
              danger
              ghost
              class="client-review-btn"
              :disabled="!hasPostRejectSelection"
              @click="showPostRejectConfirm"
            >
              {{ t('postReject') }}
            </Button>
            <Button
              class="client-review-btn"
              :disabled="!hasPendingSelection"
              @click="showTransfer"
            >
              转交
            </Button>
          </div>
        </div>
      </template>
      <template #clientStatus="{ row }">
        <ClientStatusCell :row="row" />
      </template>
    </Grid>

    <div
      class="client-review-hint"
      :class="{ 'is-active': selectedRows.length > 0 }"
    >
      <span class="client-review-hint__dot" />
      <span class="client-review-hint__text">{{ selectionHint }}</span>
    </div>

    <TransferModalComp @success="reloadGrid" />
  </Page>
</template>

<style scoped>
.client-review-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.client-review-toolbar__primary {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.client-review-btn {
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    opacity 0.15s ease;
}

.client-review-btn:not(:disabled):hover {
  box-shadow: 0 2px 8px hsl(var(--primary) / 16%);
  transform: translateY(-1px);
}

.client-review-btn:not(:disabled):active {
  box-shadow: none;
  transform: translateY(0);
}

.client-review-hint {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
  min-height: 36px;
  padding: 6px 14px;
  margin-top: 10px;
  font-size: 12px;
  color: hsl(var(--muted-foreground) / 85%);
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 4%) 0%,
    hsl(var(--background)) 50%,
    hsl(var(--primary) / 4%) 100%
  );
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}

.client-review-hint.is-active {
  color: hsl(var(--foreground) / 80%);
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 8%) 0%,
    hsl(var(--background)) 55%,
    hsl(var(--primary) / 6%) 100%
  );
  border-color: hsl(var(--primary) / 22%);
}

.client-review-hint__dot {
  flex: none;
  width: 6px;
  height: 6px;
  background: hsl(var(--primary) / 45%);
  border-radius: 50%;
  transition: background 0.2s ease;
}

.client-review-hint.is-active .client-review-hint__dot {
  background: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 16%);
}

.client-review-hint__text {
  line-height: 1.4;
}
</style>
