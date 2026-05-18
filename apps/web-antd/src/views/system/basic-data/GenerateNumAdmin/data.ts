import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { GenerateNumAdminApi } from '#/api/system/base-data/generate-num-admin';

import { z } from '#/adapter/form';
import { $t } from '#/locales';

/**
 * 获取表格搜索表单的字段配置
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('system.basicData.generateNum.name'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'tableName',
      label: $t('system.basicData.generateNum.tableName'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'OrganizationSelect',
      fieldName: 'orgId',
      label: $t('system.basicData.generateNum.orgId'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
      },
    },
  ];
}

/**
 * 获取编辑表单的字段配置（主表字段，不含规则明细）
 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('system.basicData.generateNum.name'),
      componentProps: {
        maxLength: 100,
      },
      rules: z
        .string()
        .trim()
        .min(
          1,
          $t('ui.formRules.required', [
            $t('system.basicData.generateNum.name'),
          ]),
        )
        .max(
          100,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.generateNum.name'),
            100,
          ]),
        ),
    },
    {
      component: 'Input',
      fieldName: 'tableName',
      label: $t('system.basicData.generateNum.tableName'),
      componentProps: {
        maxLength: 200,
      },
      rules: z
        .string()
        .trim()
        .min(
          1,
          $t('ui.formRules.required', [
            $t('system.basicData.generateNum.tableName'),
          ]),
        )
        .max(
          200,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.generateNum.tableName'),
            200,
          ]),
        ),
    },
    {
      component: 'Select',
      fieldName: 'applyScope',
      label: $t('system.basicData.generateNum.applyScope'),
      defaultValue: 'none',
      componentProps: {
        allowClear: false,
        style: {
          width: '200px',
        },
        options: [
          {
            label: $t('system.basicData.generateNum.applyScopeOptions.none'),
            value: 'none',
          },
          {
            label: $t('system.basicData.generateNum.applyScopeOptions.org'),
            value: 'org',
          },
          {
            label: $t('system.basicData.generateNum.applyScopeOptions.user'),
            value: 'user',
          },
        ],
      },
    },
    {
      component: 'OrganizationSelect',
      fieldName: 'orgId',
      label: $t('system.basicData.generateNum.orgId'),
      componentProps: {
        allowClear: true,
        appendCodeOnDisplayName: false,
        placeholder: $t('ui.placeholder.select'),
      },
      dependencies: {
        triggerFields: ['applyScope'],
        show: (values) => values.applyScope === 'org',
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'generateNumUserIds',
      label: $t('system.basicData.generateNum.generateNumUsers'),
      componentProps: {
        allowClear: true,
        mode: 'multiple',
        placeholder: $t('ui.placeholder.select'),
      },
      dependencies: {
        triggerFields: ['applyScope'],
        show: (values) => values.applyScope === 'user',
      },
    },
  ];
}

/**
 * 获取表格列配置
 */
export function useColumns(
  onActionClick?: OnActionClickFn<GenerateNumAdminApi.GenerateNumDto>,
): VxeTableGridOptions<GenerateNumAdminApi.GenerateNumDto>['columns'] {
  return [
    {
      field: 'name',
      title: $t('system.basicData.generateNum.name'),
      minWidth: 150,
    },
    {
      field: 'tableName',
      title: $t('system.basicData.generateNum.tableName'),
      minWidth: 180,
    },
    {
      field: 'orgName',
      title: $t('system.basicData.generateNum.orgId'),
      minWidth: 180,
    },
    {
      field: 'generateNumUsers',
      title: $t('system.basicData.generateNum.generateNumUsers'),
      minWidth: 220,
      formatter: ({ cellValue }) => {
        const users = Array.isArray(cellValue) ? cellValue : [];
        return users
          .map((item) => item?.nickName || item?.userId)
          .filter(Boolean)
          .join('、');
      },
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.generateNum.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'name',
          nameTitle: $t('system.basicData.generateNum.name'),
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
