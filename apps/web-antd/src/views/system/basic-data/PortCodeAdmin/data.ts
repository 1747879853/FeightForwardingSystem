import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { PortCodeAdminApi } from '#/api/system/base-data/port-code-admin';

import { $t } from '#/locales';

const getStatusOptions = () => [
  { color: 'success', label: $t('common.enabled'), value: 0 },
  { color: 'default', label: $t('common.disabled'), value: 1 },
];

/**
 * 获取表格搜索表单的字段配置
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: $t('system.basicData.portCode.keyword'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'Status',
      label: $t('system.basicData.portCode.status'),
      defaultValue: undefined,
      componentProps: {
        allowClear: true,
        options: getStatusOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: $t('ui.placeholder.select'),
      },
    },
  ];
}

/**
 * 获取编辑表单的字段配置
 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'portName',
      label: $t('system.basicData.portCode.portName'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'cnName',
      label: $t('system.basicData.portCode.cnName'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'chau',
      label: $t('system.basicData.portCode.chau'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Textarea',
      fieldName: 'explain',
      label: $t('system.basicData.portCode.explain'),
      componentProps: { allowClear: true, rows: 3 },
    },
    {
      component: 'Input',
      fieldName: 'portType',
      label: $t('system.basicData.portCode.portType'),
      componentProps: { allowClear: true },
    },
    {
      component: 'CountrySelect',
      fieldName: 'countryId',
      label: $t('system.basicData.portCode.countryId'),
      defaultValue: undefined,
    },
    {
      component: 'LaneSelect',
      fieldName: 'laneId',
      label: $t('system.basicData.portCode.laneId'),
      defaultValue: undefined,
      componentProps: {
        labelKey: 'laneName',
      },
    },
    {
      component: 'Input',
      fieldName: 'ediCode',
      label: $t('system.basicData.portCode.ediCode'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'statisticalArea',
      label: $t('system.basicData.portCode.statisticalArea'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Select',
      fieldName: 'status',
      label: $t('system.basicData.portCode.status'),
      defaultValue: 0,
      componentProps: {
        allowClear: true,
        options: getStatusOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: $t('ui.placeholder.select'),
      },
    },
  ];
}

/**
 * 获取表格列配置
 */
export function useColumns(
  onActionClick?: OnActionClickFn<PortCodeAdminApi.PortCodeDto>,
): VxeTableGridOptions<PortCodeAdminApi.PortCodeDto>['columns'] {
  return [
    {
      field: 'cnName',
      title: $t('system.basicData.portCode.cnName'),
      minWidth: 160,
    },
    {
      field: 'portName',
      title: $t('system.basicData.portCode.portName'),
      minWidth: 160,
    },
    {
      field: 'countryName',
      title: $t('system.basicData.portCode.countryName'),
      minWidth: 140,
    },
    {
      field: 'chau',
      title: $t('system.basicData.portCode.chau'),
      minWidth: 120,
    },
    {
      field: 'portType',
      title: $t('system.basicData.portCode.portType'),
      minWidth: 120,
    },
    {
      field: 'laneCode',
      title: $t('system.basicData.portCode.laneCode'),
      minWidth: 120,
    },
    {
      field: 'laneName',
      title: $t('system.basicData.portCode.laneName'),
      minWidth: 140,
    },
    {
      field: 'ediCode',
      title: $t('system.basicData.portCode.ediCode'),
      minWidth: 120,
    },
    {
      field: 'statisticalArea',
      title: $t('system.basicData.portCode.statisticalArea'),
      minWidth: 120,
    },
    {
      field: 'status',
      title: $t('system.basicData.portCode.status'),
      minWidth: 90,
      cellRender: {
        name: 'CellTag',
        options: getStatusOptions(),
      },
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.portCode.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'cnName',
          nameTitle: $t('system.basicData.portCode.name'),
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
