import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { SeServiceConfigAdminApi } from '#/api/system/base-data/se-service-config-admin';

import { $t } from '#/locales';
import { formatUserAttribute } from '#/views/system/user/data';

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

const getPortName = (row: SeServiceConfigAdminApi.SeServiceConfigItemListDto) =>
  row.portName || row.pol?.portName || row.pol?.cnName || '-';

const getServiceTypeText = (
  value: number | string | undefined,
  optionMap: Map<number, string>,
) => {
  if (value === undefined || value === null) return '-';
  const enumLabel = optionMap.get(Number(value));
  return enumLabel || String(value);
};

export function useColumns(
  serviceTypeOptions: SelectOption[],
  onActionClick?: OnActionClickFn<SeServiceConfigAdminApi.SeServiceConfigItemListDto>,
): VxeTableGridOptions<SeServiceConfigAdminApi.SeServiceConfigItemListDto>['columns'] {
  const serviceTypeMap = new Map(
    serviceTypeOptions.map((item) => [Number(item.value), item.label]),
  );

  return [
    {
      field: 'pol',
      title: $t('system.basicData.seServiceConfig.polId'),
      minWidth: 180,
      formatter: ({ row }) => getPortName(row),
    },
    {
      field: 'serviceType',
      title: $t('system.basicData.seServiceConfig.serviceType'),
      minWidth: 160,
      formatter: ({ cellValue, row }) =>
        row.serviceTypeText ||
        row.serviceTypeName ||
        row.serviceTypeDisplayName ||
        getServiceTypeText(
          cellValue as number | string | undefined,
          serviceTypeMap,
        ),
    },
    {
      field: 'userAttribute',
      title: $t('system.basicData.seServiceConfig.userAttribute'),
      minWidth: 180,
      formatter: ({ cellValue }) =>
        formatUserAttribute(cellValue as number | undefined),
    },
    {
      field: 'autoComplete',
      title: $t('system.basicData.seServiceConfig.autoComplete'),
      minWidth: 120,
      cellRender: {
        name: 'CellTag',
        options: [
          { value: true, label: $t('common.yes'), color: 'success' },
          { value: false, label: $t('common.no'), color: 'default' },
        ],
      },
    },
    {
      field: 'manualAllowed',
      title: $t('system.basicData.seServiceConfig.manualAllowed'),
      minWidth: 140,
      cellRender: {
        name: 'CellTag',
        options: [
          { value: true, label: $t('common.yes'), color: 'success' },
          { value: false, label: $t('common.no'), color: 'default' },
        ],
      },
    },
    {
      field: 'reminder',
      title: $t('system.basicData.seServiceConfig.reminder'),
      minWidth: 120,
      cellRender: {
        name: 'CellTag',
        options: [
          { value: true, label: $t('common.yes'), color: 'success' },
          { value: false, label: $t('common.no'), color: 'default' },
        ],
      },
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
