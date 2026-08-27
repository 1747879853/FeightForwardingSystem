<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';
import { useAccessStore } from '@vben/stores';

import { Button, message, Modal } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  CommissionOrderAdminApi,
  deleteCommissionOrder,
  getCommissionOrderPagedList,
  submitCommissionOrder,
  unSubmitCommissionOrder,
} from '#/api/commission/commission-order-admin';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';

import { useGridFormSchema, useListColumns } from './data';
import ActionModal from './action-modal.vue';
import CreateModal from './create-modal.vue';
import DetailModal from './detail-modal.vue';

defineOptions({ name: 'CommissionOrderList' });

const route = useRoute();
const accessStore = useAccessStore();

/** 提成类型：由路由 meta 注入（销售提成=0 / 操作提成=1） */
const commissionType = computed<CommissionOrderAdminApi.CommissionType>(
  () =>
    (route.meta.commissionType as
      | CommissionOrderAdminApi.CommissionType
      | undefined) ?? CommissionOrderAdminApi.CommissionType.Sales,
);

const pageTitle = computed(() =>
  commissionType.value === CommissionOrderAdminApi.CommissionType.Operation
    ? $t('commissionOrder.menu.operationCommission')
    : $t('commissionOrder.menu.salesCommission'),
);

const hasCode = (code: string) => accessStore.accessCodes.includes(code);

// ==================== 弹窗 ====================

const [CreateModalComp, createModalApi] = useVbenModal({
  connectedComponent: CreateModal,
  destroyOnClose: true,
});

const [DetailModalComp, detailModalApi] = useVbenModal({
  connectedComponent: DetailModal,
  destroyOnClose: true,
});

const [ActionModalComp, actionModalApi] = useVbenModal({
  connectedComponent: ActionModal,
  destroyOnClose: true,
});

const onAdd = () => {
  createModalApi.setData({ commissionType: commissionType.value });
  createModalApi.open();
};

const openDetail = (row: CommissionOrderAdminApi.CommissionOrderDto) => {
  detailModalApi.setData({
    commissionType: commissionType.value,
    id: row.id,
  });
  detailModalApi.open();
};

// ==================== 行操作 ====================

const onActionClick = ({
  code,
  row,
}: {
  code: string;
  row: CommissionOrderAdminApi.CommissionOrderDto;
}) => {
  switch (code) {
    case 'detail': {
      openDetail(row);
      break;
    }
    case 'submit': {
      confirmSubmit(row);
      break;
    }
    case 'unsubmit': {
      confirmUnsubmit(row);
      break;
    }
    case 'audit':
    case 'reject':
    case 'grant': {
      actionModalApi.setData({
        finalAmount: row.finalAmount,
        id: row.id,
        mode: code as 'audit' | 'grant' | 'reject',
      });
      actionModalApi.open();
      break;
    }
    case 'delete': {
      handleDelete(row);
      break;
    }
    default: {
      break;
    }
  }
};

const confirmSubmit = (row: CommissionOrderAdminApi.CommissionOrderDto) => {
  Modal.confirm({
    title: `${$t('commissionOrder.actions.submit')} - ${row.commissionOrderNum}`,
    content: $t('commissionOrder.actions.submitConfirm'),
    async onOk() {
      await submitCommissionOrder({ id: row.id });
      message.success($t('commissionOrder.action.submitSuccess'));
      handleRefresh();
    },
  });
};

const confirmUnsubmit = (row: CommissionOrderAdminApi.CommissionOrderDto) => {
  Modal.confirm({
    title: `${$t('commissionOrder.actions.unsubmit')} - ${row.commissionOrderNum}`,
    content: $t('commissionOrder.actions.unsubmitConfirm'),
    async onOk() {
      await unSubmitCommissionOrder({ id: row.id });
      message.success($t('commissionOrder.action.unsubmitSuccess'));
      handleRefresh();
    },
  });
};

/** 删除确认由 CellOperation 渲染器内置（Popconfirm/Modal.confirm），这里直接执行 */
const handleDelete = async (
  row: CommissionOrderAdminApi.CommissionOrderDto,
) => {
  await deleteCommissionOrder(row.id);
  message.success($t('commissionOrder.action.deleteSuccess'));
  handleRefresh();
};

const handleRowDblclick = ({
  row,
  column,
}: {
  row: CommissionOrderAdminApi.CommissionOrderDto;
  column?: { type?: string };
}) => {
  if (column?.type === 'checkbox') {
    return;
  }
  openDetail(row);
};

// ==================== 列表查询 ====================

const getRangeValue = (
  value: unknown,
): [unknown | undefined, unknown | undefined] => {
  if (!Array.isArray(value)) {
    return [undefined, undefined];
  }
  return [value[0] ?? undefined, value[1] ?? undefined];
};

const toMonth = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }
  const date = dayjs(value as string);
  return date.isValid() ? date.format('YYYY-MM') : undefined;
};

const mapParams = (formValues: Record<string, any>) => {
  const { accountDateRange, ...rest } = formValues;
  const [start, end] = getRangeValue(accountDateRange);
  return {
    ...rest,
    accountDateEnd: toMonth(end),
    accountDateStart: toMonth(start),
  };
};

const fetchList = (params: Record<string, any>) =>
  getCommissionOrderPagedList({
    ...params,
    commissionType: commissionType.value,
  });

const [Grid, gridApi] =
  useVbenVxeGrid<CommissionOrderAdminApi.CommissionOrderDto>({
    gridEvents: {
      cellDblclick: handleRowDblclick,
    },
    formOptions: {
      collapsed: true,
      schema: useGridFormSchema(),
      showCollapseButton: true,
      submitOnChange: true,
      wrapperClass: 'grid-cols-6',
    },
    gridOptions: {
      columns: useListColumns({ hasCode, onActionClick }),
      height: 'auto',
      keepSource: true,
      pagerConfig: {
        enabled: true,
      },
      proxyConfig: {
        ajax: {
          query: createPagedListQuery(fetchList, {
            defaultSort: 'AccountDate DESC, CreationTime DESC',
            mapParams,
          }),
        },
      },
      rowConfig: {
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

const handleRefresh = () => {
  gridApi.query();
};
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="pageTitle">
      <template #toolbar-tools>
        <Button
          v-access:code="'Admin.CommissionOrder.Add'"
          type="primary"
          @click="onAdd"
        >
          <Plus class="size-5" />
          {{ $t('commissionOrder.actions.create') }}
        </Button>
      </template>
    </Grid>

    <CreateModalComp @success="handleRefresh" />
    <DetailModalComp />
    <ActionModalComp @success="handleRefresh" />
  </Page>
</template>
