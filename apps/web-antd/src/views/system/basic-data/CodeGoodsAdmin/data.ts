import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { CodeGoodsAdminApi } from '#/api/system/base-data/code-goods-admin';

import { z } from '#/adapter/form';
import { $t } from '#/locales';

/** 与业务单 CargoType 一致：0 普通货 / 1 冻柜 / 2 危险品 / 3 超限箱 */
const getCargoTypeOptions = () => [
  { value: 0, label: $t('seaImport.import.cargoTypeOptions.normal') },
  { value: 1, label: $t('seaImport.import.cargoTypeOptions.refrigerated') },
  { value: 2, label: $t('seaImport.import.cargoTypeOptions.dangerous') },
  { value: 3, label: $t('seaImport.import.cargoTypeOptions.outOfGauge') },
];

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
    {
      component: 'Select',
      fieldName: 'CargoId',
      label: $t('system.basicData.codeGoods.cargoId'),
      componentProps: {
        allowClear: true,
        options: getCargoTypeOptions(),
        placeholder: $t('ui.placeholder.select'),
        style: { width: '100%' },
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
        maxLength: 128,
      },
      rules: z
        .string()
        .max(
          128,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeGoods.code'),
            128,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('system.basicData.codeGoods.goodsName'),
      componentProps: {
        maxLength: 128,
      },
      rules: z
        .string()
        .min(1, {
          message: $t('ui.formRules.required', [
            $t('system.basicData.codeGoods.goodsName'),
          ]),
        })
        .max(
          128,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeGoods.goodsName'),
            128,
          ]),
        ),
    },
    {
      component: 'Select',
      fieldName: 'cargoId',
      label: $t('system.basicData.codeGoods.cargoId'),
      componentProps: {
        options: getCargoTypeOptions(),
        placeholder: $t('ui.placeholder.select'),
        style: { width: '100%' },
      },
      rules: z.number({
        required_error: $t('ui.formRules.selectRequired', [
          $t('system.basicData.codeGoods.cargoId'),
        ]),
        invalid_type_error: $t('ui.formRules.selectRequired', [
          $t('system.basicData.codeGoods.cargoId'),
        ]),
      }),
    },
    {
      component: 'Input',
      fieldName: 'goodNo',
      label: $t('system.basicData.codeGoods.goodNo'),
      componentProps: {
        maxLength: 128,
      },
      rules: z
        .string()
        .max(
          128,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeGoods.goodNo'),
            128,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'enName',
      label: $t('system.basicData.codeGoods.enName'),
      componentProps: {
        maxLength: 128,
      },
      rules: z
        .string()
        .max(
          128,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeGoods.enName'),
            128,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'hsCode',
      label: $t('system.basicData.codeGoods.hsCode'),
      componentProps: {
        maxLength: 64,
      },
      rules: z
        .string()
        .max(
          64,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeGoods.hsCode'),
            64,
          ]),
        )
        .optional(),
    },
    {
      component: 'Input',
      fieldName: 'ruleUnit',
      label: $t('system.basicData.codeGoods.ruleUnit'),
      componentProps: {
        maxLength: 64,
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
        maxLength: 256,
        rows: 3,
      },
      rules: z
        .string()
        .max(
          256,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeGoods.description'),
            256,
          ]),
        )
        .optional(),
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('system.basicData.codeGoods.remark'),
      componentProps: {
        maxLength: 1024,
        rows: 3,
      },
      rules: z
        .string()
        .max(
          1024,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.codeGoods.remark'),
            1024,
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
  const cargoTypeLabelMap = new Map(
    getCargoTypeOptions().map((item) => [item.value, item.label]),
  );

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
      field: 'cargoId',
      title: $t('system.basicData.codeGoods.cargoId'),
      minWidth: 100,
      formatter: ({ cellValue }) =>
        cargoTypeLabelMap.get(cellValue as number) ?? cellValue ?? '',
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
