<script lang="ts" setup>
import type {
  BatchEditSeFreiPriceInput,
  SeFreiPriceCtnFeeEditDto,
  SeFreiPriceFeeEditDto,
  SeFreiPriceOutDto,
  CtnCodeDto,
} from '#/api/sea-export/freight-rate-admin';

import { FreiPricePropType } from '#/api/sea-export/freight-rate-admin';

import { computed, nextTick, ref, onMounted } from 'vue';
import { getEnumItems } from '#/utils/init-enum';
import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useVbenForm } from '#/adapter/form';
import {
  batchEditSeFreiPrice,
  GetCtnCodesByPriceIdsAsync,
  getSeFreiPriceDetail,
} from '#/api/sea-export/freight-rate-admin';
import { $t } from '#/locales';
import { Button, Select, Input } from 'ant-design-vue';

const emits = defineEmits(['success']);

const ht = ref<any>(null);

const batchIds = ref<string[]>([]);

// 箱型列表（通过API获取，不可新增或删除）
const ctnCodes = ref<CtnCodeDto[]>([]);

// 箱型成本数据（存储每个箱型的成本值）
const ctnCosts = ref<Record<string, number | undefined>>({});

// 处理箱型成本输入
function handleCtnCostInput(ctnCodeId: number, value: string) {
  const numValue = value ? Number(value) : undefined;
  ctnCosts.value[String(ctnCodeId)] = isNaN(numValue ?? 0)
    ? undefined
    : numValue;
}

// 附加费数据结构
interface SurchargeFeeItem {
  feeCodeId?: number;
  currencyId?: number;
  prices: Record<
    string,
    {
      price?: number;
      conditionType?: number;
      operatorType?: number;
      value?: number;
      otherPrice?: number;
    }
  >;
}

// 附加费列表
const surchargeFees = ref<SurchargeFeeItem[]>([]);

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
      const feeIndex = Number(feeType);
      if (surchargeFees.value[feeIndex]) {
        surchargeFees.value[feeIndex].prices[ctnCodeId] = {};
      }
    }
  }
  hideConditionPopup();
}

// 切换算符（循环切换：>、>=、<、<=、=）
function toggleOperator(index: number, ctnCodeId: string) {
  const currentOperator =
    surchargeFees.value[index]?.prices[ctnCodeId]?.operatorType || 1;
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

// 币别列表
const currencyList = ref<any[]>([]);

// 费用代码列表
const feeCodeList = ref<any[]>([]);

// 加载下拉数据
async function loadSelectData() {
  try {
    const { getCurrencyPagedList } =
      await import('#/api/system/base-data/currency-admin');
    const currencyRes = await getCurrencyPagedList({ PageSize: 1000 });
    currencyList.value = (currencyRes.items || []).map((item: any) => ({
      label: item.code || item.enName,
      value: item.id,
    }));

    const { getFeeCodePagedList } =
      await import('#/api/system/base-data/fee-code-admin');
    const feeRes = await getFeeCodePagedList({ PageSize: 1000 });
    feeCodeList.value = (feeRes.items || []).map((item: any) => ({
      label: item.cnName || item.enName,
      value: item.id,
    }));
  } catch (error) {
    console.error('加载下拉数据失败:', error);
  }
}

// 添加附加费
function addSurchargeFee() {
  surchargeFees.value.push({
    prices: {},
  });
}

// 删除附加费
function removeSurchargeFee(index: number) {
  surchargeFees.value.splice(index, 1);
}

// 更新附加费价格
function updateSurchargePriceValue(
  feeIndex: number,
  ctnCodeId: string,
  field: 'price' | 'value' | 'otherPrice' | 'conditionType' | 'operatorType',
  value: string,
) {
  const numValue = value ? Number(value) : undefined;

  if (!surchargeFees.value[feeIndex]) {
    surchargeFees.value[feeIndex] = { prices: {} };
  }

  if (!surchargeFees.value[feeIndex].prices[ctnCodeId]) {
    surchargeFees.value[feeIndex].prices[ctnCodeId] = {};
  }

  surchargeFees.value[feeIndex].prices[ctnCodeId][field] = numValue;
}

// 监听费用代码变化，自动填充默认币别
async function handleFeeCodeChange(feeIndex: number, feeCodeId?: number) {
  if (!feeCodeId) {
    if (surchargeFees.value[feeIndex]) {
      surchargeFees.value[feeIndex].currencyId = undefined;
    }
    return;
  }

  try {
    const { getFeeCodeDetail } =
      await import('#/api/system/base-data/fee-code-admin');
    const detail = await getFeeCodeDetail(feeCodeId);

    if (detail.currencyId && surchargeFees.value[feeIndex]) {
      surchargeFees.value[feeIndex].currencyId = detail.currencyId;
    }
  } catch (error) {
    console.error('获取费用代码详情失败:', error);
  }
}

// 主表表单配置（合并基础信息和其他设置）
const [Form, formApi] = useVbenForm({
  schema: [
    {
      component: 'ApiSelect',
      fieldName: 'carrierId',
      label: '船公司',
      componentProps: {
        api: async () => {
          const { getCarrierPagedList } =
            await import('#/api/system/base-data/carrier-admin');
          const res = await getCarrierPagedList({ PageSize: 1000 });
          return (res.items || []).map((item: any) => ({
            label: item.cnName || item.enName,
            value: item.id,
          }));
        },
        showSearch: true,
        filterOption: true,
        placeholder: '留空不修改',
        allowClear: true,
      },
    },
    {
      component: 'ApiSelect',
      fieldName: 'currencyId',
      label: '币别',
      componentProps: {
        api: async () => {
          const { getCurrencyPagedList } =
            await import('#/api/system/base-data/currency-admin');
          const res = await getCurrencyPagedList({ PageSize: 1000 });
          return (res.items || []).map((item: any) => ({
            label: item.cnName || item.enName,
            value: item.id,
          }));
        },
        showSearch: true,
        filterOption: true,
        placeholder: '留空不修改',
        allowClear: true,
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'freeDays',
      label: '免用箱',
      componentProps: {
        placeholder: '留空不修改',
        min: 0,
      },
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
      component: 'DatePicker',
      fieldName: 'etd',
      label: '开船日期',
      componentProps: {
        placeholder: '留空不修改',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
    },
    {
      component: 'Select',
      fieldName: 'etdDayOfWeek',
      label: '开船星期',
      componentProps: {
        options: [
          { label: '周日', value: 0 },
          { label: '周一', value: 1 },
          { label: '周二', value: 2 },
          { label: '周三', value: 3 },
          { label: '周四', value: 4 },
          { label: '周五', value: 5 },
          { label: '周六', value: 6 },
        ],
        placeholder: '留空不修改',
        allowClear: true,
      },
    },
    {
      component: 'TimePicker',
      fieldName: 'etdDayTime',
      label: '开船时间点',
      componentProps: {
        placeholder: '留空不修改',
        format: 'HH:mm',
        valueFormat: 'HH:mm',
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'closeDocTime',
      label: '截单时间',
      componentProps: {
        placeholder: '留空不修改',
        format: 'YYYY-MM-DD HH:mm',
        valueFormat: 'YYYY-MM-DD HH:mm',
        showTime: true,
        timePicker: { format: 'HH:mm' },
      },
    },
    {
      component: 'Select',
      fieldName: 'closeDocDayOfWeek',
      label: '截单星期',
      componentProps: {
        options: [
          { label: '周日', value: 0 },
          { label: '周一', value: 1 },
          { label: '周二', value: 2 },
          { label: '周三', value: 3 },
          { label: '周四', value: 4 },
          { label: '周五', value: 5 },
          { label: '周六', value: 6 },
        ],
        placeholder: '留空不修改',
        allowClear: true,
      },
    },
    {
      component: 'TimePicker',
      fieldName: 'closeDocDayTime',
      label: '截单时间点',
      componentProps: {
        placeholder: '留空不修改',
        format: 'HH:mm',
        valueFormat: 'HH:mm',
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'closingTime',
      label: '截关时间',
      componentProps: {
        placeholder: '留空不修改',
        format: 'YYYY-MM-DD HH:mm',
        valueFormat: 'YYYY-MM-DD HH:mm',
        showTime: true,
        timePicker: { format: 'HH:mm' },
      },
    },
    {
      component: 'ApiSelect',
      fieldName: 'polId',
      label: '起运港',
      componentProps: {
        api: async () => {
          const { getPortCodePagedList } =
            await import('#/api/system/base-data/port-code-admin');
          const res = await getPortCodePagedList({ PageSize: 1000 });
          return (res.items || []).map((item: any) => ({
            label: `${item.cnName}(${item.portName})`,
            value: item.id,
          }));
        },
        showSearch: true,
        filterOption: true,
        placeholder: '留空不修改',
        allowClear: true,
      },
      formItemClass: 'w-full',
    },
    {
      component: 'ApiSelect',
      fieldName: 'podId',
      label: '目的港',
      componentProps: {
        api: async () => {
          const { getPortCodePagedList } =
            await import('#/api/system/base-data/port-code-admin');
          const res = await getPortCodePagedList({ PageSize: 1000 });
          return (res.items || []).map((item: any) => ({
            label: `${item.cnName}(${item.portName})`,
            value: item.id,
          }));
        },
        showSearch: true,
        filterOption: true,
        placeholder: '留空不修改',
        allowClear: true,
      },
    },
    {
      component: 'RadioGroup',
      fieldName: 'isDirect',
      label: '是否直达',
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
      component: 'ApiSelect',
      fieldName: 'poT1Id',
      label: '中转港1',
      componentProps: {
        api: async () => {
          const { getPortCodePagedList } =
            await import('#/api/system/base-data/port-code-admin');
          const res = await getPortCodePagedList({ PageSize: 1000 });
          return (res.items || []).map((item: any) => ({
            label: `${item.cnName}(${item.portName})`,
            value: item.id,
          }));
        },
        showSearch: true,
        filterOption: true,
        placeholder: '留空不修改',
        allowClear: true,
      },
    },
    {
      component: 'ApiSelect',
      fieldName: 'poT2Id',
      label: '中转港2',
      componentProps: {
        api: async () => {
          const { getPortCodePagedList } =
            await import('#/api/system/base-data/port-code-admin');
          const res = await getPortCodePagedList({ PageSize: 1000 });
          return (res.items || []).map((item: any) => ({
            label: `${item.cnName}(${item.portName})`,
            value: item.id,
          }));
        },
        showSearch: true,
        filterOption: true,
        placeholder: '留空不修改',
        allowClear: true,
      },
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
      componentProps: {
        options: [
          { label: '不改', value: undefined },
          { label: '是', value: true },
          { label: '否', value: false },
        ],
        optionType: 'button',
      },
    },
  ],
  showDefaultActions: false,
  layout: 'horizontal',
  wrapperClass: 'grid-cols-4',
});

// 订单状态下拉框
const freightConditionItemOptions = ref<any[]>([]);
const conditionComparisonTypeOptions = ref<any[]>([]);

onMounted(async () => {
  freightConditionItemOptions.value = await getEnumItems(
    'freightConditionItem',
  );
  freightConditionItemOptions.value = freightConditionItemOptions.value.map(
    (item) => ({
      label: item.displayName,
      value: item.value,
      description: item.description,
    }),
  );

  conditionComparisonTypeOptions.value = await getEnumItems(
    'ConditionComparisonType',
  );
  conditionComparisonTypeOptions.value =
    conditionComparisonTypeOptions.value.map((item) => ({
      label: item.displayName,
      value: item.value,
    }));
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const values = await formApi.getValues();

    // 构建箱型列表（海运费）
    const seFreiPriceCtns: any[] = [];
    ctnCodes.value.forEach((ctn) => {
      const costValue = ctnCosts.value[String(ctn.id)];
      if (costValue !== undefined && costValue !== null) {
        seFreiPriceCtns.push({
          ctnCodeId: ctn.id,
          cost: costValue,
        });
      }
    });

    // 构建附加费列表
    const seFreiPriceFees: SeFreiPriceFeeEditDto[] = [];
    surchargeFees.value.forEach((surcharge) => {
      if (surcharge.feeCodeId && surcharge.currencyId) {
        const fee: SeFreiPriceFeeEditDto = {
          feeCodeId: surcharge.feeCodeId,
          currencyId: surcharge.currencyId,
          seFreiPriceCtnFees: [],
        };

        Object.keys(surcharge.prices).forEach((ctnCodeIdStr) => {
          const priceItem = surcharge.prices[ctnCodeIdStr];
          if (priceItem && priceItem.price !== undefined) {
            const originalCtn = ctnCodes.value.find(
              (ctn) => String(ctn.id) === ctnCodeIdStr,
            );

            fee.seFreiPriceCtnFees?.push({
              ctnCodeId: originalCtn?.id ?? Number(ctnCodeIdStr),
              price: priceItem.price,
              conditionType: priceItem.conditionType,
              operatorType: priceItem.operatorType,
              value: priceItem.value,
              otherPrice: priceItem.otherPrice,
            });
          }
        });

        if (fee.seFreiPriceCtnFees && fee.seFreiPriceCtnFees.length > 0) {
          seFreiPriceFees.push(fee);
        }
      }
    });

    // 构建提交数据
    const submitData: BatchEditSeFreiPriceInput = {
      ids: batchIds.value,
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
      etd: values.etd,
      etdDayOfWeek: values.etdDayOfWeek,
      etdDayTime: values.etdDayTime,
      closeDocTime: values.closeDocTime,
      closeDocDayOfWeek: values.closeDocDayOfWeek,
      closeDocDayTime: values.closeDocDayTime,
      closingTime: values.closingTime,
      remark: values.remark,
      seFreiPriceCtns: seFreiPriceCtns.length > 0 ? seFreiPriceCtns : undefined,
      seFreiPriceFees: seFreiPriceFees.length > 0 ? seFreiPriceFees : undefined,
    };

    // 移除undefined字段
    Object.keys(submitData).forEach((key) => {
      if ((submitData as any)[key] === undefined) {
        delete (submitData as any)[key];
      }
    });

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
      console.log('批量编辑数据:', data);

      formApi.resetForm();
      surchargeFees.value = [];
      ctnCosts.value = {};
      conditionalFeeConfigs.value = {};

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
                    @input="
                      handleCtnCostInput(
                        ctn.id,
                        ($event.target as HTMLInputElement).value,
                      )
                    "
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
            附加费明细 — 留空则不修改
          </span>
          <div class="flex gap-2">
            <button
              type="button"
              class="rounded border border-green-500 px-3 py-1 text-sm text-green-600 hover:bg-green-50"
              @click="addSurchargeFee"
            >
              + 添加
            </button>
            <button
              type="button"
              class="rounded border border-red-500 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
              @click="surchargeFees.length > 0 && surchargeFees.pop()"
              :disabled="surchargeFees.length === 0"
            >
              - 删除
            </button>
          </div>
        </div>

        <div class="overflow-x-auto" v-if="surchargeFees.length > 0">
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
                  style="width: 80px"
                >
                  币别
                </th>
                <th
                  v-for="ctn in ctnCodes"
                  :key="`fee${ctn.id}`"
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
                  <select
                    v-model="surcharge.feeCodeId"
                    class="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    @change="handleFeeCodeChange(index, surcharge.feeCodeId)"
                  >
                    <option :value="undefined">请选择</option>
                    <option
                      v-for="fee in feeCodeList"
                      :key="fee.value"
                      :value="fee.value"
                    >
                      {{ fee.label }}
                    </option>
                  </select>
                </td>

                <!-- 币别选择 -->
                <td class="border border-gray-300 px-2 py-2">
                  <select
                    v-model="surcharge.currencyId"
                    class="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  >
                    <option :value="undefined">请选择</option>
                    <option
                      v-for="currency in currencyList"
                      :key="currency.value"
                      :value="currency.value"
                    >
                      {{ currency.label }}
                    </option>
                  </select>
                </td>

                <!-- 箱型价格输入 -->
                <td
                  v-for="ctn in ctnCodes"
                  :key="`price${ctn.id}`"
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

                    <!-- 条件配置弹窗 -->
                    <div
                      v-if="
                        conditionPopupVisible &&
                        currentConditionCell?.feeType === index.toString() &&
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
                            getConditionalConfig(
                              index.toString(),
                              String(ctn.id),
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
                      getConditionalConfig(index.toString(), String(ctn.id))
                        .enabled
                    "
                    class="mt-6 space-y-2"
                  >
                    <!-- 条件配置行 -->
                    <div class="flex items-center gap-1.5">
                      <Select
                        size="small"
                        :value="surcharge.prices[String(ctn.id)]?.conditionType"
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
                      class="w-full rounded-lg border border-gray-300 py-2 pl-2 pr-2 text-center transition-colors hover:border-blue-400 focus:outline-none [&_.ant-input]:focus:border-transparent [&_.ant-input]:focus:shadow-none"
                      placeholder="留空不修改"
                    />
                  </div>
                </td>

                <!-- 删除按钮 -->
                <td class="border border-gray-300 px-2 py-2 text-center">
                  <button
                    type="button"
                    class="rounded border border-red-500 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    @click="removeSurchargeFee(index)"
                  >
                    删除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-else
          class="rounded border border-dashed border-gray-300 py-8 text-center text-gray-400"
        >
          暂无附加费，点击"添加"按钮添加附加费
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
:deep(.ant-input-sm) {
  padding: 2px 8px;
}

:deep(.ant-select-sm) {
  .ant-select-selector {
    padding: 2px 8px !important;
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
</style>
