import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { SystemOrganizationUnitApi } from '#/api/system/organization-unit';

import { z } from '#/adapter/form';
import { getOrganizationUnitTree } from '#/api/system/organization-unit';
import { $t } from '#/locales';

/**
 * 获取编辑表单的字段配置。如果没有使用多语言，可以直接export一个数组常量
 */
export function useSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        maxLength: 128,
      },
      fieldName: 'displayName',
      label: $t('system.dept.deptName'),
      rules: z
        .string()
        .min(1, $t('ui.formRules.required', [$t('system.dept.deptName')]))
        .max(
          128,
          $t('ui.formRules.maxLength', [$t('system.dept.deptName'), 128]),
        ),
    },
    {
      component: 'ApiTreeSelect',
      componentProps: {
        allowClear: true,
        api: getOrganizationUnitTree,
        class: 'w-full',
        labelField: 'displayName',
        valueField: 'id',
        childrenField: 'children',
      },
      fieldName: 'parentId',
      label: $t('system.dept.parentDept'),
    },
  ];
}

/**
 * 获取表格列配置
 * @description 使用函数的形式返回列数据而不是直接export一个Array常量，是为了响应语言切换时重新翻译表头
 * @param onActionClick 表格操作按钮点击事件
 */
export function useColumns(
  onActionClick?: OnActionClickFn<SystemOrganizationUnitApi.OrganizationUnitTreeDto>,
): VxeTableGridOptions<SystemOrganizationUnitApi.OrganizationUnitTreeDto>['columns'] {
  return [
    {
      align: 'left',
      field: 'displayName',
      fixed: 'left',
      title: $t('system.dept.deptName'),
      treeNode: true,
    },
    {
      field: 'code',
      title: $t('system.dept.code'),
    },

    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'displayName',
          nameTitle: $t('system.dept.name'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          {
            code: 'append',
            text: $t('system.dept.addChild'),
          },
          'edit', // 默认的编辑按钮
          {
            code: 'delete', // 默认的删除按钮
            disabled: (
              row: SystemOrganizationUnitApi.OrganizationUnitTreeDto,
            ) => {
              return !!(row.children && row.children.length > 0);
            },
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      headerAlign: 'center',
      showOverflow: false,
      title: $t('system.dept.operation'),
    },
  ];
}
