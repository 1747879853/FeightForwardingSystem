import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { CtnCodeAdminApi } from '#/api/system/base-data/ctn-code-admin';

import { $t } from '#/locales';
import { z } from '@vben/common-ui';
const getStatusOptions = () => [
  { color: 'success', label: $t('common.enabled'), value: 0 },
  { color: 'default', label: $t('common.disabled'), value: 1 },
];

const getIsDefaultOptions = () => [
  {
    color: 'success',
    label: $t('system.basicData.ctnCode.isDefaultOptions.yes'),
    value: true,
  },
  {
    color: 'default',
    label: $t('system.basicData.ctnCode.isDefaultOptions.no'),
    value: false,
  },
];

/**
 * 获取表格搜索表单的字段配置
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: $t('system.basicData.ctnCode.keyword'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'Status',
      label: $t('system.basicData.ctnCode.status'),
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
    {
      component: 'Select',
      fieldName: 'IsDefault',
      label: $t('system.basicData.ctnCode.isDefault'),
      defaultValue: undefined,
      componentProps: {
        allowClear: true,
        options: getIsDefaultOptions().map(({ label, value }) => ({
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
      fieldName: 'ctnSize',
      label: $t('system.basicData.ctnCode.ctnSize'),
      rules: z
        .string()
        .min(1, {
          message: $t('ui.formRules.required', [
            $t('system.basicData.ctnCode.ctnSize'),
          ]),
        }),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'ctnType',
      label: $t('system.basicData.ctnCode.ctnType'),
      rules: z
        .string()
        .min(1, {
          message: $t('ui.formRules.required', [
            $t('system.basicData.ctnCode.ctnType'),
          ]),
        }),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'ctnName',
      label: $t('system.basicData.ctnCode.ctnName'),
      rules: z
        .string()
        .min(1, {
          message: $t('ui.formRules.required', [
            $t('system.basicData.ctnCode.ctnName'),
          ]),
        }),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'ediCode',
      label: $t('system.basicData.ctnCode.ediCode'),
      rules: z
        .string()
        .min(1, {
          message: $t('ui.formRules.required', [
            $t('system.basicData.ctnCode.ediCode'),
          ]),
        }),
      componentProps: { allowClear: true },
    },
    {
      component: 'InputNumber',
      fieldName: 'ctnWeight',
      label: $t('system.basicData.ctnCode.ctnWeight'),
      componentProps: {
        class: 'w-full',
      },
    },
    {
      component: 'Input',
      fieldName: 'afrCode',
      label: $t('system.basicData.ctnCode.afrCode'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Textarea',
      fieldName: 'enExplain',
      label: $t('system.basicData.ctnCode.enExplain'),
      componentProps: { allowClear: true, rows: 3 },
    },
    {
      component: 'Textarea',
      fieldName: 'cnExplain',
      label: $t('system.basicData.ctnCode.cnExplain'),
      componentProps: { allowClear: true, rows: 3 },
    },

    {
      component: 'InputNumber',
      fieldName: 'limitWeight',
      label: $t('system.basicData.ctnCode.limitWeight'),
      componentProps: {
        class: 'w-full',
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'teu',
      label: $t('system.basicData.ctnCode.teu'),
      componentProps: {
        class: 'w-full',
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'orderNo',
      label: $t('system.basicData.ctnCode.orderNo'),
      componentProps: {
        class: 'w-full',
        precision: 0,
      },
    },
    {
      component: 'Select',
      fieldName: 'status',
      label: $t('system.basicData.ctnCode.status'),
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
    {
      component: 'Switch',
      fieldName: 'isDefault',
      label: $t('system.basicData.ctnCode.isDefault'),
      defaultValue: false,
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('system.basicData.ctnCode.remark'),
      componentProps: { allowClear: true, rows: 3 },
    },
  ];
}

/**
 * 获取表格列配置
 */
export function useColumns(
  onActionClick?: OnActionClickFn<CtnCodeAdminApi.CtnCodeDto>,
): VxeTableGridOptions<CtnCodeAdminApi.CtnCodeDto>['columns'] {
  return [
    {
      field: 'ctnName',
      title: $t('system.basicData.ctnCode.ctnName'),
      minWidth: 140,
    },
    {
      field: 'ctnSize',
      title: $t('system.basicData.ctnCode.ctnSize'),
      minWidth: 120,
    },
    {
      field: 'ctnType',
      title: $t('system.basicData.ctnCode.ctnType'),
      minWidth: 120,
    },
    {
      field: 'ediCode',
      title: $t('system.basicData.ctnCode.ediCode'),
      minWidth: 120,
    },
    {
      field: 'ctnWeight',
      title: $t('system.basicData.ctnCode.ctnWeight'),
      minWidth: 120,
    },
    {
      field: 'limitWeight',
      title: $t('system.basicData.ctnCode.limitWeight'),
      minWidth: 120,
    },
    {
      field: 'teu',
      title: $t('system.basicData.ctnCode.teu'),
      minWidth: 100,
    },
    {
      field: 'orderNo',
      title: $t('system.basicData.ctnCode.orderNo'),
      minWidth: 100,
    },
    {
      field: 'isDefault',
      title: $t('system.basicData.ctnCode.isDefault'),
      minWidth: 110,
      cellRender: {
        name: 'CellTag',
        options: getIsDefaultOptions(),
      },
    },
    {
      field: 'status',
      title: $t('system.basicData.ctnCode.status'),
      minWidth: 90,
      cellRender: {
        name: 'CellTag',
        options: getStatusOptions(),
      },
    },
    {
      field: 'remark',
      title: $t('system.basicData.ctnCode.remark'),
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.ctnCode.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'ctnName',
          nameTitle: $t('system.basicData.ctnCode.name'),
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
