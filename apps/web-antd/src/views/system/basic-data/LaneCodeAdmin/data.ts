import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { LaneCodeAdminApi } from '#/api/system/base-data/lane-code-admin';

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
      label: $t('system.basicData.laneCode.keyword'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'Status',
      label: $t('system.basicData.laneCode.status'),
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
      fieldName: 'code',
      label: $t('system.basicData.laneCode.code'),
      componentProps: {
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'laneName',
      label: $t('system.basicData.laneCode.laneName'),
      componentProps: {
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'laneEnName',
      label: $t('system.basicData.laneCode.laneEnName'),
      componentProps: {
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'ediCode',
      label: $t('system.basicData.laneCode.ediCode'),
      componentProps: {
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'status',
      label: $t('system.basicData.laneCode.status'),
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
  onActionClick?: OnActionClickFn<LaneCodeAdminApi.LaneCodeDto>,
): VxeTableGridOptions<LaneCodeAdminApi.LaneCodeDto>['columns'] {
  return [
    {
      field: 'code',
      title: $t('system.basicData.laneCode.code'),
      minWidth: 120,
    },
    {
      field: 'laneName',
      title: $t('system.basicData.laneCode.laneName'),
      minWidth: 160,
    },
    {
      field: 'laneEnName',
      title: $t('system.basicData.laneCode.laneEnName'),
      minWidth: 160,
    },
    {
      field: 'ediCode',
      title: $t('system.basicData.laneCode.ediCode'),
      minWidth: 120,
    },
    {
      field: 'status',
      title: $t('system.basicData.laneCode.status'),
      minWidth: 90,
      cellRender: {
        name: 'CellTag',
        options: getStatusOptions(),
      },
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.laneCode.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'laneName',
          nameTitle: $t('system.basicData.laneCode.name'),
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
