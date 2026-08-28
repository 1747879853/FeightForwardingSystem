<script lang="ts" setup>
import { computed, h, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';

import { Button, message, Modal, Space, Textarea } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  batchGrantCommissionOrder,
  CommissionOrderAdminApi,
  getCommissionOrderPagedList,
} from '#/api/commission/commission-order-admin';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';
import ActionModal from '#/views/commission/action-modal.vue';
import { formatAmount } from '#/views/commission/data';
import DetailModal from '#/views/commission/detail-modal.vue';

import {
  useCommissionGrantColumns,
  useCommissionGrantFormSchema,
} from './data';

defineOptions({ name: 'CommissionGrant' });

type OrderRow = CommissionOrderAdminApi.CommissionOrderDto;

const { CommissionOrderStatus: Status } = CommissionOrderAdminApi;

// ==================== 弹窗（复用提成单模块组件） ====================

const [DetailModalComp, detailModalApi] = useVbenModal({
  connectedComponent: DetailModal,
  destroyOnClose: true,
});

const [ActionModalComp, actionModalApi] = useVbenModal({
  connectedComponent: ActionModal,
  destroyOnClose: true,
});

const openDetail = (row: OrderRow) => {
  detailModalApi.setData({
    commissionType: row.commissionType,
    id: row.id,
  });
  detailModalApi.open();
};

// ==================== 选中行与发放 ====================

const selectedRows = ref<OrderRow[]>([]);

const syncSelectedRows = () => {
  selectedRows.value = (gridApi.grid?.getCheckboxRecords?.() ??
    []) as OrderRow[];
};

/** 单张发放：仅勾选一行且该行审核通过时可用（列表可按状态筛选，非审核通过的不可发放） */
const grantRow = computed(() => {
  if (selectedRows.value.length !== 1) return undefined;
  const row = selectedRows.value[0];
  return row && row.status === Status.Approved ? row : undefined;
});

/** 批量发放：至少勾选一行且全部为审核通过 */
const canBatchGrant = computed(
  () =>
    selectedRows.value.length > 0 &&
    selectedRows.value.every((row) => row.status === Status.Approved),
);

const handleGrant = () => {
  const row = grantRow.value;
  if (!row) return;
  actionModalApi.setData({
    finalAmount: row.finalAmount,
    id: row.id,
    mode: 'grant',
  });
  actionModalApi.open();
};

/** 批量发放：一律按各自应发金额全额发放，发放备注必填 */
const handleBatchGrant = () => {
  const rows = selectedRows.value;
  if (rows.length === 0) {
    message.warning($t('commissionOrder.action.batchGrantNoSelection'));
    return;
  }
  if (!canBatchGrant.value) {
    message.warning($t('commissionOrder.action.batchGrantApprovedOnly'));
    return;
  }
  const totalAmount = rows.reduce(
    (sum, row) => sum + (row.finalAmount ?? 0),
    0,
  );
  let modalRemark = '';
  Modal.confirm({
    title: $t('commissionOrder.action.batchGrantTitle'),
    content: () =>
      h('div', {}, [
        h(
          'p',
          $t('commissionOrder.action.batchGrantHint', {
            amount: formatAmount(totalAmount),
            count: rows.length,
          }),
        ),
        h(Textarea, {
          modelValue: modalRemark,
          onChange: (val: any) => {
            modalRemark = val.target?.value || val;
          },
          rows: 3,
          maxlength: 1024,
          placeholder: $t('commissionOrder.action.batchGrantRemarkPlaceholder'),
          style: 'margin-top: 8px;',
        }),
      ]),
    icon: null,
    width: 520,
    centered: true,
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    async onOk() {
      if (!modalRemark.trim()) {
        message.warning($t('commissionOrder.action.batchGrantRemarkRequired'));
        return Promise.reject(new Error('remark required'));
      }
      try {
        const result = await batchGrantCommissionOrder({
          ids: rows.map((row) => row.id),
          remark: modalRemark.trim(),
        });
        message.success(
          $t('commissionOrder.action.batchGrantSuccess', {
            amount: formatAmount(result?.totalAmount ?? totalAmount),
            count: result?.count ?? rows.length,
          }),
        );
        await gridApi.query();
      } catch {
        // 整批报错（全部校验通过才执行），错误由响应拦截器提示，保持弹窗不关闭
        return Promise.reject(new Error('batch grant failed'));
      }
    },
  });
};

const handleRowDblclick = ({
  row,
  column,
}: {
  row: OrderRow;
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

/** 提成状态由搜索表单控制（默认审核通过），发放类操作仅对审核通过的行生效 */
const fetchList = async (params: Record<string, any>) => {
  const result = await getCommissionOrderPagedList(params);
  // 数据刷新（查询/刷新/翻页）后勾选会被清空，同步清空选中行，避免发放按钮状态与实际勾选不一致
  selectedRows.value = [];
  return result;
};

const [Grid, gridApi] = useVbenVxeGrid<OrderRow>({
  gridEvents: {
    cellDblclick: handleRowDblclick,
    checkboxAll: syncSelectedRows,
    checkboxChange: syncSelectedRows,
    // trigger: 'row' 下单击行只触发 current-change 不触发 checkbox-change，需同步，否则发放按钮状态不跟随勾选
    currentRowChange: syncSelectedRows,
  },
  formOptions: {
    collapsed: true,
    compact: true,
    schema: useCommissionGrantFormSchema(),
    showCollapseButton: true,
    submitOnChange: true,
    wrapperClass: 'grid-cols-6',
  },
  gridOptions: {
    checkboxConfig: {
      highlight: true,
      // 点击整行即可勾选，便于工具栏发放操作
      trigger: 'row',
    },
    columns: useCommissionGrantColumns(),
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
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('commissionOrder.menu.commissionGrant')">
      <template #toolbar-tools>
        <Space>
          <Button
            v-access:code="'Admin.CommissionOrder.Grant'"
            :disabled="!canBatchGrant"
            @click="handleBatchGrant"
          >
            {{ $t('commissionOrder.action.batchGrant') }}
          </Button>
          <Button
            v-access:code="'Admin.CommissionOrder.Grant'"
            type="primary"
            :disabled="!grantRow"
            @click="handleGrant"
          >
            {{ $t('commissionOrder.actions.grant') }}
          </Button>
        </Space>
      </template>
    </Grid>

    <DetailModalComp />
    <ActionModalComp @success="gridApi.query()" />
  </Page>
</template>
