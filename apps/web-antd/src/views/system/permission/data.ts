import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemPermissionApi } from '#/api/system/permission';
import {
  DataPermissionType,
  FrightModule,
  FrightModuleOptions,
  ManageType,
  OperatorOptions,
  PropMaskConditionOperator,
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
      formatter: ({ cellValue }) =>
        FrightModuleLabels[cellValue as FrightModule] || cellValue,
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
      formatter: ({ cellValue }) =>
        OperatorLabels[cellValue as UserTablePermissionOperator] || cellValue,
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

/** 字段权限条件操作符标签（键为枚举名，后端读取时统一返回枚举名） */
export const PropMaskOperatorLabels: Record<string, string> = {
  Equals: '等于',
  NotEquals: '不等于',
  In: '属于',
  NotIn: '不属于',
  IsNull: '为空',
  IsNotNull: '不为空',
  GreaterThan: '大于',
  GreaterThanOrEqual: '大于等于',
  LessThan: '小于',
  LessThanOrEqual: '小于等于',
  Contains: '包含',
};

/** 将操作符（数字或枚举名）归一化为枚举数值 */
const propMaskOperatorNameMap: Record<string, PropMaskConditionOperator> = {
  Equals: PropMaskConditionOperator.Equals,
  NotEquals: PropMaskConditionOperator.NotEquals,
  In: PropMaskConditionOperator.In,
  NotIn: PropMaskConditionOperator.NotIn,
  IsNull: PropMaskConditionOperator.IsNull,
  IsNotNull: PropMaskConditionOperator.IsNotNull,
  GreaterThan: PropMaskConditionOperator.GreaterThan,
  GreaterThanOrEqual: PropMaskConditionOperator.GreaterThanOrEqual,
  LessThan: PropMaskConditionOperator.LessThan,
  LessThanOrEqual: PropMaskConditionOperator.LessThanOrEqual,
  Contains: PropMaskConditionOperator.Contains,
};

export function normalizePropMaskOperator(
  op: number | string | undefined | null,
): PropMaskConditionOperator | undefined {
  if (op === undefined || op === null) {
    return undefined;
  }
  if (typeof op === 'number') {
    return op as PropMaskConditionOperator;
  }
  return propMaskOperatorNameMap[op];
}

/** 字段权限条件编辑行（单层分组，与后端条件树叶子节点对应） */
export interface PropConditionRow {
  prop?: string;
  op?: PropMaskConditionOperator;
  value?: any;
  showName?: string;
  showValue?: string | string[];
}

/** 解析 conditionJson 为编辑态，不支持的结构置 unsupported */
export function parsePropConditionJson(conditionJson?: string | null): {
  logic: 'and' | 'or';
  rows: PropConditionRow[];
  unsupported: boolean;
} {
  const empty = { logic: 'and' as const, rows: [], unsupported: false };
  if (!conditionJson) {
    return empty;
  }
  try {
    const root = JSON.parse(conditionJson);
    // 分组节点：只支持一层（items 全为叶子）
    if (Array.isArray(root?.items)) {
      const hasNestedGroup = root.items.some((item: any) =>
        Array.isArray(item?.items),
      );
      if (hasNestedGroup) {
        return { ...empty, unsupported: true };
      }
      return {
        logic: root.logic === 'or' ? 'or' : 'and',
        rows: root.items.map((item: any) => ({
          prop: item.prop,
          op: normalizePropMaskOperator(item.op),
          value: item.value,
          showName: item.showName,
          showValue: item.showValue,
        })),
        unsupported: false,
      };
    }
    // 叶子节点：单条件
    if (root?.prop) {
      return {
        logic: 'and',
        rows: [
          {
            prop: root.prop,
            op: normalizePropMaskOperator(root.op),
            value: root.value,
            showName: root.showName,
            showValue: root.showValue,
          },
        ],
        unsupported: false,
      };
    }
    return { ...empty, unsupported: true };
  } catch {
    return { ...empty, unsupported: true };
  }
}

/** 将编辑态序列化为 conditionJson，无条件返回 undefined（不传） */
export function buildPropConditionJson(
  rows: PropConditionRow[],
  logic: 'and' | 'or',
): string | undefined {
  const leaves = rows
    .filter((row) => row.prop && row.op !== undefined)
    .map((row) => {
      const leaf: SystemPermissionApi.PropMaskConditionLeaf = {
        prop: row.prop!,
        op: row.op!,
      };
      if (
        row.op !== PropMaskConditionOperator.IsNull &&
        row.op !== PropMaskConditionOperator.IsNotNull &&
        row.value !== undefined &&
        row.value !== null
      ) {
        leaf.value = row.value;
      }
      if (row.showName) {
        leaf.showName = row.showName;
      }
      if (row.showValue !== undefined && row.showValue !== null) {
        leaf.showValue = row.showValue;
      }
      return leaf;
    });
  if (leaves.length === 0) {
    return undefined;
  }
  if (leaves.length === 1) {
    return JSON.stringify(leaves[0]);
  }
  return JSON.stringify({ logic, items: leaves });
}

function formatConditionLeafValue(leaf: any): string {
  if (leaf.showValue !== undefined && leaf.showValue !== null) {
    return Array.isArray(leaf.showValue)
      ? leaf.showValue.join('、')
      : String(leaf.showValue);
  }
  if (leaf.value === undefined || leaf.value === null) {
    return '';
  }
  return Array.isArray(leaf.value)
    ? leaf.value.map((item: any) => String(item)).join('、')
    : String(leaf.value);
}

/** 生成条件表达式摘要，解析失败时返回原文 */
export function formatPropConditionSummary(
  row: Pick<SystemPermissionApi.UserPropPermissionDto, 'conditionJson'>,
): string {
  if (!row.conditionJson) {
    return '-';
  }
  const parsed = parsePropConditionJson(row.conditionJson);
  if (parsed.unsupported || parsed.rows.length === 0) {
    return row.conditionJson;
  }
  const segments = parsed.rows.map((leaf) => {
    const opName =
      leaf.op === undefined ? undefined : PropMaskConditionOperator[leaf.op];
    const opLabel = (opName && PropMaskOperatorLabels[opName]) ?? leaf.op;
    const valueLabel = formatConditionLeafValue(leaf);
    const fieldLabel = leaf.showName || leaf.prop;
    return valueLabel
      ? `${fieldLabel} ${opLabel} ${valueLabel}`
      : `${fieldLabel} ${opLabel}`;
  });
  return segments.join(parsed.logic === 'or' ? ' 或 ' : ' 且 ');
}

export function usePropPermissionFormSchema(options?: {
  fieldOptions?: Array<{ label: string; value: string }>;
}): VbenFormSchema[] {
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
        options: options?.fieldOptions ?? [],
        placeholder: '请选择需要屏蔽的字段名称',
        style: { minWidth: '200px' },
        showSearch: true,
        optionFilterProp: 'label',
      },
      fieldName: 'propName',
      label: $t('system.permission.propName'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.permission.propDescriptionPlaceholder'),
        maxlength: 200,
      },
      fieldName: 'description',
      label: $t('system.permission.propDescription'),
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
      formatter: ({ cellValue }) =>
        FrightModuleLabels[cellValue as FrightModule] || cellValue,
    },
    {
      field: 'propName',
      title: $t('system.permission.propName'),
      minWidth: 160,
    },
    {
      field: 'isConditional',
      title: $t('system.permission.propConditional'),
      width: 100,
      formatter: ({ cellValue }) => (cellValue ? '是' : '否'),
    },
    {
      field: 'conditionJson',
      title: $t('system.permission.propConditionSummary'),
      minWidth: 240,
      formatter: ({ row }) =>
        formatPropConditionSummary(
          row as SystemPermissionApi.UserPropPermissionDto,
        ),
    },
    {
      field: 'description',
      title: $t('system.permission.propDescription'),
      minWidth: 150,
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
