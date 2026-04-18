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
import { Button, Space, Card } from 'ant-design-vue';

import { $t } from '#/locales';

const route = useRoute();

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});

const selectedRowKeys = ref<(string | number)[]>([]);

const handleActionClick = ({
  code,
  row,
}: OnActionClickParams<BillingPeriodAdminApi.ClientBillingPeriodDto>) => {
  switch (code) {
    case 'delete': {
      // IdDto 要求 id 为 number 类型,但 row.id 可能是 string | number
      delContact({ id: Number(row.id) });
      break;
    }
    case 'edit': {
      // 将 ClientBillingPeriodDto 转换为 BillingPeriodEditDto
      const editData: BillingPeriodAdminApi.BillingPeriodEditDto = {
        ...row,
        // bizTypes 在 DetailDto 中是 number[],在 EditDto 中是 number
        // 这里取第一个值或保持原样
        //bizTypes: Array.isArray(row.bizTypes) ? row.bizTypes[0] : row.bizTypes,
      };
      editContact(editData);
      break;
    }
  }
};

/**
 * 格式化账期周期描述
 * 根据结算方式、月份、结算日等生成可读的周期字符串
 */
const formatPeriod = (
  row: BillingPeriodAdminApi.ClientBillingPeriodDto,
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
  return cbpOrgs.map((item) => item.organizationUnitName).join(', ');
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
  console.log('newRow', newRow);
  return newRow;
};
const [Grid, gridApi] =
  useVbenVxeGrid<BillingPeriodAdminApi.ClientBillingPeriodForViewDto>({
    gridOptions: {
      columns: useColumns(handleActionClick),
      height: 'auto',
      keepSource: true,
      radioConfig: {
        highlight: true,
        trigger: 'row',
      },
      rowConfig: {
        keyField: 'id',
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
            const res = await getBillingPeriodPagedList({
              PageIndex: page.currentPage,
              PageSize: page.pageSize,
              ClientId: editId.value,
              ...formValues,
            });
            res.items = res.items.map((item) => {
              return formatPayment(item);
            });
            return res;
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
    gridEvents: {
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
  data.clientId = editId.value || '';
  await editBillingPeriod(data);
  gridApi.query();
};

const addContact = () => {
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
</style>
