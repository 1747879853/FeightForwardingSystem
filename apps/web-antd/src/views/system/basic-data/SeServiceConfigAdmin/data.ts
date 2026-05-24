import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { SeServiceConfigAdminApi } from '#/api/system/base-data/se-service-config-admin';

import { $t } from '#/locales';

export type SelectOption = { label: string; value: number };

export function useGridFormSchema(
  serviceTypeOptions: SelectOption[],
): VbenFormSchema[] {
  return [
    {
      component: 'PortSelect',
      fieldName: 'polId',
      label: $t('system.basicData.seServiceConfig.polId'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'Select',
      fieldName: 'serviceType',
      label: $t('system.basicData.seServiceConfig.serviceType'),
      componentProps: {
        allowClear: true,
        options: serviceTypeOptions,
        placeholder: $t('ui.placeholder.select'),
      },
    },
  ];
}

export function useColumns(
  serviceTypeOptions: SelectOption[],
  onActionClick?: OnActionClickFn<SeServiceConfigAdminApi.SeServiceConfigListDto>,
): VxeTableGridOptions<SeServiceConfigAdminApi.SeServiceConfigListDto>['columns'] {
  const serviceTypeMap = new Map(
    serviceTypeOptions.map((item) => [Number(item.value), item.label]),
  );

  return [
    {
      field: 'pol',
      title: $t('system.basicData.seServiceConfig.polId'),
      minWidth: 180,
      formatter: ({ row }) =>
        row.pol?.portName || row.pol?.cnName || String(row.polId || '-'),
    },
    {
      field: 'serviceTypes',
      title: $t('system.basicData.seServiceConfig.serviceType'),
      minWidth: 200,
      formatter: ({ row }) => {
        const types = row.serviceTypes;
        if (!types || types.length === 0) return '-';
        return types
          .map((t) => serviceTypeMap.get(Number(t)) || String(t))
          .join('、');
      },
    },
    {
      field: 'serviceItemCount',
      title: $t('system.basicData.seServiceConfig.serviceItemCount'),
      minWidth: 100,
      align: 'center',
    },
    {
      field: 'sortId',
      title: $t('system.basicData.seServiceConfig.sortId'),
      minWidth: 90,
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.seServiceConfig.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'id',
          nameTitle: $t('system.basicData.seServiceConfig.name'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: ['edit', 'delete'],
      },
      field: 'operation',
      fixed: 'right',
      headerAlign: 'center',
      showOverflow: false,
      title: $t('system.basicData.operation'),
      width: 150,
    },
  ];
}
