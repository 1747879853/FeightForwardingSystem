<script lang="ts" setup>
import type { GroupFieldDef } from '#/components/list-grouping';

import { onActivated, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Button,
  DropdownButton,
  Menu,
  MenuItem,
  message,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  ExpenseSubmissionAdminApi,
  getOrderFeeTaskGroupedList,
  getOrderFeeTaskList,
  OrderFeeTaskBatchAudit,
} from '#/api/audit-approval/expense-admin';
import {
  GroupingSettings,
  GroupingTabs,
  useListGrouping,
} from '#/components/list-grouping';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';

import { openAuditRemarkConfirm } from '../composables/use-audit-remark-confirm';
import { useExpenseAllColumns, useGridFormSchema } from '../data';
import Detail from './modules/detail.vue';

defineOptions({ name: 'ExpenseAll' });

// ==================== 分组统计配置 ====================

/**
 * 费用任务分组字段配置。
 * paramKey 既是「点击分组项后追加到列表查询」的参数名，
 * 也是与之互斥的搜索表单字段名。
 */
const ORDER_FEE_TASK_GROUP_FIELDS: GroupFieldDef[] = [
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.BLType,
    label: '装运方式',
    paramKey: 'BLType',
    emptyParamKey: 'BLTypeEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.BillType,
    label: '订单类型',
    paramKey: 'BillType',
    emptyParamKey: 'BillTypeEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.Client,
    label: '委托单位',
    paramKey: 'ClientId',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.Carrier,
    label: '船公司',
    paramKey: 'CarrierId',
    emptyParamKey: 'CarrierIdEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.POL,
    label: '起运港',
    paramKey: 'POLId',
    emptyParamKey: 'POLIdEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.POD,
    label: '目的港',
    paramKey: 'PODId',
    emptyParamKey: 'PODIdEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.Vessel,
    label: '船名',
    paramKey: 'Vessel',
    emptyParamKey: 'VesselEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.CodeFrt,
    label: '付费方式',
    paramKey: 'CodeFrtId',
    emptyParamKey: 'CodeFrtIdEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.CodeIssueType,
    label: '签单方式',
    paramKey: 'CodeIssueTypeId',
    emptyParamKey: 'CodeIssueTypeIdEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.Yard,
    label: '场站',
    paramKey: 'YardId',
    emptyParamKey: 'YardIdEmpty',
  },
];

// 分组统计状态
const grouping = useListGrouping({
  fields: ORDER_FEE_TASK_GROUP_FIELDS,
  getGridApi: () => gridApi,
  fetchGroups: async (baseParams, field) => {
    const groupParams: any = {
      ...baseParams,
      groupField: field as ExpenseSubmissionAdminApi.SeaExportGroupField,
    };

    const items = await getOrderFeeTaskGroupedList(groupParams);

    // 港口分组用 isSea_id 组合 key，避免海港/空港 ID 冲突
    return (items ?? []).map((item) => ({
      ...item,
      id:
        (field === ExpenseSubmissionAdminApi.SeaExportGroupField.POL ||
          field === ExpenseSubmissionAdminApi.SeaExportGroupField.POD) &&
        item.isSea !== null &&
        item.isSea !== undefined
          ? `${item.isSea}_${item.id}`
          : item.id,
    }));
  },
});

/**
 * 费用审核状态默认「未处理」(Processed=false)。
 * 仅在默认值尚未写入「最近提交值」的早期查询里兜底；用户改成「全部」(null) 或清空后不再回填。
 */
let processedDefaultApplied = false;

const transportOrderId = ref<string>('');
const orderName = ref<string>('');
const entityId = ref<string>('');
const changeOrderId = ref<string | null>(null);

/**
 * 清空选中的订单信息
 */
const clearSelectedOrder = () => {
  transportOrderId.value = '';
  entityId.value = '';
  orderName.value = '';
  changeOrderId.value = null;
};

const handleRowDblclick = ({
  row,
}: {
  row: ExpenseSubmissionAdminApi.OrderFeeTaskListDto;
}) => {
  const grid = gridApi.grid as any;
  if (grid && grid.setRadioRow) {
    grid.setRadioRow(row);
  }
  transportOrderId.value = row.transportOrder.id || '';
  entityId.value = row.entityId || '';
  changeOrderId.value = row.changeOrderId || null;
  const mblNum = row.transportOrder.mblNum || '--';
  orderName.value = `当前选中: ${mblNum}(${row.transportOrder.client?.name ?? ''})`;

  // 点行进详情时，必须把该行的 changeOrderId 原样回传
  if (detailRef.value) {
    detailRef.value.getTableDate(row.changeOrderId || null);
  }
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
      id: 'orderFeeTaskList',
      columns: useExpenseAllColumns(),
      height: 'auto',
      keepSource: true,
      radioConfig: {
        highlight: true,
        trigger: 'default',
      },
      rowConfig: {
        // ✅ 接口变更：行 key 从 entityId 改为 entityId + changeOrderId 组合
        // 同一票会出现多行（主单 + 各更改单），只用 entityId 会导致选中态串行、详情打开错行
        keyField: 'entityId + changeOrderId',
        isCurrent: true,
      },
      pagerConfig: {
        enabled: true,
      },
      proxyConfig: {
        // 关闭自动加载：挂载后先默认分组再 submitForm 首查，
        // 保证「费用审核状态」默认值写入最近提交值，避免首查漏 Processed=false
        autoLoad: false,
        ajax: {
          query: createPagedListQuery(getOrderFeeTaskList, {
            mapParams: (formValues) => {
              // 每次查询前清空选中，避免费用明细残留旧数据
              clearSelectedOrder();

              const nextValues = { ...formValues };
              if (
                !processedDefaultApplied &&
                nextValues.Processed === undefined
              ) {
                nextValues.Processed = false;
              }
              processedDefaultApplied = true;

              let params = grouping.decorateListParams(nextValues);

              // 港口分组：把 isSea_id 拆回 IsSea + 真实港口 ID
              const field = grouping.enabledField.value;
              if (
                field &&
                (field.value ===
                  ExpenseSubmissionAdminApi.SeaExportGroupField.POL ||
                  field.value ===
                    ExpenseSubmissionAdminApi.SeaExportGroupField.POD)
              ) {
                const selectedId = grouping.selectedItemId.value;
                if (selectedId !== undefined && selectedId !== null) {
                  const parts = String(selectedId).split('_');
                  if (parts.length === 2) {
                    const isSea = parts[0] === 'true';
                    const realId = parts[1];
                    params = {
                      ...params,
                      IsSea: isSea,
                      [field.paramKey]: realId,
                    };
                    delete params[field.paramKey];
                    params[field.paramKey] = realId;
                  }
                }
              }

              return params;
            },
          }),
        },
      },
      toolbarConfig: {
        custom: true,
        export: false,
        //refresh: { code: 'query' },
        zoom: false,
      },
    },
  });

onMounted(async () => {
  // 默认按委托单位分组：只设状态不查询，再由 submitForm 统一首查
  const clientIdField = ORDER_FEE_TASK_GROUP_FIELDS.find(
    (field) => field.paramKey === 'ClientId',
  );
  if (clientIdField && !grouping.enabledField.value) {
    grouping.prepareField(clientIdField.value as number);
  }
  // submitForm 把表单默认值（含 Processed=false）写入「最近提交值」，
  // 后续分页/排序/分组切换走 query 时才能带上同一套条件
  await gridApi.formApi.submitForm();
});

// 列表页 keepAlive，分组统计不做缓存：每次重新进入都拉一遍分组条数
let firstActivate = true;
onActivated(() => {
  if (firstActivate) {
    firstActivate = false;
    return;
  }
  grouping.refreshGroupData();
});

const onGroupFieldChange = (value: number | undefined) => {
  if (value === undefined) {
    grouping.disable();
  } else {
    grouping.enableField(value);
  }
};

const SubmittedOther = async (key: string) => {
  showConfirmWithRemark(true, key);
};

const detailRef = ref<any>(null);

/** 批量审核：按行精确传 items（transportOrderId + changeOrderId） */
const OrderFeeAudit = (
  approve: boolean,
  modalRemark: string,
  items: ExpenseSubmissionAdminApi.OrderFeeTaskBatchAuditItemDto[],
) => {
  const dto: ExpenseSubmissionAdminApi.OrderFeeTaskBatchAuditDto = {
    success: approve,
    remark: modalRemark,
    items,
  };

  OrderFeeTaskBatchAudit(dto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    gridApi.reload();
    grouping.refreshGroupData();
    if (detailRef.value) {
      detailRef.value.getTableDate();
    }
  });
};

const selectPass = (approve: boolean, modalRemark: string) => {
  const list =
    gridApi?.grid.getCheckboxRecords() as ExpenseSubmissionAdminApi.OrderFeeTaskListDto[];

  const items: ExpenseSubmissionAdminApi.OrderFeeTaskBatchAuditItemDto[] =
    list.map((item) => ({
      transportOrderId: item.entityId || '',
      changeOrderId: item.changeOrderId || null,
    }));

  OrderFeeAudit(approve, modalRemark, items);
};

const allPass = (approve: boolean, modalRemark: string) => {
  const tableData = gridApi.grid.getTableData()
    .tableData as ExpenseSubmissionAdminApi.OrderFeeTaskListDto[];

  const items: ExpenseSubmissionAdminApi.OrderFeeTaskBatchAuditItemDto[] = (
    tableData ?? []
  ).map((item) => ({
    transportOrderId: item.entityId || '',
    changeOrderId: item.changeOrderId || null,
  }));

  OrderFeeAudit(approve, modalRemark, items);
};

const showConfirmWithRemark = (approve = true, type = '') => {
  openAuditRemarkConfirm({
    title: approve
      ? $t('auditApproval.task.okPass')
      : $t('auditApproval.task.noPass'),
    danger: !approve,
    onConfirm: (modalRemark) => {
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
  });
};

const feeTableType = ref('horizontal');
const changeTableType = (type: string) => {
  feeTableType.value = type;
};
</script>

<template>
  <!-- 内容区改为 flex 纵向布局：顶部任务列表与下方费用明细按高度自适应分配，
       不再使用固定像素高，整页正好收在可视区内，不同分辨率下都不出现纵向滚动条。
       注意：Page 内容 div 默认有 p-4 padding，auto-content-height 已给出确定高度，flex 子项据此精确填满。 -->
  <Page auto-content-height content-class="flex flex-col overflow-hidden">
    <!-- 顶部任务列表：由固定 h-[445px] 改为占比高度(42%)并加 min/max 守卫，随屏幕自适应；
         flex-shrink-0 保证其不被压缩，vxe-grid height:'auto' 据此填满。 -->
    <Grid
      class="expense-task-grid mb-[10px] h-[42%] max-h-[440px] min-h-[240px] flex-shrink-0"
    >
      <!-- 工具栏左侧插槽始终挂载，避免开启分组时 table-title 与插槽切换导致 vxe options 重算并重置列设置 -->
      <template #toolbar-actions>
        <GroupingTabs
          v-if="grouping.isGrouping.value"
          :items="grouping.groupItems.value"
          :selected-id="grouping.selectedItemId.value"
          :loading="grouping.loading.value"
          @select="grouping.selectItem"
        />
        <div v-else class="flex text-base font-medium">
          <span>{{ $t('auditApproval.expenseReview.title') }}</span>
        </div>
      </template>
      <template #toolbar-tools>
        <DropdownButton @click="SubmittedOther('selectPass')" type="primary">
          {{ $t('auditApproval.task.selectPass') }}
          <template #overlay>
            <Menu @click="showConfirmWithRemark(true, 'all')">
              <MenuItem>
                {{ $t('auditApproval.task.allPass') }}
              </MenuItem>
            </Menu>
          </template>
        </DropdownButton>
        <span class="split mx-3 flex">|</span>
        <Button
          class="layout-toggle-btn mr-2"
          @click="changeTableType('vertical')"
          :class="[feeTableType === 'vertical' ? 'green-btn' : '']"
        >
          <IconifyIcon icon="boxicons:arrow-down-up" class="size-4" />

          {{ $t('auditApproval.tableType.vertical') }}
        </Button>
        <Button
          class="layout-toggle-btn"
          @click="changeTableType('horizontal')"
          :class="[feeTableType === 'horizontal' ? 'green-btn' : '']"
        >
          <IconifyIcon icon="boxicons:arrow-left-right" class="size-4" />
          {{ $t('auditApproval.tableType.horizontal') }}
        </Button>
        <GroupingSettings
          :fields="grouping.fields"
          :value="grouping.enabledField.value?.value"
          @change="onGroupFieldChange"
        />
      </template>
    </Grid>
    <!-- 费用明细：占据剩余全部高度(flex-1)，min-h-0 允许内部表格按需收缩，避免撑出滚动条 -->
    <Detail
      class="min-h-0 flex-1"
      :orderName="orderName"
      :transportOrderId="transportOrderId"
      :entityId="entityId"
      :changeOrderId="changeOrderId"
      ref="detailRef"
      :feeTableType="feeTableType"
    />
  </Page>
</template>
<style scoped lang="scss">
.split {
  color: #d9dee8;
}

// 顶部任务列表：卡片化容器 + 表头层级强化，与下方费用明细卡片风格统一
.expense-task-grid {
  overflow: hidden;
  border: 1px solid #e8ecf3;
  border-radius: 10px;
  box-shadow:
    0 1px 2px rgb(16 42 83 / 4%),
    0 4px 12px rgb(16 42 83 / 5%);

  :deep(.vxe-header--column) {
    font-weight: 600;
    color: #333;
    background-color: #f5f7fa;
  }

  :deep(.vxe-body--row.row--stripe) {
    background-color: #fafbfd;
  }

  :deep(.vxe-body--row:hover),
  :deep(.vxe-body--row.row--hover) {
    background-color: #e9f4ff;
  }
}

// 布局切换按钮：未选中态更精致，选中态保持绿色高亮反馈
.layout-toggle-btn {
  border-radius: 6px;
  transition: all 0.2s ease;
}

:deep(.green-btn) {
  color: #fff;
  background-color: #00b96b !important;
  border-color: #00b96b !important;
  box-shadow: 0 2px 6px rgb(0 185 107 / 25%);
}

/* 如果需要处理悬停状态 */
:deep(.green-btn:hover),
:deep(.green-btn:focus) {
  color: #fff;
  background-color: #009a55 !important;
  border-color: #009a55 !important;
}
</style>
