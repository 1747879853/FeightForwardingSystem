import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { $t } from '#/locales';

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
    // 新增：收付类型筛选
    {
      component: 'Select',
      fieldName: 'PaySide',
      label: '收付类型',
      componentProps: {
        placeholder: '请选择',
        allowClear: true,
        options: [
          { label: '全部为收', value: 0 },
          { label: '全部为付', value: 1 },
          { label: '收付都有', value: 2 },
        ],
      },
    },
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
 * 列表列配置（无操作列，第一列为 radio 单选列）
 */
export function useColumns(): VxeTableGridOptions<SeaExportAdminApi.SeaExportDto>['columns'] {
  return [
    { type: 'checkbox', width: 48, fixed: 'left' },
    {
      field: 'statementNum',
      title: $t('seaExport.export.statement.number'),
      minWidth: 140,
    },
    {
      field: 'clientName',
      title: $t('seaExport.export.statement.clientName'),
      minWidth: 140,
    },
    {
      field: 'startTime',
      title: $t('seaExport.export.statement.startTime'),
      minWidth: 140,
      formatter: 'formatDate',
    },
    {
      field: 'endTime',
      title: $t('seaExport.export.statement.endTime'),
      minWidth: 140,
      formatter: 'formatDate',
    },
    // 新增：收付类型汇总列
    {
      field: 'paySide',
      title: '收付类型',
      minWidth: 120,
      slots: { default: 'paySide' },
    },
    // 新增：开票状态汇总列
    {
      field: 'invoiceStatus',
      title: '开票状态',
      minWidth: 120,
      slots: { default: 'invoiceStatus' },
    },
    // 新增：我司银行列
    {
      field: 'orgBankAccount',
      title: '我司银行',
      minWidth: 200,
      slots: { default: 'orgBankAccount' },
    },
    {
      field: 'localCurrencyCode',
      title: $t('seaExport.export.statement.localCurrencyCode'),
      minWidth: 130,
    },
    {
      field: 'localCurrencyReceiveAmount',
      title: $t('seaExport.export.statement.localCurrencyReceiveAmount'),
      minWidth: 100,
    },
    {
      field: 'localCurrencyPayAmount',
      title: $t('seaExport.export.statement.localCurrencyPayAmount'),
      minWidth: 100,
    },
    {
      field: 'description',
      title: $t('seaExport.export.statement.notes'),
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'creationTime',
      title: $t('seaExport.export.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
  ];
}
