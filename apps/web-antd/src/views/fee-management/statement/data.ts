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
  ];
}

/**
 * 列表列配置（无操作列，第一列为 radio 单选列）
 */
export function useColumns(): VxeTableGridOptions<SeaExportAdminApi.SeaExportDto>['columns'] {
  return [
    { type: 'radio', width: 48, fixed: 'left' },
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
      field: 'localCurrencyCode',
      title: $t('seaExport.export.statement.localCurrencyCode'),
      minWidth: 130,
    },
    {
      field: 'localCurrencyReceiveAmount',
      title: $t('seaExport.export.statement.localCurrencyReceiveAmount'),
      minWidth: 80,
    },
    {
      field: 'localCurrencyPayAmount',
      title: $t('seaExport.export.statement.localCurrencyPayAmount'),
      minWidth: 80,
    },
    {
      field: 'remark',
      title: $t('seaExport.export.remark'),
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
