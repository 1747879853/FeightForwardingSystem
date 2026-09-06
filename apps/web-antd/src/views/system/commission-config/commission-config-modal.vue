<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  Button,
  Checkbox,
  DatePicker,
  Divider,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Radio,
  Select,
  Switch,
  Tag,
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
                value.tradeTermsType,
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
  <Modal :title="getTitle" class="w-[1000px]">
    <div class="mx-4 flex flex-col gap-2">
      <Form layout="vertical">
        <!-- 通用信息 -->
        <div class="grid grid-cols-2 gap-x-4">
          <FormItem :label="$t('commission.configName')" required>
            <Input
              v-model:value="baseForm.name"
              :maxlength="128"
              :placeholder="$t('commission.nameRequired')"
            />
          </FormItem>
          <FormItem :label="$t('commission.sortId')">
            <InputNumber
              v-model:value="baseForm.sortId"
              :min="0"
              class="w-40"
            />
          </FormItem>
          <FormItem :label="$t('commission.isEnabled')">
            <Switch v-model:checked="baseForm.isEnabled" />
          </FormItem>
          <FormItem :label="$t('commission.effectivePeriod')">
            <div class="flex items-center gap-2">
              <DatePicker
                v-model:value="baseForm.effectiveStartDate"
                picker="month"
                format="YYYY-MM"
                value-format="YYYY-MM"
                :placeholder="$t('commission.effectiveStartMonth')"
                allow-clear
                class="w-44"
              />
              <span class="text-gray-400">~</span>
              <DatePicker
                v-model:value="baseForm.effectiveEndDate"
                picker="month"
                format="YYYY-MM"
                value-format="YYYY-MM"
                :placeholder="$t('commission.effectiveEndMonth')"
                allow-clear
                class="w-44"
              />
            </div>
          </FormItem>
          <FormItem
            :label="$t('commission.periodType')"
            :extra="$t('commission.periodTypeHint')"
          >
            <Select
              v-model:value="baseForm.periodType"
              :options="periodTypeOptions"
              class="w-44"
            />
          </FormItem>
          <FormItem
            :label="$t('commission.bizTypes')"
            :extra="$t('commission.bizTypesHint')"
          >
            <Checkbox.Group
              v-model:value="baseForm.bizTypes"
              :options="bizTypeOptions"
            />
          </FormItem>
          <FormItem :label="$t('commission.applyUsers')" required>
            <UserSelect v-model="baseForm.userIds" mode="multiple" />
          </FormItem>
          <FormItem :label="$t('commission.applyOrgs')">
            <OrganizationSelect v-model="baseForm.orgIds" mode="multiple" />
          </FormItem>
          <FormItem
            :label="$t('commission.baseSalary')"
            :extra="$t('commission.baseSalaryHint')"
          >
            <div class="flex items-center gap-2">
              <InputNumber
                v-model:value="baseForm.baseSalary"
                :min="0"
                class="w-44"
              />
              <Select
                v-model:value="baseForm.baseSalaryMode"
                :options="baseSalaryModeOptions"
                :placeholder="$t('commission.baseSalaryMode')"
                allow-clear
                class="w-56"
              />
            </div>
          </FormItem>
          <FormItem :label="$t('commission.remark')">
            <Input.TextArea
              v-model:value="baseForm.remark"
              :maxlength="1024"
              :rows="2"
            />
          </FormItem>
        </div>

        <!-- 销售提成规则 -->
        <template v-if="isSales">
          <Divider orientation="left" orientation-margin="0">
            <span class="text-sm font-medium">
              {{ $t('commission.salesRuleSection') }}
            </span>
          </Divider>
          <div class="grid grid-cols-2 gap-x-4">
            <FormItem :label="$t('commission.profitThreshold')" required>
              <div class="flex items-center gap-2">
                <Select
                  v-model:value="salesForm.profitThresholdOperator"
                  :options="profitThresholdOperatorOptions"
                  :placeholder="$t('commission.profitThresholdOperator')"
                  class="w-44"
                />
                <InputNumber
                  v-model:value="salesForm.profitThreshold"
                  :min="0"
                  class="w-44"
                />
              </div>
            </FormItem>
            <FormItem :label="$t('commission.negativeProfitRate')" required>
              <InputNumber
                v-model:value="salesForm.negativeProfitRate"
                :min="0"
                :max="1000"
                class="w-44"
              />
            </FormItem>
          </div>
          <FormItem :label="$t('commission.salesCommissionType')" required>
            <Radio.Group
              v-model:value="salesForm.salesCommissionType"
              :options="salesCommissionTypeOptions"
              option-type="button"
              button-style="solid"
            />
          </FormItem>
          <FormItem
            v-if="
              salesForm.salesCommissionType === SalesCommissionType.FixedRate
            "
            :label="$t('commission.fixedRate')"
            required
          >
            <InputNumber
              v-model:value="salesForm.fixedRate"
              :min="0"
              :max="1000"
              class="w-44"
            />
          </FormItem>
          <div v-else class="rounded-md border border-gray-200 p-3">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-sm font-medium">{{
                $t('commission.tiers')
              }}</span>
              <Button size="small" @click="addTier">
                + {{ $t('commission.addTier') }}
              </Button>
            </div>
            <template v-if="salesForm.tiers.length > 0">
              <div
                class="mb-2 grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 text-xs text-gray-500"
              >
                <span>{{ $t('commission.tierMinAmount') }}</span>
                <span>{{ $t('commission.tierMaxAmount') }}</span>
                <span>{{ $t('commission.tierRate') }}</span>
                <span></span>
              </div>
              <div
                v-for="(tier, tierIndex) in salesForm.tiers"
                :key="tier._key"
                class="mb-2 grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2"
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
                <Tag v-else color="blue" class="w-fit">
                  {{ $t('commission.tierNoLimit') }}
                </Tag>
                <InputNumber
                  v-model:value="tier.rate"
                  :min="0"
                  :max="1000"
                  class="w-full"
                  :placeholder="$t('commission.tierRate')"
                />
                <Button
                  type="link"
                  danger
                  size="small"
                  @click="removeTier(tierIndex)"
                >
                  {{ $t('common.delete') }}
                </Button>
              </div>
            </template>
            <Typography.Text v-else type="secondary">
              {{ $t('commission.tiersRequired') }}
            </Typography.Text>
          </div>
        </template>

        <!-- 操作提成规则 -->
        <template v-else>
          <Divider orientation="left" orientation-margin="0">
            <span class="text-sm font-medium">
              {{ $t('commission.operationRuleSection') }}
            </span>
          </Divider>
          <div class="flex flex-col gap-3">
            <div
              v-for="(rule, ruleIndex) in operationForm.rules"
              :key="rule._key"
              class="rounded-md border border-gray-200 bg-gray-50/70 p-3"
            >
              <div class="mb-2 flex flex-wrap items-center gap-2">
                <span class="text-xs text-gray-500">
                  {{ $t('commission.ruleName') }}
                </span>
                <Input
                  v-model:value="rule.name"
                  :maxlength="128"
                  class="w-48"
                  :placeholder="$t('commission.ruleName')"
                />
                <span class="text-xs text-gray-500">
                  {{ $t('commission.ruleAmount') }}
                </span>
                <InputNumber
                  v-model:value="rule.amount"
                  :min="0.01"
                  :precision="2"
                  class="w-32"
                />
                <span class="text-xs text-gray-400">
                  {{ $t('commission.ruleAmountUnit') }}
                </span>
                <div class="flex-1"></div>
                <Button
                  v-if="operationForm.rules.length > 1"
                  type="link"
                  danger
                  size="small"
                  @click="removeRule(ruleIndex)"
                >
                  {{ $t('common.delete') }}
                </Button>
              </div>
              <div class="mb-2 text-xs text-gray-400">
                {{ $t('commission.conditionGroupLogicHint') }}
              </div>
              <div
                v-for="(group, groupIndex) in rule.conditionGroups"
                :key="group._key"
                class="mb-2 rounded-md border border-dashed border-gray-300 bg-white p-2"
              >
                <div class="mb-1 flex items-center justify-between">
                  <span class="text-xs font-medium text-gray-600">
                    {{
                      $t('commission.conditionGroupTitle', {
                        index: groupIndex + 1,
                      })
                    }}
                  </span>
                  <Button
                    v-if="rule.conditionGroups.length > 1"
                    type="link"
                    danger
                    size="small"
                    @click="removeGroup(rule, groupIndex)"
                  >
                    {{ $t('common.delete') }}
                  </Button>
                </div>
                <div
                  v-for="(cond, condIndex) in group.conditions"
                  :key="cond._key"
                  class="mb-2 flex items-center gap-2"
                >
                  <Select
                    :model-value="cond.conditionField"
                    :options="conditionFieldOptions"
                    :placeholder="$t('commission.conditionField')"
                    class="w-40"
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
                    class="w-32"
                    @update:value="
                      (value) =>
                        onConditionOperatorChange(
                          cond,
                          value as CommissionConfigAdminApi.CommissionConditionOperator,
                        )
                    "
                  />
                  <div class="min-w-0 flex-1">
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
                    <Typography.Text
                      v-else-if="isPerTicket(cond.conditionField)"
                      type="secondary"
                      class="text-xs"
                    >
                      {{ $t('commission.perTicketHint') }}
                    </Typography.Text>
                  </div>
                  <Button
                    v-if="countRuleConditions(rule) > 1"
                    type="link"
                    danger
                    size="small"
                    @click="removeCondition(rule, group, condIndex)"
                  >
                    {{ $t('common.delete') }}
                  </Button>
                </div>
                <Button
                  v-if="!ruleHasPerTicket(rule)"
                  size="small"
                  @click="addCondition(group)"
                >
                  + {{ $t('commission.addCondition') }}
                </Button>
              </div>
              <Button
                v-if="!ruleHasPerTicket(rule)"
                size="small"
                @click="addGroup(rule)"
              >
                + {{ $t('commission.addConditionGroup') }}
              </Button>
            </div>
            <div>
              <Button size="small" type="dashed" @click="addRule">
                + {{ $t('commission.addRule') }}
              </Button>
            </div>
          </div>
        </template>
      </Form>
    </div>
  </Modal>
</template>
