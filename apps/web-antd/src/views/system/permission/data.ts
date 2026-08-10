import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemPermissionApi } from '#/api/system/permission';
import { FreightRateLabelOptions } from '#/api/sea-export/freight-rate-admin';
import {
  DataPermissionType,
  FrightModule,
  FrightModuleOptions,
  ManageType,
  OperatorOptions,
  UserTablePermissionOperator,
} from '#/api/system/permission';
import { $t } from '#/locales';

// ==================== 枚举标签映射 ====================

export function formatManageType(value: ManageType) {
  const labels: Record<ManageType, string> = {
    [ManageType.Get]: $t('system.permission.manageTypeGet'),
    [ManageType.Edit]: $t('system.permission.manageTypeEdit'),
  };
  return labels[value] ?? String(value);
}

export function formatDataPermissionType(value: DataPermissionType) {
  const labels: Record<DataPermissionType, string> = {
    [DataPermissionType.My]: $t('system.permission.dataPermissionTypeMy'),
    [DataPermissionType.MyPart]: $t(
      'system.permission.dataPermissionTypeMyPart',
    ),
    [DataPermissionType.MyCompany]: $t(
      'system.permission.dataPermissionTypeMyCompany',
    ),
    [DataPermissionType.ManyUser]: $t(
      'system.permission.dataPermissionTypeManyUser',
    ),
    [DataPermissionType.ManyPart]: $t(
      'system.permission.dataPermissionTypeManyPart',
    ),
    [DataPermissionType.All]: $t('system.permission.dataPermissionTypeAll'),
  };
  return labels[value] ?? String(value);
}

/** 数据权限表单可选项（排除「自己」，系统默认无需配置） */
export function getDataPermissionFormTypeOptions() {
  return [
    {
      label: $t('system.permission.dataPermissionTypeMyPart'),
      value: DataPermissionType.MyPart,
    },
    {
      label: $t('system.permission.dataPermissionTypeMyCompany'),
      value: DataPermissionType.MyCompany,
    },
    {
      label: $t('system.permission.dataPermissionTypeManyUser'),
      value: DataPermissionType.ManyUser,
    },
    {
      label: $t('system.permission.dataPermissionTypeManyPart'),
      value: DataPermissionType.ManyPart,
    },
    {
      label: $t('system.permission.dataPermissionTypeAll'),
      value: DataPermissionType.All,
    },
  ];
}

export function getManageTypeOptions() {
  return [
    {
      label: $t('system.permission.manageTypeGet'),
      value: ManageType.Get,
    },
    {
      label: $t('system.permission.manageTypeEdit'),
      value: ManageType.Edit,
    },
  ];
}

export function needsDataPermissionItems(type?: DataPermissionType) {
  return (
    type === DataPermissionType.ManyUser || type === DataPermissionType.ManyPart
  );
}

export const FrightModuleLabels: Record<FrightModule, string> = {
  [FrightModule.SeaExport]: '海运出口',
  [FrightModule.OrderFee]: '业务费用',
  [FrightModule.TransportOrder]: '业务表',
  [FrightModule.PaymentApplication]: '付费申请',
  [FrightModule.SeaImport]: '海运进口',
  [FrightModule.AirExport]: '空运出口',
  [FrightModule.AirImport]: '空运进口',
  [FrightModule.SeFreiPrice]: '运价',
  [FrightModule.PreOrder]: '业务联系单',
  [FrightModule.Client]: '客户管理',
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
        class: 'w-full',
        options: getManageTypeOptions(),
        placeholder: $t('system.permission.manageTypePlaceholder'),
      },
      fieldName: 'manageType',
      label: $t('system.permission.manageType'),
      rules: 'required',
      defaultValue: ManageType.Get,
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        options: getDataPermissionFormTypeOptions(),
        placeholder: $t('system.permission.dataPermissionTypePlaceholder'),
      },
      fieldName: 'dataPermissionType',
      label: $t('system.permission.dataPermissionType'),
      rules: 'required',
    },
  ];
}

export function useDataPermissionItemColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'entityId',
      title: $t('system.permission.entityId'),
      width: 100,
    },
    {
      field: 'entityName',
      minWidth: 200,
      title: $t('system.permission.entityName'),
    },
  ];
}

export function useDataPermissionColumns<
  T = SystemPermissionApi.UserDataPermissionDto,
>(
  onActionClick: OnActionClickFn<T>,
  onViewItems?: (row: T) => void,
): VxeTableGridOptions['columns'] {
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
      formatter: ({ cellValue }) => formatManageType(cellValue),
    },
    {
      field: 'dataPermissionType',
      title: $t('system.permission.dataPermissionType'),
      width: 150,
      formatter: ({ cellValue }) => formatDataPermissionType(cellValue),
    },
    {
      field: 'itemCount',
      title: $t('system.permission.itemCount'),
      width: 100,
      formatter: ({ row }) => {
        const record = row as SystemPermissionApi.UserDataPermissionDto;
        if (!needsDataPermissionItems(record.dataPermissionType)) {
          return '-';
        }
        return String(record.items?.length ?? 0);
      },
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
          actions: onViewItems
            ? [
                {
                  code: 'viewItems',
                  text: $t('system.permission.viewDataPermissionItems'),
                  show: (row: T) =>
                    needsDataPermissionItems(
                      (row as SystemPermissionApi.UserDataPermissionDto)
                        .dataPermissionType,
                    ),
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

// ==================== 表级权限字段元数据 ====================

export type TablePermissionFieldValueType = 'enum' | 'id' | 'number' | 'string';

export interface TablePermissionFieldMeta {
  propName: string;
  showName: string;
  valueType: TablePermissionFieldValueType;
  enumOptions?: Array<{ label: string; value: string }>;
  operators?: UserTablePermissionOperator[];
}

const STRING_OPERATORS = [
  UserTablePermissionOperator.Equals,
  UserTablePermissionOperator.NotEquals,
  UserTablePermissionOperator.Contains,
  UserTablePermissionOperator.StartsWith,
  UserTablePermissionOperator.EndsWith,
];

const COMPARABLE_OPERATORS = [
  UserTablePermissionOperator.Equals,
  UserTablePermissionOperator.NotEquals,
  UserTablePermissionOperator.GreaterThan,
  UserTablePermissionOperator.LessThan,
  UserTablePermissionOperator.GreaterThanOrEqual,
  UserTablePermissionOperator.LessThanOrEqual,
];

export const TablePermissionFieldMetaMap: Partial<
  Record<FrightModule, TablePermissionFieldMeta[]>
> = {
  [FrightModule.SeaExport]: [
    {
      propName: 'Vessel',
      showName: '船名',
      valueType: 'string',
      operators: STRING_OPERATORS,
    },
    {
      propName: 'BLType',
      showName: '装运方式',
      valueType: 'enum',
      enumOptions: [
        { label: '整柜', value: '0' },
        { label: '拼箱分票', value: '1' },
        { label: '拼箱主票', value: '2' },
      ],
    },
    {
      propName: 'BillType',
      showName: '订单类型',
      valueType: 'enum',
      enumOptions: [
        { label: '直单', value: '0' },
        { label: '分单', value: '1' },
      ],
    },
    {
      propName: 'BookingAgentId',
      showName: '订舱代理',
      valueType: 'id',
      operators: COMPARABLE_OPERATORS,
    },
    {
      propName: 'ClientId',
      showName: '委托单位',
      valueType: 'id',
      operators: COMPARABLE_OPERATORS,
    },
  ],
  [FrightModule.TransportOrder]: [
    {
      propName: 'CommissionNum',
      showName: '委托编号',
      valueType: 'string',
      operators: STRING_OPERATORS,
    },
    {
      propName: 'ClientId',
      showName: '委托单位',
      valueType: 'id',
      operators: COMPARABLE_OPERATORS,
    },
    {
      propName: 'BizType',
      showName: '业务类型',
      valueType: 'enum',
      enumOptions: [
        { label: '海运出口', value: '0' },
        { label: '海运进口', value: '1' },
      ],
    },
  ],
  [FrightModule.PaymentApplication]: [
    {
      propName: 'ClientId',
      showName: '委托单位',
      valueType: 'id',
      operators: COMPARABLE_OPERATORS,
    },
  ],
};

export function getTablePermissionFieldOptions(frightModule?: FrightModule) {
  if (frightModule === undefined) {
    return [];
  }
  return (TablePermissionFieldMetaMap[frightModule] ?? []).map((field) => ({
    label: field.showName,
    value: field.propName,
  }));
}

export function getTablePermissionFieldMeta(
  frightModule: FrightModule | undefined,
  propName: string,
) {
  return (TablePermissionFieldMetaMap[frightModule!] ?? []).find(
    (field) => field.propName === propName,
  );
}

export function getOperatorOptionsForField(
  fieldMeta?: TablePermissionFieldMeta,
) {
  const allowedOperators = fieldMeta?.operators;
  if (!allowedOperators?.length) {
    return OperatorOptions;
  }
  return OperatorOptions.filter((option) =>
    allowedOperators.includes(option.value),
  );
}

export function formatConditionDisplay(
  row: Pick<
    SystemPermissionApi.UserTablePermissionConditionDto,
    'propName' | 'showName' | 'value' | 'showValue'
  >,
) {
  const fieldLabel = row.showName || row.propName;
  const valueLabel = row.showValue || row.value;
  return `${fieldLabel} = ${valueLabel}`;
}

// ==================== 表级权限表单和表格配置 ====================

export function useTablePermissionFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        options: FrightModuleOptions,
        placeholder: $t('system.permission.modulePlaceholder'),
      },
      fieldName: 'frightModule',
      label: $t('system.permission.module'),
      rules: 'required',
    },
  ];
}

export function useTablePermissionColumns<
  T = SystemPermissionApi.UserTablePermissionDto & { conditionCount?: number },
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
      field: 'conditionCount',
      title: $t('system.permission.conditionCount'),
      width: 100,
      formatter: ({ cellValue }) =>
        cellValue === undefined ? '-' : String(cellValue),
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

export function useTableConditionFormSchema(options?: {
  frightModule?: FrightModule;
  propNameDisabled?: boolean;
}): VbenFormSchema[] {
  const fieldOptions = getTablePermissionFieldOptions(options?.frightModule);

  return [
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        options: fieldOptions,
        placeholder: $t('system.permission.conditionPropNamePlaceholder'),
        disabled: options?.propNameDisabled,
        showSearch: true,
        optionFilterProp: 'label',
      },
      fieldName: 'propName',
      label: $t('system.permission.conditionPropName'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        options: OperatorOptions,
        placeholder: $t('system.permission.conditionOperatorPlaceholder'),
      },
      fieldName: 'operator',
      label: $t('system.permission.conditionOperator'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.permission.conditionValuePlaceholder'),
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
      field: 'propName',
      title: $t('system.permission.conditionPropName'),
      width: 120,
      formatter: ({ row }) =>
        (row as SystemPermissionApi.UserTablePermissionConditionDto).showName ||
        (row as SystemPermissionApi.UserTablePermissionConditionDto).propName,
    },
    {
      field: 'operator',
      title: $t('system.permission.conditionOperator'),
      width: 100,
      formatter: ({ cellValue }) => OperatorLabels[cellValue] || cellValue,
    },
    {
      field: 'value',
      title: $t('system.permission.conditionValue'),
      minWidth: 120,
      formatter: ({ row }) => {
        const condition =
          row as SystemPermissionApi.UserTablePermissionConditionDto;
        return condition.showValue || condition.value;
      },
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
      width: 120,
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
        style: { minWidth: '200px' },
      },
      fieldName: 'frightModule',
      label: $t('system.permission.module'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        options: FreightRateLabelOptions,
        placeholder: '请选择需要屏蔽的字段名称',
        style: { minWidth: '200px' },
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
