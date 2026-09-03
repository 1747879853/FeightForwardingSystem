<script lang="ts" setup>
import type { GroupFieldDef } from '#/components/list-grouping';

import { onActivated, onMounted } from 'vue';
import dayjs from 'dayjs';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, message, Modal, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  BankStatementAdminApi,
  deleteBankStatement,
  getBankStatementGroupedList,
  getBankStatementPagedList,
} from '#/api/settlement-management/bank-statement-admin';
import {
  GroupingSettings,
  GroupingTabs,
  useListGrouping,
} from '#/components/list-grouping';
import { useTableConfigStore } from '#/store/table-config';
import { createAbpPermission } from '#/utils/abp-permission';
import { normalizeKeysParam } from '#/utils/keys-search';
import { createPagedListQuery } from '#/utils/paged-list-query';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';

import {
  useColumns,
  useGridFormSchema,
  getBankStatementWriteOffStatusInfo,
} from './data';
import { enrichBankStatementListItems } from './utils';

const perm = createAbpPermission('Admin.BankStatement');
const router = useRouter();
const tableConfigStore = useTableConfigStore();

const GROUP_CONFIG_NAME = 'group_config_BankStatementList';

const loadGroupField = async (): Promise<
  BankStatementAdminApi.BankStatementGroupField | undefined
> => {
  await tableConfigStore.loadGroupConfigsOnce();
  const hit = tableConfigStore.getGroupConfigByName(GROUP_CONFIG_NAME);
  if (!hit?.setting) return undefined;
  try {
    const parsed = JSON.parse(hit.setting) as { field?: null | number };
    if (typeof parsed.field !== 'number') return undefined;
    const validFields = Object.values(
      BankStatementAdminApi.BankStatementGroupField,
    ).filter((value): value is number => typeof value === 'number');
    return validFields.includes(parsed.field)
      ? (parsed.field as BankStatementAdminApi.BankStatementGroupField)
      : undefined;
  } catch {
    return undefined;
  }
};

const saveGroupField = (
  fieldValue: BankStatementAdminApi.BankStatementGroupField | undefined,
) => {
  const setting = JSON.stringify({ field: fieldValue ?? null });
  const hit = tableConfigStore.getGroupConfigByName(GROUP_CONFIG_NAME);
  if (hit) {
    void tableConfigStore.editGroupConfig({
      id: hit.id,
      name: GROUP_CONFIG_NAME,
      setting,
    });
  } else {
    void tableConfigStore.addGroupConfig({ name: GROUP_CONFIG_NAME, setting });
  }
};

const { BankStatementGroupField: GroupField } = BankStatementAdminApi;

const BANK_STATEMENT_GROUP_FIELDS: GroupFieldDef<BankStatementAdminApi.BankStatementGroupField>[] =
  [
    { value: GroupField.Settlement, label: '付款方', paramKey: 'settlementId' },
    {
      value: GroupField.OrgBankAccount,
      label: '我司银行',
      paramKey: 'orgBankAccountId',
      emptyParamKey: 'orgBankAccountIdEmpty',
    },
    {
      value: GroupField.ClientInvoiceBank,
      label: '对方银行',
      paramKey: 'clientInvoiceBankId',
      emptyParamKey: 'clientInvoiceBankIdEmpty',
    },
    {
      value: GroupField.WriteOffStatus,
      label: '核销状态',
      paramKey: 'writeOffStatus',
    },
  ];

/** 将时间范围拆分为起止参数 */
function splitTimeRange(
  formValues: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...formValues };
  // Keys 精确搜索：去空白去重后作为 List<string>（repeat 序列化），空则为 undefined 不下发
  result.keys = normalizeKeysParam(formValues.keys);
  const range = formValues.statementTimeRange as [unknown, unknown] | undefined;
  if (Array.isArray(range) && range.length === 2) {
    const [start, end] = range;
    result.statementTimeStart = start
      ? dayjs(start as string | Date)
          .startOf('day')
          .toISOString()
      : undefined;
    result.statementTimeEnd = end
      ? dayjs(end as string | Date)
          .endOf('day')
          .toISOString()
      : undefined;
  }
  delete result.statementTimeRange;
  return grouping.decorateListParams(result);
}

const grouping = useListGrouping<BankStatementAdminApi.BankStatementGroupField>(
  {
    fields: BANK_STATEMENT_GROUP_FIELDS,
    getGridApi: () => gridApi,
    fetchGroups: async (baseParams, field) =>
      await getBankStatementGroupedList({
        ...baseParams,
        groupField: field,
      } as BankStatementAdminApi.BankStatementGroupedQueryDto),
    persist: {
      load: loadGroupField,
      save: saveGroupField,
    },
  },
);

const [Grid, gridApi] =
  useVbenVxeGrid<BankStatementAdminApi.BankStatementListDto>({
    formOptions: {
      schema: useGridFormSchema(),
      submitOnChange: true,
      showCollapseButton: true,
      collapsed: true,
      compact: true,
      commonConfig: {
        labelWidth: 64,
      },
      wrapperClass: 'grid-cols-6',
    },
    gridOptions: {
      columns: useColumns(),
      height: 'auto',
      keepSource: true,
      checkboxConfig: {
        highlight: true,
      },
      rowConfig: {
        keyField: 'id',
        isHover: true,
      },
      pagerConfig: {
        enabled: true,
      },
      proxyConfig: {
        autoLoad: false,
        ajax: {
          query: createPagedListQuery(getBankStatementPagedList, {
            defaultSort: 'StatementTime DESC',
            mapParams: splitTimeRange,
            afterFetch: async (result) => {
              const page =
                result as BankStatementAdminApi.PagedList<BankStatementAdminApi.BankStatementListDto>;
              return {
                ...page,
                items: await enrichBankStatementListItems(page.items || []),
              } as typeof result;
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
      cellDblclick: handleRowDblClick,
    },
  });

onMounted(async () => {
  await grouping.restorePersistedField();
  await gridApi.formApi.submitForm();
});

let firstActivate = true;
onActivated(() => {
  if (firstActivate) {
    firstActivate = false;
    return;
  }
  grouping.refreshGroupData();
});

function onGroupFieldChange(
  value: BankStatementAdminApi.BankStatementGroupField | undefined,
) {
  if (value === undefined) grouping.disable();
  else grouping.enableField(value);
}

function getSelectedRows(): BankStatementAdminApi.BankStatementListDto[] {
  return (gridApi.grid?.getCheckboxRecords?.() ??
    []) as BankStatementAdminApi.BankStatementListDto[];
}

function handleRowDblClick({
  row,
}: {
  row: BankStatementAdminApi.BankStatementListDto;
}) {
  if (!row) return;
  router.push(`/bank-statement/edit/${row.id}`);
}

function handleCreate() {
  router.push('/bank-statement/add');
}

function handleRefresh() {
  gridApi.query();
}

useRefreshListOnFormReturn('BankStatementList', handleRefresh);

async function handleDelete() {
  const rows = getSelectedRows();
  if (rows.length === 0) {
    message.warning('请先选择要删除的记录');
    return;
  }
  if (rows.length > 1) {
    message.warning('每次只能删除一条记录，请只选择一条');
    return;
  }

  const row = rows[0]!;
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除流水"${row.bankStatementNo || row.id}"吗？`,
    okType: 'danger',
    onOk: async () => {
      try {
        await deleteBankStatement({ id: row.id });
        message.success('删除成功');
        gridApi.query();
      } catch (error: any) {
        message.error(error.message || '删除失败');
      }
    },
  });
}
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <GroupingTabs
          v-if="grouping.isGrouping.value"
          :items="grouping.groupItems.value"
          :selected-id="grouping.selectedItemId.value"
          :loading="grouping.loading.value"
          @select="grouping.selectItem"
        />
        <div v-else class="mr-1 pl-1 text-[1rem]">银行流水</div>
      </template>
      <template #toolbar-tools>
        <Space>
          <Button v-access:code="perm.add" type="primary" @click="handleCreate">
            新建
          </Button>
          <Button v-access:code="perm.delete" danger @click="handleDelete">
            删除
          </Button>
          <GroupingSettings
            :fields="grouping.fields"
            :value="grouping.enabledField.value?.value"
            @change="onGroupFieldChange"
          />
        </Space>
      </template>

      <template #writeOffStatus="{ row }">
        <Tag
          v-if="row.writeOffStatus !== undefined && row.writeOffStatus !== null"
          :color="getBankStatementWriteOffStatusInfo(row.writeOffStatus).color"
        >
          {{ getBankStatementWriteOffStatusInfo(row.writeOffStatus).label }}
        </Tag>
        <span v-else>-</span>
      </template>
    </Grid>
  </Page>
</template>
