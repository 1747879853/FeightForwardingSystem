import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { CodeGoodsAdminApi } from '#/api/system/base-data/code-goods-admin';

import { z } from '#/adapter/form';
import { $t } from '#/locales';

/**
 * 获取表格搜索表单的字段配置
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: $t('system.basicData.codeGoods.keyword'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
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
      label: $t('system.basicData.codeGoods.code'),
      componentProps: {
        maxLength: 50,
      },
      rules: z
        .string()
        .max(
          50,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeGoods.code'),
            50,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('system.basicData.codeGoods.goodsName'),
      componentProps: {
        maxLength: 100,
      },
      rules: z
        .string()
        .max(
          100,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeGoods.goodsName'),
            100,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'goodNo',
      label: $t('system.basicData.codeGoods.goodNo'),
      componentProps: {
        maxLength: 50,
      },
      rules: z
        .string()
        .max(
          50,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeGoods.goodNo'),
            50,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'enName',
      label: $t('system.basicData.codeGoods.enName'),
      componentProps: {
        maxLength: 100,
      },
      rules: z
        .string()
        .max(
          100,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeGoods.enName'),
            100,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'hsCode',
      label: $t('system.basicData.codeGoods.hsCode'),
      componentProps: {
        maxLength: 50,
      },
      rules: z
        .string()
        .max(
          50,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeGoods.hsCode'),
            50,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'ruleUnit',
      label: $t('system.basicData.codeGoods.ruleUnit'),
      componentProps: {
        maxLength: 50,
      },
    },
    {
      component: 'Input',
      fieldName: 'ruleUnit1',
      label: $t('system.basicData.codeGoods.ruleUnit1'),
      componentProps: {
        maxLength: 50,
      },
    },
    {
      component: 'Input',
      fieldName: 'ruleUnit2',
      label: $t('system.basicData.codeGoods.ruleUnit2'),
      componentProps: {
        maxLength: 50,
      },
    },
    {
      component: 'Switch',
      fieldName: 'enable',
      label: $t('system.basicData.codeGoods.enable'),
      defaultValue: true,
    },
    {
      component: 'InputNumber',
      fieldName: 'sortId',
      label: $t('system.basicData.codeGoods.sortId'),
      componentProps: {
        min: 0,
        precision: 0,
        style: { width: '100%' },
      },
    },
    {
      component: 'Textarea',
      fieldName: 'description',
      label: $t('system.basicData.codeGoods.description'),
      componentProps: {
        maxLength: 500,
        rows: 3,
      },
      rules: z
        .string()
        .max(
          500,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeGoods.description'),
            500,
          ]),
        )
        .optional(),
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('system.basicData.codeGoods.remark'),
      componentProps: {
        maxLength: 500,
        rows: 3,
      },
      rules: z
        .string()
        .max(
          500,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeGoods.remark'),
            500,
          ]),
        )
        .optional(),
    },
  ];
}

/**
 * 获取表格列配置
 */
export function useColumns(
  onActionClick?: OnActionClickFn<CodeGoodsAdminApi.CodeGoodsDto>,
): VxeTableGridOptions<CodeGoodsAdminApi.CodeGoodsDto>['columns'] {
  return [
    {
      field: 'code',
      title: $t('system.basicData.codeGoods.code'),
      minWidth: 100,
    },
    {
      field: 'name',
      title: $t('system.basicData.codeGoods.goodsName'),
      minWidth: 150,
    },
    {
      field: 'goodNo',
      title: $t('system.basicData.codeGoods.goodNo'),
      minWidth: 100,
    },
    {
      field: 'enName',
      title: $t('system.basicData.codeGoods.enName'),
      minWidth: 150,
    },
    {
      field: 'hsCode',
      title: $t('system.basicData.codeGoods.hsCode'),
      minWidth: 100,
    },
    {
      field: 'enable',
      title: $t('system.basicData.codeGoods.enable'),
      minWidth: 80,
      cellRender: {
        name: 'CellTag',
        options: [
          { color: 'success', label: $t('common.enabled'), value: true },
          { color: 'default', label: $t('common.disabled'), value: false },
        ],
      },
    },
    {
      field: 'sortId',
      title: $t('system.basicData.codeGoods.sortId'),
      minWidth: 80,
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.codeGoods.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'name',
          nameTitle: $t('system.basicData.codeGoods.name'),
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
