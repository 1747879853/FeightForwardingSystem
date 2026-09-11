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
import ClientSelect from '#/adapter/component/biz-select/client-select.vue';
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
  Array<{ label: string; value: number; currencyId?: number; code?: string }>
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
        style: { width: '100%' },
      }),
    },
    {
      component: CurrencySelect,
      fieldName: 'currencyId',
      label: '币别',
      componentProps: () => ({
        placeholder: '留空不修改',
        allowClear: true,
        style: { width: '100%' },
      }),
    },
    {
      component: ClientSelect,
      fieldName: 'bookingAgentId',
      label: '订舱代理',
      componentProps: () => ({
        placeholder: '留空不修改',
        allowClear: true,
        industryCategory: 'o', // 只展示行业类别包含"o"（订舱代理）的客户
        style: { width: '100%' },
      }),
    },
    {
      component: 'Input',
      fieldName: 'voyage',
      label: '航程(天)',
      componentProps: {
        placeholder: '留空不修改',
        maxlength: 100,
        style: { width: '100%' },
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
        style: { width: '100%' },
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
        style: { width: '100%' },
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
        style: { width: '100%' },
      },
    },
    {
      component: PortSelect,
      fieldName: 'poT1Id',
      label: '中转港1',
      componentProps: () => ({
        placeholder: '留空不修改',
        allowClear: true,
        style: { width: '100%' },
      }),
    },
    {
      component: PortSelect,
      fieldName: 'poT2Id',
      label: '中转港2',
      componentProps: () => ({
        placeholder: '留空不修改',
        allowClear: true,
        style: { width: '100%' },
      }),
    },
    {
      component: 'InputNumber',
      fieldName: 'polFreeDays',
      label: '起运港免用箱',
      componentProps: {
        placeholder: '留空不修改',
        min: 0,
        style: { width: '100%' },
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'podFreeDays',
      label: '目的港免用箱',
      componentProps: {
        placeholder: '留空不修改',
        min: 0,
        style: { width: '100%' },
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'poddem',
      label: '目的港免堆期',
      componentProps: {
        placeholder: '留空不修改',
        min: 0,
        style: { width: '100%' },
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'poddet',
      label: '目的港免箱期',
      componentProps: {
        placeholder: '留空不修改',
        min: 0,
        style: { width: '100%' },
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
        style: { width: '100%' },
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
        style: { width: '100%' },
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
        style: { width: '100%' },
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
        style: { width: '100%' },
      },
      formItemClass: 'col-span-4',
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
  // 只有当币别为空或null时，才自动填充默认币别
  // 如果用户已经选择了币别，则不覆盖
  if (
    feeItem &&
    feeItem.currencyId &&
    surchargeFees.value[index] &&
    (surchargeFees.value[index].currencyId === undefined ||
      surchargeFees.value[index].currencyId === null)
  ) {
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
  const label = feeItem?.code
    ? feeItem.code + '-' + feeItem.label
    : feeItem?.label || '';

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

    console.log('=== 附加费数据调试 (提交前) ===');
    console.log(
      'surchargeFees.value:',
      JSON.parse(JSON.stringify(surchargeFees.value)),
    );

    surchargeFees.value.forEach((surcharge, index) => {
      console.log(`--- 处理附加费索引 [${index}] ---`);
      console.log(`  费用代码ID (feeCodeId): ${surcharge.feeCodeId}`);
      console.log(
        `  当前币别ID (currencyId): ${surcharge.currencyId} (类型: ${typeof surcharge.currencyId})`,
      );
      console.log(`  计费方式 (priceFeeType): ${surcharge.priceFeeType}`);

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

        const finalCurrencyId = surcharge.currencyId ?? null;
        console.log(`  最终提交币别ID (finalCurrencyId): ${finalCurrencyId}`);

        const fee: SeFreiPriceFeeAddDto = {
          feeCodeId: surcharge.feeCodeId,
          currencyId: finalCurrencyId, // 留空传null
          priceFeeType: surcharge.priceFeeType,
          price: orderPrice,
          seFreiPriceCtnFees:
            ctnFees && ctnFees.length > 0 ? ctnFees : undefined,
        };

        console.log(`  生成的费用对象:`, fee);
        seFreiPriceFees.push(fee);
      }
    });

    console.log('=== 所有附加费处理完毕 ===');
    console.log('seFreiPriceFees:', seFreiPriceFees);

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
      bookingAgentId: values.bookingAgentId ?? null,
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
    if (!isOpen) {
      hideConditionPopup();
      document.removeEventListener('click', hideConditionPopup);
      return;
    }

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
      code: item.code,
      currencyId: item.currencyId, // 保留币别ID用于自动填充
    }));
    console.log('feeCodeList:', feeCodeList.value);
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
  <Modal
    :title="`批量更改 (已选中 ${batchIds.length} 条)`"
    class="freight-sync-update-modal w-[1400px]"
  >
    <div class="sync-update">
      <!-- 顶栏提示 -->
      <header class="sync-update__hero">
        <div class="sync-update__hero-main">
          <span class="sync-update__hero-icon" aria-hidden="true">
            <IconifyIcon icon="mdi:sync" />
          </span>
          <div class="sync-update__hero-text">
            <div class="sync-update__hero-title">批量更改运价</div>
            <p class="sync-update__hero-sub">
              已填写字段将统一写入选中记录；留空字段保持原值不变
            </p>
          </div>
        </div>
        <span class="sync-update__count-chip">
          已选
          <em>{{ batchIds.length }}</em>
          条
        </span>
      </header>

      <!-- 基础信息 -->
      <section class="form-section">
        <header class="section-header">
          <div class="section-title">
            <div class="section-title-icon">
              <IconifyIcon
                icon="mdi:card-account-details-outline"
                class="size-4"
              />
            </div>
            <span class="section-title-text">基础信息</span>
            <span class="section-hint">选填，留空不改</span>
          </div>
        </header>
        <div class="section-body section-body--basic">
          <Form />
        </div>
      </section>

      <!-- 日期时间设置 -->
      <section class="form-section form-section--detail">
        <header class="section-header">
          <div class="section-title">
            <div class="section-title-icon icon-teal">
              <IconifyIcon icon="mdi:calendar-clock-outline" class="size-4" />
            </div>
            <span class="section-title-text">日期时间设置</span>
          </div>
          <div class="section-actions">
            <div class="mode-switch">
              <button
                type="button"
                class="mode-chip"
                :class="{ 'mode-chip--active': dateEditMode === 'date' }"
                @click="switchToDateMode"
              >
                <IconifyIcon icon="mdi:calendar-range" class="size-4" />
                日期模式
              </button>
              <button
                type="button"
                class="mode-chip"
                :class="{ 'mode-chip--active': dateEditMode === 'week' }"
                @click="switchToWeekMode"
              >
                <IconifyIcon icon="mdi:calendar-weekend" class="size-4" />
                星期模式
              </button>
            </div>
            <Button
              type="link"
              size="small"
              class="add-group-btn"
              @click="addDateGroup"
            >
              <IconifyIcon icon="mdi:plus-circle-outline" class="size-4" />
              添加一组
            </Button>
          </div>
        </header>

        <div class="section-body">
          <!-- 日期模式 -->
          <div v-if="dateEditMode === 'date'">
            <div v-if="etdList.length === 0" class="empty-tip">
              暂无日期数据，请点击「添加一组」按钮添加
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
                      format="YYYY-MM-DD"
                      value-format="YYYY-MM-DD"
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
              暂无星期数据，请点击「添加一组」按钮添加
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
                        <IconifyIcon
                          icon="mdi:ship-wheel"
                          class="mr-1 size-4"
                        />
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
      </section>

      <!-- 箱型费率 -->
      <section
        v-if="ctnCodes.length > 0"
        class="form-section form-section--detail"
      >
        <header class="section-header">
          <div class="section-title">
            <div class="section-title-icon icon-amber">
              <IconifyIcon icon="mdi:cube-outline" class="size-4" />
            </div>
            <span class="section-title-text">箱型费率（海运费）</span>
            <span class="section-hint">留空则不修改</span>
          </div>
        </header>
        <div class="section-body">
          <div class="overflow-x-auto">
            <table class="rate-table">
              <thead>
                <tr>
                  <th class="text-left">费用类型</th>
                  <th v-for="ctn in ctnCodes" :key="ctn.id" class="text-center">
                    {{ ctn.ctnName }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>海运费</td>
                  <td
                    v-for="ctn in ctnCodes"
                    :key="ctn.id"
                    class="rate-table__cell"
                  >
                    <input
                      :id="`ctn_${ctn.id}`"
                      type="number"
                      class="rate-input"
                      placeholder="留空不修改"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- 附加费明细 -->
      <section
        class="form-section form-section--detail form-section--surcharge"
      >
        <header class="section-header">
          <div class="section-title">
            <div class="section-title-icon icon-violet">
              <IconifyIcon icon="mdi:cash-plus" class="size-4" />
            </div>
            <div class="section-title-stack">
              <div class="section-title-row">
                <span class="section-title-text">附加费明细</span>
                <span
                  v-if="surchargeFees.length > 0"
                  class="section-count-badge"
                >
                  {{ surchargeFees.length }}
                </span>
              </div>
              <span class="section-subtitle"
                >留空则不修改；先选费用与计费方式，再按箱型填写单价</span
              >
            </div>
          </div>
          <div class="section-actions">
            <Button
              type="primary"
              size="small"
              ghost
              class="surcharge-action-btn"
              @click="addSurchargeFee"
            >
              <IconifyIcon icon="mdi:plus" class="size-3.5" />
              添加
            </Button>
            <Button
              danger
              size="small"
              ghost
              class="surcharge-action-btn"
              :disabled="surchargeFees.length === 0"
              @click="surchargeFees.length > 0 && surchargeFees.pop()"
            >
              <IconifyIcon icon="mdi:minus" class="size-3.5" />
              删除末行
            </Button>
          </div>
        </header>

        <div class="section-body section-body--surcharge">
          <div
            v-if="surchargeFees.length === 0"
            class="empty-tip empty-tip--surcharge"
          >
            <div class="empty-tip-icon">
              <IconifyIcon icon="mdi:cash-plus" class="size-6" />
            </div>
            <div class="empty-tip-title">暂无附加费</div>
            <div class="empty-tip-desc">
              点击右上角「添加」录入要批量写入的附加费（留空字段不改）
            </div>
          </div>

          <div v-else class="surcharge-table-wrap">
            <table class="surcharge-table">
              <thead>
                <tr>
                  <th class="col-index">#</th>
                  <th class="col-meta col-fee">费用名称</th>
                  <th class="col-meta col-currency">币别</th>
                  <th class="col-meta col-billing">计费方式</th>
                  <th v-for="ctn in ctnCodes" :key="ctn.id" class="col-price">
                    <span class="ctn-chip">{{ ctn.ctnName }}</span>
                  </th>
                  <th class="col-action">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(surcharge, index) in surchargeFees"
                  :key="index"
                  class="surcharge-row"
                >
                  <td class="col-index">
                    <span class="row-index">{{ index + 1 }}</span>
                  </td>

                  <td class="col-meta col-fee">
                    <Select
                      v-model:value="surcharge.feeCodeId"
                      class="fee-name-select w-full"
                      show-search
                      :filter-option="filterFeeOption"
                      placeholder="请选择费用名称"
                      allow-clear
                      :dropdown-match-select-width="false"
                      @change="
                        (value: any) => handleFeeCodeChange(index, value)
                      "
                    >
                      <Select.Option
                        v-for="fee in feeCodeList"
                        :key="fee.value"
                        :value="fee.value"
                        :title="
                          fee.code ? fee.code + '-' + fee.label : fee.label
                        "
                      >
                        {{ fee.code ? fee.code + '-' + fee.label : fee.label }}
                      </Select.Option>
                    </Select>
                  </td>

                  <td class="col-meta col-currency">
                    <CurrencySelect
                      :key="`currency_${index}_${surcharge.feeCodeId || 'empty'}`"
                      v-model="surcharge.currencyId"
                      class="currency-select-fixed w-full"
                      placeholder="币别"
                      allow-clear
                    />
                  </td>

                  <td class="col-meta col-billing">
                    <Select
                      v-model:value="surcharge.priceFeeType"
                      class="billing-select w-full"
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

                  <td
                    v-for="(ctn, ctnIndex) in ctnCodes"
                    :key="`fee${ctn.id}`"
                    class="col-price"
                    :class="{
                      'col-price--order': surcharge.priceFeeType === 1,
                      'col-price--condition':
                        surcharge.priceFeeType !== 1 &&
                        getConditionalConfig(index, String(ctn.id)).enabled,
                    }"
                  >
                    <div
                      v-if="surcharge.priceFeeType === 1"
                      class="price-cell price-cell--order"
                    >
                      <template v-if="ctnIndex === 0">
                        <span class="price-mode-tag">按票统一价</span>
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
                          class="price-input"
                          placeholder="请输入按票价格"
                        />
                      </template>
                      <template v-else>
                        <div class="price-placeholder">同左</div>
                      </template>
                    </div>

                    <div
                      v-else
                      class="price-cell"
                      :class="{
                        'price-cell--conditioned': getConditionalConfig(
                          index,
                          String(ctn.id),
                        ).enabled,
                      }"
                    >
                      <div
                        v-if="
                          getConditionalConfig(index, String(ctn.id)).enabled
                        "
                        class="condition-panel"
                      >
                        <div class="condition-panel__toolbar">
                          <div
                            class="condition-trigger condition-trigger--inline"
                          >
                            <button
                              type="button"
                              class="condition-btn condition-btn--active"
                              @click="
                                showConditionPopup(
                                  $event,
                                  index,
                                  String(ctn.id),
                                )
                              "
                              title="设置条件费用"
                            >
                              <IconifyIcon
                                icon="mdi:filter-outline"
                                class="h-3.5 w-3.5"
                              />
                            </button>
                            <div
                              v-if="
                                conditionPopupVisible &&
                                currentConditionCell?.feeIndex === index &&
                                currentConditionCell?.ctnCodeId ===
                                  String(ctn.id)
                              "
                              class="condition-popup"
                              @click.stop
                            >
                              <label class="condition-popup-item">
                                <input
                                  type="checkbox"
                                  :checked="
                                    getConditionalConfig(index, String(ctn.id))
                                      .enabled
                                  "
                                  @change="
                                    toggleConditionEnabled(
                                      ($event.target as HTMLInputElement)
                                        .checked,
                                    )
                                  "
                                  class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>启用条件模式</span>
                              </label>
                            </div>
                          </div>
                          <span class="condition-panel__title">条件计价</span>
                          <span
                            v-if="
                              surcharge.prices[String(ctn.id)]?.conditionType
                            "
                            class="condition-panel__unit"
                          >
                            {{
                              freightConditionItemOptions.find(
                                (o) =>
                                  o.value ===
                                  surcharge.prices[String(ctn.id)]
                                    ?.conditionType,
                              )?.description
                            }}
                          </span>
                        </div>

                        <div class="condition-rule-row">
                          <Select
                            size="small"
                            :value="
                              surcharge.prices[String(ctn.id)]?.conditionType
                            "
                            :options="freightConditionItemOptions"
                            class="condition-select"
                            @change="
                              (val) =>
                                updateSurchargePriceValue(
                                  index,
                                  String(ctn.id),
                                  'conditionType',
                                  String(val),
                                )
                            "
                            placeholder="条件"
                          />

                          <button
                            type="button"
                            class="operator-btn"
                            @click="toggleOperator(index, String(ctn.id))"
                            title="点击切换算符"
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
                            class="condition-threshold"
                            placeholder="阈值"
                          />
                        </div>

                        <div class="condition-price-split">
                          <div class="split-item split-item--yes">
                            <div class="split-label">是</div>
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
                              class="condition-amount"
                              placeholder="0"
                            />
                          </div>
                          <div class="split-item split-item--else">
                            <div class="split-label">否则</div>
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
                              class="condition-amount"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>

                      <template v-else>
                        <div class="condition-trigger">
                          <button
                            type="button"
                            class="condition-btn"
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

                          <div
                            v-if="
                              conditionPopupVisible &&
                              currentConditionCell?.feeIndex === index &&
                              currentConditionCell?.ctnCodeId === String(ctn.id)
                            "
                            class="condition-popup"
                            @click.stop
                          >
                            <label class="condition-popup-item">
                              <input
                                type="checkbox"
                                :checked="false"
                                @change="
                                  toggleConditionEnabled(
                                    ($event.target as HTMLInputElement).checked,
                                  )
                                "
                                class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span>启用条件模式</span>
                            </label>
                          </div>
                        </div>

                        <div class="price-simple">
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
                            class="price-input"
                            placeholder="0"
                          />
                        </div>
                      </template>
                    </div>
                  </td>

                  <td class="col-action">
                    <button
                      type="button"
                      class="row-delete-btn"
                      title="删除此行"
                      @click="removeSurchargeFee(index)"
                    >
                      <IconifyIcon icon="mdi:delete-outline" class="size-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="form-footer">
        <Button class="footer-btn" @click="modalApi.close()">取消</Button>
        <Button
          type="primary"
          class="footer-btn footer-btn--primary"
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
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1200px) {
  .date-group-content,
  .week-group-content {
    grid-template-columns: 1fr;
  }

  .sync-update__hero {
    flex-direction: column;
    align-items: stretch;
  }
}

/* 内容自然撑开，纵向滚动只交给 Modal 内容区（勿再套 max-height+overflow） */
.sync-update {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 2px 4px 20px;
}

.sync-update__hero {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 12%) 0%,
    hsl(var(--primary) / 4%) 55%,
    #fff 100%
  );
  border: 1px solid hsl(var(--primary) / 22%);
  border-radius: 12px;
  box-shadow: 0 2px 8px hsl(var(--primary) / 8%);
  animation: fade-in 0.35s ease;
}

.sync-update__hero-main {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.sync-update__hero-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 20px;
  color: hsl(var(--primary));
  background: #fff;
  border: 1px solid hsl(var(--primary) / 20%);
  border-radius: 10px;
}

.sync-update__hero-text {
  min-width: 0;
}

.sync-update__hero-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  color: #1a2332;
}

.sync-update__hero-sub {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: #8c95a3;
}

.sync-update__count-chip {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border: 1px solid hsl(var(--primary) / 25%);
  border-radius: 999px;

  em {
    font-style: normal;
    font-weight: 700;
  }
}

.form-section {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  margin-bottom: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e8ecf3;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgb(16 42 83 / 5%);
  transition: box-shadow 0.25s ease;

  &:hover {
    box-shadow: 0 4px 14px rgb(16 42 83 / 8%);
  }

  /* 明细分区自然撑开，由 Modal 内容区统一纵向滚动 */
  &--detail {
    flex-shrink: 0;

    .section-header {
      flex-shrink: 0;
    }
  }
}

.section-header {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  padding: 10px 14px;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 8%) 0%,
    hsl(var(--primary) / 3%) 55%,
    hsl(var(--background)) 100%
  );
  border-bottom: 1px solid #e4e8ef;
}

.section-title {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.section-title-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-radius: 8px;

  &.icon-teal {
    color: #0d9488;
    background: #e6fffa;
  }

  &.icon-amber {
    color: #d97706;
    background: #fff7ed;
  }

  &.icon-violet {
    color: #4f46e5;
    background: #eef2ff;
  }
}

.section-title-text {
  font-size: 14px;
  font-weight: 600;
  color: #252a31;
  white-space: nowrap;
}

.section-title-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.section-title-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.section-subtitle {
  font-size: 12px;
  line-height: 1.4;
  color: #64748b;
}

.section-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 600;
  color: #4f46e5;
  background: #eef2ff;
  border-radius: 999px;
}

.section-hint {
  font-size: 12px;
  color: #9aa3af;
}

.section-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.section-body {
  padding: 14px 16px 16px;
}

/* 基础信息：下拉 / 日期 / 数值 / 输入框占满网格列宽，视觉对齐 */
.section-body--basic :deep(.ant-select),
.section-body--basic :deep(.ant-picker),
.section-body--basic :deep(.ant-input-number),
.section-body--basic :deep(.ant-input-affix-wrapper),
.section-body--basic :deep(.ant-input:not(textarea)),
.section-body--basic :deep(textarea.ant-input) {
  width: 100% !important;
}

.section-body--basic :deep(.ant-form) {
  margin-bottom: 0;
}

.mode-switch {
  display: inline-flex;
  padding: 3px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.mode-chip {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 6px;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    color: #334155;
    background: rgb(255 255 255 / 70%);
  }

  &--active {
    color: hsl(var(--primary));
    background: #fff;
    box-shadow: 0 1px 3px rgb(16 42 83 / 10%);

    &:hover {
      color: hsl(var(--primary));
      background: #fff;
    }
  }
}

.add-group-btn {
  font-weight: 500;
}

.sub-table {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sub-table-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.empty-tip {
  padding: 28px 16px;
  font-size: 13px;
  color: #8c95a3;
  text-align: center;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;

  &:hover {
    background: #f1f5f9;
    border-color: hsl(var(--primary) / 40%);
  }
}

.rate-table {
  width: 100%;
  overflow: hidden;
  border-collapse: collapse;
  border: 1px solid #e4e8ef;
  border-radius: 8px;

  th,
  td {
    padding: 10px 12px;
    border: 1px solid #e8ecf3;
  }

  thead tr {
    background: hsl(var(--primary) / 8%);
  }

  th {
    font-size: 13px;
    font-weight: 600;
    color: #252a31;
  }

  tbody tr {
    transition: background-color 0.15s ease;

    &:hover {
      background: #fafbfd;
    }
  }
}

.rate-table__cell {
  vertical-align: middle;

  &--price {
    position: relative;
    padding: 12px 12px 12px 16px;
  }
}

.rate-input {
  width: 100%;
  padding: 6px 8px;
  font-size: 13px;
  text-align: center;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    border-color: #40a9ff;
  }

  &:focus {
    outline: none;
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 2px hsl(var(--primary) / 15%);
  }
}

.form-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 4px 0;
}

.footer-btn {
  min-width: 88px;
  transition:
    transform 0.15s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
  }

  &--primary:hover {
    box-shadow: 0 4px 12px hsl(var(--primary) / 28%);
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

button[title='设置条件费用'] {
  transition:
    color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;

  &:hover {
    transform: scale(1.06);
  }
}

input[type='number'] {
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:focus {
    outline: none;
  }
}

.space-y-2 {
  animation: fade-in 0.3s ease-in-out;
}

.date-group-row,
.week-group-row {
  position: relative;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 16px;
  margin-bottom: 0;
  background: linear-gradient(135deg, #fff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 5%);
  transition:
    border-color 0.2s ease,
    box-shadow 0.25s ease;

  &:hover {
    border-color: hsl(var(--primary) / 25%);
    box-shadow: 0 4px 12px rgb(16 42 83 / 8%);
  }
}

.date-group-row::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  content: '';
  background: linear-gradient(
    to bottom,
    hsl(var(--primary)),
    hsl(var(--primary) / 65%)
  );
  border-radius: 8px 0 0 8px;
}

.week-group-row::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  content: '';
  background: linear-gradient(to bottom, #0d9488, #5eead4);
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
  letter-spacing: 0.3px;
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
  opacity: 0.55;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
  }
}

/* —— 附加费表格（对齐 freight-rate-form） —— */
.form-section--surcharge .section-title {
  align-items: flex-start;
}

.form-section--surcharge .section-title-icon {
  margin-top: 1px;
}

.form-section--surcharge .section-header {
  align-items: flex-start;
  padding-top: 12px;
  padding-bottom: 12px;
}

.section-body--surcharge {
  padding-top: 12px;
}

.surcharge-action-btn {
  transition:
    transform 0.15s ease,
    box-shadow 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }
}

.empty-tip--surcharge {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  padding: 36px 20px;
}

.empty-tip-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-bottom: 4px;
  color: #4f46e5;
  background: #eef2ff;
  border-radius: 12px;
}

.empty-tip-title {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.empty-tip-desc {
  font-size: 12px;
  color: #94a3b8;
}

.surcharge-table-wrap {
  overflow-x: auto;
  border: 1px solid #e4e8ef;
  border-radius: 10px;
}

.surcharge-table {
  width: 100%;
  min-width: max-content;
  border-spacing: 0;
  border-collapse: separate;

  th,
  td {
    vertical-align: middle;
    border-right: 1px solid #e8ecf3;
    border-bottom: 1px solid #e8ecf3;
  }

  th:last-child,
  td:last-child {
    border-right: none;
  }

  thead th {
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    text-align: center;
    letter-spacing: 0.2px;
    background: linear-gradient(
      180deg,
      hsl(var(--primary) / 8%) 0%,
      hsl(var(--primary) / 5%) 100%
    );
    border-bottom: 1px solid #dbe3f0;
  }

  .col-index {
    width: 44px;
    min-width: 44px;
    text-align: center;
    background: #f8fafc;
  }

  thead .col-index {
    background: linear-gradient(
      180deg,
      hsl(var(--primary) / 8%) 0%,
      hsl(var(--primary) / 5%) 100%
    );
  }

  .col-meta {
    background: #fafbfd;
  }

  thead .col-meta {
    background: linear-gradient(
      180deg,
      hsl(var(--primary) / 8%) 0%,
      hsl(var(--primary) / 5%) 100%
    );
  }

  .col-fee {
    width: 180px;
    min-width: 180px;
    padding: 10px 12px;
  }

  .col-currency {
    width: 110px;
    min-width: 110px;
    padding: 10px;
  }

  .col-billing {
    width: 120px;
    min-width: 120px;
    padding: 10px;
  }

  .col-price {
    min-width: 228px;
    padding: 10px 12px;
    background: #fff;
    transition: background-color 0.15s ease;
  }

  .col-price--order {
    background: hsl(var(--primary) / 6%);
  }

  .col-price--condition {
    width: 180px;
    min-width: 168px;
    max-width: 196px;
    background: #f5f7ff;
  }

  .col-action {
    width: 64px;
    min-width: 64px;
    text-align: center;
    background: #fafbfd;
  }

  thead .col-action {
    background: linear-gradient(
      180deg,
      hsl(var(--primary) / 8%) 0%,
      hsl(var(--primary) / 5%) 100%
    );
  }
}

.ctn-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-radius: 999px;
}

.row-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  background: #e2e8f0;
  border-radius: 6px;
}

.surcharge-row {
  transition: background-color 0.15s ease;
  animation: fade-in 0.28s ease;

  &:hover {
    .col-meta,
    .col-index,
    .col-action {
      background: #f1f5f9;
    }

    .col-price {
      background: #f8fafc;
    }

    .col-price--order {
      background: #eef6ff;
    }

    .col-price--condition {
      background: #eef0ff;
    }

    .row-index {
      color: #fff;
      background: hsl(var(--primary));
    }
  }
}

.price-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 44px;
}

.price-cell--order {
  gap: 6px;
  align-items: stretch;
  justify-content: center;
}

.price-cell--conditioned {
  min-height: 0;
}

.price-mode-tag {
  align-self: flex-start;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #0369a1;
  background: #e0f2fe;
  border-radius: 4px;
}

.price-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  font-size: 12px;
  color: #94a3b8;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
}

.price-simple {
  padding-top: 2px;
}

.price-cell :deep(.ant-input.price-input),
.price-cell :deep(input.price-input),
.price-input.ant-input {
  width: 100%;
  height: 36px;
  padding: 8px 10px;
  font-size: 13px;
  text-align: center;
  background: #fff;
  border: 1px solid #d0d7e2;
  border-radius: 8px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.price-cell :deep(.ant-input:hover),
.price-cell :deep(input.price-input:hover) {
  border-color: hsl(var(--primary) / 55%);
}

.price-cell :deep(.ant-input:focus),
.price-cell :deep(input.price-input:focus) {
  outline: none;
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 2px hsl(var(--primary) / 14%);
}

.condition-trigger {
  position: absolute;
  top: -2px;
  left: -2px;
  z-index: 2;

  &--inline {
    position: relative;
    top: auto;
    left: auto;
  }
}

.condition-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: #94a3b8;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgb(16 42 83 / 6%);
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background-color 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    color: hsl(var(--primary));
    border-color: #93c5fd;
    box-shadow: 0 2px 6px hsl(var(--primary) / 16%);
    transform: scale(1.06);
  }

  &--active {
    color: #fff;
    background: #4f46e5;
    border-color: #4f46e5;
    box-shadow: 0 2px 6px rgb(79 70 229 / 28%);

    &:hover {
      color: #fff;
      background: #4338ca;
      border-color: #4338ca;
    }
  }
}

.condition-popup {
  position: absolute;
  top: 28px;
  left: 0;
  z-index: 50;
  min-width: 168px;
  padding: 6px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 10px 28px rgb(16 42 83 / 14%);
  animation: fade-in 0.18s ease;
}

.condition-popup-item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.15s ease;

  &:hover {
    background: #f1f5f9;
  }
}

.condition-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  background: #fff;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgb(16 42 83 / 4%);
}

.condition-panel__toolbar {
  display: flex;
  gap: 6px;
  align-items: center;
  min-height: 20px;
}

.condition-panel__title {
  font-size: 11px;
  font-weight: 600;
  color: #4338ca;
  letter-spacing: 0.02em;
}

.condition-panel__unit {
  padding: 0 6px;
  margin-left: auto;
  font-size: 10px;
  font-weight: 500;
  color: #64748b;
  background: #f1f5f9;
  border-radius: 999px;
}

.condition-rule-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 24px minmax(48px, 0.72fr);
  gap: 4px;
  align-items: center;
}

.condition-select,
.condition-threshold {
  width: 100%;
  min-width: 0;
}

.condition-panel :deep(.condition-select .ant-select-selector),
.condition-panel :deep(.condition-threshold.ant-input),
.condition-panel :deep(input.condition-threshold) {
  height: 28px !important;
  font-size: 12px;
  border-radius: 6px;
}

.condition-panel :deep(.condition-select .ant-select-selection-item),
.condition-panel :deep(.condition-select .ant-select-selection-placeholder) {
  line-height: 26px !important;
}

.condition-panel :deep(.condition-select .ant-select-selector) {
  display: flex;
  align-items: center;
  padding-inline: 4px !important;
}

.condition-panel :deep(.condition-select .ant-select-arrow) {
  inset-inline-end: 4px;
}

.operator-btn {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 28px;
  padding: 0;
  font-size: 12px;
  font-weight: 700;
  color: hsl(var(--primary));
  cursor: pointer;
  background: hsl(var(--primary) / 6%);
  border: 1px solid #d0d7e2;
  border-radius: 6px;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    transform 0.12s ease;

  &:hover {
    background: hsl(var(--primary) / 10%);
    border-color: #93c5fd;
    transform: translateY(-1px);
  }
}

.condition-price-split {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.split-item {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 6px;
  align-items: center;
  min-width: 0;
  padding: 4px 6px;
  border-radius: 6px;

  &--yes {
    background: #eff6ff;
    border: 1px solid #dbeafe;

    .split-label {
      color: #1d4ed8;
    }
  }

  &--else {
    background: #f8fafc;
    border: 1px solid #e2e8f0;

    .split-label {
      color: #64748b;
    }
  }
}

.split-label {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
}

.condition-amount {
  width: 100%;
}

.condition-panel :deep(.condition-amount.ant-input),
.condition-panel :deep(input.condition-amount) {
  height: 28px !important;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  background: #fff;
  border: 1px solid #d0d7e2;
  border-radius: 5px;
}

.condition-panel :deep(.condition-amount.ant-input:hover),
.condition-panel :deep(input.condition-amount:hover) {
  border-color: hsl(var(--primary) / 55%);
}

.condition-panel :deep(.condition-amount.ant-input:focus),
.condition-panel :deep(input.condition-amount:focus) {
  outline: none;
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 2px hsl(var(--primary) / 14%);
}

.row-delete-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: #94a3b8;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  transition:
    color 0.15s ease,
    background-color 0.15s ease,
    border-color 0.15s ease,
    transform 0.12s ease;

  &:hover {
    color: #ef4444;
    background: #fef2f2;
    border-color: #fecaca;
    transform: scale(1.05);
  }
}

.fee-name-select {
  min-width: 160px;
}

.currency-select-fixed {
  min-width: 100px;
}

.billing-select :deep(.ant-select-selector) {
  border-radius: 8px !important;
}

.section-body--surcharge :deep(.ant-select-selector) {
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease !important;
}

.section-body--surcharge :deep(.ant-select-focused .ant-select-selector),
.section-body--surcharge :deep(.ant-select-selector:hover) {
  border-color: hsl(var(--primary)) !important;
  box-shadow: 0 0 0 2px hsl(var(--primary) / 12%) !important;
}
</style>
