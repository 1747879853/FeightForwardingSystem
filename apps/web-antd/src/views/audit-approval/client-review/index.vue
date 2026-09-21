<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';

import { Button, message, Space } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  auditClient,
  ClientAdminApi,
  getClientAuditPagedList,
} from '#/api/sea-export/client-admin';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';
import { openAuditRemarkConfirm } from '#/views/audit-approval/composables/use-audit-remark-confirm';

import {
  mapClientReviewParams,
  useClientReviewColumns,
  useClientReviewFormSchema,
} from './data';
import DetailModal from './modules/detail-modal.vue';

defineOptions({ name: 'ClientReview' });

const { ClientTaskStatus } = ClientAdminApi;

type ClientTaskRow = ClientAdminApi.ClientTaskDto;

const auditCode = 'Admin.Client.Audit';

const t = (key: string) => $t(`auditApproval.clientReview.${key}`);

// ==================== 详情弹窗 ====================

const [DetailModalComp, detailModalApi] = useVbenModal({
  connectedComponent: DetailModal,
  destroyOnClose: true,
});

/** 详情按客户id查（行上的 id 是任务id） */
const openDetail = (row: ClientTaskRow) => {
  if (!row.client?.id) {
    message.warning('该行没有客户信息');
    return;
  }
  detailModalApi.setData({ clientId: row.client.id });
  detailModalApi.open();
};

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
  openDetail(row);
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

const handleOpenDetail = () => {
  const rows = selectedRows.value;
  if (rows.length !== 1) {
    message.warning('请勾选一条客户查看审核详情');
    return;
  }
  openDetail(rows[0]!);
};
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="t('title')">
      <template #toolbar-tools>
        <Space>
          <Button
            v-access:code="auditCode"
            type="primary"
            :disabled="!hasPendingSelection"
            @click="showAuditConfirm"
          >
            {{ t('auditPass') }}
          </Button>
          <Button
            v-access:code="auditCode"
            danger
            :disabled="!hasPendingSelection"
            @click="showRejectConfirm"
          >
            {{ t('selectReject') }}
          </Button>
          <Button
            v-access:code="auditCode"
            danger
            ghost
            :disabled="!hasPostRejectSelection"
            @click="showPostRejectConfirm"
          >
            {{ t('postReject') }}
          </Button>
          <Button @click="handleOpenDetail">{{ t('detail') }}</Button>
        </Space>
      </template>
    </Grid>

    <DetailModalComp />
  </Page>
</template>
