<script lang="ts" setup>
import type {
  BatchEditSeFreiPriceInput,
  SeFreiPriceCtnAddDto,
  SeFreiPriceFeeAddDto,
  SeFreiPriceDayAddDto,
  SeFreiPriceWeekDayAddDto,
  CtnCodeDto,
} from '#/api/sea-export/freight-rate-admin';

import { PriceFeeType } from '#/api/sea-export/freight-rate-admin';

import { computed, ref, onMounted } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useVbenForm } from '#/adapter/form';
import {
  batchEditSeFreiPrice,
  GetCtnCodesByPriceIdsAsync,
} from '#/api/sea-export/freight-rate-admin';
import { $t } from '#/locales';
import { Button, Select, Input, DatePicker, TimePicker } from 'ant-design-vue';
import PortSelect from '#/adapter/component/biz-select/port-select.vue';
import CarrierSelect from '#/adapter/component/biz-select/carrier-select.vue';
import CurrencySelect from '#/adapter/component/biz-select/currency-select.vue';
import { getEnumItems } from '#/utils/init-enum';

const emits = defineEmits(['success']);

// ==================== 状态定义 ====================

const batchIds = ref<string[]>([]);
const isBatchMode = ref(true); // 始终为批量模式

// 箱型列表（从API获取）
const ctnCodes = ref<CtnCodeDto[]>([]);

// 币别列表（用于下拉选择）
const currencyList = ref<any[]>([]);

// 费用代码列表（用于下拉选择，包含完整信息）
const feeCodeList = ref<
  Array<{ label: string; value: number; currencyId?: number }>
>([]);

// 枚举选项
const freightConditionItemOptions = ref<any[]>([]);
const conditionComparisonTypeOptions = ref<any[]>([]);

// 日期编辑模式：'date' - 完整日期时间, 'week' - 星期+时间点
const dateEditMode = ref<'date' | 'week'>('date');

// 日期数据列表
interface DateGroup {
  etd?: string;
  closeDocTime?: string;
  closingTime?: string;
}

interface WeekGroup {
  etdDayOfWeek?: number;
  etdDayTime?: string;
  closeDocDayOfWeek?: number;
  closeDocDayTime?: string;
  closingDayOfWeek?: number;
  closingDayTime?: string;
}

const etdList = ref<DateGroup[]>([]);
const etdDayList = ref<WeekGroup[]>([]);

// 附加费价格数据结构
interface SurchargePriceItem {
  price?: number;
  conditionType?: number;
  operatorType?: number;
  value?: number;
  otherPrice?: number;
}

// 附加费数据结构
interface SurchargeFeeItem {
  feeCodeId?: number;
  currencyId?: number | null;
  priceFeeType: PriceFeeType;
  prices: Record<string, SurchargePriceItem>;
}

// 附加费列表
const surchargeFees = ref<SurchargeFeeItem[]>([]);

// 条件费用配置数据结构
interface ConditionalFeeConfig {
  enabled: boolean;
  threshold?: number;
  valueIfGreater?: number;
  valueOtherwise?: number;
}

// 条件费用配置状态
const conditionalFeeConfigs = ref<
  Record<string, Record<string, ConditionalFeeConfig>>
>({});

// 条件选择弹窗状态
const conditionPopupVisible = ref(false);
const conditionPopupPosition = ref({ top: 0, left: 0 });
const currentConditionCell = ref<{
  feeIndex: number;
  ctnCodeId: string;
} | null>(null);

// ==================== 表单配置 ====================

// 主表表单配置
const [Form, formApi] = useVbenForm({
  schema: [
    {
      component: CarrierSelect,
      fieldName: 'carrierId',
      label: '船公司',
      componentProps: () => ({
        placeholder: '留空不修改',
        allowClear: true,
      }),
    },
    {
      component: CurrencySelect,
      fieldName: 'currencyId',
      label: '币别',
      componentProps: () => ({
        placeholder: '留空不修改',
        allowClear: true,
      }),
    },
    {
      component: 'Input',
      fieldName: 'voyage',
      label: '航程(天)',
      componentProps: {
        placeholder: '留空不修改',
        maxlength: 100,
      },
      formItemClass: 'w-full',
    },
    {
      component: PortSelect,
      fieldName: 'polId',
      label: '起运港',
      componentProps: () => ({
        placeholder: '留空不修改',
        allowClear: true,
      }),
      formItemClass: 'w-full',
    },
    {
      component: PortSelect,
      fieldName: 'podId',
      label: '目的港',
      componentProps: () => ({
        placeholder: '留空不修改',
        allowClear: true,
      }),
      rules: '',
    },
    {
      component: 'RadioGroup',
      fieldName: 'isDirect',
      label: '是否直达',
      defaultValue: undefined,
      componentProps: {
        options: [
          { label: '不改', value: undefined },
          { label: '是', value: true },
          { label: '否', value: false },
        ],
        optionType: 'button',
      },
    },
    {
      component: PortSelect,
      fieldName: 'poT1Id',
      label: '中转港1',
      componentProps: () => ({
        placeholder: '留空不修改',
        allowClear: true,
      }),
    },
    {
      component: PortSelect,
      fieldName: 'poT2Id',
      label: '中转港2',
      componentProps: () => ({
        placeholder: '留空不修改',
        allowClear: true,
      }),
    },
    {
      component: 'InputNumber',
      fieldName: 'polFreeDays',
      label: '起运港免用箱',
      componentProps: {
        placeholder: '留空不修改',
        min: 0,
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'podFreeDays',
      label: '目的港免用箱',
      componentProps: {
        placeholder: '留空不修改',
        min: 0,
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'poddem',
      label: '目的港免堆期',
      componentProps: {
        placeholder: '留空不修改',
        min: 0,
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'poddet',
      label: '目的港免箱期',
      componentProps: {
        placeholder: '留空不修改',
        min: 0,
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'validTimeStart',
      label: '有效起始日期',
      componentProps: {
        placeholder: '留空不修改',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'validTimeEnd',
      label: '有效截止日期',
      componentProps: {
        placeholder: '留空不修改',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
    },
    {
      component: 'RadioGroup',
      fieldName: 'recommend',
      label: '是否推荐',
      defaultValue: undefined,
      componentProps: {
        options: [
          { label: '不改', value: undefined },
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
        placeholder: '留空不修改...',
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

// ==================== 日期编辑方法 ====================

// 切换到日期模式
function switchToDateMode() {
  dateEditMode.value = 'date';
  // 清空星期模式数据
  etdDayList.value = [];
}

// 切换到星期模式
function switchToWeekMode() {
  dateEditMode.value = 'week';
  // 清空日期模式数据
  etdList.value = [];
}

// 添加日期组
function addDateGroup() {
  if (dateEditMode.value === 'date') {
    etdList.value.push({
      etd: undefined,
      closeDocTime: undefined,
      closingTime: undefined,
    });
  } else {
    etdDayList.value.push({
      etdDayOfWeek: undefined,
      closeDocDayOfWeek: undefined,
      closeDocDayTime: undefined,
      closingDayOfWeek: undefined,
      closingDayTime: undefined,
    });
  }
}

// 删除日期组
function removeDateGroup(index: number) {
  if (dateEditMode.value === 'date') {
    etdList.value.splice(index, 1);
  } else {
    etdDayList.value.splice(index, 1);
  }
}

// ==================== 附加费管理方法 ====================

// 初始化条件配置
function initConditionalConfig(feeIndex: number, ctnCodeId: string) {
  const feeIndexStr = String(feeIndex);
  if (!conditionalFeeConfigs.value[feeIndexStr]) {
    conditionalFeeConfigs.value[feeIndexStr] = {};
  }
  if (!conditionalFeeConfigs.value[feeIndexStr][ctnCodeId]) {
    conditionalFeeConfigs.value[feeIndexStr][ctnCodeId] = {
      enabled: false,
      threshold: undefined,
      valueIfGreater: undefined,
      valueOtherwise: undefined,
    };
  }
}

// 获取条件配置
function getConditionalConfig(
  feeIndex: number,
  ctnCodeId: string,
): ConditionalFeeConfig {
  initConditionalConfig(feeIndex, ctnCodeId);
  return conditionalFeeConfigs.value[String(feeIndex)]?.[
    ctnCodeId
  ] as ConditionalFeeConfig;
}

// 显示条件选择弹窗
function showConditionPopup(
  event: MouseEvent,
  feeIndex: number,
  ctnCodeId: string,
) {
  event.stopPropagation();
  const target = event.target as HTMLElement;
  const rect = target.getBoundingClientRect();

  currentConditionCell.value = { feeIndex, ctnCodeId };
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
  if (currentConditionCell.value) {
    const config = getConditionalConfig(
      currentConditionCell.value.feeIndex,
      currentConditionCell.value.ctnCodeId,
    );
    config.enabled = enabled;

    if (!enabled) {
      config.threshold = undefined;
      config.valueIfGreater = undefined;
      config.valueOtherwise = undefined;

      const feeIndex = currentConditionCell.value.feeIndex;
      const ctnCodeId = currentConditionCell.value.ctnCodeId;
      if (surchargeFees.value[feeIndex]) {
        surchargeFees.value[feeIndex].prices[ctnCodeId] = {
          ...surchargeFees.value[feeIndex].prices[ctnCodeId],
          price: undefined,
        };
      }
    }
  }
  hideConditionPopup();
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

// 处理计费方式变化
function handlePriceFeeTypeChange(index: number, value: PriceFeeType) {
  const fee = surchargeFees.value[index];
  if (!fee) return;

  fee.priceFeeType = value;

  // 切换计费方式时清空相关数据
  if (value === PriceFeeType.Ctn) {
    // 按集装箱：清空按票价格
    delete fee.prices['order'];
  } else {
    // 按票：清空箱型费用，保留order价格
    Object.keys(fee.prices).forEach((key) => {
      if (key !== 'order') {
        delete fee.prices[key];
      }
    });
  }
}

// 处理费用代码变化，自动填充默认币别
function handleFeeCodeChange(index: number, feeCodeId: number | undefined) {
  if (!feeCodeId) return;

  const feeItem = feeCodeList.value.find((item) => item.value === feeCodeId);
  if (feeItem && feeItem.currencyId && surchargeFees.value[index]) {
    // 自动填充默认币别
    surchargeFees.value[index].currencyId = feeItem.currencyId;
  }
}

// 切换算符
function toggleOperator(index: number, ctnCodeId: string) {
  const currentOperator =
    surchargeFees.value[index]?.prices[ctnCodeId]?.operatorType || 1;

  const operatorSequence = conditionComparisonTypeOptions.value.map(
    (opt) => opt.value,
  );

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

// 添加附加费
function addSurchargeFee() {
  surchargeFees.value.push({
    priceFeeType: PriceFeeType.Ctn,
    prices: {},
  });
}

// 删除附加费
function removeSurchargeFee(index: number) {
  surchargeFees.value.splice(index, 1);
}

// 费用代码选项模糊搜索过滤函数
function filterFeeOption(input: string, option: any) {
  if (!input) return true;

  const feeItem = feeCodeList.value.find((item) => item.value === option.value);
  const label = feeItem?.label || '';

  return String(label).toLowerCase().includes(input.toLowerCase());
}

// ==================== Modal 配置 ====================

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const values = await formApi.getValues();

    // 构建箱型列表（seFreiPriceCtns）
    const seFreiPriceCtns: SeFreiPriceCtnAddDto[] = [];

    // 从 ctnCodes 中获取所有箱型，并检查是否有修改的 cost
    ctnCodes.value.forEach((ctn) => {
      const costInput = document.getElementById(
        `ctn_${ctn.id}`,
      ) as HTMLInputElement;
      const cost = costInput?.value ? Number(costInput.value) : undefined;

      // 只有当用户填写了 cost 时才包含该箱型
      if (cost !== undefined && !isNaN(cost)) {
        seFreiPriceCtns.push({
          ctnCodeId: ctn.id, // 使用 ctn.id 作为 ctnCodeId
          cost: cost,
        });
      }
    });

    // 构建费用列表（seFreiPriceFees）
    const seFreiPriceFees: SeFreiPriceFeeAddDto[] = [];

    console.log('=== 附加费数据调试 ===');
    console.log('surchargeFees.value:', surchargeFees.value);

    surchargeFees.value.forEach((surcharge, index) => {
      console.log(`附加费[${index}]:`, {
        feeCodeId: surcharge.feeCodeId,
        currencyId: surcharge.currencyId,
        priceFeeType: surcharge.priceFeeType,
        prices: surcharge.prices,
      });

      // 批量编辑：只要费用代码有值就提交，其他字段留空传null
      if (surcharge.feeCodeId) {
        const isOrderFee = surcharge.priceFeeType === PriceFeeType.Order;

        let ctnFees: any[] | undefined;

        if (isOrderFee) {
          // 按票计费：不需要箱型费用列表
          ctnFees = undefined;
        } else {
          // 按集装箱计费：构建箱型费用列表
          ctnFees = Object.entries(surcharge.prices)
            .map(([ctnCodeIdStr, priceItem]) => {
              if (ctnCodeIdStr === 'order') {
                return null;
              }

              const originalCtn = ctnCodes.value.find(
                (ctn) => String(ctn.id) === ctnCodeIdStr,
              );

              if (!originalCtn || priceItem.price === undefined) {
                return null;
              }

              return {
                ctnCodeId: originalCtn.id,
                price: priceItem.price,
                conditionType: priceItem.conditionType,
                operatorType: priceItem.operatorType,
                value: priceItem.value,
                otherPrice: priceItem.otherPrice,
              };
            })
            .filter(
              (ctnFee): ctnFee is NonNullable<typeof ctnFee> =>
                ctnFee !== null && ctnFee.price !== undefined,
            );
        }

        const orderPrice = isOrderFee
          ? (surcharge.prices['order']?.price ?? 0)
          : undefined;

        const fee: SeFreiPriceFeeAddDto = {
          feeCodeId: surcharge.feeCodeId,
          currencyId: surcharge.currencyId ?? null, // 留空传null
          priceFeeType: surcharge.priceFeeType,
          price: orderPrice,
          seFreiPriceCtnFees:
            ctnFees && ctnFees.length > 0 ? ctnFees : undefined,
        };

        seFreiPriceFees.push(fee);
      }
    });

    // 构建关联日列表（seFreiPriceDays）
    const seFreiPriceDays: SeFreiPriceDayAddDto[] = [];
    if (dateEditMode.value === 'date' && etdList.value.length > 0) {
      etdList.value.forEach((group) => {
        if (group.etd || group.closeDocTime || group.closingTime) {
          seFreiPriceDays.push({
            etd: group.etd,
            closeDocTime: group.closeDocTime,
            closingTime: group.closingTime,
          });
        }
      });
    }

    // 构建关联周几列表（seFreiPriceWeekDays）
    const seFreiPriceWeekDays: SeFreiPriceWeekDayAddDto[] = [];
    if (dateEditMode.value === 'week' && etdDayList.value.length > 0) {
      etdDayList.value.forEach((group) => {
        if (
          group.etdDayOfWeek !== undefined ||
          group.closeDocDayOfWeek !== undefined ||
          group.closingDayOfWeek !== undefined
        ) {
          seFreiPriceWeekDays.push({
            etdDayOfWeek: group.etdDayOfWeek,
            etdDayTime: undefined,
            closeDocDayOfWeek: group.closeDocDayOfWeek,
            closeDocDayTime: group.closeDocDayTime,
            closingDayOfWeek: group.closingDayOfWeek,
            closingDayTime: group.closingDayTime,
          });
        }
      });
    }

    // 构建提交数据
    const submitData: BatchEditSeFreiPriceInput = {
      ids: batchIds.value,
      carrierId: values.carrierId ?? null,
      currencyId: values.currencyId ?? null,
      polId: values.polId ?? null,
      podId: values.podId ?? null,
      isDirect: values.isDirect ?? null,
      poT1Id: values.poT1Id ?? null,
      poT2Id: values.poT2Id ?? null,
      polFreeDays: values.polFreeDays ?? null,
      podFreeDays: values.podFreeDays ?? null,
      poddem: values.poddem ?? null,
      poddet: values.poddet ?? null,
      voyage: values.voyage ?? null,
      recommend: values.recommend ?? null,
      validTimeStart: values.validTimeStart ?? null,
      validTimeEnd: values.validTimeEnd ?? null,
      remark: values.remark ?? null,
      seFreiPriceCtns: seFreiPriceCtns.length > 0 ? seFreiPriceCtns : undefined,
      seFreiPriceFees: seFreiPriceFees.length > 0 ? seFreiPriceFees : undefined,
      seFreiPriceDays: seFreiPriceDays.length > 0 ? seFreiPriceDays : undefined,
      seFreiPriceWeekDays:
        seFreiPriceWeekDays.length > 0 ? seFreiPriceWeekDays : undefined,
    };

    console.log('c-submitData', submitData);

    modalApi.lock();
    batchEditSeFreiPrice(submitData)
      .then(() => {
        emits('success');
        modalApi.close();
      })
      .catch(() => {
        modalApi.unlock();
      });
  },

  async onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData<any>();
      console.log('c-data:', data);

      formApi.resetForm();
      surchargeFees.value = [];
      etdList.value = [];
      etdDayList.value = [];
      conditionalFeeConfigs.value = {};
      dateEditMode.value = 'date';

      if (data?.ids) {
        batchIds.value = data.ids;

        // 加载币别和费用代码列表
        await loadSelectData();

        // 获取箱型列表
        try {
          const ctnResponse = await GetCtnCodesByPriceIdsAsync(data.ids);
          ctnCodes.value = ctnResponse || [];
          console.log('获取到的箱型列表:', ctnCodes.value);
        } catch (error) {
          console.error('获取箱型列表失败:', error);
          ctnCodes.value = [];
        }
      }
    }
  },

  closeOnClickModal: false,
});

// ==================== 数据加载 ====================

async function loadSelectData() {
  try {
    // 加载币别列表
    const { getCurrencyPagedList } =
      await import('#/api/system/base-data/currency-admin');
    const currencyRes = await getCurrencyPagedList({ PageSize: 1000 });
    currencyList.value = (currencyRes.items || []).map((item: any) => ({
      label: item.code || item.enName,
      value: item.id,
    }));

    // 加载费用代码列表（保留完整信息用于自动填充币别）
    const { getFeeCodePagedList } =
      await import('#/api/system/base-data/fee-code-admin');
    const feeRes = await getFeeCodePagedList({ PageSize: 1000 });
    feeCodeList.value = (feeRes.items || []).map((item: any) => ({
      label: item.cnName || item.enName,
      value: item.id,
      currencyId: item.currencyId, // 保留币别ID用于自动填充
    }));
  } catch (error) {
    console.error('加载下拉数据失败:', error);
  }
}

onMounted(async () => {
  // 从缓存获取枚举项
  freightConditionItemOptions.value = await getEnumItems(
    'freightConditionItem',
  );
  freightConditionItemOptions.value = freightConditionItemOptions.value.map(
    (item) => {
      return {
        label: item.displayName,
        value: item.value,
        description: item.description,
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
  <Modal :title="`批量更改 (已选中 ${batchIds.length} 条)`" class="w-[1400px]">
    <div class="px-4">
      <!-- 提示 -->
      <div
        class="mb-4 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800"
      >
        💡 填写的字段将统一更新到所有选中的航线记录中，留空的字段不会修改。
      </div>

      <!-- 基础信息 -->
      <div class="mb-6">
        <div class="mb-3 border-b border-gray-200 pb-2">
          <span class="text-base font-semibold text-gray-700"> 基础信息 </span>
        </div>
        <Form />
      </div>

      <!-- 日期时间设置（独立模块） -->
      <div class="mb-6">
        <div
          class="mb-3 flex items-center justify-between border-b border-gray-200 pb-2"
        >
          <span class="text-base font-semibold text-gray-700">
            日期时间设置
          </span>
          <div class="flex items-center gap-2">
            <!-- 模式切换按钮 -->
            <Button
              :type="dateEditMode === 'date' ? 'primary' : 'default'"
              size="small"
              @click="switchToDateMode"
            >
              <IconifyIcon icon="mdi:calendar-range" class="mr-1 size-4" />
              日期模式
            </Button>
            <Button
              :type="dateEditMode === 'week' ? 'primary' : 'default'"
              size="small"
              @click="switchToWeekMode"
            >
              <IconifyIcon icon="mdi:calendar-weekend" class="mr-1 size-4" />
              星期模式
            </Button>
            <!-- 添加按钮 -->
            <Button type="link" size="small" @click="addDateGroup">
              <IconifyIcon icon="mdi:plus" class="size-4" />
              添加一组
            </Button>
          </div>
        </div>

        <!-- 日期模式 -->
        <div v-if="dateEditMode === 'date'">
          <div v-if="etdList.length === 0" class="empty-tip">
            暂无日期数据，请点击"添加一组"按钮添加
          </div>
          <div v-else class="sub-table">
            <div
              v-for="(dateGroup, index) in etdList"
              :key="index"
              class="sub-table-row date-group-row"
            >
              <div class="date-group-content">
                <!-- 开船日期 -->
                <div class="date-field">
                  <label class="field-label">
                    <IconifyIcon icon="mdi:ship-wheel" class="mr-1 size-4" />
                    开船日期
                  </label>
                  <DatePicker
                    v-model:value="dateGroup.etd"
                    placeholder="请选择开船日期"
                    format="YYYY-MM-DD HH:mm"
                    value-format="YYYY-MM-DD HH:mm"
                    show-time
                    :time-picker-props="{ format: 'HH:mm' }"
                    style="width: 100%"
                  />
                </div>
                <!-- 截单时间 -->
                <div class="date-field">
                  <label class="field-label">
                    <IconifyIcon
                      icon="mdi:file-document-check"
                      class="mr-1 size-4"
                    />
                    截单时间
                  </label>
                  <DatePicker
                    v-model:value="dateGroup.closeDocTime"
                    placeholder="请选择截单时间"
                    format="YYYY-MM-DD HH:mm"
                    value-format="YYYY-MM-DD HH:mm"
                    show-time
                    :time-picker-props="{ format: 'HH:mm' }"
                    style="width: 100%"
                  />
                </div>
                <!-- 截关时间 -->
                <div class="date-field">
                  <label class="field-label">
                    <IconifyIcon
                      icon="mdi:container-lock"
                      class="mr-1 size-4"
                    />
                    截关时间
                  </label>
                  <DatePicker
                    v-model:value="dateGroup.closingTime"
                    placeholder="请选择截关时间"
                    format="YYYY-MM-DD HH:mm"
                    value-format="YYYY-MM-DD HH:mm"
                    show-time
                    :time-picker-props="{ format: 'HH:mm' }"
                    style="width: 100%"
                  />
                </div>
              </div>
              <Button
                type="link"
                danger
                size="small"
                @click="removeDateGroup(index)"
                class="delete-btn"
              >
                <IconifyIcon icon="mdi:delete-outline" class="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <!-- 星期模式 -->
        <div v-if="dateEditMode === 'week'">
          <div v-if="etdDayList.length === 0" class="empty-tip">
            暂无星期数据，请点击"添加一组"按钮添加
          </div>
          <div v-else class="sub-table">
            <div
              v-for="(weekGroup, index) in etdDayList"
              :key="index"
              class="sub-table-row week-group-row"
            >
              <div class="week-group-content">
                <!-- 开船星期组 -->
                <div class="week-pair">
                  <div class="week-field">
                    <label class="field-label">
                      <IconifyIcon icon="mdi:ship-wheel" class="mr-1 size-4" />
                      开船星期
                    </label>
                    <Select
                      v-model:value="weekGroup.etdDayOfWeek"
                      placeholder="请选择"
                      style="width: 100%"
                      :options="[
                        { label: '周日', value: 0 },
                        { label: '周一', value: 1 },
                        { label: '周二', value: 2 },
                        { label: '周三', value: 3 },
                        { label: '周四', value: 4 },
                        { label: '周五', value: 5 },
                        { label: '周六', value: 6 },
                      ]"
                    />
                  </div>
                  <div class="week-field">
                    <label class="field-label">
                      <IconifyIcon
                        icon="mdi:clock-outline"
                        class="mr-1 size-4"
                      />
                      时间点
                    </label>
                    <TimePicker
                      v-model:value="weekGroup.etdDayTime"
                      placeholder="请选择"
                      format="HH:mm"
                      value-format="HH:mm:ss"
                      style="width: 100%"
                    />
                  </div>
                </div>

                <!-- 截单星期组 -->
                <div class="week-pair">
                  <div class="week-field">
                    <label class="field-label">
                      <IconifyIcon
                        icon="mdi:file-document-check"
                        class="mr-1 size-4"
                      />
                      截单星期
                    </label>
                    <Select
                      v-model:value="weekGroup.closeDocDayOfWeek"
                      placeholder="请选择"
                      style="width: 100%"
                      :options="[
                        { label: '周日', value: 0 },
                        { label: '周一', value: 1 },
                        { label: '周二', value: 2 },
                        { label: '周三', value: 3 },
                        { label: '周四', value: 4 },
                        { label: '周五', value: 5 },
                        { label: '周六', value: 6 },
                      ]"
                    />
                  </div>
                  <div class="week-field">
                    <label class="field-label">
                      <IconifyIcon
                        icon="mdi:clock-outline"
                        class="mr-1 size-4"
                      />
                      时间点
                    </label>
                    <TimePicker
                      v-model:value="weekGroup.closeDocDayTime"
                      placeholder="请选择"
                      format="HH:mm"
                      value-format="HH:mm:ss"
                      style="width: 100%"
                    />
                  </div>
                </div>

                <!-- 截关星期组 -->
                <div class="week-pair">
                  <div class="week-field">
                    <label class="field-label">
                      <IconifyIcon
                        icon="mdi:container-lock"
                        class="mr-1 size-4"
                      />
                      截关星期
                    </label>
                    <Select
                      v-model:value="weekGroup.closingDayOfWeek"
                      placeholder="请选择"
                      style="width: 100%"
                      :options="[
                        { label: '周日', value: 0 },
                        { label: '周一', value: 1 },
                        { label: '周二', value: 2 },
                        { label: '周三', value: 3 },
                        { label: '周四', value: 4 },
                        { label: '周五', value: 5 },
                        { label: '周六', value: 6 },
                      ]"
                    />
                  </div>
                  <div class="week-field">
                    <label class="field-label">
                      <IconifyIcon
                        icon="mdi:clock-outline"
                        class="mr-1 size-4"
                      />
                      时间点
                    </label>
                    <TimePicker
                      v-model:value="weekGroup.closingDayTime"
                      placeholder="请选择"
                      format="HH:mm"
                      value-format="HH:mm:ss"
                      style="width: 100%"
                    />
                  </div>
                </div>
              </div>
              <Button
                type="link"
                danger
                size="small"
                @click="removeDateGroup(index)"
                class="delete-btn"
              >
                <IconifyIcon icon="mdi:delete-outline" class="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- 箱型费率 -->
      <div v-if="ctnCodes.length > 0" class="mb-6">
        <div class="mb-3 border-b border-gray-200 pb-2">
          <span class="text-base font-semibold text-gray-700">
            箱型费率（海运费）— 留空则不修改
          </span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse border border-gray-300">
            <thead>
              <tr class="bg-gray-100">
                <th class="border border-gray-300 px-3 py-2 text-left">
                  费用类型
                </th>
                <th
                  v-for="ctn in ctnCodes"
                  :key="ctn.id"
                  class="border border-gray-300 px-3 py-2 text-center"
                >
                  {{ ctn.ctnName }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border border-gray-300 px-3 py-2">海运费</td>
                <td
                  v-for="ctn in ctnCodes"
                  :key="ctn.id"
                  class="border border-gray-300 px-2 py-2"
                >
                  <input
                    :id="`ctn_${ctn.id}`"
                    type="number"
                    class="w-full rounded border border-gray-300 px-2 py-1 text-center text-sm"
                    placeholder="留空不修改"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 附加费明细 -->
      <div class="mb-6">
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
                  v-for="ctn in ctnCodes"
                  :key="ctn.id"
                  class="border border-gray-300 px-3 py-2 text-center"
                >
                  {{ ctn.ctnName }}
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
                    @change="(value: any) => handleFeeCodeChange(index, value)"
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
                  <CurrencySelect
                    v-model:value="surcharge.currencyId"
                    class="w-full"
                    placeholder="请选择币别"
                    allow-clear
                  />
                </td>

                <!-- 计费方式 -->
                <td class="border border-gray-300 px-2 py-2">
                  <Select
                    v-model:value="surcharge.priceFeeType"
                    class="w-full"
                    placeholder="计费方式"
                    :options="[
                      { label: '按集装箱', value: 0 },
                      { label: '按票', value: 1 },
                    ]"
                    @change="
                      (value: any) => handlePriceFeeTypeChange(index, value)
                    "
                  />
                </td>

                <!-- 箱型价格列 -->
                <td
                  v-for="(ctn, ctnIndex) in ctnCodes"
                  :key="`fee${ctn.id}`"
                  class="relative border border-gray-300 py-2 pl-4 pr-3"
                >
                  <!-- 按票计费特殊处理：只在第一列显示输入框 -->
                  <div v-if="surcharge.priceFeeType === 1" class="mt-6">
                    <template v-if="ctnIndex === 0">
                      <div class="mb-1 text-center text-xs text-blue-600">
                        按票计费（所有箱型统一价格）
                      </div>
                      <Input
                        :value="surcharge.prices['order']?.price"
                        @input="
                          updateSurchargePriceValue(
                            index,
                            'order',
                            'price',
                            ($event.target as HTMLInputElement).value,
                          )
                        "
                        type="number"
                        class="w-full rounded-lg border border-gray-300 py-2 pl-2 pr-2 text-center transition-colors hover:border-blue-400 focus:outline-none"
                        placeholder="0"
                      />
                    </template>
                    <template v-else>
                      <div class="text-center text-gray-400">-</div>
                    </template>
                  </div>

                  <!-- 按集装箱计费：正常显示 -->
                  <template v-else>
                    <!-- 条件模式图标 -->
                    <div class="absolute left-1 top-1 z-10">
                      <button
                        type="button"
                        class="flex h-5 w-5 items-center justify-center rounded bg-white text-gray-400 shadow-sm transition-all hover:text-blue-600 hover:shadow-md"
                        @click="
                          showConditionPopup($event, index, String(ctn.id))
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
                          currentConditionCell?.feeIndex === index &&
                          currentConditionCell?.ctnCodeId === String(ctn.id)
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
                              getConditionalConfig(index, String(ctn.id))
                                .enabled
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
                      v-if="getConditionalConfig(index, String(ctn.id)).enabled"
                      class="mt-6 space-y-2"
                    >
                      <!-- 条件配置行 -->
                      <div class="flex items-center gap-1.5">
                        <Select
                          size="small"
                          :value="
                            surcharge.prices[String(ctn.id)]?.conditionType
                          "
                          :options="freightConditionItemOptions"
                          class="flex-1"
                          @change="
                            (val) =>
                              updateSurchargePriceValue(
                                index,
                                String(ctn.id),
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
                          @click="toggleOperator(index, String(ctn.id))"
                          :title="'点击切换算符'"
                        >
                          {{
                            getOperatorSymbol(
                              surcharge.prices[String(ctn.id)]?.operatorType,
                            )
                          }}
                        </button>

                        <Input
                          size="small"
                          :value="surcharge.prices[String(ctn.id)]?.value"
                          @input="
                            updateSurchargePriceValue(
                              index,
                              String(ctn.id),
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
                          v-if="surcharge.prices[String(ctn.id)]?.conditionType"
                          class="whitespace-nowrap text-xs text-gray-500"
                        >
                          {{
                            freightConditionItemOptions.find(
                              (o) =>
                                o.value ===
                                surcharge.prices[String(ctn.id)]?.conditionType,
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
                              :value="surcharge.prices[String(ctn.id)]?.price"
                              @input="
                                updateSurchargePriceValue(
                                  index,
                                  String(ctn.id),
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
                              :value="
                                surcharge.prices[String(ctn.id)]?.otherPrice
                              "
                              @input="
                                updateSurchargePriceValue(
                                  index,
                                  String(ctn.id),
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
                        :value="surcharge.prices[String(ctn.id)]?.price"
                        @input="
                          updateSurchargePriceValue(
                            index,
                            String(ctn.id),
                            'price',
                            ($event.target as HTMLInputElement).value,
                          )
                        "
                        type="number"
                        class="w-full rounded-lg border border-gray-300 py-2 pl-2 pr-2 text-center transition-colors hover:border-blue-400 focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                  </template>
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
          确认修改
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

// 日期时间设置模块样式
.date-group-row,
.week-group-row {
  position: relative;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 16px;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #fff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 5%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.date-group-row::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  content: '';
  background: linear-gradient(to bottom, #3b82f6, #60a5fa);
  border-radius: 8px 0 0 8px;
}

.date-group-content {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.week-group-content {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.date-field,
.week-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.date-field .field-label,
.week-field .field-label {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.week-pair {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.week-pair .week-field:first-child {
  flex: 1;
}

.week-pair .week-field:last-child {
  flex: 0 0 100px;
}

.delete-btn {
  flex-shrink: 0;
  margin-top: 24px;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.delete-btn:hover {
  opacity: 1;
}

// 模式切换按钮样式增强
.mode-btn-active {
  font-weight: 600 !important;
  color: white !important;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
  border-color: #2563eb !important;
  box-shadow: 0 4px 12px rgb(59 130 246 / 50%) !important;
  transform: scale(1.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.mode-btn-active:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
  box-shadow: 0 6px 16px rgb(59 130 246 / 60%) !important;
  transform: scale(1.1);
}

.mode-btn-inactive {
  color: #9ca3af !important;
  background-color: #fafafa !important;
  border-color: #e5e7eb !important;
  opacity: 0.6;
  transition: all 0.3s ease;
}

.mode-btn-inactive:hover {
  color: #6b7280 !important;
  background-color: #f3f4f6 !important;
  border-color: #d1d5db !important;
  opacity: 0.85;
}
</style>
