import { $t } from '#/locales';
import dayjs from 'dayjs';
import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';
import type { ChangeOrderAdminApi } from '#/api/sea-export/change-order-admin';

/**
 * 列表列配置（无操作列，第一列为 radio 单选列）
 */

export function useColumns(): VxeTableGridOptions<ChangeOrderAdminApi.ChangeOrderEditDto>['columns'] {
  return [
    { type: 'checkbox', width: 48, fixed: 'left' },
    {
      title: $t('seaExport.export.accountDate'),
      field: 'accountDate',
      width: 100,
      cellRender: {
        name: 'CellTag',
      },
    },
    {
      title: $t('seaExport.export.changeOrder.reason'),
      align: 'center',
      field: 'reason',
      minWidth: 300,
      cellRender: {
        name: 'CellInput',
      },
    },
    {
      title: $t('seaExport.export.orderFee.remark'),
      field: 'remark',
      minWidth: 120,
      cellRender: {
        name: 'CellInput',
      },
    },
    {
      title: $t('seaExport.export.changeOrder.feeLocked'),
      field: 'feeLocked',
      minWidth: 80,
      cellRender: {
        name: 'CellTag',
        options: [
          {
            color: 'blue',
            value: true,
            label: $t('common.yes'),
          },
          {
            color: 'gray',
            value: false,
            label: $t('common.no'),
          },
        ],
      },
    },
    {
      title: $t('seaExport.export.changeOrder.feeLockedUserName'),
      field: 'feeLockedUserName',
      minWidth: 80,
    },
    {
      title: $t('seaExport.export.changeOrder.feeLockedTime'),
      field: 'feeLockedTime',
      minWidth: 100,
      formatter: 'formatDateTime',
    },

    {
      title: $t('seaExport.export.changeOrder.feeUnLockedUserName'),
      field: 'feeUnLockedUserName',
      align: 'center',
      minWidth: 80,
    },
    {
      title: $t('seaExport.export.changeOrder.lastModificationTime'),
      field: 'lastModificationTime',
      align: 'center',
      minWidth: 100,
      formatter: 'formatDateTime',
    },
    {
      title: $t('seaExport.export.changeOrder.creationTime'),
      field: 'creationTime',
      minWidth: 100,
      formatter: 'formatDateTime',
    },
  ];
}
