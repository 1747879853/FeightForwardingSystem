import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import type { StatementAdminApi } from '#/api/settlement-management/statement-admin';

import { $t } from '#/locales';
import { createKeysSearchSchema } from '#/utils/keys-search';

/**
 * 开票状态选项（参考费用状态的颜色规范）
 */
export const getInvoiceStatusOptions = () => [
  { value: 0, label: '未开票', color: '#b8cdd7' },
  { value: 1, label: '部分开票', color: '#ffc107' },
  { value: 2, label: '已开票', color: '#67c23a' },
];

/**
 * 结算状态选项（参考费用状态的颜色规范）
 */
export const getSettlementStatusOptions = () => [
  { value: 0, label: '未结算', color: '#b8cdd7' },
  { value: 1, label: '部分结算', color: '#909399' },
  { value: 2, label: '结算完毕', color: '#67c23a' },
];

/**
 * 列表搜索表单 schema
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: $t('seaExport.export.keyword'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    createKeysSearchSchema({
      help: '精确匹配（非模糊）：对账单号、备注、客户名称、客户代码（不含主提单号）',
    }),
    {
      component: 'Input',
      fieldName: 'StatementNum',
      label: $t('seaExport.export.statement.number'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'CreationStartTime',
      label: $t('seaExport.export.statement.startTime'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'CreationEndTime',
      label: $t('seaExport.export.statement.endTime'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    // 移除：收付类型筛选
    // 新增：开票状态筛选
    {
      component: 'Select',
      fieldName: 'InvoiceStatus',
      label: '开票状态',
      componentProps: {
        placeholder: '请选择',
        allowClear: true,
        options: [
          { label: '未开票', value: 0 },
          { label: '部分开票', value: 1 },
          { label: '已开票', value: 2 },
        ],
      },
    },
    // 新增：结算状态筛选
    {
      component: 'Select',
      fieldName: 'SettlementStatus',
      label: '结算状态',
      componentProps: {
        placeholder: '请选择',
        allowClear: true,
        options: getSettlementStatusOptions().map(({ label, value }) => ({
          label,
          value,
        })),
      },
    },
    // 新增：我司银行筛选
    {
      component: 'ApiSelect',
      fieldName: 'OrgBankAccountId',
      label: '我司银行',
      componentProps: {
        placeholder: '请选择',
        allowClear: true,
        api: async () => {
          const { getUserBankAccountList } =
            await import('#/api/system/user-admin');
          const { useUserStore } = await import('@vben/stores');
          const userStore = useUserStore();
          const userId = userStore.userInfo?.id;
          if (!userId) return [];
          const accounts = await getUserBankAccountList(userId);
          return (accounts || []).map((account: any) => ({
            label: `${account.bankShortName} - ${account.accountName} (${account.currencyCode})`,
            value: account.id,
          }));
        },
      },
    },
  ];
}

/**
 * 获取基础列配置（包含最常用的币别列）
 */
export function useColumns(): VxeTableGridOptions<StatementAdminApi.StatementDto>['columns'] {
  const baseColumns: VxeTableGridOptions<StatementAdminApi.StatementDto>['columns'] =
    [
      { type: 'checkbox', width: 48, fixed: 'left' },
      {
        field: 'statementNum',
        title: $t('seaExport.export.statement.number'),
        minWidth: 140,
        sortable: true,
      },
      {
        field: 'client.name',
        title: $t('seaExport.export.statement.clientName'),
        minWidth: 140,
        sortable: true,
      },
      {
        field: 'startTime',
        title: $t('seaExport.export.statement.startTime'),
        minWidth: 140,
        formatter: 'formatDate',
        sortable: true,
      },
      {
        field: 'endTime',
        title: $t('seaExport.export.statement.endTime'),
        minWidth: 140,
        formatter: 'formatDate',
        sortable: true,
      },
      // 移除：收付类型汇总列
      // 新增：开票状态汇总列
      {
        field: 'invoiceStatus',
        title: '开票状态',
        minWidth: 120,
        cellRender: {
          name: 'CellTag',
          options: getInvoiceStatusOptions(),
        },
        sortable: true,
      },
      // 新增：结算状态汇总列
      {
        field: 'settlementStatus',
        title: '结算状态',
        minWidth: 120,
        cellRender: {
          name: 'CellTag',
          options: getSettlementStatusOptions(),
        },
        sortable: true,
      },
      // 新增：我司银行列
      {
        field: 'orgBankAccount',
        title: '我司银行',
        minWidth: 200,
        slots: { default: 'orgBankAccount' },
        sortable: false,
      },
      {
        field: 'description',
        title: $t('seaExport.export.statement.notes'),
        minWidth: 160,
        showOverflow: true,
        sortable: true,
      },
      {
        field: 'creationTime',
        title: $t('seaExport.export.creationTime'),
        minWidth: 160,
        formatter: 'formatDateTime',
        sortable: true,
      },
      // 新增：创建人列
      {
        field: 'creatorUserName',
        title: '创建人',
        minWidth: 120,
        sortable: true,
      },
    ];

  // 添加最常用的币别列（RMB、USD）
  const commonCurrencies = ['RMB', 'USD'];
  const currencyColumns: VxeTableGridOptions<StatementAdminApi.StatementDto>['columns'] =
    [];

  commonCurrencies.forEach((currencyCode) => {
    // 应收列
    currencyColumns.push({
      field: `currency_${currencyCode}_receive`,
      title: `${currencyCode}应收`,
      minWidth: 100,
      formatter: ({ row }: { row: StatementAdminApi.StatementDto }) => {
        const currencyGroup = row.statementCurrencyGroup?.find(
          (c) => c.currency?.code === currencyCode,
        );
        return currencyGroup ? currencyGroup.receiveAmount : '';
      },
      sortable: false,
    });

    // 应付列
    currencyColumns.push({
      field: `currency_${currencyCode}_pay`,
      title: `${currencyCode}应付`,
      minWidth: 100,
      formatter: ({ row }: { row: StatementAdminApi.StatementDto }) => {
        const currencyGroup = row.statementCurrencyGroup?.find(
          (c) => c.currency?.code === currencyCode,
        );
        return currencyGroup ? currencyGroup.payAmount : '';
      },
      sortable: false,
    });
  });

  return [...baseColumns, ...currencyColumns];
}
