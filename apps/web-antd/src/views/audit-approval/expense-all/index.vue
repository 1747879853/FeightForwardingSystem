<script lang="ts" setup>
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';
import { OrderFeeTaskBatchAudit } from '#/api/audit-approval/expense-admin';
import { useRouter } from 'vue-router';
import { Page } from '@vben/common-ui';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getOrderFeeTaskList } from '#/api/audit-approval/expense-admin';
import { $t } from '#/locales';
import { useExpenseAllColumns, useGridFormSchema } from '../data';
import { Plus, ArrowDown, ArrowLeft } from '@vben/icons';
import { IconifyIcon } from '@vben/icons';
import { computed, onMounted, ref, h } from 'vue';
import {
  Button,
  message,
  DropdownButton,
  Textarea,
  MenuItem,
  Menu,
  Modal,
} from 'ant-design-vue';

import Detail from './modules/detail.vue';
const router = useRouter();

const transportOrderId = ref<string>('');
const orderName = ref<string>('');
const entityId = ref<string>('');
const handleRowDblclick = ({
  row,
}: {
  row: ExpenseSubmissionAdminApi.OrderFeeTaskListDto;
}) => {
  console.log('row', row);
  transportOrderId.value = row.transportOrder.id || '';
  entityId.value = row.entityId || '';
  orderName.value = `当前选中: ${row.transportOrder.mblNum}(${row.transportOrder.clientName})`;
};

const [Grid, gridApi] =
  useVbenVxeGrid<ExpenseSubmissionAdminApi.OrderFeeTaskListDto>({
    formOptions: {
      schema: useGridFormSchema(),
      submitOnChange: true,
      showCollapseButton: true,
      collapsed: true,
      compact: true,
      wrapperClass: 'grid-cols-7',
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
const SubmittedOther = async (e: any) => {
  console.log('SubmittedOther', e);
  showConfirmWithRemark(true, e.key);
};

const OrderFeeAudit = (
  approve: boolean,
  modalRemark: string,
  ids: number[],
) => {
  let OrderFeeTaskBatchAuditDto: ExpenseSubmissionAdminApi.OrderFeeTaskBatchAuditDto =
    {
      success: approve,
      remark: modalRemark,
      transportOrderIds: ids,
    };
  // console.log(OrderFeeAuditDto);
  OrderFeeTaskBatchAudit(OrderFeeTaskBatchAuditDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    gridApi.reload();
  });
};

const selectPass = (approve: boolean, modalRemark: string) => {
  let list = gridApi?.grid.getCheckboxRecords();

  const ids = list.map((item) => item.transportOrder?.id);
  OrderFeeAudit(approve, modalRemark, ids);
};

const allPass = (approve: boolean, modalRemark: string) => {
  let tableData = gridApi.grid.getTableData().tableData;
  const ids = (tableData ?? []).map((item) => item.transportOrder?.id);
  OrderFeeAudit(approve, modalRemark, ids);
};
const showConfirmWithRemark = (approve: boolean = true, type: string = '') => {
  let modalRemark = '';
  // 创建弹窗实例
  const modal = Modal.confirm({
    title: approve
      ? $t('auditApproval.task.okPass')
      : $t('auditApproval.task.noPass'),
    content: () =>
      h('div', {}, [
        h(Textarea, {
          modelValue: modalRemark,
          onChange: (val: any) => {
            modalRemark = val.target?.value || val;
            console.log('Textarea changed:', modalRemark);
          },
          rows: 3,
          placeholder: $t('auditApproval.task.remarkPlaceholder'),
          maxlength: 100,
          style: 'margin-top: 8px;',
        }),
      ]),
    icon: null,
    width: 520,
    centered: true,
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    async onOk() {
      switch (type) {
        case 'all': {
          allPass(approve, modalRemark);
          break;
        }
        case 'selectPass': {
          selectPass(approve, modalRemark);
          break;
        }
      }
    },
    onCancel() {
      modalRemark = '';
    },
  });
};
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
        <DropdownButton
          @click="showConfirmWithRemark(true, 'all')"
          type="primary"
        >
          {{ $t('auditApproval.task.allPass') }}
          <template #overlay>
            <Menu @click="SubmittedOther">
              <MenuItem key="selectPass">
                {{ $t('auditApproval.task.selectPass') }}
              </MenuItem>
            </Menu>
          </template>
        </DropdownButton>
        <span class="split mx-4 flex">| </span>
        <Button
          class="mr-2"
          @click="changeTableType('vertical')"
          :class="[feeTableType === 'vertical' ? 'green-btn' : '']"
        >
          <IconifyIcon icon="boxicons:arrow-down-up" class="size-4" />

          {{ $t('auditApproval.tableType.vertical') }}
        </Button>
        <Button
          @click="changeTableType('horizontal')"
          :class="[feeTableType === 'horizontal' ? 'green-btn' : '']"
        >
          <IconifyIcon icon="boxicons:arrow-left-right" class="size-4" />
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
.split {
  color: #33333345;
}

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
