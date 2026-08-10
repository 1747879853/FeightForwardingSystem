<script lang="ts" setup>
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import type { OnActionClickParams } from '#/adapter/vxe-table';
import {
  useColumns,
  SettlementTypeOptions,
  MonthsOptions,
  SettlementDayOptions,
} from './data';
import type { BillingPeriodAdminApi } from '#/api/sea-export/billing-period-admin';
import {
  addBillingPeriod,
  getBillingPeriodPagedList,
  editBillingPeriod,
  deleteBillingPeriod,
} from '#/api/sea-export/billing-period-admin';
import { useVbenModal } from '@vben/common-ui';
import AddModal from './add-modal.vue';
import { computed, onMounted, ref, watch, h, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { IconifyIcon } from '@vben/icons';
import { Page } from '@vben/common-ui';
import { Button, Space, message } from 'ant-design-vue';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';
import { Modal as AntModal } from 'ant-design-vue';

const route = useRoute();

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});

const selectedRowKeys = ref<(string | number)[]>([]);

/**
 * 获取选中的行数据
 */
const getSelectedRows = () => {
  const records = (gridApi.grid?.getCheckboxRecords?.() ??
    []) as BillingPeriodAdminApi.ClientBillingPeriodForViewDto[];
  return records;
};

/**
 * 批量删除
 */
const handleBatchDelete = async () => {
  const selectedRows = getSelectedRows();

  if (selectedRows.length === 0) {
    message.warning($t('common.selectAtLeastOne'));
    return;
  }

  AntModal.confirm({
    title: $t('common.confirmDelete'),
    content: $t('common.confirmDeleteItems', [selectedRows.length]),
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    okType: 'danger',
    onOk: async () => {
      try {
        // 批量删除，逐个调用删除接口
        for (const row of selectedRows) {
          await deleteBillingPeriod({ id: row.id });
        }
        message.success($t('common.deleteSuccess'));
        gridApi.query();
        selectedRowKeys.value = [];
      } catch (error) {
        console.error('批量删除失败:', error);
        message.error($t('common.deleteFailed'));
      }
    },
  });
};

const handleActionClick = ({
  code,
  row,
}: OnActionClickParams<BillingPeriodAdminApi.ClientBillingPeriodForViewDto>) => {
  switch (code) {
    case 'delete': {
      // row.id 可能是大数 string，原样透传，禁止 Number() 转换（丢精度）
      delContact({ id: row.id });
      break;
    }
    case 'manageAttachments': {
      manageAttachments(row);
      break;
    }
  }
};

/**
 * 管理附件
 */
const manageAttachments = (
  row: BillingPeriodAdminApi.ClientBillingPeriodForViewDto,
) => {
  // 这里可以打开附件管理模态框或跳转到附件管理页面
  console.log('Manage attachments for billing period:', row);
  AntModal.info({
    title: '附件管理',
    content: `账期ID: ${row.id} 的附件管理功能待开发`,
  });
};

/**
 * 格式化账期周期描述
 * 根据结算方式、月份、结算日等生成可读的周期字符串
 */
const formatPeriod = (
  row: BillingPeriodAdminApi.ClientBillingPeriodForViewDto,
): string => {
  const settlementTypeText =
    SettlementTypeOptions.find((item) => item.value === row.settlementType)
      ?.label || '';

  if (row.permanent) {
    return `${settlementTypeText} - 长期有效`;
  }

  let periodText = settlementTypeText;

  // 月结
  if (row.settlementType === 1 && row.months) {
    const monthsText =
      MonthsOptions.find((item) => item.value === row.months)?.label || '';
    periodText += ` - ${monthsText}`;
  }

  // 指定日结
  if (row.settlementType === 2 && row.settlementDay) {
    const dayText =
      SettlementDayOptions.find((item) => item.value === row.settlementDay)
        ?.label || '';
    periodText += ` - ${dayText}`;
  }

  // 天数结算
  if (row.days) {
    periodText += ` - ${row.days}天`;
  }

  return periodText;
};

/**
 * 格式化组织单元名称
 * 将组织ID数组转换为组织名称字符串(逗号分隔)
 * 注意:这里假设后端返回的数据中已经包含了 organizationUnitName 字段
 * 如果后端未返回,则需要调用 API 获取组织信息
 */
const formatOrganizationUnitName = (
  cbpOrgs?: BillingPeriodAdminApi.CbpOrgDto[],
): string => {
  if (!cbpOrgs || cbpOrgs.length === 0) {
    return '';
  }

  // TODO: 如果需要从 ID 转换为名称,需要调用 API
  // 目前假设后端已经在 ClientBillingPeriodForViewDto 中返回了 organizationUnitName
  // 这里暂时返回 ID 列表,实际使用时应该从 row.organizationUnitName 获取
  return cbpOrgs.map((item) => item.organizationUnit?.name ?? '').join(', ');
};

/**
 * 格式化用户名称
 * 将用户ID数组转换为用户名称字符串(逗号分隔)
 * 注意:这里假设后端返回的数据中已经包含了 userName 字段
 * 如果后端未返回,则需要调用 API 获取用户信息
 */
const formatUserNames = (
  cbpUsers?: BillingPeriodAdminApi.CbpUserDto[],
): string => {
  if (!cbpUsers || cbpUsers.length === 0) {
    return '';
  }

  // TODO: 如果需要从 ID 转换为名称,需要调用 API
  // 目前假设后端已经在 ClientBillingPeriodForViewDto 中返回了 userName
  // 这里暂时返回 ID 列表,实际使用时应该从 row.userName 获取
  return cbpUsers.map((item) => item.userNickName).join(', ');
};

const formatPayment = (row: BillingPeriodAdminApi.ClientBillingPeriodDto) => {
  const newRow = {
    ...row,
  } as BillingPeriodAdminApi.ClientBillingPeriodForViewDto;
  newRow.period = formatPeriod(row);
  newRow.organizationUnitName = formatOrganizationUnitName(row.cbpOrgs);
  newRow.userName = formatUserNames(row.cbpUsers);
  return newRow;
};
const fetchBillingPeriodPagedList = (params: Record<string, any>) =>
  getBillingPeriodPagedList({
    ...params,
    ClientId: editId.value,
  });

const [Grid, gridApi] =
  useVbenVxeGrid<BillingPeriodAdminApi.ClientBillingPeriodForViewDto>({
    gridOptions: {
      columns: useColumns(),
      height: 'auto',
      keepSource: true,
      checkboxConfig: {
        highlight: true,
        reserve: true,
        trigger: 'default',
      },
      rowConfig: {
        keyField: 'id',
        isHover: true,
      },
      pagerConfig: {
        enabled: true,
      },
      proxyConfig: {
        ajax: {
          query: createPagedListQuery(fetchBillingPeriodPagedList, {
            afterFetch: (res: any) => {
              const items =
                res.items?.map(
                  (item: BillingPeriodAdminApi.ClientBillingPeriodDto) =>
                    formatPayment(item),
                ) || [];
              return {
                ...res,
                items,
              };
            },
          }),
        },
      },
      toolbarConfig: {
        custom: true,
        export: false,
        refresh: { code: 'query' },
        zoom: true,
      },
    },
    gridEvents: {
      // 双击行事件 - 进入编辑页面
      cellDblclick: ({
        row,
      }: {
        row: BillingPeriodAdminApi.ClientBillingPeriodForViewDto;
      }) => {
        const editData: BillingPeriodAdminApi.BillingPeriodEditDto = {
          ...row,
        };
        editContact(editData);
      },

      // 单行选择变化事件
      checkboxChange: () => {
        const records = (gridApi.grid?.getCheckboxRecords?.() ??
          []) as (BillingPeriodAdminApi.ClientBillingPeriodForViewDto & {
          _rowKey?: string | number;
        })[];

        selectedRowKeys.value = records
          .map((r) => r._rowKey)
          .filter((key): key is string | number => key !== undefined);

        // 可以在这里处理业务逻辑
      },

      // 全选/取消全选事件
      checkboxAll: () => {
        const records = (gridApi.grid?.getCheckboxRecords?.() ??
          []) as (BillingPeriodAdminApi.ClientBillingPeriodForViewDto & {
          _rowKey?: string | number;
        })[];

        selectedRowKeys.value = records
          .map((r) => r._rowKey)
          .filter((key): key is string | number => key !== undefined);
      },

      // 单选模式下的选择事件（如果使用 radio 类型）
      radioChange: ({
        row,
      }: {
        row: BillingPeriodAdminApi.ClientBillingPeriodForViewDto;
      }) => {
        console.log('单选选中:', row);
      },
    },
  });

const [Modal, modalApi] = useVbenModal({
  // 连接抽离的组件
  connectedComponent: AddModal,
  class: 'w-[1200px]', // ✅ 官方推荐的宽度入口
});
const addContactData = async (
  data: BillingPeriodAdminApi.BillingPeriodEditDto,
) => {
  data.clientId = editId.value || '';
  await addBillingPeriod(data);
  gridApi.query();
};
const editContactData = async (
  data: BillingPeriodAdminApi.BillingPeriodEditDto,
) => {
  console.log('editContactData', data);
  data.clientId = editId.value || '';
  await editBillingPeriod(data);
  gridApi.query();
};

const addContact = () => {
  // 清空之前设置的编辑数据，避免新增弹窗显示编辑数据
  modalApi.setData(undefined);
  modalApi.open();
};
const editContact = (data: BillingPeriodAdminApi.BillingPeriodEditDto) => {
  modalApi.setData(data).open();
};

const delContact = async (data: BillingPeriodAdminApi.IdDto) => {
  await deleteBillingPeriod(data);
  gridApi.query();
};
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('seaExport.client.paymentTerms.title')">
      <template #toolbar-tools>
        <Space>
          <Button type="primary" @click="addContact">
            <IconifyIcon icon="ant-design:plus-outlined" class="size-4" />
            {{ $t('common.create') }}
          </Button>
          <Button danger @click="handleBatchDelete">
            <IconifyIcon icon="ant-design:delete-outlined" class="size-4" />
            {{ $t('common.batchDelete') }}
          </Button>
        </Space>
      </template>
    </Grid>
  </Page>

  <Modal @add="addContactData" @edit="editContactData" />
</template>

<style scoped lang="scss">
.payment-card {
  :deep(.ant-card-body) {
    padding: 0 20px 20px !important;
  }

  :deep(.ant-table-content) {
    min-height: 270px;
    // max-height: 500px;
    // overflow-y: auto;
  }
}

// .custom-table {
//   min-height: 300px;
// }

.attachments-list {
  .attachment-item {
    &:not(:last-child) {
      border-bottom: 1px solid #f0f0f0;
    }
  }
}
</style>
