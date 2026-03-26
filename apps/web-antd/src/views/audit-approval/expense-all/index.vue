<script lang="ts" setup>
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';
import { useRouter } from 'vue-router';
import { Page } from '@vben/common-ui';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getOrderFeeTaskList } from '#/api/audit-approval/expense-admin';
import { $t } from '#/locales';
import { useExpenseAllColumns, useGridFormSchema } from '../data';
import { Plus, ArrowDown, ArrowLeft } from '@vben/icons';
import { computed, onMounted, ref } from 'vue';
import { Button, message, Modal } from 'ant-design-vue';

import Detail from './modules/detail.vue';
const router = useRouter();

const transportOrderId = ref<number>(0);
const orderName = ref<string>('');
const entityId = ref<number>(0);
const handleRowDblclick = ({
  row,
}: {
  row: ExpenseSubmissionAdminApi.OrderFeeTaskListDto;
}) => {
  console.log('row', row);
  transportOrderId.value = row.transportOrder.id || 0;
  entityId.value = row.entityId || 0;
  orderName.value = `当前选中: ${row.transportOrder.mblNum}(${row.transportOrder.clientName})`;
};

const [Grid, gridApi] =
  useVbenVxeGrid<ExpenseSubmissionAdminApi.OrderFeeTaskListDto>({
    formOptions: {
      schema: useGridFormSchema(),
      submitOnChange: true,
      showCollapseButton: false,
    },
    gridEvents: {
      cellClick: handleRowDblclick,
    },
    gridOptions: {
      columns: useExpenseAllColumns(),
      height: 'auto',
      keepSource: true,
      radioConfig: {
        highlight: true,
        trigger: 'row',
      },
      rowConfig: {
        keyField: 'entityId',
      },
      pagerConfig: {
        enabled: true,
      },
      proxyConfig: {
        ajax: {
          query: async (
            { page }: { page: { currentPage: number; pageSize: number } },
            formValues: Record<string, any>,
          ) => {
            return await getOrderFeeTaskList({
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

const getSelectedRow = ():
  | ExpenseSubmissionAdminApi.OrderFeeTaskListDto
  | undefined => {
  const grid = gridApi.grid as any;
  return grid?.getRadioRecord?.() ?? undefined;
};
const feeTableType = ref('vertical');
const changeTableType = (type: string) => {
  feeTableType.value = type;
};
</script>

<template>
  <Page auto-content-height>
    <Grid
      class="mb-[10px] h-[430px]"
      :table-title="$t('auditApproval.expenseReview.title')"
    >
      <template #toolbar-actions​>
        <div class="flex">
          <span>{{ $t('auditApproval.expenseReview.title') }}</span>
        </div>
      </template>
      <template #toolbar-tools>
        <Button
          class="mr-2"
          @click="changeTableType('vertical')"
          :class="[feeTableType === 'vertical' ? 'green-btn' : '']"
        >
          <ArrowDown class="size-5" />
          {{ $t('auditApproval.tableType.vertical') }}
        </Button>
        <Button
          @click="changeTableType('horizontal')"
          :class="[feeTableType === 'horizontal' ? 'green-btn' : '']"
        >
          <ArrowLeft class="size-5" />
          {{ $t('auditApproval.tableType.horizontal') }}
        </Button>
      </template>
    </Grid>
    <Detail
      :orderName="orderName"
      :transportOrderId="transportOrderId"
      :entityId="entityId"
      :feeTableType="feeTableType"
    />
  </Page>
</template>
<style scoped lang="scss">
:deep(.green-btn) {
  color: #fff;
  background-color: #00b96b !important;
  border-color: #00b96b !important;
}

/* 如果需要处理悬停状态 */
:deep(.green-btn:hover),
:deep(.green-btn:focus) {
  color: #fff;
  background-color: #009a55 !important;
  border-color: #009a55 !important;
}
</style>
