<script lang="ts" setup>
import type {
  AddSeFreiPriceInput,
  BatchEditSeFreiPriceInput,
  EditSeFreiPriceInput,
  SeFreiPriceCtnAddDto,
  SeFreiPriceCtnEditDto,
  SeFreiPriceFeeAddDto,
  SeFreiPriceFeeEditDto,
  SeFreiPriceCtnFeeEditDto,
  SeFreiPriceOutDto,
} from '#/api/sea-export/freight-rate-admin';

import {
  FreiPricePropType,
  PriceFeeType,
} from '#/api/sea-export/freight-rate-admin';

import { computed, nextTick, ref, onMounted } from 'vue';
import { getEnumItems } from '#/utils/init-enum';
import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useVbenForm } from '#/adapter/form';
import {
  addSeFreiPrice,
  batchEditSeFreiPrice,
  editSeFreiPrice,
  getSeFreiPriceDetail,
} from '#/api/sea-export/freight-rate-admin';
import { $t } from '#/locales';
import { Button, Select, Input } from 'ant-design-vue';
import { selectRanges } from '#/views/system/workflow/utils/const';

const emits = defineEmits(['success']);

const formData = ref<SeFreiPriceOutDto>();
const id = ref<string>();
const isBatchMode = ref(false);
const batchIds = ref<string[]>([]);
// 是否仅编辑附加费（双击附加费列时传入）
const onlySurchargeFees = ref(false);

// 中转港禁用状态（响应式）
const transshipmentPortsDisabled = ref(false);

// 截单时间模式：'datetime' - 完整日期时间, 'week' - 星期+时间点
const closeDocMode = ref<'datetime' | 'week' | null>(null);
// 截关时间模式：'datetime' - 完整日期时间, 'week' - 星期+时间点
const closingMode = ref<'datetime' | 'week' | null>(null);
// 开船时间模式：'date' - 完整日期, 'week' - 星期
const etdMode = ref<'date' | 'week' | null>(null);

// 动态箱型列表（从行数据的 seFreiPriceCtns 中获取）
const dynamicCtnTypes = computed(() => {
  if (
    !formData.value?.seFreiPriceCtns ||
    formData.value.seFreiPriceCtns.length === 0
  ) {
    return [];
  }
  console.log('c-dynamicCtnTypes', formData.value.seFreiPriceCtns);
  return formData.value.seFreiPriceCtns.map((ctn) => ({
    ctnCodeId: String(ctn.ctnCodeId), // 转换为字符串，与条件配置的key保持一致
    name: ctn.ctnCode?.ctnName || `箱型${ctn.ctnCodeId}`,
    cost: ctn.cost,
  }));
});

// 箱型费率数据 - 按费用类型组织
interface FeeDataItem {
  feeCodeId?: number;
  currencyId?: number;
  prices: Record<string, number | undefined>; // key: ctnCodeId, value: price
}

const feeData = ref<Record<string, FeeDataItem>>({});

// 附加费价格数据结构
interface SurchargePriceItem {
  price?: number; // 普通价格或满足条件的价格
  conditionType?: number; // 条件类型
  operatorType?: number; // 算符类型
  value?: number; // 条件阈值
  otherPrice?: number; // 否则价格
}

// 附加费数据结构
interface SurchargeFeeItem {
  id?: string; // 编辑时的ID
  feeCodeId?: number; // 费用代码ID
  currencyId?: number | null; // 币别ID
  priceFeeType: PriceFeeType; // 计费方式：0-按集装箱，1-按票
  prices: Record<string, SurchargePriceItem>; // key: ctnCodeId (string), value: 价格对象
  seFreiPriceCtnFees?: SeFreiPriceCtnFeeEditDto[];
}

// 附加费列表
const surchargeFees = ref<SurchargeFeeItem[]>([]);

// 币别列表（用于下拉选择）
const currencyList = ref<any[]>([]);

// 费用代码列表（用于下拉选择）
const feeCodeList = ref<any[]>([]);

// 港口数据缓存
const portCache = ref<any[]>([]);
const carrierCache = ref<any[]>([]);

// 标记是否已加载基础数据
const baseDataLoaded = ref(false);

// 加载币别和费用代码列表
async function loadSelectData() {
  try {
    // 如果已经加载过基础数据，直接返回
    if (baseDataLoaded.value) {
      return;
    }

    // 加载港口数据（所有端口共用）
    const { getPortCodePagedList } =
      await import('#/api/system/base-data/port-code-admin');
    const portRes = await getPortCodePagedList({ PageSize: 1000 });
    portCache.value = (portRes.items || []).map((item: any) => ({
      label: `${item.cnName}(${item.portName})`,
      value: item.id,
    }));

    // 加载船公司数据
    const { getCarrierPagedList } =
      await import('#/api/system/base-data/carrier-admin');
    const carrierRes = await getCarrierPagedList({ PageSize: 1000 });
    carrierCache.value = (carrierRes.items || []).map((item: any) => ({
      label: item.cnName || item.enName,
      value: item.id,
    }));

    // 加载币别列表
    const { getCurrencyPagedList } =
      await import('#/api/system/base-data/currency-admin');
    const currencyRes = await getCurrencyPagedList({ PageSize: 1000 });
    currencyList.value = (currencyRes.items || []).map((item: any) => ({
      label: item.code || item.enName,
      value: item.id,
    }));

    // 加载费用代码列表
    const { getFeeCodePagedList } =
      await import('#/api/system/base-data/fee-code-admin');
    const feeRes = await getFeeCodePagedList({ PageSize: 1000 });
    feeCodeList.value = (feeRes.items || []).map((item: any) => ({
      label: item.cnName || item.enName,
      value: item.id,
    }));

    baseDataLoaded.value = true;
  } catch (error) {
    console.error('加载下拉数据失败:', error);
  }
}

/**
 * 更新中转港字段的禁用状态
 * @param disabled 是否禁用
 */
function updateTransshipmentPortsDisabled(disabled: boolean) {
  console.log('updateTransshipmentPortsDisabled', disabled);
  transshipmentPortsDisabled.value = disabled;
  // 手动更新表单字段的禁用状态，确保响应式生效
  formApi.updateSchema([
    {
      fieldName: 'poT1Id',
      componentProps: {
        disabled,
      },
    },
    {
      fieldName: 'poT2Id',
      componentProps: {
        disabled,
      },
    },
  ]);
}

// ==================== 开船时间互斥逻辑 ====================

/**
 * 处理开船日期变化 - 选择完整日期时清空星期
 */
function handleEtdChange(value: any) {
  if (value) {
    etdMode.value = 'date';
    // 清空星期
    formApi.setValues({
      etdDayOfWeek: undefined,
    });
  } else {
    etdMode.value = null;
  }
}

/**
 * 处理开船星期变化 - 选择星期时清空完整日期
 */
function handleEtdDayOfWeekChange(value: any) {
  if (value !== undefined && value !== null) {
    etdMode.value = 'week';
    // 清空完整日期
    formApi.setValues({
      etd: undefined,
    });
  } else {
    etdMode.value = null;
  }
}

// ==================== 截单时间互斥逻辑 ====================

/**
 * 处理截单时间变化 - 选择完整日期时间时清空星期和时间点
 */
function handleCloseDocTimeChange(value: any) {
  if (value) {
    closeDocMode.value = 'datetime';
    // 清空星期和时间点
    formApi.setValues({
      closeDocDayOfWeek: undefined,
      closeDocDayTime: undefined,
    });
  } else {
    closeDocMode.value = null;
  }
}

/**
 * 处理截单星期变化 - 选择星期时清空完整日期时间
 */
function handleCloseDocDayOfWeekChange(value: any) {
  if (value !== undefined && value !== null) {
    closeDocMode.value = 'week';
    // 清空完整日期时间
    formApi.setValues({
      closeDocTime: undefined,
    });
  } else {
    closeDocMode.value = null;
  }
}

/**
 * 处理截单时间点变化 - 仅在选择星期时有效
 */
function handleCloseDocDayTimeChange(value: any) {
  // 时间点只在星期模式下使用，不需要特殊处理
}

// ==================== 截关时间互斥逻辑 ====================

/**
 * 处理截关时间变化 - 选择完整日期时间时清空星期和时间点
 */
function handleClosingTimeChange(value: any) {
  if (value) {
    closingMode.value = 'datetime';
    // 清空星期和时间点
    formApi.setValues({
      closingDayOfWeek: undefined,
      closingDayTime: undefined,
    });
  } else {
    closingMode.value = null;
  }
}

/**
 * 处理截关星期变化 - 选择星期时清空完整日期时间
 */
function handleClosingDayOfWeekChange(value: any) {
  if (value !== undefined && value !== null) {
    closingMode.value = 'week';
    // 清空完整日期时间
    formApi.setValues({
      closingTime: undefined,
    });
  } else {
    closingMode.value = null;
  }
}

/**
 * 处理截关时间点变化 - 仅在选择星期时有效
 */
function handleClosingDayTimeChange(value: any) {
  // 时间点只在星期模式下使用，不需要特殊处理
}

// ==================== 禁用状态计算属性 ====================

// 开船星期是否禁用：选择了完整日期时禁用
const isEtdDayOfWeekDisabled = computed(() => {
  return !isBatchMode.value && etdMode.value === 'date';
});

// 截单星期是否禁用：选择了完整日期时间时禁用
const isCloseDocDayOfWeekDisabled = computed(() => {
  return !isBatchMode.value && closeDocMode.value === 'datetime';
});

// 截单时间点是否禁用：未选择星期时禁用
const isCloseDocDayTimeDisabled = computed(() => {
  return !isBatchMode.value && closeDocMode.value !== 'week';
});

// 截关星期是否禁用：选择了完整日期时间时禁用
const isClosingDayOfWeekDisabled = computed(() => {
  return !isBatchMode.value && closingMode.value === 'datetime';
});

// 截关时间点是否禁用：未选择星期时禁用
const isClosingDayTimeDisabled = computed(() => {
  return !isBatchMode.value && closingMode.value !== 'week';
});

// 条件费用配置数据结构
interface ConditionalFeeConfig {
  enabled: boolean;
  threshold?: number; // 阈值
  valueIfGreater?: number; // 大于阈值的值
  valueOtherwise?: number; // 否则的值
}

// 条件费用配置状态 - 按费用类型和箱型组织
const conditionalFeeConfigs = ref<
  Record<string, Record<string, ConditionalFeeConfig>>
>({});

// 条件选择弹窗状态
const conditionPopupVisible = ref(false);
const conditionPopupPosition = ref({ top: 0, left: 0 });
const currentConditionCell = ref<{ feeType: string; ctnCodeId: string } | null>(
  null,
);

// 初始化条件配置
function initConditionalConfig(feeType: string, ctnCodeId: string) {
  if (!conditionalFeeConfigs.value[feeType]) {
    conditionalFeeConfigs.value[feeType] = {};
  }
  if (!conditionalFeeConfigs.value[feeType][ctnCodeId]) {
    conditionalFeeConfigs.value[feeType][ctnCodeId] = {
      enabled: false,
      threshold: undefined,
      valueIfGreater: undefined,
      valueOtherwise: undefined,
    };
  }
}

// 获取条件配置
function getConditionalConfig(
  feeType: string,
  ctnCodeId: string,
): ConditionalFeeConfig {
  initConditionalConfig(feeType, ctnCodeId);
  return conditionalFeeConfigs.value[feeType]?.[
    ctnCodeId
  ] as ConditionalFeeConfig;
}

// 显示条件选择弹窗
function showConditionPopup(
  event: MouseEvent,
  feeType: string,
  ctnCodeId: string,
) {
  console.log('c-showConditionPopup', feeType, ctnCodeId);
  event.stopPropagation();
  const target = event.target as HTMLElement;
  const rect = target.getBoundingClientRect();

  currentConditionCell.value = { feeType, ctnCodeId };
  conditionPopupPosition.value = {
    top: rect.top + window.scrollY - 2,
    left: rect.right + window.scrollX + 3,
  };
  conditionPopupVisible.value = true;

  setTimeout(() => {
    document.addEventListener('click', hideConditionPopup);
  }, 0);
}

// 隐藏条件选择弹窗
function hideConditionPopup() {
  conditionPopupVisible.value = false;
  currentConditionCell.value = null;
  document.removeEventListener('click', hideConditionPopup);
}

// 切换条件启用状态
function toggleConditionEnabled(enabled: boolean) {
  console.log('c-toggleConditionEnabled', enabled, currentConditionCell.value);
  if (currentConditionCell.value) {
    const config = getConditionalConfig(
      currentConditionCell.value.feeType,
      currentConditionCell.value.ctnCodeId,
    );
    config.enabled = enabled;

    if (!enabled) {
      config.threshold = undefined;
      config.valueIfGreater = undefined;
      config.valueOtherwise = undefined;

      const feeType = currentConditionCell.value.feeType;
      const ctnCodeId = currentConditionCell.value.ctnCodeId;
      if (feeData.value[feeType]) {
        feeData.value[feeType].prices[ctnCodeId] = undefined;
      }
    }
  }
  hideConditionPopup();
}

// 更新条件费用值
function updateConditionalValue(
  feeType: string,
  ctnCodeId: string,
  field: 'threshold' | 'valueIfGreater' | 'valueOtherwise',
  value: string,
) {
  const config = getConditionalConfig(feeType, ctnCodeId);
  const numValue = value ? Number(value) : undefined;
  config[field] = numValue;

  if (!feeData.value[feeType]) {
    feeData.value[feeType] = { prices: {} };
  }
  if (config.enabled && config.threshold !== undefined) {
    feeData.value[feeType].prices[ctnCodeId] = undefined;
  }
}

// 更新普通费用值
function updateNormalFeeValue(
  feeType: string,
  ctnCodeId: string,
  value: string,
) {
  const config = getConditionalConfig(feeType, ctnCodeId);

  if (config.enabled) {
    return;
  }

  const numValue = value ? Number(value) : undefined;

  if (!feeData.value[feeType]) {
    feeData.value[feeType] = { prices: {} };
  }
  feeData.value[feeType].prices[ctnCodeId] = numValue;
}

// 切换算符（循环切换：>、>=、<、<=、=）
function toggleOperator(index: number, ctnCodeId: string) {
  const currentOperator =
    surchargeFees.value[index]?.prices[ctnCodeId]?.operatorType || 1;
  console.log('c-toggleOperator', index, ctnCodeId, currentOperator);
  // 定义算符顺序：1: >, 2: >=, 3: <, 4: <=, 5: =
  const operatorSequence = conditionComparisonTypeOptions.value.map(
    (opt) => opt.value,
  );

  // 找到当前算符的索引，然后切换到下一个
  const currentIndex = operatorSequence.indexOf(currentOperator ?? 0);
  const nextIndex = (currentIndex + 1) % operatorSequence.length;
  const nextOperator = operatorSequence[nextIndex];

  updateSurchargePriceValue(
    index,
    ctnCodeId,
    'operatorType',
    String(nextOperator),
  );
}

// 获取算符显示符号
function getOperatorSymbol(operatorType?: number): string {
  return (
    conditionComparisonTypeOptions.value.find(
      (opt) => opt.value === operatorType,
    )?.label || '≥'
  );
}

// 处理计费方式变化
function handlePriceFeeTypeChange(index: number, value: PriceFeeType) {
  const fee = surchargeFees.value[index];
  if (!fee) return;

  fee.priceFeeType = value;

  // 切换计费方式时清空相关数据
  if (value === PriceFeeType.Ctn) {
    // 按集装箱：清空固定价格
    Object.keys(fee.prices).forEach((key) => {
      const priceItem = fee.prices[key];
      if (priceItem) {
        priceItem.price = undefined;
      }
    });
  } else {
    // 按票：清空箱型费用
    fee.prices = {};
    fee.seFreiPriceCtnFees = [];
  }
}

// 更新附加费价格值
function updateSurchargePriceValue(
  index: number,
  ctnCodeId: string,
  field: keyof SurchargePriceItem,
  value: string,
) {
  const fee = surchargeFees.value[index];
  if (!fee) return;

  if (!fee.prices[ctnCodeId]) {
    fee.prices[ctnCodeId] = {};
  }

  const numValue = value ? Number(value) : undefined;
  fee.prices[ctnCodeId][field] = numValue;
}

// 添加附加费
function addSurchargeFee() {
  surchargeFees.value.push({
    priceFeeType: PriceFeeType.Ctn, // 默认按集装箱
    prices: {},
    seFreiPriceCtnFees: [],
  });
}

// 删除附加费
function removeSurchargeFee(index: number) {
  surchargeFees.value.splice(index, 1);
}

// 费用代码选项模糊搜索过滤函数
function filterFeeOption(input: string, option: any) {
  if (!input) return true;

  // Ant Design Vue Select.Option 的 children 是渲染函数，需要通过 key 来查找对应的 label
  // feeCodeList 中存储了实际的 label 信息
  const feeItem = feeCodeList.value.find((item) => item.value === option.value);
  const label = feeItem?.label || '';

  console.log('c-filterFeeOption', input, label, option);
  // 确保label是字符串类型后再进行匹配
  return String(label).toLowerCase().includes(input.toLowerCase());
}

// 币别选项模糊搜索过滤函数
function filterCurrencyOption(input: string, option: any) {
  if (!input) return true;

  // 通过 option.value 在 currencyList 中查找对应的 label
  const currencyItem = currencyList.value.find(
    (item) => item.value === option.value,
  );
  const label = currencyItem?.label || '';

  console.log('c-filterCurrencyOption', input, label, option);
  // 确保label是字符串类型后再进行匹配
  return String(label).toLowerCase().includes(input.toLowerCase());
}

// 主表表单配置
const [Form, formApi] = useVbenForm({
  schema: [
    {
      component: 'Select',
      fieldName: 'carrierId',
      label: '船公司',
      componentProps: () => ({
        options: carrierCache.value,
        showSearch: true,
        filterOption: (input: string, option: any) => {
          if (!input) return true;
          const item = carrierCache.value.find(
            (item) => item.value === option.value,
          );
          const label = item?.label || '';
          return String(label).toLowerCase().includes(input.toLowerCase());
        },
        placeholder: isBatchMode.value ? '留空不修改' : '请选择船公司',
        allowClear: true,
      }),
      rules: isBatchMode.value ? '' : 'required',
    },
    {
      component: 'Select',
      fieldName: 'currencyId',
      label: '币别',
      componentProps: () => ({
        options: currencyList.value,
        showSearch: true,
        filterOption: (input: string, option: any) => {
          if (!input) return true;
          const item = currencyList.value.find(
            (item) => item.value === option.value,
          );
          const label = item?.label || '';
          return String(label).toLowerCase().includes(input.toLowerCase());
        },
        placeholder: isBatchMode.value ? '留空不修改' : '请选择币别',
        allowClear: true,
      }),
      rules: isBatchMode.value ? '' : 'required',
    },
    {
      component: 'InputNumber',
      fieldName: 'freeDays',
      label: '免用箱',
      componentProps: {
        placeholder: isBatchMode.value ? '留空不修改' : '请输入免用箱天数',
        min: 0,
        maxlength: 160,
      },
    },
    {
      component: 'Input',
      fieldName: 'voyage',
      label: '航程(天)',
      componentProps: {
        placeholder: isBatchMode.value ? '留空不修改' : '请输入航程',
        maxlength: 100,
      },
      formItemClass: 'w-full',
    },
    {
      component: 'DatePicker',
      fieldName: 'etd',
      label: '开船日期',
      componentProps: () => ({
        placeholder: isBatchMode.value ? '留空不修改' : '请选择开船日期',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        onChange: handleEtdChange,
      }),
    },
    {
      component: 'Select',
      fieldName: 'etdDayOfWeek',
      label: '开船星期',
      componentProps: () => ({
        options: [
          { label: '周日', value: 0 },
          { label: '周一', value: 1 },
          { label: '周二', value: 2 },
          { label: '周三', value: 3 },
          { label: '周四', value: 4 },
          { label: '周五', value: 5 },
          { label: '周六', value: 6 },
        ],
        placeholder: isBatchMode.value ? '留空不修改' : '请选择开船星期',
        allowClear: true,
        disabled: isEtdDayOfWeekDisabled.value,
        onChange: handleEtdDayOfWeekChange,
      }),
    },
    {
      component: 'DatePicker',
      fieldName: 'closeDocTime',
      label: '截单时间',
      componentProps: () => ({
        placeholder: isBatchMode.value ? '留空不修改' : '请选择截单时间',
        format: 'YYYY-MM-DD HH:mm',
        valueFormat: 'YYYY-MM-DD HH:mm',
        showTime: true,
        timePicker: { format: 'HH:mm' },
        onChange: handleCloseDocTimeChange,
      }),
    },
    {
      component: 'Select',
      fieldName: 'closeDocDayOfWeek',
      label: '截单星期',
      componentProps: () => ({
        options: [
          { label: '周日', value: 0 },
          { label: '周一', value: 1 },
          { label: '周二', value: 2 },
          { label: '周三', value: 3 },
          { label: '周四', value: 4 },
          { label: '周五', value: 5 },
          { label: '周六', value: 6 },
        ],
        placeholder: isBatchMode.value ? '留空不修改' : '请选择截单星期',
        allowClear: true,
        disabled: isCloseDocDayOfWeekDisabled.value,
        onChange: handleCloseDocDayOfWeekChange,
      }),
    },
    {
      component: 'TimePicker',
      fieldName: 'closeDocDayTime',
      label: '截单时间点',
      componentProps: () => ({
        placeholder: isBatchMode.value ? '留空不修改' : '请选择时间点',
        format: 'HH:mm',
        valueFormat: 'HH:mm',
        disabled: isCloseDocDayTimeDisabled.value,
        onChange: handleCloseDocDayTimeChange,
      }),
    },
    {
      component: 'DatePicker',
      fieldName: 'closingTime',
      label: '截关时间',
      componentProps: () => ({
        placeholder: isBatchMode.value ? '留空不修改' : '请选择截关时间',
        format: 'YYYY-MM-DD HH:mm',
        valueFormat: 'YYYY-MM-DD HH:mm',
        showTime: true,
        timePicker: { format: 'HH:mm' },
        onChange: handleClosingTimeChange,
      }),
    },
    {
      component: 'Select',
      fieldName: 'closingDayOfWeek',
      label: '截关星期',
      componentProps: () => ({
        options: [
          { label: '周日', value: 0 },
          { label: '周一', value: 1 },
          { label: '周二', value: 2 },
          { label: '周三', value: 3 },
          { label: '周四', value: 4 },
          { label: '周五', value: 5 },
          { label: '周六', value: 6 },
        ],
        placeholder: isBatchMode.value ? '留空不修改' : '请选择截关星期',
        allowClear: true,
        disabled: isClosingDayOfWeekDisabled.value,
        onChange: handleClosingDayOfWeekChange,
      }),
    },
    {
      component: 'TimePicker',
      fieldName: 'closingDayTime',
      label: '截关时间点',
      componentProps: () => ({
        placeholder: isBatchMode.value ? '留空不修改' : '请选择时间点',
        format: 'HH:mm',
        valueFormat: 'HH:mm',
        disabled: isClosingDayTimeDisabled.value,
        onChange: handleClosingDayTimeChange,
      }),
    },
    {
      component: 'Select',
      fieldName: 'polId',
      label: '起运港',
      componentProps: () => ({
        options: portCache.value,
        showSearch: true,
        filterOption: (input: string, option: any) => {
          if (!input) return true;
          const item = portCache.value.find(
            (item) => item.value === option.value,
          );
          const label = item?.label || '';
          return String(label).toLowerCase().includes(input.toLowerCase());
        },
        placeholder: isBatchMode.value ? '留空不修改' : '请选择起运港',
        allowClear: true,
      }),
      formItemClass: 'w-full',
      rules: isBatchMode.value ? '' : 'required',
    },

    {
      component: 'Select',
      fieldName: 'podId',
      label: '目的港',
      componentProps: () => ({
        options: portCache.value,
        showSearch: true,
        filterOption: (input: string, option: any) => {
          if (!input) return true;
          const item = portCache.value.find(
            (item) => item.value === option.value,
          );
          const label = item?.label || '';
          return String(label).toLowerCase().includes(input.toLowerCase());
        },
        placeholder: isBatchMode.value ? '留空不修改' : '请选择目的港',
        allowClear: true,
      }),
      rules: isBatchMode.value ? '' : 'required',
    },
    {
      component: 'RadioGroup',
      fieldName: 'isDirect',
      label: '是否直达',
      defaultValue: true,
      componentProps: {
        options: isBatchMode.value
          ? [
              { label: '不改', value: undefined },
              { label: '是', value: true },
              { label: '否', value: false },
            ]
          : [
              { label: '是', value: true },
              { label: '否', value: false },
            ],
        optionType: 'button',
        onChange: (value: any) => {
          // 如果选择直达（true），则清空并禁用中转港
          console.log('value', value.target.value, value.target.value === true);
          if (value.target.value === true) {
            formApi.setValues({
              poT1Id: null,
              poT2Id: null,
            });
          }
          // 更新中转港字段的禁用状态：选择"是"(直达)时禁用，选择"否"(非直达)或"不改"时启用
          updateTransshipmentPortsDisabled(value.target.value === true);
        },
      },
    },
    {
      component: 'Select',
      fieldName: 'poT1Id',
      label: '中转港1',
      componentProps: () => ({
        options: portCache.value,
        showSearch: true,
        filterOption: (input: string, option: any) => {
          if (!input) return true;
          const item = portCache.value.find(
            (item) => item.value === option.value,
          );
          const label = item?.label || '';
          return String(label).toLowerCase().includes(input.toLowerCase());
        },
        placeholder: isBatchMode.value ? '留空不修改' : '请选择中转港1',
        allowClear: true,
        disabled: transshipmentPortsDisabled.value,
      }),
    },
    {
      component: 'Select',
      fieldName: 'poT2Id',
      label: '中转港2',
      componentProps: () => ({
        options: portCache.value,
        showSearch: true,
        filterOption: (input: string, option: any) => {
          if (!input) return true;
          const item = portCache.value.find(
            (item) => item.value === option.value,
          );
          const label = item?.label || '';
          return String(label).toLowerCase().includes(input.toLowerCase());
        },
        placeholder: isBatchMode.value ? '留空不修改' : '请选择中转港2',
        allowClear: true,
        disabled: transshipmentPortsDisabled.value,
      }),
    },
    {
      component: 'InputNumber',
      fieldName: 'polFreeDays',
      label: '起运港免用箱',
      componentProps: {
        placeholder: isBatchMode.value
          ? '留空不修改'
          : '请输入起运港免用箱天数',
        min: 0,
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'podFreeDays',
      label: '目的港免用箱',
      componentProps: {
        placeholder: isBatchMode.value
          ? '留空不修改'
          : '请输入目的港免用箱天数',
        min: 0,
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'poddem',
      label: '目的港免堆期',
      componentProps: {
        placeholder: isBatchMode.value
          ? '留空不修改'
          : '请输入目的港免堆期天数',
        min: 0,
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'poddet',
      label: '目的港免箱期',
      componentProps: {
        placeholder: isBatchMode.value
          ? '留空不修改'
          : '请输入目的港免箱期天数',
        min: 0,
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'validTimeStart',
      label: '有效起始日期',
      componentProps: {
        placeholder: isBatchMode.value ? '留空不修改' : '请选择起始日期',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
      rules: isBatchMode.value ? '' : 'required',
    },
    {
      component: 'DatePicker',
      fieldName: 'validTimeEnd',
      label: '有效截止日期',
      componentProps: {
        placeholder: isBatchMode.value ? '留空不修改' : '请选择截止日期',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
      rules: isBatchMode.value ? '' : 'required',
    },
    {
      component: 'RadioGroup',
      fieldName: 'recommend',
      label: '是否推荐',
      defaultValue: undefined,
      componentProps: {
        options: isBatchMode.value
          ? [
              { label: '不改', value: undefined },
              { label: '是', value: true },
              { label: '否', value: false },
            ]
          : [
              { label: '是', value: true },
              { label: '否', value: false },
            ],
        optionType: 'button',
      },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: '备注',
      componentProps: {
        placeholder: isBatchMode.value ? '留空不修改...' : '请输入备注',
        rows: 1,
        maxlength: 500,
        showCount: true,
      },
    },
  ],
  showDefaultActions: false,
  layout: 'horizontal',
  wrapperClass: 'grid-cols-4',
});

// 其他设置表单（已移至主表表单）
const [OtherForm, otherFormApi] = useVbenForm({
  schema: [],
  showDefaultActions: false,
  layout: 'horizontal',
  wrapperClass: 'grid-cols-4',
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid: mainValid } = await formApi.validate();
    if (!mainValid && !isBatchMode.value) return;

    const values = await formApi.getValues();

    // 构建箱型列表（seFreiPriceCtns）- 箱型费率（海运费）
    const seFreiPriceCtns: SeFreiPriceCtnEditDto[] = [];
    console.log('dynamicCtnTypes:', dynamicCtnTypes.value);
    console.log('seFreiPriceCtns:', formData);
    // 从 formData.seFreiPriceCtns 获取原始箱型数据，并更新成本值
    if (formData.value?.seFreiPriceCtns) {
      formData.value.seFreiPriceCtns.forEach((ctn) => {
        const dyCtnItem = dynamicCtnTypes.value.find(
          (item) => String(ctn.ctnCodeId) === item.ctnCodeId,
        );

        const newCost = Number(dyCtnItem?.cost) || ctn.cost;

        seFreiPriceCtns.push({
          id: ctn.id,
          ctnCodeId: ctn.ctnCodeId,
          cost: newCost || 0,
        });
      });
    }

    // 构建费用列表（seFreiPriceFees）- 附加费明细
    const seFreiPriceFees: SeFreiPriceFeeEditDto[] = [];
    console.log('c-sub-surchargeFees:', surchargeFees.value);
    // 处理附加费
    surchargeFees.value.forEach((surcharge) => {
      if (
        surcharge.feeCodeId &&
        surcharge.currencyId !== undefined &&
        surcharge.currencyId !== null
      ) {
        const fee: SeFreiPriceFeeEditDto = {
          id: surcharge.id,
          feeCodeId: surcharge.feeCodeId,
          currencyId: surcharge.currencyId,
          priceFeeType: surcharge.priceFeeType ?? PriceFeeType.Ctn, // 默认按集装箱
          seFreiPriceCtnFees: [],
        };

        // 处理 seFreiPriceCtnFees：如果存在则更新，否则从 prices 创建
        if (
          surcharge.seFreiPriceCtnFees &&
          surcharge.seFreiPriceCtnFees.length > 0
        ) {
          // 编辑模式：更新已有的 seFreiPriceCtnFees
          surcharge.seFreiPriceCtnFees.forEach((ctnFee) => {
            const ctnCodeIdStr = String(ctnFee.ctnCodeId);
            const priceItem = surcharge.prices[ctnCodeIdStr];

            if (priceItem && priceItem.price !== undefined) {
              // 更新价格和相关字段
              ctnFee.price = priceItem.price;
              ctnFee.conditionType =
                priceItem.value !== undefined
                  ? priceItem.conditionType
                  : undefined;
              ctnFee.operatorType = priceItem.operatorType;
              ctnFee.value = priceItem.value;
              ctnFee.otherPrice = priceItem.otherPrice;
            }
          });

          fee.seFreiPriceCtnFees = surcharge.seFreiPriceCtnFees;
        } else {
          // 新增模式：从 prices 对象创建新的 seFreiPriceCtnFees
          Object.keys(surcharge.prices).forEach((ctnCodeIdStr) => {
            const priceItem = surcharge.prices[ctnCodeIdStr];
            if (priceItem && priceItem.price !== undefined) {
              // 从 formData 中查找原始的 ctnCodeId（number 类型），避免精度丢失
              const originalCtn = formData.value?.seFreiPriceCtns?.find(
                (ctn) => String(ctn.ctnCodeId) === ctnCodeIdStr,
              );

              fee.seFreiPriceCtnFees?.push({
                ctnCodeId: originalCtn?.ctnCodeId ?? Number(ctnCodeIdStr), // 优先使用原始 number 类型
                price: priceItem.price,
                conditionType:
                  priceItem.value !== undefined
                    ? priceItem.conditionType
                    : undefined,
                operatorType: priceItem.operatorType,
                value: priceItem.value,
                otherPrice: priceItem.otherPrice,
              });
            }
          });
        }

        if (fee.seFreiPriceCtnFees && fee.seFreiPriceCtnFees.length > 0) {
          seFreiPriceFees.push(fee);
        }
      }
    });

    // 构建关联日列表（seFreiPriceDays）- 原 seFreiPriceETDs
    const seFreiPriceDays: any[] = [];
    if (values.etd || values.closeDocTime || values.closingTime) {
      seFreiPriceDays.push({
        etd: values.etd,
        closeDocTime: values.closeDocTime,
        closingTime: values.closingTime,
      });
    }

    // 构建关联周几列表（seFreiPriceWeekDays）- 原 seFreiPriceETDDays
    const seFreiPriceWeekDays: any[] = [];
    if (
      values.etdDayOfWeek !== undefined ||
      values.closeDocDayOfWeek !== undefined ||
      values.closingDayOfWeek !== undefined
    ) {
      seFreiPriceWeekDays.push({
        etdDayOfWeek: values.etdDayOfWeek,
        etdDayTime: undefined, // 表单中未使用此字段
        closeDocDayOfWeek: values.closeDocDayOfWeek,
        closeDocDayTime: values.closeDocDayTime,
        closingDayOfWeek: values.closingDayOfWeek,
        closingDayTime: values.closingDayTime,
      });
    }

    // 构建提交数据 - 始终提交完整数据（包括隐藏的字段）
    const submitData: any = {
      carrierId: values.carrierId,
      currencyId: values.currencyId,
      polId: values.polId,
      podId: values.podId,
      isDirect: values.isDirect,
      recommend: values.recommend,
      validTimeStart: values.validTimeStart,
      validTimeEnd: values.validTimeEnd,
      poT1Id: values.poT1Id,
      poT2Id: values.poT2Id,
      polFreeDays: values.polFreeDays,
      podFreeDays: values.podFreeDays,
      poddem: values.poddem,
      poddet: values.poddet,
      voyage: values.voyage,
      contractNo: values.contractNo,
      remark: values.remark,
      seFreiPriceCtns,
      seFreiPriceFees,
      seFreiPriceDays,
      seFreiPriceWeekDays,
    };
    console.log('c-submitData', submitData);
    // 批量模式
    if (isBatchMode.value) {
      const batchData: BatchEditSeFreiPriceInput = {
        ids: batchIds.value,
        ...submitData,
      };
      if (batchData.seFreiPriceCtns && batchData.seFreiPriceCtns.length === 0) {
        delete batchData.seFreiPriceCtns;
      }
      if (batchData.seFreiPriceFees && batchData.seFreiPriceFees.length === 0) {
        delete batchData.seFreiPriceFees;
      }
      if (batchData.seFreiPriceDays && batchData.seFreiPriceDays.length === 0) {
        delete batchData.seFreiPriceDays;
      }
      if (
        batchData.seFreiPriceWeekDays &&
        batchData.seFreiPriceWeekDays.length === 0
      ) {
        delete batchData.seFreiPriceWeekDays;
      }
      modalApi.lock();
      batchEditSeFreiPrice(batchData)
        .then(() => {
          emits('success');
          modalApi.close();
        })
        .catch(() => {
          modalApi.unlock();
        });
    } else {
      // 单条新增/编辑
      if (id.value) {
        (submitData as EditSeFreiPriceInput).id = id.value;
      }

      modalApi.lock();
      const apiCall = id.value
        ? editSeFreiPrice(submitData as EditSeFreiPriceInput)
        : addSeFreiPrice(submitData as AddSeFreiPriceInput);

      apiCall
        .then(() => {
          emits('success');
          modalApi.close();
        })
        .catch(() => {
          modalApi.unlock();
        });
    }
  },

  async onOpenChange(isOpen) {
    console.log('c-onOpenChange', isOpen);
    if (isOpen) {
      const data = modalApi.getData<any>();
      console.log('c-data:', data);
      formApi.resetForm();
      feeData.value = {};
      conditionalFeeConfigs.value = {};
      surchargeFees.value = []; // 重置附加费列表

      // 设置是否仅编辑附加费
      onlySurchargeFees.value = data?.onlySurchargeFees === true;

      // 加载币别和费用代码列表
      await loadSelectData();

      if (data?.isBatch && data?.ids) {
        // 批量编辑模式
        isBatchMode.value = true;
        batchIds.value = data.ids;
        id.value = undefined;
        formData.value = undefined;
      } else if (data?.id) {
        // 编辑模式 - 从后端获取详情
        isBatchMode.value = false;
        id.value = data.id;
        try {
          const detail = await getSeFreiPriceDetail(data.id);
          formData.value = detail;

          // 初始化截单/截关时间模式 - 从子表获取数据
          const firstDay = detail.seFreiPriceDays?.[0];
          const firstWeekDay = detail.seFreiPriceWeekDays?.[0];

          if (firstDay?.closeDocTime) {
            closeDocMode.value = 'datetime';
          } else if (
            firstWeekDay?.closeDocDayOfWeek !== undefined &&
            firstWeekDay?.closeDocDayOfWeek !== null
          ) {
            closeDocMode.value = 'week';
          } else {
            closeDocMode.value = null;
          }

          if (firstDay?.closingTime) {
            closingMode.value = 'datetime';
          } else if (
            firstWeekDay?.closingDayOfWeek !== undefined &&
            firstWeekDay?.closingDayOfWeek !== null
          ) {
            closingMode.value = 'week';
          } else {
            closingMode.value = null;
          }

          // 初始化开船时间模式 - 从子表获取数据
          if (firstDay?.etd) {
            etdMode.value = 'date';
          } else if (
            firstWeekDay?.etdDayOfWeek !== undefined &&
            firstWeekDay?.etdDayOfWeek !== null
          ) {
            etdMode.value = 'week';
          } else {
            etdMode.value = null;
          }

          await nextTick();
          formApi.setValues({
            carrierId: detail.carrierId,
            currencyId: detail.currencyId,
            polId: detail.polId,
            podId: detail.podId,
            isDirect: detail.isDirect,
            recommend: detail.recommend,
            validTimeStart: detail.validTimeStart,
            validTimeEnd: detail.validTimeEnd,
            poT1Id: detail.poT1Id,
            poT2Id: detail.poT2Id,
            polFreeDays: detail.polFreeDays,
            podFreeDays: detail.podFreeDays,
            poddem: detail.poddem,
            poddet: detail.poddet,
            voyage: detail.voyage,
            contractNo: detail.contractNo,
            // 从子表第一个记录中获取日期数据
            etd: firstDay?.etd,
            etdDayOfWeek: firstWeekDay?.etdDayOfWeek,
            closeDocTime: firstDay?.closeDocTime,
            closeDocDayOfWeek: firstWeekDay?.closeDocDayOfWeek,
            closeDocDayTime: firstWeekDay?.closeDocDayTime,
            closingTime: firstDay?.closingTime,
            closingDayOfWeek: firstWeekDay?.closingDayOfWeek,
            closingDayTime: firstWeekDay?.closingDayTime,
            remark: detail.remark,
          });

          // 根据isDirect初始化中转港禁用状态
          if (detail.isDirect === true) {
            transshipmentPortsDisabled.value = true;
          } else {
            transshipmentPortsDisabled.value = false;
          }

          // 加载附加费数据
          if (detail.seFreiPriceFees) {
            detail.seFreiPriceFees.forEach((fee: any, feeIndex: number) => {
              const surchargeItem: SurchargeFeeItem = {
                id: fee.id,
                feeCodeId: fee.feeCodeId,
                currencyId: fee.currencyId,
                priceFeeType: fee.priceFeeType ?? PriceFeeType.Ctn, // 默认按集装箱
                prices: {},
                seFreiPriceCtnFees: [],
              };

              if (fee.seFreiPriceCtnFees) {
                fee.seFreiPriceCtnFees.forEach((ctnFee: any) => {
                  const ctnInfo = detail.seFreiPriceCtns?.find(
                    (ctn) => ctn.id === ctnFee.seFreiPriceCtnId,
                  );

                  if (ctnInfo) {
                    const ctnCodeId = String(ctnInfo.ctnCodeId);
                    console.log('c-ctnCodeId', ctnCodeId, ctnInfo);
                    // 判断是否需要启用条件模式：operatorType、value、otherPrice 任一不为空
                    const hasConditionData =
                      (ctnFee.operatorType !== undefined &&
                        ctnFee.operatorType !== null) ||
                      (ctnFee.value !== undefined && ctnFee.value !== null) ||
                      (ctnFee.otherPrice !== undefined &&
                        ctnFee.otherPrice !== null);

                    // 如果存在条件数据，初始化并启用条件配置（使用索引作为feeType）
                    if (hasConditionData) {
                      const feeTypeStr = String(feeIndex);
                      initConditionalConfig(feeTypeStr, ctnCodeId);
                      if (
                        conditionalFeeConfigs.value[feeTypeStr] &&
                        conditionalFeeConfigs.value[feeTypeStr][ctnCodeId]
                      ) {
                        conditionalFeeConfigs.value[feeTypeStr][
                          ctnCodeId
                        ].enabled = true;
                      }
                    }

                    // 将后端数据转换为 SurchargePriceItem 格式
                    surchargeItem.prices[ctnCodeId] = {
                      price: ctnFee.price,
                      value: ctnFee.value,
                      conditionType: ctnFee.conditionType || 1,
                      operatorType: ctnFee.operatorType,
                      otherPrice: ctnFee.otherPrice,
                    };

                    // 直接使用原始的 ctnCodeId（number 类型）避免精度丢失
                    surchargeItem.seFreiPriceCtnFees?.push({
                      id: ctnFee.id,
                      ctnCodeId: ctnInfo.ctnCodeId,
                      price: ctnFee.price,
                      conditionType: ctnFee.conditionType,
                      operatorType: ctnFee.operatorType,
                      value: ctnFee.value,
                      otherPrice: ctnFee.otherPrice,
                    });
                  }
                });
              }

              surchargeFees.value.push(surchargeItem);
            });
          }
        } catch (error) {
          console.error('获取运价详情失败:', error);
        }
      } else if (data?.carrierId) {
        // 复制模式 - 直接使用传入的数据
        isBatchMode.value = false;
        id.value = undefined;
        formData.value = data as SeFreiPriceOutDto;

        // 从子表第一个记录中获取日期数据
        const firstDay = data.seFreiPriceDays?.[0];
        const firstWeekDay = data.seFreiPriceWeekDays?.[0];

        await nextTick();
        formApi.setValues({
          carrierId: data.carrierId,
          currencyId: data.currencyId,
          polId: data.polId,
          podId: data.podId,
          isDirect: data.isDirect,
          poT1Id: data.poT1Id,
          poT2Id: data.poT2Id,
          polFreeDays: data.polFreeDays,
          podFreeDays: data.podFreeDays,
          poddem: data.poddem,
          poddet: data.poddet,
          freeDays: data.freeDays,
          voyage: data.voyage,
          contractNo: data.contractNo,
          // 从子表第一个记录中获取日期数据
          etd: firstDay?.etd,
          etdDayOfWeek: firstWeekDay?.etdDayOfWeek,
          closeDocTime: firstDay?.closeDocTime,
          closeDocDayOfWeek: firstWeekDay?.closeDocDayOfWeek,
          closeDocDayTime: firstWeekDay?.closeDocDayTime,
          closingTime: firstDay?.closingTime,
          closingDayOfWeek: firstWeekDay?.closingDayOfWeek,
          closingDayTime: firstWeekDay?.closingDayTime,
          remark: data.remark,
        });

        // 根据isDirect初始化中转港禁用状态
        if (data.isDirect === true) {
          transshipmentPortsDisabled.value = true;
        } else {
          transshipmentPortsDisabled.value = false;
        }

        formApi.setValues({
          recommend: data.recommend,
          validTimeStart: data.validTimeStart,
          validTimeEnd: data.validTimeEnd,
        });

        // 加载附加费数据
        if (data.seFreiPriceFees) {
          data.seFreiPriceFees.forEach((fee: any, feeIndex: number) => {
            const surchargeItem: SurchargeFeeItem = {
              id: fee.id,
              feeCodeId: fee.feeCodeId,
              currencyId: fee.currencyId,
              priceFeeType: fee.priceFeeType ?? PriceFeeType.Ctn, // 默认按集装箱
              prices: {},
              seFreiPriceCtnFees: [],
            };

            if (fee.seFreiPriceCtnFees) {
              fee.seFreiPriceCtnFees.forEach((ctnFee: any) => {
                const ctnInfo = data.seFreiPriceCtns?.find(
                  (ctn: any) => ctn.id === ctnFee.seFreiPriceCtnId,
                );

                if (ctnInfo) {
                  // 直接使用原始的 ctnCodeId（number 类型）避免精度丢失
                  const ctnCodeId = ctnInfo.ctnCodeId;
                  const ctnCodeIdStr = String(ctnCodeId);

                  // 判断是否需要启用条件模式：operatorType、value、otherPrice 任一不为空
                  const hasConditionData =
                    (ctnFee.operatorType !== undefined &&
                      ctnFee.operatorType !== null) ||
                    (ctnFee.value !== undefined && ctnFee.value !== null) ||
                    (ctnFee.otherPrice !== undefined &&
                      ctnFee.otherPrice !== null);

                  // 如果存在条件数据，初始化并启用条件配置（使用索引作为feeType）
                  if (hasConditionData) {
                    const feeTypeStr = String(feeIndex);
                    initConditionalConfig(feeTypeStr, ctnCodeIdStr);
                    if (
                      conditionalFeeConfigs.value[feeTypeStr] &&
                      conditionalFeeConfigs.value[feeTypeStr][ctnCodeIdStr]
                    ) {
                      conditionalFeeConfigs.value[feeTypeStr][
                        ctnCodeIdStr
                      ].enabled = true;
                    }
                  }

                  // 将后端数据转换为 SurchargePriceItem 格式
                  surchargeItem.prices[ctnCodeIdStr] = {
                    price: ctnFee.price,
                    value: ctnFee.value,
                    conditionType: ctnFee.conditionType || 1,
                    operatorType: ctnFee.operatorType,
                    otherPrice: ctnFee.otherPrice,
                  };

                  // 直接使用原始的 ctnCodeId（number 类型）避免精度丢失
                  surchargeItem.seFreiPriceCtnFees?.push({
                    id: ctnFee.id,
                    ctnCodeId: ctnInfo.ctnCodeId,
                    price: ctnFee.price,
                    conditionType: ctnFee.conditionType,
                    operatorType: ctnFee.operatorType,
                    value: ctnFee.value,
                    otherPrice: ctnFee.otherPrice,
                  });
                }
              });
            }

            surchargeFees.value.push(surchargeItem);
          });
        }
      } else {
        // 新增模式 - 初始化空数据
        isBatchMode.value = false;
        id.value = undefined;
        // 创建空的formData结构，包含空的箱型数组
        formData.value = {
          id: '',
          recommend: false,
          carrierId: 0,
          polId: 0,
          podId: 0,
          isDirect: true,
          validTimeStart: '',
          validTimeEnd: '',
          currencyId: 0,
          creationTime: '',
          isValid: true,
          seFreiPriceCtns: [], // 初始化为空数组
          seFreiPriceFees: [],
        } as SeFreiPriceOutDto;
      }
    }
  },

  closeOnClickModal: false,
});

const getModalTitle = computed(() => {
  if (isBatchMode.value) {
    return `批量更改 (已选中 ${batchIds.value.length} 条)`;
  }
  if (onlySurchargeFees.value) {
    return '编辑附加费';
  }
  return formData.value?.id
    ? $t('common.edit', '运价')
    : $t('common.create', '运价');
});

// 订单状态下拉框
const freightConditionItemOptions = ref<any[]>([]);
const conditionComparisonTypeOptions = ref<any[]>([]);

onMounted(async () => {
  // 从缓存获取枚举项（如果缓存不存在会自动加载）
  freightConditionItemOptions.value = await getEnumItems(
    'freightConditionItem',
  );
  freightConditionItemOptions.value = freightConditionItemOptions.value.map(
    (item) => {
      return {
        label: item.displayName,
        value: item.value,
        description: item.description, // 可选：如果需要在选项中显示描述信息
      };
    },
  );

  conditionComparisonTypeOptions.value = await getEnumItems(
    'ConditionComparisonType',
  );
  conditionComparisonTypeOptions.value =
    conditionComparisonTypeOptions.value.map((item) => {
      return {
        label: item.displayName,
        value: item.value,
      };
    });
});
</script>

<template>
  <Modal :title="getModalTitle" class="w-[1400px]">
    <div class="px-4">
      <!-- 批量模式提示 -->
      <div
        v-if="isBatchMode"
        class="mb-4 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800"
      >
        💡 填写的字段将统一更新到所有选中的航线记录中，留空的字段不会修改。
      </div>

      <!-- 基础信息 -->
      <div v-show="!onlySurchargeFees" class="mb-6">
        <div class="mb-3 border-b border-gray-200 pb-2">
          <span class="text-base font-semibold text-gray-700"> 基础信息 </span>
        </div>
        <Form />
      </div>

      <!-- 箱型费率 -->
      <div v-show="!onlySurchargeFees" class="mb-6">
        <div
          class="mb-3 flex items-center justify-between border-b border-gray-200 pb-2"
        >
          <span class="text-base font-semibold text-gray-700">
            箱型费率 {{ isBatchMode ? ' —留空则不修改' : '' }}
          </span>
        </div>

        <!-- 无箱型时的提示 -->
        <div
          v-if="dynamicCtnTypes.length === 0"
          class="rounded border border-dashed border-gray-300 py-8 text-center text-gray-400"
        >
          暂无箱型数据
        </div>

        <!-- 箱型费率表格 -->
        <div v-else class="overflow-x-auto">
          <table class="w-full border-collapse border border-gray-300">
            <thead>
              <tr class="bg-gray-100">
                <th class="border border-gray-300 px-3 py-2 text-left">
                  费用类型
                </th>
                <th
                  v-for="ctn in dynamicCtnTypes"
                  :key="ctn.ctnCodeId"
                  class="border border-gray-300 px-3 py-2 text-center"
                >
                  {{ ctn.name }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border border-gray-300 px-3 py-2">海运费</td>

                <!-- 箱型价格输入 -->
                <td
                  v-for="ctn in dynamicCtnTypes"
                  :key="ctn.ctnCodeId"
                  class="border border-gray-300 px-2 py-2"
                >
                  <input
                    v-model.number="ctn.cost"
                    type="number"
                    class="w-full rounded border border-gray-300 px-2 py-1 text-center text-sm"
                    placeholder="-"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 附加费明细 -->
      <div
        class="mb-6"
        v-if="
          !isBatchMode &&
          (onlySurchargeFees || formData?.id || surchargeFees.length > 0)
        "
      >
        <div
          class="mb-3 flex items-center justify-between border-b border-gray-200 pb-2"
        >
          <span class="text-base font-semibold text-gray-700">
            附加费明细
          </span>
          <div class="flex gap-2">
            <Button type="primary" size="small" ghost @click="addSurchargeFee">
              + 添加
            </Button>
            <Button
              danger
              size="small"
              ghost
              :disabled="surchargeFees.length === 0"
              @click="surchargeFees.length > 0 && surchargeFees.pop()"
            >
              - 删除
            </Button>
          </div>
        </div>

        <div v-if="surchargeFees.length === 0" class="empty-tip">
          暂无附加费，点击"添加"按钮添加附加费
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full border-collapse border border-gray-300">
            <thead>
              <tr class="bg-gray-100">
                <th
                  class="border border-gray-300 px-3 py-2 text-center"
                  style="width: 150px"
                >
                  费用名称
                </th>
                <th
                  class="border border-gray-300 px-3 py-2 text-center"
                  style="width: 100px"
                >
                  币别
                </th>
                <th
                  class="border border-gray-300 px-3 py-2 text-center"
                  style="width: 120px"
                >
                  计费方式
                </th>
                <th
                  v-for="ctn in dynamicCtnTypes"
                  :key="ctn.ctnCodeId"
                  class="border border-gray-300 px-3 py-2 text-center"
                >
                  {{ ctn.name }}
                </th>
                <th
                  class="border border-gray-300 px-3 py-2 text-center"
                  style="width: 80px"
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(surcharge, index) in surchargeFees" :key="index">
                <!-- 费用名称选择 -->
                <td class="border border-gray-300 px-2 py-2">
                  <Select
                    v-model:value="surcharge.feeCodeId"
                    class="w-full"
                    show-search
                    :filter-option="filterFeeOption"
                    placeholder="请选择费用名称"
                    allow-clear
                  >
                    <Select.Option
                      v-for="fee in feeCodeList"
                      :key="fee.value"
                      :value="fee.value"
                    >
                      {{ fee.label }}
                    </Select.Option>
                  </Select>
                </td>

                <!-- 币别选择 -->
                <td class="border border-gray-300 px-2 py-2">
                  <Select
                    v-model:value="surcharge.currencyId!"
                    class="w-full"
                    show-search
                    :filter-option="filterCurrencyOption"
                    placeholder="请选择币别"
                    allow-clear
                  >
                    <Select.Option
                      v-for="currency in currencyList"
                      :key="currency.value"
                      :value="currency.value"
                    >
                      {{ currency.label }}
                    </Select.Option>
                  </Select>
                </td>

                <!-- 计费方式 -->
                <td class="border border-gray-300 px-2 py-2">
                  <Select
                    v-model:value="surcharge.priceFeeType"
                    class="w-full"
                    placeholder="计费方式"
                    :options="[
                      { label: '按集装箱', value: PriceFeeType.Ctn },
                      { label: '按票', value: PriceFeeType.Order },
                    ]"
                    @change="
                      (value: any) => handlePriceFeeTypeChange(index, value)
                    "
                  />
                </td>

                <!-- 箱型价格列 -->
                <td
                  v-for="ctn in dynamicCtnTypes"
                  :key="`fee${ctn.ctnCodeId}`"
                  class="relative border border-gray-300 py-2 pl-4 pr-3"
                >
                  <!-- 条件模式图标 -->
                  <div class="absolute left-1 top-1 z-10">
                    <button
                      type="button"
                      class="flex h-5 w-5 items-center justify-center rounded bg-white text-gray-400 shadow-sm transition-all hover:text-blue-600 hover:shadow-md"
                      @click="
                        showConditionPopup(
                          $event,
                          index.toString(),
                          ctn.ctnCodeId,
                        )
                      "
                      title="设置条件费用"
                    >
                      <IconifyIcon
                        icon="mdi:filter-outline"
                        class="h-3.5 w-3.5"
                      />
                    </button>

                    <!-- 条件配置弹窗 -->
                    <div
                      v-if="
                        conditionPopupVisible &&
                        currentConditionCell?.feeType === index.toString() &&
                        currentConditionCell?.ctnCodeId === ctn.ctnCodeId
                      "
                      class="absolute left-0 top-7 z-50 min-w-[180px] rounded-lg border border-gray-200 bg-white p-3 shadow-xl"
                      @click.stop
                    >
                      <label
                        class="flex cursor-pointer items-center space-x-2 rounded px-2 py-1.5 transition-colors hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          :checked="
                            getConditionalConfig(
                              index.toString(),
                              ctn.ctnCodeId,
                            ).enabled
                          "
                          @change="
                            toggleConditionEnabled(
                              ($event.target as HTMLInputElement).checked,
                            )
                          "
                          class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span class="text-sm font-medium text-gray-700"
                          >启用条件模式</span
                        >
                      </label>
                    </div>
                  </div>

                  <!-- 条件模式内容 -->
                  <div
                    v-if="
                      getConditionalConfig(index.toString(), ctn.ctnCodeId)
                        .enabled
                    "
                    class="mt-6 space-y-2"
                  >
                    <!-- 条件配置行 -->
                    <div class="flex items-center gap-1.5">
                      <Select
                        size="small"
                        :value="surcharge.prices[ctn.ctnCodeId]?.conditionType"
                        :options="freightConditionItemOptions"
                        class="flex-1"
                        @change="
                          (val) =>
                            updateSurchargePriceValue(
                              index,
                              ctn.ctnCodeId,
                              'conditionType',
                              String(val),
                            )
                        "
                        placeholder="条件类型"
                      />

                      <!-- 算符切换按钮 -->
                      <button
                        type="button"
                        class="flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-sm font-semibold text-blue-600 transition-all hover:border-blue-400 hover:bg-blue-50 focus:outline-none"
                        @click="toggleOperator(index, ctn.ctnCodeId)"
                        :title="'点击切换算符'"
                      >
                        {{
                          getOperatorSymbol(
                            surcharge.prices[ctn.ctnCodeId]?.operatorType,
                          )
                        }}
                      </button>

                      <Input
                        size="small"
                        :value="surcharge.prices[ctn.ctnCodeId]?.value"
                        @input="
                          updateSurchargePriceValue(
                            index,
                            ctn.ctnCodeId,
                            'value',
                            ($event.target as HTMLInputElement).value,
                          )
                        "
                        type="number"
                        class="flex-1"
                        placeholder="阈值"
                      />

                      <!-- 条件说明（单位） -->
                      <span
                        v-if="surcharge.prices[ctn.ctnCodeId]?.conditionType"
                        class="whitespace-nowrap text-xs text-gray-500"
                      >
                        {{
                          freightConditionItemOptions.find(
                            (o) =>
                              o.value ===
                              surcharge.prices[ctn.ctnCodeId]?.conditionType,
                          )?.description
                        }}
                      </span>
                    </div>
                    <!-- 价格输入区域 -->
                    <div
                      class="flex overflow-hidden rounded-lg border border-gray-300 bg-white transition-colors"
                    >
                      <!-- 满足条件的价格 (70%) -->
                      <div class="w-[70%]">
                        <div
                          class="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100 px-2 py-1 text-center text-xs font-semibold text-blue-700"
                        >
                          是
                        </div>
                        <div class="px-2 py-1">
                          <Input
                            size="small"
                            :value="surcharge.prices[ctn.ctnCodeId]?.price"
                            @input="
                              updateSurchargePriceValue(
                                index,
                                ctn.ctnCodeId,
                                'price',
                                ($event.target as HTMLInputElement).value,
                              )
                            "
                            type="number"
                            class="h-9 w-full rounded-none text-center"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <!-- ELSE 分隔线 (30%) -->
                      <div
                        class="flex w-[30%] flex-col border-l border-gray-300 bg-gray-50"
                      >
                        <div
                          class="border-b border-gray-200 bg-gradient-to-r from-gray-100 to-gray-200 px-2 py-1 text-center text-xs font-semibold text-gray-600"
                        >
                          否则
                        </div>
                        <div class="px-2 py-1">
                          <Input
                            size="small"
                            :value="surcharge.prices[ctn.ctnCodeId]?.otherPrice"
                            @input="
                              updateSurchargePriceValue(
                                index,
                                ctn.ctnCodeId,
                                'otherPrice',
                                ($event.target as HTMLInputElement).value,
                              )
                            "
                            type="number"
                            class="h-9 w-full rounded-none text-center"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 普通模式（无条件） -->
                  <div v-else class="relative mt-6">
                    <Input
                      :value="surcharge.prices[ctn.ctnCodeId]?.price"
                      @input="
                        updateSurchargePriceValue(
                          index,
                          ctn.ctnCodeId,
                          'price',
                          ($event.target as HTMLInputElement).value,
                        )
                      "
                      type="number"
                      class="w-full rounded-lg border border-gray-300 py-2 pl-2 pr-2 text-center transition-colors hover:border-blue-400 focus:outline-none"
                      placeholder="0"
                    />
                  </div>
                </td>

                <!-- 删除按钮 -->
                <td class="border border-gray-300 px-2 py-2 text-center">
                  <Button
                    type="link"
                    danger
                    size="small"
                    @click="removeSurchargeFee(index)"
                  >
                    <IconifyIcon icon="mdi:delete-outline" class="size-4" />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end space-x-2">
        <Button @click="modalApi.close()"> 取消 </Button>
        <Button
          type="primary"
          class="rounded text-white"
          @click="modalApi.onConfirm()"
        >
          {{ isBatchMode ? '确认修改' : '确认' }}
        </Button>
      </div>
    </template>
  </Modal>
</template>

<style lang="scss" scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

:deep(.ant-input-sm) {
  padding: 2px 8px;
}

:deep(.ant-select-sm) {
  .ant-select-selector {
    padding: 2px 8px !important;
  }
}

// 条件模式图标按钮样式
button[title='设置条件费用'] {
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }
}

// 输入框焦点效果
input[type='number'] {
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:focus {
    outline: none;
  }
}

// 条件配置区域动画
.space-y-2 {
  animation: fade-in 0.3s ease-in-out;
}

// 价格输入区域渐变背景增强
.bg-gradient-to-r {
  background-size: 200% 100%;
  transition: background-position 0.3s ease;

  &:hover {
    background-position: right center;
  }
}

// 空状态提示
.empty-tip {
  padding: 16px;
  font-size: 14px;
  color: #999;
  text-align: center;
  background: #fff;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
}
</style>
