import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemPermissionApi } from '#/api/system/permission';

import {
  DataPermissionType,
  DataPermissionTypeOptions,
  FrightModule,
  FrightModuleOptions,
  ManageType,
  ManageTypeOptions,
  OperatorOptions,
  UserTablePermissionOperator,
} from '#/api/system/permission';
import { $t } from '#/locales';

// ==================== 枚举标签映射 ====================

export const ManageTypeLabels: Record<ManageType, string> = {
  [ManageType.Get]: '查询',
  [ManageType.Edit]: '编辑',
};

export const DataPermissionTypeLabels: Record<DataPermissionType, string> = {
  [DataPermissionType.My]: '自己',
  [DataPermissionType.MyPart]: '本部门',
  [DataPermissionType.MyCompany]: '本公司',
  [DataPermissionType.ManyUser]: '多用户',
  [DataPermissionType.ManyPart]: '多部门/多公司',
  [DataPermissionType.All]: '全部',
};

export const FrightModuleLabels: Record<FrightModule, string> = {
  [FrightModule.WarehouseManagement]: '仓库管理',
  [FrightModule.TraderManagement]: '贸易商管理',
};

export const OperatorLabels: Record<UserTablePermissionOperator, string> = {
  [UserTablePermissionOperator.Equals]: '等于',
  [UserTablePermissionOperator.NotEquals]: '不等于',
  [UserTablePermissionOperator.Contains]: '包含',
  [UserTablePermissionOperator.GreaterThan]: '大于',
  [UserTablePermissionOperator.LessThan]: '小于',
  [UserTablePermissionOperator.GreaterThanOrEqual]: '大于等于',
  [UserTablePermissionOperator.LessThanOrEqual]: '小于等于',
  [UserTablePermissionOperator.StartsWith]: '开头包含',
  [UserTablePermissionOperator.EndsWith]: '结尾包含',
};

// ==================== 数据权限表单和表格配置 ====================

export function useDataPermissionFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        options: ManageTypeOptions,
        placeholder: '请选择功能类型',
      },
      fieldName: 'manageType',
      label: $t('system.permission.manageType'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        options: DataPermissionTypeOptions,
        placeholder: '请选择数据范围',
      },
      fieldName: 'dataPermissionType',
      label: $t('system.permission.dataPermissionType'),
      rules: 'required',
    },
  ];
}

export function useDataPermissionColumns<
  T = SystemPermissionApi.UserDataPermissionDto,
>(onActionClick: OnActionClickFn<T>): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'id',
      title: 'ID',
      width: 80,
    },
    {
      field: 'manageType',
      title: $t('system.permission.manageType'),
      width: 120,
      formatter: ({ cellValue }) => ManageTypeLabels[cellValue] || cellValue,
    },
    {
      field: 'dataPermissionType',
      title: $t('system.permission.dataPermissionType'),
      width: 150,
      formatter: ({ cellValue }) =>
        DataPermissionTypeLabels[cellValue] || cellValue,
    },
    {
      field: 'creationTime',
      formatter: 'formatDateTime',
      title: $t('system.permission.createTime'),
      width: 180,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'id',
          nameTitle: $t('system.permission.name'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.permission.operation'),
      width: 130,
    },
  ];
}

// ==================== 表级权限表单和表格配置 ====================

export function useTablePermissionFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        options: FrightModuleOptions,
        placeholder: '请选择模块',
      },
      fieldName: 'frightModule',
      label: $t('system.permission.module'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        options: ManageTypeOptions,
        placeholder: '请选择功能类型',
      },
      fieldName: 'manageType',
      label: $t('system.permission.manageType'),
      rules: 'required',
    },
  ];
}

export function useTablePermissionColumns<
  T = SystemPermissionApi.UserTablePermissionDto,
>(
  onActionClick: OnActionClickFn<T>,
  onViewConditions?: (row: T) => void,
): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'id',
      title: 'ID',
      width: 80,
    },
    {
      field: 'frightModule',
      title: $t('system.permission.module'),
      width: 150,
      formatter: ({ cellValue }) => FrightModuleLabels[cellValue] || cellValue,
    },
    {
      field: 'manageType',
      title: $t('system.permission.manageType'),
      width: 120,
      formatter: ({ cellValue }) => ManageTypeLabels[cellValue] || cellValue,
    },
    {
      field: 'creationTime',
      formatter: 'formatDateTime',
      title: $t('system.permission.createTime'),
      width: 180,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'id',
          nameTitle: $t('system.permission.name'),
          onClick: onActionClick,
          actions: onViewConditions
            ? [
                {
                  code: 'viewConditions',
                  text: $t('system.permission.viewConditions'),
                },
              ]
            : undefined,
        },
        name: 'CellOperation',
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.permission.operation'),
      width: 200,
    },
  ];
}

// ==================== 表级权限条件表单和表格配置 ====================

export function useTableConditionFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入字段名称',
      },
      fieldName: 'propName',
      label: $t('system.permission.conditionPropName'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        options: OperatorOptions,
        placeholder: '请选择操作符',
      },
      fieldName: 'operator',
      label: $t('system.permission.conditionOperator'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入条件值',
      },
      fieldName: 'value',
      label: $t('system.permission.conditionValue'),
      rules: 'required',
    },
  ];
}

export function useTableConditionColumns<
  T = SystemPermissionApi.UserTablePermissionConditionDto,
>(onActionClick: OnActionClickFn<T>): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'id',
      title: 'ID',
      width: 80,
    },
    {
      field: 'propName',
      title: $t('system.permission.conditionPropName'),
      width: 150,
    },
    {
      field: 'operator',
      title: $t('system.permission.conditionOperator'),
      width: 120,
      formatter: ({ cellValue }) => OperatorLabels[cellValue] || cellValue,
    },
    {
      field: 'value',
      title: $t('system.permission.conditionValue'),
      minWidth: 150,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'id',
          nameTitle: $t('system.permission.name'),
          onClick: onActionClick,
          showEdit: false,
        },
        name: 'CellOperation',
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.permission.operation'),
      width: 100,
    },
  ];
}

// ==================== 字段权限表单和表格配置 ====================

export function usePropPermissionFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        options: FrightModuleOptions,
        placeholder: '请选择模块',
      },
      fieldName: 'frightModule',
      label: $t('system.permission.module'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入需要屏蔽的字段名称',
      },
      fieldName: 'propName',
      label: $t('system.permission.propName'),
      rules: 'required',
    },
  ];
}

export function usePropPermissionColumns<
  T = SystemPermissionApi.UserPropPermissionDto,
>(onActionClick: OnActionClickFn<T>): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'id',
      title: 'ID',
      width: 80,
    },
    {
      field: 'frightModule',
      title: $t('system.permission.module'),
      width: 150,
      formatter: ({ cellValue }) => FrightModuleLabels[cellValue] || cellValue,
    },
    {
      field: 'propName',
      title: $t('system.permission.propName'),
      minWidth: 200,
    },
    {
      field: 'creationTime',
      formatter: 'formatDateTime',
      title: $t('system.permission.createTime'),
      width: 180,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'id',
          nameTitle: $t('system.permission.name'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.permission.operation'),
      width: 130,
    },
  ];
}
