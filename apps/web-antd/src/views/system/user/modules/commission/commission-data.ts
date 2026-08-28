import dayjs from 'dayjs';

import { CommissionConfigAdminApi } from '#/api/commission/commission-config-admin';
import { $t } from '#/locales';

/**
 * 提成配置模块共享工具：
 * 枚举选项 / 文案映射 / 表格列 / 规则摘要格式化。
 */

type Option = { label: string; value: number };

export const getBizTypeOptions = (): Option[] => [
  {
    label: $t('commission.bizTypeSeaExport'),
    value: CommissionConfigAdminApi.BizType.SeaExport,
  },
  {
    label: $t('commission.bizTypeSeaImport'),
    value: CommissionConfigAdminApi.BizType.SeaImport,
  },
  {
    label: $t('commission.bizTypeAirExport'),
    value: CommissionConfigAdminApi.BizType.AirExport,
  },
];

export const getCargoTypeOptions = (): Option[] => [
  {
    label: $t('commission.cargoNormal'),
    value: CommissionConfigAdminApi.CargoType.Normal,
  },
  {
    label: $t('commission.cargoReefer'),
    value: CommissionConfigAdminApi.CargoType.Reefer,
  },
  {
    label: $t('commission.cargoHazardous'),
    value: CommissionConfigAdminApi.CargoType.Hazardous,
  },
  {
    label: $t('commission.cargoOverSize'),
    value: CommissionConfigAdminApi.CargoType.OverSize,
  },
];

export const getConditionFieldOptions = (): Option[] => [
  {
    label: $t('commission.conditionFieldSeaPol'),
    value: CommissionConfigAdminApi.CommissionConditionField.SeaDeparturePort,
  },
  {
    label: $t('commission.conditionFieldSeaPod'),
    value: CommissionConfigAdminApi.CommissionConditionField.SeaDestinationPort,
  },
  {
    label: $t('commission.conditionFieldAirPol'),
    value: CommissionConfigAdminApi.CommissionConditionField.AirDeparturePort,
  },
  {
    label: $t('commission.conditionFieldAirPod'),
    value: CommissionConfigAdminApi.CommissionConditionField.AirDestinationPort,
  },
  {
    label: $t('commission.conditionFieldCargoType'),
    value: CommissionConfigAdminApi.CommissionConditionField.CargoType,
  },
  {
    label: $t('commission.conditionFieldPerTicket'),
    value: CommissionConfigAdminApi.CommissionConditionField.PerTicket,
  },
];

export const getConditionOperatorOptions = (): Option[] => [
  {
    label: $t('commission.operatorEqual'),
    value: CommissionConfigAdminApi.CommissionConditionOperator.Equal,
  },
  {
    label: $t('commission.operatorNotEqual'),
    value: CommissionConfigAdminApi.CommissionConditionOperator.NotEqual,
  },
  {
    label: $t('commission.operatorIn'),
    value: CommissionConfigAdminApi.CommissionConditionOperator.In,
  },
  {
    label: $t('commission.operatorNotIn'),
    value: CommissionConfigAdminApi.CommissionConditionOperator.NotIn,
  },
];

export const getProfitThresholdOperatorOptions = (): Option[] => [
  {
    label: $t('commission.operatorGreaterThan'),
    value: CommissionConfigAdminApi.ProfitThresholdOperator.GreaterThan,
  },
  {
    label: $t('commission.operatorGreaterThanOrEqual'),
    value: CommissionConfigAdminApi.ProfitThresholdOperator.GreaterThanOrEqual,
  },
];

export const getSalesCommissionTypeOptions = (): Option[] => [
  {
    label: $t('commission.calcFixedRate'),
    value: CommissionConfigAdminApi.SalesCommissionType.FixedRate,
  },
  {
    label: $t('commission.calcLadderSegment'),
    value: CommissionConfigAdminApi.SalesCommissionType.LadderSegment,
  },
  {
    label: $t('commission.calcLadderWhole'),
    value: CommissionConfigAdminApi.SalesCommissionType.LadderWhole,
  },
];

export const getBaseSalaryModeOptions = (): Option[] => [
  {
    label: $t('commission.baseSalaryModeDirectAdd'),
    value: CommissionConfigAdminApi.BaseSalaryMode.DirectAdd,
  },
  {
    label: $t('commission.baseSalaryModeMax'),
    value: CommissionConfigAdminApi.BaseSalaryMode.MaxOfBoth,
  },
];

export const getBizTypeLabels = (
  bizTypes?: CommissionConfigAdminApi.BizType[] | null,
): string => {
  if (!bizTypes || bizTypes.length === 0) {
    return $t('commission.unlimited');
  }
  const map = new Map(getBizTypeOptions().map((o) => [o.value, o.label]));
  return bizTypes.map((t) => map.get(t) ?? String(t)).join('、');
};

export const getBaseSalaryModeLabel = (
  mode?: CommissionConfigAdminApi.BaseSalaryMode | null,
): string => {
  const map = new Map(
    getBaseSalaryModeOptions().map((o) => [o.value, o.label]),
  );
  return map.get(mode as number) ?? '';
};

export const getCargoTypeLabel = (
  cargoId?: CommissionConfigAdminApi.CargoType | null,
): string => {
  const map = new Map(getCargoTypeOptions().map((o) => [o.value, o.label]));
  return map.get(cargoId as number) ?? String(cargoId ?? '');
};

export const getConditionFieldLabel = (
  field: CommissionConfigAdminApi.CommissionConditionField,
): string => {
  const map = new Map(
    getConditionFieldOptions().map((o) => [o.value, o.label]),
  );
  return map.get(field as number) ?? String(field);
};

export const getConditionOperatorLabel = (
  operator: CommissionConfigAdminApi.CommissionConditionOperator,
): string => {
  const map = new Map(
    getConditionOperatorOptions().map((o) => [o.value, o.label]),
  );
  return map.get(operator as number) ?? String(operator);
};

/**
 * 日期时间文案：`2026-08-27 22:38:03`，空值显示 `-`
 */
export const formatDateTime = (value?: null | string): string => {
  if (!value) return '-';
  const date = dayjs(value);
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : value;
};

/**
 * 生效期间文案：`2026-07 ~ 不限`
 */
export const formatEffectivePeriod = (
  dto: CommissionConfigAdminApi.CommissionConfigDto,
): string => {
  const format = (v?: null | string) =>
    v ? v.slice(0, 7) : $t('commission.unlimited');
  return `${format(dto.effectiveStartDate)} ~ ${format(dto.effectiveEndDate)}`;
};

/**
 * 底薪文案：`5000 · 直接加`；未真正启用时显示 `-`
 */
export const formatBaseSalary = (
  dto: CommissionConfigAdminApi.CommissionConfigDto,
): string => {
  if (!dto.isBaseSalaryEnabled || dto.baseSalary == null) return '-';
  return `${dto.baseSalary} · ${getBaseSalaryModeLabel(dto.baseSalaryMode)}`;
};

/**
 * 销售规则摘要：short 用于单元格、full 用于 tooltip
 */
export const buildSalesRuleSummary = (
  sales: CommissionConfigAdminApi.CommissionSalesDto,
): { full: string; short: string } => {
  let calc: string;
  let short: string;
  if (sales.salesCommissionType === 0) {
    calc = $t('commission.calcFixedRate');
    short = $t('commission.fixedRateSummary', {
      rate: sales.fixedRate ?? 0,
    });
  } else {
    calc =
      sales.salesCommissionType === 1
        ? $t('commission.calcLadderSegment')
        : $t('commission.calcLadderWhole');
    short = $t('commission.tierSummary', { count: sales.tiers.length });
  }

  const op =
    sales.profitThresholdOperator === 0
      ? $t('commission.operatorGreaterThan')
      : $t('commission.operatorGreaterThanOrEqual');
  const full = $t('commission.salesConfigDetail', {
    calc,
    negative: sales.negativeProfitRate,
    op,
    threshold: sales.profitThreshold,
  });
  const tierTexts = sales.tiers.map((tier) =>
    tier.maxAmount == null
      ? $t('commission.tierDetailNoLimit', {
          min: tier.minAmount,
          rate: tier.rate,
        })
      : $t('commission.tierDetail', {
          max: tier.maxAmount,
          min: tier.minAmount,
          rate: tier.rate,
        }),
  );
  return {
    full: tierTexts.length > 0 ? `${full}；${tierTexts.join('，')}` : full,
    short,
  };
};

/**
 * 单个条件的自然语言描述
 */
export const buildConditionDescription = (
  cond: CommissionConfigAdminApi.CommissionConditionDto,
): string => {
  if (
    cond.conditionField ===
    CommissionConfigAdminApi.CommissionConditionField.PerTicket
  ) {
    return $t('commission.conditionFieldPerTicket');
  }
  const fieldLabel = getConditionFieldLabel(cond.conditionField);
  const operatorLabel = getConditionOperatorLabel(cond.operator);
  const valueLabels = cond.values.map((v) => {
    if (v.seaPort) {
      return v.seaPort.cnName || v.seaPort.portName || String(v.seaPort.id);
    }
    if (v.airPort) {
      return (
        v.airPort.cnName ||
        v.airPort.iataCode ||
        v.airPort.enName ||
        String(v.airPort.id)
      );
    }
    return getCargoTypeLabel(v.cargoId);
  });
  return `${fieldLabel}${operatorLabel}${valueLabels.join('、')}`;
};

/**
 * 操作规则摘要：short 为条件项数量、full 为逐条描述
 */
export const buildOperationRuleSummary = (
  operation: CommissionConfigAdminApi.CommissionOperationDto,
): { full: string; short: string } => {
  const short = $t('commission.operationRuleSummary', {
    count: operation.rules.length,
  });
  const andWord = $t('commission.andWord');
  const orWord = $t('commission.orWord');
  const full = operation.rules
    .map((rule) => {
      const groups = rule.conditionGroups
        .map((group) =>
          group.conditions.map(buildConditionDescription).join(andWord),
        )
        .join(orWord);
      return `${rule.name || $t('commission.ruleName')}: ${groups} → ${rule.amount}`;
    })
    .join('；');
  return { full, short };
};

export const buildRuleSummary = (
  dto: CommissionConfigAdminApi.CommissionConfigDto,
): { full: string; short: string } => {
  if (dto.commissionType === CommissionConfigAdminApi.CommissionType.Sales) {
    return dto.sales
      ? buildSalesRuleSummary(dto.sales)
      : { full: '-', short: '-' };
  }
  return dto.operation
    ? buildOperationRuleSummary(dto.operation)
    : { full: '-', short: '-' };
};

/**
 * 提成配置列表列定义（bodyCell 按 key 渲染）
 */
export const useCommissionConfigColumns = () => {
  return [
    {
      title: $t('commission.configName'),
      dataIndex: 'name',
      key: 'name',
      minWidth: 170,
      ellipsis: true,
    },
    {
      title: $t('commission.sortId'),
      dataIndex: 'sortId',
      key: 'sortId',
      width: 70,
      align: 'center' as const,
    },
    {
      title: $t('commission.isEnabled'),
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      width: 90,
      align: 'center' as const,
    },
    {
      title: $t('commission.effectivePeriod'),
      key: 'effectivePeriod',
      width: 170,
    },
    {
      title: $t('commission.bizTypes'),
      key: 'bizTypes',
      width: 170,
    },
    {
      title: $t('commission.baseSalary'),
      key: 'baseSalary',
      width: 140,
    },
    {
      title: $t('commission.rulesSummary'),
      key: 'ruleSummary',
      minWidth: 170,
      ellipsis: true,
    },
    {
      title: $t('commission.creator'),
      dataIndex: 'creatorUserName',
      key: 'creatorUserName',
      width: 110,
    },
    {
      title: $t('commission.creationTime'),
      dataIndex: 'creationTime',
      key: 'creationTime',
      width: 160,
    },
    {
      title: $t('system.user.operation'),
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      align: 'center' as const,
    },
  ];
};
