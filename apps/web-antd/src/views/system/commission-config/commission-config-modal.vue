<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import {
  FileText,
  Info,
  InspectionPanel,
  Plus,
  Settings,
  Users,
} from '@vben/icons';

import {
  Button,
  Checkbox,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Radio,
  Select,
  Switch,
  Typography,
} from 'ant-design-vue';

import {
  AirPortSelect,
  OrganizationSelect,
  PortSelect,
  UserSelect,
} from '#/adapter/component/biz-select';
import {
  addCommissionConfig,
  CommissionConfigAdminApi,
  editCommissionConfig,
  getCommissionConfigDetail,
} from '#/api/commission/commission-config-admin';
import { $t } from '#/locales';

import {
  getBaseSalaryModeOptions,
  getBizTypeOptions,
  getCargoTypeOptions,
  getClientTypeOptions,
  getConditionFieldOptions,
  getConditionOperatorOptions,
  getPeriodTypeOptions,
  getProfitThresholdOperatorOptions,
  getSalesCommissionTypeOptions,
  getTradeTermsTypeOptions,
} from './data';

defineOptions({ name: 'SystemCommissionConfigModal' });

const emit = defineEmits(['success']);

const {
  CommissionConditionField,
  CommissionConditionOperator,
  CommissionPeriodType,
  CommissionType,
  SalesCommissionType,
} = CommissionConfigAdminApi;

// ==================== 草稿数据结构 ====================

interface TierDraft {
  _key: string;
  minAmount?: number;
  /** undefined = 无上限（仅最后一档） */
  maxAmount?: number;
  rate?: number;
}

interface ConditionDraft {
  _key: string;
  conditionField?: CommissionConfigAdminApi.CommissionConditionField;
  operator?: CommissionConfigAdminApi.CommissionConditionOperator;
  /** 港口/机场 id 或货物类型，单值比较时最多一个 */
  values: Array<number | string>;
}

interface ConditionGroupDraft {
  _key: string;
  conditions: ConditionDraft[];
}

interface RuleDraft {
  _key: string;
  name: string;
  amount?: number;
  conditionGroups: ConditionGroupDraft[];
}

// ==================== 表单状态 ====================

const editId = ref<string | null>(null);
const contextUserId = ref<number | undefined>(undefined);
const commissionType = ref<CommissionConfigAdminApi.CommissionType>(
  CommissionType.Sales,
);
const isSales = computed(() => commissionType.value === CommissionType.Sales);

const typeLabel = computed(() =>
  $t(isSales.value ? 'commission.salesTab' : 'commission.operationTab'),
);

const getTitle = computed(() =>
  editId.value
    ? $t('ui.actionTitle.edit', [typeLabel.value])
    : $t('ui.actionTitle.create', [typeLabel.value]),
);

const baseForm = reactive({
  name: '',
  sortId: 0,
  isEnabled: true,
  effectiveStartDate: undefined as string | undefined,
  effectiveEndDate: undefined as string | undefined,
  periodType: CommissionPeriodType.Month,
  userIds: [] as number[],
  orgIds: [] as number[],
  bizTypes: [] as CommissionConfigAdminApi.BizType[],
  baseSalary: undefined as number | undefined,
  baseSalaryMode: undefined as
    | CommissionConfigAdminApi.BaseSalaryMode
    | undefined,
  remark: '',
});

const salesForm = reactive({
  profitThreshold: 0,
  profitThresholdOperator: undefined as
    | CommissionConfigAdminApi.ProfitThresholdOperator
    | undefined,
  negativeProfitRate: 0,
  salesCommissionType: SalesCommissionType.FixedRate,
  fixedRate: undefined as number | undefined,
  tiers: [] as TierDraft[],
});

const operationForm = reactive({ rules: [] as RuleDraft[] });

// ==================== 草稿工厂 ====================

let keySeq = 0;
const nextKey = () => `draft-${keySeq++}`;

function createCondition(): ConditionDraft {
  return {
    _key: nextKey(),
    conditionField: undefined,
    operator: undefined,
    values: [],
  };
}

function createConditionGroup(): ConditionGroupDraft {
  return { _key: nextKey(), conditions: [createCondition()] };
}

function createRule(): RuleDraft {
  return {
    _key: nextKey(),
    name: '',
    amount: undefined,
    conditionGroups: [createConditionGroup()],
  };
}

function resetDrafts() {
  keySeq = 0;
  Object.assign(baseForm, {
    name: '',
    sortId: 0,
    isEnabled: true,
    effectiveStartDate: undefined,
    effectiveEndDate: undefined,
    periodType: CommissionPeriodType.Month,
    userIds: [],
    orgIds: [],
    bizTypes: [],
    baseSalary: undefined,
    baseSalaryMode: undefined,
    remark: '',
  });
  Object.assign(salesForm, {
    profitThreshold: 0,
    profitThresholdOperator: undefined,
    negativeProfitRate: 0,
    salesCommissionType: SalesCommissionType.FixedRate,
    fixedRate: undefined,
    tiers: [],
  });
  operationForm.rules = [createRule()];
}

// ==================== 选项数据 ====================

const bizTypeOptions = getBizTypeOptions();
const baseSalaryModeOptions = getBaseSalaryModeOptions();
const periodTypeOptions = getPeriodTypeOptions();
const cargoTypeOptions = getCargoTypeOptions();
const tradeTermsTypeOptions = getTradeTermsTypeOptions();
const clientTypeOptions = getClientTypeOptions();
const conditionFieldOptions = getConditionFieldOptions();
const conditionOperatorOptions = getConditionOperatorOptions();
const profitThresholdOperatorOptions = getProfitThresholdOperatorOptions();
const salesCommissionTypeOptions = getSalesCommissionTypeOptions();

// ==================== 销售阶梯 ====================

function addTier() {
  const last = salesForm.tiers[salesForm.tiers.length - 1];
  salesForm.tiers.push({
    _key: nextKey(),
    // 新档起始金额自动衔接上一档结束金额
    minAmount: last?.maxAmount ?? undefined,
    maxAmount: undefined,
    rate: undefined,
  });
}

function removeTier(tierIndex: number) {
  salesForm.tiers.splice(tierIndex, 1);
  if (salesForm.tiers.length === 0) return;
  // 最后一档恒为无上限，其余档重新串联
  const last = salesForm.tiers[salesForm.tiers.length - 1];
  if (last) last.maxAmount = undefined;
  for (let i = 1; i < salesForm.tiers.length; i++) {
    const tier = salesForm.tiers[i];
    if (tier) tier.minAmount = salesForm.tiers[i - 1]?.maxAmount ?? undefined;
  }
}

function onTierMaxChange(
  tierIndex: number,
  value: string | number | null | undefined,
) {
  const next = salesForm.tiers[tierIndex + 1];
  if (next) {
    next.minAmount = value == null || value === '' ? undefined : Number(value);
  }
}

// 切换到阶梯计算方式时自动补一档
watch(
  () => salesForm.salesCommissionType,
  (type) => {
    if (
      type !== SalesCommissionType.FixedRate &&
      salesForm.tiers.length === 0
    ) {
      addTier();
    }
  },
);

// ==================== 操作条件项 ====================

const isMultipleOperator = (
  operator?: CommissionConfigAdminApi.CommissionConditionOperator,
) =>
  operator === CommissionConditionOperator.In ||
  operator === CommissionConditionOperator.NotIn;

const isSeaPortField = (
  field?: CommissionConfigAdminApi.CommissionConditionField,
) =>
  field === CommissionConditionField.SeaDeparturePort ||
  field === CommissionConditionField.SeaDestinationPort;

const isAirPortField = (
  field?: CommissionConfigAdminApi.CommissionConditionField,
) =>
  field === CommissionConditionField.AirDeparturePort ||
  field === CommissionConditionField.AirDestinationPort;

const isTradeTermsField = (
  field?: CommissionConfigAdminApi.CommissionConditionField,
) => field === CommissionConditionField.TradeTerms;

const isClientClientTypeField = (
  field?: CommissionConfigAdminApi.CommissionConditionField,
) => field === CommissionConditionField.ClientClientType;

const isPerTicket = (
  field?: CommissionConfigAdminApi.CommissionConditionField,
) => field === CommissionConditionField.PerTicket;

/** 单选比较符绑定单值，多选比较符绑定数组 */
const getConditionValueBinding = (cond: ConditionDraft): any =>
  isMultipleOperator(cond.operator) ? cond.values : cond.values[0];

function onConditionValuesChange(cond: ConditionDraft, value: any) {
  cond.values = value == null ? [] : Array.isArray(value) ? value : [value];
}

function onConditionFieldChange(
  cond: ConditionDraft,
  field: CommissionConfigAdminApi.CommissionConditionField,
) {
  cond.conditionField = field;
  cond.values = [];
  if (isPerTicket(field)) {
    cond.operator = undefined;
  }
}

function onConditionOperatorChange(
  cond: ConditionDraft,
  operator: CommissionConfigAdminApi.CommissionConditionOperator,
) {
  cond.operator = operator;
  // 等于/不等于只允许一个比较值
  if (!isMultipleOperator(operator)) {
    cond.values = cond.values.slice(0, 1);
  }
}

const ruleHasPerTicket = (rule: RuleDraft) =>
  rule.conditionGroups.some((group) =>
    group.conditions.some((cond) => isPerTicket(cond.conditionField)),
  );

const countRuleConditions = (rule: RuleDraft) =>
  rule.conditionGroups.reduce(
    (count, group) => count + group.conditions.length,
    0,
  );

function addRule() {
  operationForm.rules.push(createRule());
}

function removeRule(ruleIndex: number) {
  operationForm.rules.splice(ruleIndex, 1);
}

function addGroup(rule: RuleDraft) {
  rule.conditionGroups.push(createConditionGroup());
}

function removeGroup(rule: RuleDraft, groupIndex: number) {
  rule.conditionGroups.splice(groupIndex, 1);
}

function addCondition(group: ConditionGroupDraft) {
  group.conditions.push(createCondition());
}

function removeCondition(
  rule: RuleDraft,
  group: ConditionGroupDraft,
  conditionIndex: number,
) {
  group.conditions.splice(conditionIndex, 1);
  // 组内条件删空后自动移除该组（保留至少一组）
  if (group.conditions.length === 0 && rule.conditionGroups.length > 1) {
    const groupIndex = rule.conditionGroups.indexOf(group);
    if (groupIndex >= 0) rule.conditionGroups.splice(groupIndex, 1);
  }
}

// ==================== 校验 ====================

function validateCommon(): string | null {
  if (!baseForm.name.trim()) return $t('commission.nameRequired');
  if (
    baseForm.effectiveStartDate &&
    baseForm.effectiveEndDate &&
    baseForm.effectiveStartDate > baseForm.effectiveEndDate
  ) {
    return $t('commission.effectiveRangeInvalid');
  }
  if (baseForm.userIds.length === 0 && baseForm.orgIds.length === 0) {
    return $t('commission.applyTargetRequired');
  }
  return null;
}

function validateSales(): string | null {
  if (salesForm.profitThreshold == null) {
    return $t('commission.profitThresholdRequired');
  }
  if (salesForm.profitThreshold < 0) {
    return $t('commission.profitThresholdInvalid');
  }
  if (salesForm.profitThresholdOperator == null) {
    return $t('commission.profitThresholdOperatorRequired');
  }
  if (salesForm.negativeProfitRate == null) {
    return $t('commission.negativeProfitRateRequired');
  }
  if (salesForm.negativeProfitRate < 0 || salesForm.negativeProfitRate > 1000) {
    return $t('commission.rateRangeInvalid');
  }
  if (salesForm.salesCommissionType === SalesCommissionType.FixedRate) {
    if (salesForm.fixedRate == null) return $t('commission.fixedRateRequired');
    if (salesForm.fixedRate < 0 || salesForm.fixedRate > 1000) {
      return $t('commission.rateRangeInvalid');
    }
  } else {
    if (salesForm.tiers.length === 0) return $t('commission.tiersRequired');
    for (let i = 0; i < salesForm.tiers.length; i++) {
      const tier = salesForm.tiers[i];
      if (!tier) continue;
      if (tier.minAmount == null) return $t('commission.tierMinAmountRequired');
      const isLast = i === salesForm.tiers.length - 1;
      if (!isLast) {
        if (tier.maxAmount == null)
          return $t('commission.tierOnlyLastUnlimited');
        if (tier.maxAmount <= tier.minAmount) {
          return $t('commission.tierMaxAmountInvalid');
        }
      }
      if (tier.rate == null || tier.rate < 0 || tier.rate > 1000) {
        return $t('commission.tierRateInvalid');
      }
    }
  }
  return null;
}

function validateOperation(): string | null {
  if (operationForm.rules.length === 0) return $t('commission.rulesRequired');
  for (const rule of operationForm.rules) {
    if (rule.name.length > 128) return $t('commission.ruleNameTooLong');
    if (rule.amount == null) return $t('commission.ruleAmountRequired');
    if (rule.amount <= 0) return $t('commission.ruleAmountInvalid');
    if (rule.conditionGroups.length === 0) {
      return $t('commission.groupConditionsRequired');
    }
    // 「按票」独占整个条件项：此时跳过组内其他校验
    if (ruleHasPerTicket(rule)) {
      if (
        rule.conditionGroups.length !== 1 ||
        countRuleConditions(rule) !== 1
      ) {
        return $t('commission.perTicketExclusive');
      }
      continue;
    }
    for (const group of rule.conditionGroups) {
      if (group.conditions.length === 0) {
        return $t('commission.groupConditionsRequired');
      }
      for (const cond of group.conditions) {
        if (cond.conditionField == null) {
          return $t('commission.conditionFieldRequired');
        }
        if (cond.operator == null) {
          return $t('commission.conditionOperatorRequired');
        }
        if (isMultipleOperator(cond.operator)) {
          if (cond.values.length === 0) {
            return $t('commission.conditionValuesRequired');
          }
        } else if (cond.values.length !== 1) {
          return $t('commission.conditionValuesRequired');
        }
      }
    }
  }
  return null;
}

function validateAll(): string | null {
  return (
    validateCommon() || (isSales.value ? validateSales() : validateOperation())
  );
}

// ==================== 构建提交数据 ====================

function buildConditionValues(
  cond: ConditionDraft,
): CommissionConfigAdminApi.CommissionConditionValueInputDto[] | null {
  if (isPerTicket(cond.conditionField)) return null;
  return cond.values.map((value) => {
    if (cond.conditionField === CommissionConditionField.CargoType) {
      return { cargoId: value as CommissionConfigAdminApi.CargoType };
    }
    if (cond.conditionField === CommissionConditionField.TradeTerms) {
      return {
        tradeTermsType: value as CommissionConfigAdminApi.TradeTermsType,
      };
    }
    if (cond.conditionField === CommissionConditionField.ClientClientType) {
      return {
        clientClientType: value as CommissionConfigAdminApi.ClientType,
      };
    }
    return { portId: value as number };
  });
}

function buildSalesPayload(): CommissionConfigAdminApi.CommissionSalesInputDto | null {
  if (!isSales.value) return null;
  const isFixed =
    salesForm.salesCommissionType === SalesCommissionType.FixedRate;
  return {
    profitThreshold: salesForm.profitThreshold,
    profitThresholdOperator: salesForm.profitThresholdOperator,
    negativeProfitRate: salesForm.negativeProfitRate,
    salesCommissionType: salesForm.salesCommissionType,
    fixedRate: isFixed ? (salesForm.fixedRate ?? null) : null,
    tiers: isFixed
      ? null
      : salesForm.tiers.map((tier) => ({
          minAmount: tier.minAmount ?? 0,
          maxAmount: tier.maxAmount ?? null,
          rate: tier.rate ?? 0,
        })),
  };
}

function buildOperationPayload(): CommissionConfigAdminApi.CommissionOperationInputDto | null {
  if (isSales.value) return null;
  return {
    rules: operationForm.rules.map((rule) => ({
      name: rule.name.trim() || null,
      amount: rule.amount ?? 0,
      conditionGroups: rule.conditionGroups.map((group) => ({
        conditions: group.conditions.map((cond) => ({
          conditionField:
            cond.conditionField ?? CommissionConditionField.PerTicket,
          operator: isPerTicket(cond.conditionField)
            ? CommissionConditionOperator.Equal
            : (cond.operator ?? CommissionConditionOperator.Equal),
          values: buildConditionValues(cond),
        })),
      })),
    })),
  };
}

function buildSubmitData(): CommissionConfigAdminApi.CommissionConfigAddDto {
  return {
    name: baseForm.name.trim(),
    sortId: baseForm.sortId,
    remark: baseForm.remark.trim() || null,
    isEnabled: baseForm.isEnabled,
    commissionType: commissionType.value,
    effectiveStartDate: baseForm.effectiveStartDate
      ? `${baseForm.effectiveStartDate}-01`
      : null,
    effectiveEndDate: baseForm.effectiveEndDate
      ? `${baseForm.effectiveEndDate}-01`
      : null,
    periodType: baseForm.periodType,
    userIds: baseForm.userIds.length > 0 ? baseForm.userIds : null,
    orgIds: baseForm.orgIds.length > 0 ? baseForm.orgIds : null,
    bizTypes: baseForm.bizTypes.length > 0 ? baseForm.bizTypes : null,
    baseSalary: baseForm.baseSalary ?? null,
    baseSalaryMode: baseForm.baseSalaryMode ?? null,
    sales: buildSalesPayload(),
    operation: buildOperationPayload(),
  };
}

// ==================== 编辑回填 ====================

async function fillFromDetail(id: string) {
  const detail = await getCommissionConfigDetail(id);
  baseForm.name = detail.name;
  baseForm.sortId = detail.sortId;
  baseForm.isEnabled = detail.isEnabled;
  baseForm.effectiveStartDate = detail.effectiveStartDate?.slice(0, 7);
  baseForm.effectiveEndDate = detail.effectiveEndDate?.slice(0, 7);
  baseForm.periodType = detail.periodType ?? CommissionPeriodType.Month;
  baseForm.userIds = detail.applyUsers.map((user) => user.id);
  baseForm.orgIds = detail.applyOrgs.map((org) => org.id);
  baseForm.bizTypes = [...detail.bizTypes];
  baseForm.baseSalary = detail.baseSalary ?? undefined;
  baseForm.baseSalaryMode = detail.baseSalaryMode ?? undefined;
  baseForm.remark = detail.remark ?? '';

  if (detail.sales) {
    salesForm.profitThreshold = detail.sales.profitThreshold;
    salesForm.profitThresholdOperator = detail.sales.profitThresholdOperator;
    salesForm.negativeProfitRate = detail.sales.negativeProfitRate;
    salesForm.salesCommissionType = detail.sales.salesCommissionType;
    salesForm.fixedRate = detail.sales.fixedRate ?? undefined;
    salesForm.tiers = detail.sales.tiers.map((tier) => ({
      _key: nextKey(),
      minAmount: tier.minAmount,
      maxAmount: tier.maxAmount ?? undefined,
      rate: tier.rate,
    }));
  }

  if (detail.operation) {
    operationForm.rules = detail.operation.rules.map((rule) => ({
      _key: nextKey(),
      name: rule.name ?? '',
      amount: rule.amount,
      conditionGroups: rule.conditionGroups.map((group) => ({
        _key: nextKey(),
        conditions: group.conditions.map((cond) => ({
          _key: nextKey(),
          conditionField: cond.conditionField,
          operator: isPerTicket(cond.conditionField)
            ? undefined
            : cond.operator,
          values: cond.values
            .map(
              (value) =>
                value.seaPort?.id ??
                value.airPort?.id ??
                value.cargoId ??
                value.tradeTermsType ??
                value.clientClientType,
            )
            .filter((value): value is number => value != null),
        })),
      })),
    }));
  }
}

// ==================== 弹窗 ====================

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const error = validateAll();
    if (error) {
      message.error(error);
      return;
    }
    modalApi.lock();
    try {
      const payload = buildSubmitData();
      if (editId.value) {
        await editCommissionConfig({ ...payload, id: editId.value });
      } else {
        await addCommissionConfig(payload);
      }
      message.success($t('ui.actionMessage.operationSuccess'));
      modalApi.close();
      emit('success');
    } finally {
      modalApi.lock(false);
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    const data = modalApi.getData<{
      userId?: number;
      commissionType: CommissionConfigAdminApi.CommissionType;
      id?: string;
    }>();
    commissionType.value = data?.commissionType ?? CommissionType.Sales;
    contextUserId.value = data?.userId;
    resetDrafts();
    if (data?.id) {
      editId.value = data.id;
      modalApi.lock();
      try {
        await fillFromDetail(data.id);
      } finally {
        modalApi.lock(false);
      }
    } else {
      editId.value = null;
      // 携带上下文用户时（如从用户相关入口进入）预选该用户为适用人
      if (
        contextUserId.value != null &&
        !baseForm.userIds.includes(contextUserId.value)
      ) {
        baseForm.userIds = [contextUserId.value];
      }
    }
  },
});
</script>

<template>
  <Modal :title="getTitle" class="commission-config-modal w-[1000px]">
    <div class="cc-form mx-2">
      <Form layout="vertical" class="cc-form-body">
        <!-- 基本信息 -->
        <section class="cc-section">
          <div class="cc-section__title">
            <span class="cc-section__icon">
              <FileText class="cc-icon" />
            </span>
            <span class="cc-section__text">
              {{ $t('commission.basicInfoSection') }}
            </span>
          </div>
          <div class="cc-basic">
            <div class="cc-basic__row cc-basic__row--name">
              <FormItem
                :label="$t('commission.configName')"
                required
                class="cc-basic__name"
              >
                <Input
                  v-model:value="baseForm.name"
                  :maxlength="128"
                  :placeholder="$t('commission.nameRequired')"
                  allow-clear
                />
              </FormItem>
              <FormItem :label="$t('commission.sortId')" class="cc-basic__sort">
                <InputNumber
                  v-model:value="baseForm.sortId"
                  :min="0"
                  class="w-full"
                />
              </FormItem>
              <FormItem
                :label="$t('commission.isEnabled')"
                class="cc-basic__enabled"
              >
                <div class="cc-switch-row">
                  <Switch v-model:checked="baseForm.isEnabled" />
                  <span class="cc-switch-hint">
                    {{
                      baseForm.isEnabled
                        ? $t('commission.enabled')
                        : $t('commission.disabled')
                    }}
                  </span>
                </div>
              </FormItem>
            </div>

            <div class="cc-basic__row cc-basic__row--2">
              <FormItem :label="$t('commission.effectivePeriod')">
                <div class="cc-inline-fields">
                  <DatePicker
                    v-model:value="baseForm.effectiveStartDate"
                    picker="month"
                    format="YYYY-MM"
                    value-format="YYYY-MM"
                    :placeholder="$t('commission.effectiveStartMonth')"
                    allow-clear
                    class="cc-inline-fields__grow"
                  />
                  <span class="cc-range-sep">~</span>
                  <DatePicker
                    v-model:value="baseForm.effectiveEndDate"
                    picker="month"
                    format="YYYY-MM"
                    value-format="YYYY-MM"
                    :placeholder="$t('commission.effectiveEndMonth')"
                    allow-clear
                    class="cc-inline-fields__grow"
                  />
                </div>
              </FormItem>
              <FormItem :label="$t('commission.periodType')">
                <Select
                  v-model:value="baseForm.periodType"
                  :options="periodTypeOptions"
                  class="w-full"
                />
              </FormItem>
            </div>
            <p class="cc-field-hint">
              {{ $t('commission.periodTypeHint') }}
            </p>

            <FormItem :label="$t('commission.bizTypes')">
              <Checkbox.Group
                v-model:value="baseForm.bizTypes"
                :options="bizTypeOptions"
                class="cc-biz-types"
              />
            </FormItem>
            <p class="cc-field-hint">{{ $t('commission.bizTypesHint') }}</p>

            <div class="cc-basic__row cc-basic__row--2">
              <FormItem :label="$t('commission.baseSalary')">
                <InputNumber
                  v-model:value="baseForm.baseSalary"
                  :min="0"
                  class="w-full"
                  :placeholder="$t('commission.baseSalary')"
                />
              </FormItem>
              <FormItem :label="$t('commission.baseSalaryMode')">
                <Select
                  v-model:value="baseForm.baseSalaryMode"
                  :options="baseSalaryModeOptions"
                  :placeholder="$t('commission.baseSalaryMode')"
                  allow-clear
                  class="w-full"
                />
              </FormItem>
            </div>
            <p class="cc-field-hint">{{ $t('commission.baseSalaryHint') }}</p>

            <FormItem :label="$t('commission.remark')">
              <Input.TextArea
                v-model:value="baseForm.remark"
                :maxlength="1024"
                :rows="2"
                allow-clear
                show-count
              />
            </FormItem>
          </div>
        </section>

        <!-- 适用对象 -->
        <section class="cc-section">
          <div class="cc-section__title">
            <span class="cc-section__icon">
              <Users class="cc-icon" />
            </span>
            <span class="cc-section__text">
              {{ $t('commission.applyTargetSection') }}
            </span>
          </div>
          <div class="cc-basic__row cc-basic__row--2">
            <FormItem :label="$t('commission.applyUsers')" required>
              <UserSelect v-model="baseForm.userIds" mode="multiple" />
            </FormItem>
            <FormItem :label="$t('commission.applyOrgs')">
              <OrganizationSelect v-model="baseForm.orgIds" mode="multiple" />
            </FormItem>
          </div>
        </section>

        <!-- 销售提成规则 -->
        <section v-if="isSales" class="cc-section cc-section--accent">
          <div class="cc-section__title">
            <span class="cc-section__icon">
              <InspectionPanel class="cc-icon" />
            </span>
            <span class="cc-section__text">
              {{ $t('commission.salesRuleSection') }}
            </span>
          </div>
          <div class="cc-grid">
            <FormItem :label="$t('commission.profitThreshold')" required>
              <div class="cc-inline-fields">
                <Select
                  v-model:value="salesForm.profitThresholdOperator"
                  :options="profitThresholdOperatorOptions"
                  :placeholder="$t('commission.profitThresholdOperator')"
                  class="cc-inline-fields__grow"
                />
                <InputNumber
                  v-model:value="salesForm.profitThreshold"
                  :min="0"
                  class="cc-inline-fields__grow"
                />
              </div>
            </FormItem>
            <FormItem :label="$t('commission.negativeProfitRate')" required>
              <InputNumber
                v-model:value="salesForm.negativeProfitRate"
                :min="0"
                :max="1000"
                class="w-full"
              />
            </FormItem>
            <FormItem
              :label="$t('commission.salesCommissionType')"
              required
              class="cc-grid-span-2"
            >
              <Radio.Group
                v-model:value="salesForm.salesCommissionType"
                :options="salesCommissionTypeOptions"
                option-type="button"
                button-style="solid"
                class="cc-calc-type"
              />
            </FormItem>
            <FormItem
              v-if="
                salesForm.salesCommissionType === SalesCommissionType.FixedRate
              "
              :label="$t('commission.fixedRate')"
              required
              class="cc-grid-span-2"
            >
              <InputNumber
                v-model:value="salesForm.fixedRate"
                :min="0"
                :max="1000"
                class="w-56"
              />
            </FormItem>
          </div>

          <div
            v-if="
              salesForm.salesCommissionType !== SalesCommissionType.FixedRate
            "
            class="cc-tier-panel"
          >
            <div class="cc-tier-panel__head">
              <div class="cc-tier-panel__title">
                <InspectionPanel class="cc-icon cc-tier-panel__icon" />
                <span>{{ $t('commission.tiers') }}</span>
              </div>
              <Button
                type="primary"
                ghost
                size="small"
                class="cc-action-btn"
                @click="addTier"
              >
                <span class="cc-btn-content">
                  <Plus class="cc-icon" />
                  {{ $t('commission.addTier') }}
                </span>
              </Button>
            </div>
            <template v-if="salesForm.tiers.length > 0">
              <div class="cc-tier-header">
                <span>{{ $t('commission.tierMinAmount') }}</span>
                <span>{{ $t('commission.tierMaxAmount') }}</span>
                <span>{{ $t('commission.tierRate') }}</span>
                <span></span>
              </div>
              <div
                v-for="(tier, tierIndex) in salesForm.tiers"
                :key="tier._key"
                class="cc-tier-row"
              >
                <InputNumber
                  v-model:value="tier.minAmount"
                  :disabled="tierIndex > 0"
                  :min="0"
                  class="w-full"
                  :placeholder="$t('commission.tierMinAmount')"
                />
                <InputNumber
                  v-if="tierIndex < salesForm.tiers.length - 1"
                  v-model:value="tier.maxAmount"
                  :min="0"
                  class="w-full"
                  :placeholder="$t('commission.tierMaxAmount')"
                  @update:value="(value) => onTierMaxChange(tierIndex, value)"
                />
                <span v-else class="cc-chip">
                  {{ $t('commission.tierNoLimit') }}
                </span>
                <InputNumber
                  v-model:value="tier.rate"
                  :min="0"
                  :max="1000"
                  class="w-full"
                  :placeholder="$t('commission.tierRate')"
                />
                <Button
                  type="text"
                  danger
                  size="small"
                  class="cc-row-delete"
                  @click="removeTier(tierIndex)"
                >
                  {{ $t('common.delete') }}
                </Button>
              </div>
            </template>
            <div v-else class="cc-empty-hint">
              {{ $t('commission.tiersRequired') }}
            </div>
          </div>
        </section>

        <!-- 操作提成规则 -->
        <section v-else class="cc-section cc-section--accent">
          <div class="cc-section__title">
            <span class="cc-section__icon">
              <Settings class="cc-icon" />
            </span>
            <span class="cc-section__text">
              {{ $t('commission.operationRuleSection') }}
            </span>
            <span class="cc-section__meta">
              {{
                $t('commission.operationRuleSummary', {
                  count: operationForm.rules.length,
                })
              }}
            </span>
          </div>

          <div class="cc-rules">
            <div
              v-for="(rule, ruleIndex) in operationForm.rules"
              :key="rule._key"
              class="cc-rule-card"
            >
              <div class="cc-rule-card__head">
                <span class="cc-rule-badge">
                  {{ $t('commission.ruleIndex', { index: ruleIndex + 1 }) }}
                </span>
                <div class="cc-rule-fields">
                  <div class="cc-rule-field">
                    <span class="cc-rule-field__label">
                      {{ $t('commission.ruleName') }}
                    </span>
                    <Input
                      v-model:value="rule.name"
                      :maxlength="128"
                      class="w-48"
                      :placeholder="$t('commission.ruleName')"
                      allow-clear
                    />
                  </div>
                  <div class="cc-rule-field">
                    <span class="cc-rule-field__label">
                      {{ $t('commission.ruleAmount') }}
                    </span>
                    <InputNumber
                      v-model:value="rule.amount"
                      :min="0.01"
                      :precision="2"
                      class="w-32"
                    />
                    <span class="cc-rule-field__unit">
                      {{ $t('commission.ruleAmountUnit') }}
                    </span>
                  </div>
                </div>
                <Button
                  v-if="operationForm.rules.length > 1"
                  type="text"
                  danger
                  size="small"
                  class="cc-row-delete"
                  @click="removeRule(ruleIndex)"
                >
                  {{ $t('common.delete') }}
                </Button>
              </div>

              <div class="cc-logic-hint">
                <Info class="cc-icon cc-logic-hint__icon" />
                {{ $t('commission.conditionGroupLogicHint') }}
              </div>

              <div class="cc-groups">
                <div
                  v-for="(group, groupIndex) in rule.conditionGroups"
                  :key="group._key"
                  class="cc-group-card"
                >
                  <div class="cc-group-card__head">
                    <span class="cc-group-card__title">
                      {{
                        $t('commission.conditionGroupTitle', {
                          index: groupIndex + 1,
                        })
                      }}
                    </span>
                    <Button
                      v-if="rule.conditionGroups.length > 1"
                      type="text"
                      danger
                      size="small"
                      class="cc-row-delete"
                      @click="removeGroup(rule, groupIndex)"
                    >
                      {{ $t('common.delete') }}
                    </Button>
                  </div>

                  <div
                    v-for="(cond, condIndex) in group.conditions"
                    :key="cond._key"
                    class="cc-cond-row"
                  >
                    <Select
                      :model-value="cond.conditionField"
                      :options="conditionFieldOptions"
                      :placeholder="$t('commission.conditionField')"
                      class="cc-cond-row__field"
                      @update:value="
                        (value) =>
                          onConditionFieldChange(
                            cond,
                            value as CommissionConfigAdminApi.CommissionConditionField,
                          )
                      "
                    />
                    <Select
                      v-if="!isPerTicket(cond.conditionField)"
                      :model-value="cond.operator"
                      :options="conditionOperatorOptions"
                      :placeholder="$t('commission.conditionOperator')"
                      class="cc-cond-row__op"
                      @update:value="
                        (value) =>
                          onConditionOperatorChange(
                            cond,
                            value as CommissionConfigAdminApi.CommissionConditionOperator,
                          )
                      "
                    />
                    <div class="cc-cond-row__value">
                      <PortSelect
                        v-if="isSeaPortField(cond.conditionField)"
                        :model-value="getConditionValueBinding(cond)"
                        :mode="
                          isMultipleOperator(cond.operator)
                            ? 'multiple'
                            : undefined
                        "
                        @update:model-value="
                          (value) => onConditionValuesChange(cond, value)
                        "
                      />
                      <AirPortSelect
                        v-else-if="isAirPortField(cond.conditionField)"
                        :model-value="getConditionValueBinding(cond)"
                        :mode="
                          isMultipleOperator(cond.operator)
                            ? 'multiple'
                            : undefined
                        "
                        @update:model-value="
                          (value) => onConditionValuesChange(cond, value)
                        "
                      />
                      <Select
                        v-else-if="
                          cond.conditionField ===
                          CommissionConditionField.CargoType
                        "
                        :model-value="getConditionValueBinding(cond)"
                        :options="cargoTypeOptions"
                        :mode="
                          isMultipleOperator(cond.operator)
                            ? 'multiple'
                            : undefined
                        "
                        :placeholder="$t('commission.conditionValues')"
                        @update:value="
                          (value) => onConditionValuesChange(cond, value)
                        "
                      />
                      <Select
                        v-else-if="isTradeTermsField(cond.conditionField)"
                        :model-value="getConditionValueBinding(cond)"
                        :options="tradeTermsTypeOptions"
                        :mode="
                          isMultipleOperator(cond.operator)
                            ? 'multiple'
                            : undefined
                        "
                        :placeholder="$t('commission.conditionValues')"
                        @update:value="
                          (value) => onConditionValuesChange(cond, value)
                        "
                      />
                      <Select
                        v-else-if="isClientClientTypeField(cond.conditionField)"
                        :model-value="getConditionValueBinding(cond)"
                        :options="clientTypeOptions"
                        :mode="
                          isMultipleOperator(cond.operator)
                            ? 'multiple'
                            : undefined
                        "
                        :placeholder="$t('commission.conditionValues')"
                        @update:value="
                          (value) => onConditionValuesChange(cond, value)
                        "
                      />
                      <Typography.Text
                        v-else-if="isPerTicket(cond.conditionField)"
                        type="secondary"
                        class="cc-per-ticket-hint"
                      >
                        {{ $t('commission.perTicketHint') }}
                      </Typography.Text>
                    </div>
                    <Button
                      v-if="countRuleConditions(rule) > 1"
                      type="text"
                      danger
                      size="small"
                      class="cc-row-delete"
                      @click="removeCondition(rule, group, condIndex)"
                    >
                      {{ $t('common.delete') }}
                    </Button>
                  </div>

                  <Button
                    v-if="!ruleHasPerTicket(rule)"
                    size="small"
                    type="dashed"
                    class="cc-dashed-btn"
                    @click="addCondition(group)"
                  >
                    <span class="cc-btn-content">
                      <Plus class="cc-icon" />
                      {{ $t('commission.addCondition') }}
                    </span>
                  </Button>
                </div>
              </div>

              <Button
                v-if="!ruleHasPerTicket(rule)"
                size="small"
                type="dashed"
                class="cc-dashed-btn"
                @click="addGroup(rule)"
              >
                <span class="cc-btn-content">
                  <Plus class="cc-icon" />
                  {{ $t('commission.addConditionGroup') }}
                </span>
              </Button>
            </div>

            <Button
              type="dashed"
              block
              class="cc-add-rule-btn"
              @click="addRule"
            >
              <span class="cc-btn-content">
                <Plus class="cc-icon" />
                {{ $t('commission.addRule') }}
              </span>
            </Button>
          </div>
        </section>
      </Form>
    </div>
  </Modal>
</template>

<style scoped>
.cc-form {
  max-height: min(72vh, 780px);
  padding-right: 4px;
  overflow: hidden auto;
}

.cc-form-body :deep(.ant-form-item) {
  margin-bottom: 14px;
}

.cc-form-body :deep(.ant-form-item-label) {
  padding-bottom: 4px;
}

.cc-form-body :deep(.ant-form-item-label > label) {
  height: auto;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
}

.cc-form-body :deep(.ant-form-item-extra) {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.4;
}

.cc-section {
  padding: 14px 16px 4px;
  margin-bottom: 12px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 3%);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.cc-section:hover {
  border-color: hsl(var(--primary) / 28%);
  box-shadow: 0 2px 10px hsl(var(--primary) / 6%);
}

.cc-section--accent {
  background: linear-gradient(
    180deg,
    hsl(var(--primary) / 5%) 0%,
    hsl(var(--card)) 48px
  );
}

.cc-section__title {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 2px 0 10px;
  margin-bottom: 12px;
  border-bottom: 1px solid hsl(var(--border));
}

.cc-section__icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 12%);
  border-radius: 7px;
}

.cc-icon {
  display: block;
  width: 14px;
  height: 14px;
}

.cc-btn-content {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  white-space: nowrap;
}

.cc-dashed-btn,
.cc-add-rule-btn,
.cc-action-btn {
  white-space: nowrap;
}

.cc-dashed-btn {
  color: hsl(var(--primary));
  border-color: hsl(var(--primary) / 35%);
}

.cc-dashed-btn:hover {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 8%);
  border-color: hsl(var(--primary));
}

.cc-add-rule-btn {
  height: 40px;
  margin-top: 2px;
  font-weight: 500;
  color: hsl(var(--primary));
  border-color: hsl(var(--primary) / 40%);
  border-style: dashed;
}

.cc-add-rule-btn:hover {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 8%);
  border-color: hsl(var(--primary));
}

.cc-section__text {
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.cc-section__meta {
  padding: 2px 8px;
  margin-left: auto;
  font-size: 12px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-radius: 999px;
}

.cc-basic {
  display: flex;
  flex-direction: column;
}

.cc-basic__row {
  display: grid;
  gap: 0 16px;
}

.cc-basic__row--name {
  grid-template-columns: minmax(0, 1fr) 120px 140px;
}

.cc-basic__row--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.cc-field-hint {
  margin: -6px 0 12px;
  font-size: 12px;
  line-height: 1.45;
  color: hsl(var(--muted-foreground));
}

.cc-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.cc-grid-span-2 {
  grid-column: span 2;
}

.cc-inline-fields {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.cc-inline-fields__grow {
  flex: 1;
  min-width: 0;
}

.cc-range-sep {
  flex-shrink: 0;
  color: hsl(var(--muted-foreground));
}

.cc-switch-row {
  display: flex;
  gap: 10px;
  align-items: center;
  min-height: 32px;
}

.cc-switch-hint {
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.cc-biz-types {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  padding-top: 4px;
}

.cc-calc-type {
  display: flex;
  flex-wrap: wrap;
}

.cc-tier-panel {
  padding: 12px;
  margin: 0 0 14px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.cc-tier-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.cc-tier-panel__title {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.cc-tier-panel__icon {
  color: hsl(var(--primary));
}

.cc-tier-header,
.cc-tier-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 8px;
  align-items: center;
}

.cc-tier-header {
  margin-bottom: 6px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.cc-tier-row {
  padding: 6px 8px;
  margin-bottom: 6px;
  border-radius: 8px;
  transition: background-color 0.15s ease;
}

.cc-tier-row:hover {
  background: hsl(var(--primary) / 6%);
}

.cc-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-height: 28px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border: 1px solid hsl(var(--primary) / 22%);
  border-radius: 999px;
}

.cc-empty-hint {
  padding: 16px 8px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
  text-align: center;
}

.cc-rules {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 12px;
}

.cc-rule-card {
  padding: 12px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;
}

.cc-rule-card:hover {
  border-color: hsl(var(--primary) / 35%);
  box-shadow: 0 4px 14px hsl(var(--primary) / 8%);
}

.cc-rule-card__head {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.cc-rule-badge {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 12%);
  border-radius: 999px;
}

.cc-rule-fields {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: center;
}

.cc-rule-field {
  display: flex;
  gap: 8px;
  align-items: center;
}

.cc-rule-field__label {
  flex-shrink: 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.cc-rule-field__unit {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.cc-logic-hint {
  display: flex;
  gap: 6px;
  align-items: flex-start;
  padding: 8px 10px;
  margin-bottom: 10px;
  font-size: 12px;
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--primary) / 6%);
  border-radius: 8px;
}

.cc-logic-hint__icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: hsl(var(--primary));
}

.cc-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.cc-group-card {
  padding: 10px;
  background: hsl(var(--card));
  border: 1px dashed hsl(var(--border));
  border-radius: 8px;
  transition: border-color 0.2s ease;
}

.cc-group-card:hover {
  border-color: hsl(var(--primary) / 40%);
  border-style: solid;
}

.cc-group-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.cc-group-card__title {
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.cc-cond-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 6px;
  margin-bottom: 6px;
  border-radius: 8px;
  transition: background-color 0.15s ease;
}

.cc-cond-row:hover {
  background: hsl(var(--primary) / 5%);
}

.cc-cond-row__field {
  flex-shrink: 0;
  width: 160px;
}

.cc-cond-row__op {
  flex-shrink: 0;
  width: 120px;
}

.cc-cond-row__value {
  flex: 1;
  min-width: 0;
}

.cc-per-ticket-hint {
  display: block;
  padding: 6px 0;
  font-size: 12px;
  line-height: 1.5;
}

.cc-row-delete {
  flex-shrink: 0;
  opacity: 0.72;
  transition: opacity 0.15s ease;
}

.cc-row-delete:hover {
  opacity: 1;
}

@media (max-width: 768px) {
  .cc-basic__row--name,
  .cc-basic__row--2,
  .cc-grid {
    grid-template-columns: 1fr;
  }

  .cc-grid-span-2 {
    grid-column: span 1;
  }

  .cc-tier-header,
  .cc-tier-row {
    grid-template-columns: 1fr;
  }
}
</style>
