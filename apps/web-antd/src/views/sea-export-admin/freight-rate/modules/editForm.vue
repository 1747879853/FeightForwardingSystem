<script lang="ts" setup>
import type {
  AddSeFreiPriceInput,
  EditSeFreiPriceInput,
  SeFreiPriceOutDto,
  PriceFeeType,
} from '#/api/sea-export/freight-rate-admin';

import { computed, ref, onMounted } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useVbenForm } from '#/adapter/form';
import {
  addSeFreiPrice,
  editSeFreiPrice,
  getSeFreiPriceDetail,
} from '#/api/sea-export/freight-rate-admin';
import { $t } from '#/locales';
import {
  Button,
  message,
  Select,
  InputNumber,
  Input,
  DatePicker,
  TimePicker,
  Tag,
} from 'ant-design-vue';
import { getEnumItems } from '#/utils/init-enum';

const emits = defineEmits(['success']);

// ==================== 状态定义 ====================

const formData = ref<SeFreiPriceOutDto>();
const id = ref<string>();
const isEditMode = computed(() => !!id.value);

// 时间模式控制（用于独立日期模块）
const dateEditMode = ref<'date' | 'week'>('date'); // 默认日期模式

// 开船日子表输入模式控制（用于互斥）
const etdInputMode = ref<'date' | 'weekday' | null>(null);

// 下拉数据源
const currencyList = ref<any[]>([]);
const feeCodeList = ref<any[]>([]);
const allCtnOptions = ref<Array<{ ctnCodeId: number; ctnName: string }>>([]);

// USD 币别 ID（默认值）
const defaultCurrencyId = ref<number | undefined>(undefined);

// 当前选中的箱型ID（用于Select组件）
const selectedCtnId = ref<number | undefined>(undefined);

// 枚举选项
const freightConditionItemOptions = ref<any[]>([]);
const conditionComparisonTypeOptions = ref<any[]>([]);

// 动态箱型列表（从formData中获取）
const dynamicCtnTypes = computed(() => {
  if (
    !formData.value?.seFreiPriceCtns ||
    formData.value.seFreiPriceCtns.length === 0
  ) {
    return [];
  }
  console.log(
    '计算dynamicCtnTypes，formData.value.seFreiPriceCtns:',
    formData.value.seFreiPriceCtns,
  );
  return formData.value.seFreiPriceCtns.map((ctn) => ({
    ctnCodeId: String(ctn.ctnCodeId),
    name: ctn.ctnCode?.ctnName || `箱型${ctn.ctnCodeId}`,
    cost: ctn.cost,
    remark: ctn.remark,
  }));
});

// 已存在的箱型ID列表（用于防止重复添加）
const existingCtnCodeIds = computed(() => {
  return formData.value?.seFreiPriceCtns?.map((ctn) => ctn.ctnCodeId) || [];
});

// 附加费数据结构
interface SurchargePriceItem {
  price?: number; // 普通价格或满足条件的价格
  conditionType?: number; // 条件类型
  operatorType?: number; // 算符类型
  value?: number; // 条件阈值
  otherPrice?: number; // 否则价格
}

interface SurchargeFeeItem {
  id?: string;
  feeCodeId?: number;
  currencyId?: number;
  priceFeeType: PriceFeeType;
  prices: Record<string, SurchargePriceItem>; // key: ctnCodeId (string), value: 价格对象
  seFreiPriceCtnFees?: Array<{
    ctnCodeId: number;
    price: number;
    conditionType?: number;
    operatorType?: number;
    value?: number;
    otherPrice?: number;
  }>;
}

// 附加费列表
const surchargeFees = ref<SurchargeFeeItem[]>([]);

// 开船日子表（日期模式）- 一组包含三个日期
const etdList = ref<
  Array<{
    id?: string;
    etd?: string; // 开船日期
    closeDocTime?: string; // 截单时间（日期格式）
    closingTime?: string; // 截关时间（日期格式）
  }>
>([]);

// 开船日周几子表（星期模式）- 一组包含三个星期+时间点
const etdDayList = ref<
  Array<{
    id?: string;
    etdDayOfWeek?: number; // 开船星期
    etdDayTime?: string; // 开船时间点
    closeDocDayOfWeek?: number; // 截单星期
    closeDocDayTime?: string; // 截单时间点
    closingDayOfWeek?: number; // 截关星期
    closingDayTime?: string; // 截关时间点
  }>
>([]);

// 条件费用配置
interface ConditionalFeeConfig {
  enabled: boolean;
  threshold?: number;
  valueIfGreater?: number;
  valueOtherwise?: number;
}

const conditionalFeeConfigs = ref<
  Record<string, Record<string, ConditionalFeeConfig>>
>({});

// 条件弹窗状态
const conditionPopupVisible = ref(false);
const conditionPopupPosition = ref({ top: 0, left: 0 });
const currentConditionCell = ref<{
  feeIndex: number;
  ctnCodeId: string;
} | null>(null);

// 是否直达状态（用于控制中转港的可编辑性）
const isDirectValue = ref<boolean>(true);

// ==================== 加载基础数据 ====================

/**
 * 加载基础数据
 */
async function loadSelectData() {
  try {
    const { getCurrencyPagedList } =
      await import('#/api/system/base-data/currency-admin');
    const currencyRes = await getCurrencyPagedList({ PageSize: 1000 });
    currencyList.value = (currencyRes.items || []).map((item: any) => ({
      label: item.code || item.enName,
      value: item.id,
    }));

    // 查找 USD 币别的 ID
    const usdCurrency = currencyRes.items?.find(
      (item: any) => item.code?.toUpperCase() === 'USD',
    );
    if (usdCurrency) {
      defaultCurrencyId.value = usdCurrency.id;
      console.log('USD 币别 ID:', defaultCurrencyId.value);
    }

    const { getFeeCodePagedList } =
      await import('#/api/system/base-data/fee-code-admin');
    const feeRes = await getFeeCodePagedList({ PageSize: 1000 });
    feeCodeList.value = (feeRes.items || []).map((item: any) => ({
      label: item.cnName || item.enName,
      value: item.id,
    }));

    // 加载箱型列表
    const { getCtnCodePagedList } =
      await import('#/api/system/base-data/ctn-code-admin');
    const ctnRes = await getCtnCodePagedList({
      PageIndex: 1,
      PageSize: 1000,
      Sorting: 'OrderNo',
    });
    allCtnOptions.value = (ctnRes.items || []).map((item: any) => ({
      ctnCodeId: item.id,
      ctnName: item.ctnName || '',
    }));

    // 加载枚举项
    freightConditionItemOptions.value = await getEnumItems(
      'freightConditionItem',
    );
    conditionComparisonTypeOptions.value = await getEnumItems(
      'conditionComparisonType',
    );
  } catch (error) {
    console.error('加载下拉数据失败:', error);
  }
}

/**
 * 加载默认箱型（status为0且isDefault为true）
 */
async function loadDefaultCtns() {
  try {
    const { getCtnCodePagedList } =
      await import('#/api/system/base-data/ctn-code-admin');
    const ctnRes = await getCtnCodePagedList({
      PageIndex: 1,
      PageSize: 1000,
      Sorting: 'OrderNo',
    });

    // 筛选出默认箱型
    const defaultCtns = (ctnRes.items || []).filter(
      (item: any) => item.status === 0 && item.isDefault === true,
    );

    if (defaultCtns && defaultCtns.length > 0) {
      console.log('加载到默认箱型:', defaultCtns);
      return defaultCtns.map((item: any) => ({
        id: '',
        seFreiPriceId: '',
        ctnCodeId: item.id,
        cost: 0,
        remark: undefined,
        ctnCode: {
          id: item.id,
          ctnName: item.ctnName || '',
        } as any,
      }));
    }

    return [];
  } catch (error) {
    console.error('加载默认箱型失败:', error);
    return [];
  }
}

// ==================== 表单配置 ====================

const [Form, formApi] = useVbenForm({
  schema: [
    // 第一行：船公司、起运港、目的港
    {
      component: 'CarrierSelect',
      fieldName: 'carrierId',
      label: '船公司',
      componentProps: {
        placeholder: '请选择船公司',
        allowClear: true,
        style: { width: '100%' },
      },
      rules: 'required',
    },
    {
      component: 'PortSelect',
      fieldName: 'polId',
      label: '起运港',
      componentProps: {
        placeholder: '请选择起运港',
        allowClear: true,
        style: { width: '100%' },
      },
      rules: 'required',
    },
    {
      component: 'PortSelect',
      fieldName: 'podId',
      label: '目的港',
      componentProps: {
        placeholder: '请选择目的港',
        allowClear: true,
        style: { width: '100%' },
      },
      rules: 'required',
    },
    // 第二行：是否直达、中转港1、中转港2
    {
      component: 'RadioGroup',
      fieldName: 'isDirect',
      label: '是否直达',
      defaultValue: true,
      componentProps: {
        options: [
          { label: '是', value: true },
          { label: '否', value: false },
        ],
        onChange: (e: any) => {
          const isDirect = e.target?.value ?? e;
          isDirectValue.value = isDirect;
          if (isDirect === true) {
            // 选择"是"时，清空并禁用中转港
            formApi.setValues({ poT1Id: undefined, poT2Id: undefined });
          }
        },
      },
    },
    {
      component: 'PortSelect',
      fieldName: 'poT1Id',
      label: '中转港1',
      dependencies: {
        show: (values) => values.isDirect === false,
        triggerFields: ['isDirect'],
      },
      componentProps: {
        placeholder: '请选择中转港1',
        allowClear: true,
        style: { width: '100%' },
      },
    },
    {
      component: 'PortSelect',
      fieldName: 'poT2Id',
      label: '中转港2',
      dependencies: {
        show: (values) => values.isDirect === false,
        triggerFields: ['isDirect'],
      },
      componentProps: {
        placeholder: '请选择中转港2',
        allowClear: true,
        style: { width: '100%' },
      },
    },
    {
      component: 'Input',
      fieldName: 'voyage',
      label: '航程(天)',
      componentProps: {
        placeholder: '请输入航程',
        maxlength: 100,
        style: { width: '100%' },
      },
    },
    // 第三行：约号、免用箱天数等
    {
      component: 'Input',
      fieldName: 'contractNo',
      label: '约号',
      componentProps: {
        placeholder: '请输入约号',
        maxlength: 128,
        style: { width: '100%' },
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'polFreeDays',
      label: '起运港免用箱',
      componentProps: {
        placeholder: '请输入免用箱天数',
        min: 0,
        style: { width: '100%' },
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'podFreeDays',
      label: '目的港免用箱',
      componentProps: {
        placeholder: '请输入免用箱天数',
        min: 0,
        style: { width: '100%' },
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'poddem',
      label: '目的港免堆期',
      componentProps: {
        placeholder: '请输入免堆期天数',
        min: 0,
        style: { width: '100%' },
      },
    },
    // 第四行：目的港免箱期
    {
      component: 'InputNumber',
      fieldName: 'poddet',
      label: '目的港免箱期',
      componentProps: {
        placeholder: '请输入免箱期天数',
        min: 0,
        style: { width: '100%' },
      },
    },
    // {
    //   component: 'DatePicker',
    //   fieldName: 'closeDocTime',
    //   label: '截单时间',
    //   componentProps: {
    //     placeholder: '请选择截单时间',
    //     format: 'YYYY-MM-DD HH:mm',
    //     valueFormat: 'YYYY-MM-DD HH:mm',
    //     showTime: true,
    //     timePicker: { format: 'HH:mm' },
    //     style: { width: '100%' },
    //     onChange: (value: any) => {
    //       if (value) {
    //         dateEditMode.value = 'date';
    //         formApi.setValues({
    //           closeDocDayOfWeek: undefined,
    //           closeDocDayTime: undefined,
    //         });
    //       }
    //     },
    //   },
    // },
    // {
    //   component: 'Select',
    //   fieldName: 'closeDocDayOfWeek',
    //   label: '截单星期',
    //   componentProps: {
    //     options: [
    //       { label: '周日', value: 0 },
    //       { label: '周一', value: 1 },
    //       { label: '周二', value: 2 },
    //       { label: '周三', value: 3 },
    //       { label: '周四', value: 4 },
    //       { label: '周五', value: 5 },
    //       { label: '周六', value: 6 },
    //     ],
    //     placeholder: '请选择截单星期',
    //     allowClear: true,
    //     disabled: computed(() => dateEditMode.value === 'date'),
    //     style: { width: '100%' },
    //     onChange: (value: any) => {
    //       if (value !== undefined && value !== null) {
    //         dateEditMode.value = 'week';
    //         formApi.setValues({ closeDocTime: undefined });
    //       }
    //     },
    //   },
    // },
    // {
    //   component: 'TimePicker',
    //   fieldName: 'closeDocDayTime',
    //   label: '截单时间点',
    //   componentProps: {
    //     placeholder: '请选择时间点',
    //     format: 'HH:mm',
    //     valueFormat: 'HH:mm:ss',
    //     disabled: computed(() => dateEditMode.value !== 'week'),
    //     style: { width: '100%' },
    //   },
    // },
    // // 第五行：截关时间相关
    // {
    //   component: 'DatePicker',
    //   fieldName: 'closingTime',
    //   label: '截关时间',
    //   componentProps: {
    //     placeholder: '请选择截关时间',
    //     format: 'YYYY-MM-DD HH:mm',
    //     valueFormat: 'YYYY-MM-DD HH:mm',
    //     showTime: true,
    //     timePicker: { format: 'HH:mm' },
    //     style: { width: '100%' },
    //     onChange: (value: any) => {
    //       if (value) {
    //         dateEditMode.value = 'date';
    //         formApi.setValues({
    //           closingDayOfWeek: undefined,
    //           closingDayTime: undefined,
    //         });
    //       }
    //     },
    //   },
    // },
    // {
    //   component: 'Select',
    //   fieldName: 'closingDayOfWeek',
    //   label: '截关星期',
    //   componentProps: {
    //     options: [
    //       { label: '周日', value: 0 },
    //       { label: '周一', value: 1 },
    //       { label: '周二', value: 2 },
    //       { label: '周三', value: 3 },
    //       { label: '周四', value: 4 },
    //       { label: '周五', value: 5 },
    //       { label: '周六', value: 6 },
    //     ],
    //     placeholder: '请选择截关星期',
    //     allowClear: true,
    //     disabled: computed(() => dateEditMode.value === 'date'),
    //     style: { width: '100%' },
    //     onChange: (value: any) => {
    //       if (value !== undefined && value !== null) {
    //         dateEditMode.value = 'week';
    //         formApi.setValues({ closingTime: undefined });
    //       }
    //     },
    //   },
    // },
    // {
    //   component: 'TimePicker',
    //   fieldName: 'closingDayTime',
    //   label: '截关时间点',
    //   componentProps: {
    //     placeholder: '请选择时间点',
    //     format: 'HH:mm',
    //     valueFormat: 'HH:mm:ss',
    //     disabled: computed(() => dateEditMode.value !== 'week'),
    //     style: { width: '100%' },
    //   },
    // },
    // 第四行：目的港免箱期、备注
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: '备注',
      componentProps: {
        placeholder: '请输入备注',
        maxlength: 500,
        showCount: true,
        autoSize: { minRows: 3, maxRows: 6 },
      },
      wrapperClass: 'col-span-4',
    },
  ],
  layout: 'horizontal',
  showDefaultActions: false,
  wrapperClass: 'grid-cols-4',
});

// ==================== Modal 配置 ====================

const [Modal, modalApi] = useVbenModal({
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      // 关闭时重置状态
      // 先清理条件配置弹窗的事件监听器
      hideConditionPopup();
      document.removeEventListener('click', hideConditionPopup);

      id.value = undefined;
      formData.value = undefined;
      surchargeFees.value = [];
      etdList.value = [];
      etdDayList.value = [];
      conditionalFeeConfigs.value = {};

      // 延迟重置表单，确保 DOM 更新完成
      setTimeout(() => {
        formApi.resetForm().catch(() => {
          // 忽略重置错误（可能在 DOM 销毁时发生）
        });
      }, 0);
      return;
    }

    // 打开时加载数据
    await loadSelectData();

    const data = modalApi.getData<any>();
    if (data?.id) {
      // 编辑模式
      id.value = data.id;
      await loadDetail(data.id);
    } else {
      // 新增模式 - 初始化并加载默认箱型
      const defaultCtns = await loadDefaultCtns();

      formData.value = {
        id: '',
        recommend: false,
        carrierId: 0,
        polId: 0,
        podId: 0,
        isDirect: true,
        validTimeStart: '',
        validTimeEnd: '',
        currencyId: defaultCurrencyId.value || 0, // 默认设置为 USD，如果未找到则为 0
        creationTime: '',
        isValid: true,
        seFreiPriceCtns: defaultCtns,
        seFreiPriceFees: [],
      } as SeFreiPriceOutDto;
      surchargeFees.value = [];
      etdList.value = [];
      etdDayList.value = [];
    }
  },
  closeOnClickModal: false,
});

// ==================== 加载详情数据啊 ====================

async function loadDetail(priceId: string) {
  try {
    const hideLoading = message.loading({ content: '加载中...', duration: 0 });
    const detail = await getSeFreiPriceDetail(priceId);
    hideLoading();

    formData.value = detail;

    // 填充表单数据
    await formApi.setValues({
      carrierId: detail.carrierId,
      currencyId: detail.currencyId,
      polId: detail.polId,
      podId: detail.podId,
      poT1Id: detail.poT1Id,
      poT2Id: detail.poT2Id,
      voyage: detail.voyage,
      contractNo: detail.contractNo,
      polFreeDays: detail.polFreeDays,
      podFreeDays: detail.podFreeDays,
      poddem: detail.poddem,
      poddet: detail.poddet,
      validTimeStart: detail.validTimeStart,
      validTimeEnd: detail.validTimeEnd,
      isDirect: detail.isDirect,
      remark: detail.remark,
    });

    // 设置日期编辑模式（从子表中判断）
    if (detail.seFreiPriceWeekDays && detail.seFreiPriceWeekDays.length > 0) {
      dateEditMode.value = 'week';
    } else if (detail.seFreiPriceDays && detail.seFreiPriceDays.length > 0) {
      dateEditMode.value = 'date';
    } else {
      dateEditMode.value = 'date'; // 默认日期模式
    }

    // 初始化是否直达状态
    isDirectValue.value = detail.isDirect ?? true;

    // 填充附加费列表
    if (detail.seFreiPriceFees && detail.seFreiPriceFees.length > 0) {
      surchargeFees.value = detail.seFreiPriceFees.map((fee, feeIndex) => {
        const surchargeItem: SurchargeFeeItem = {
          id: fee.id,
          feeCodeId: fee.feeCodeId,
          currencyId: fee.currencyId,
          priceFeeType: fee.priceFeeType,
          prices: {},
          seFreiPriceCtnFees: [],
        };

        // 判断是否为按票计费
        const isOrderFee = fee.priceFeeType === 1;

        if (isOrderFee) {
          // 按票计费：将价格存储到特殊的 'order' key 中
          if (fee.price !== undefined && fee.price !== null) {
            surchargeItem.prices['order'] = {
              price: fee.price,
            };
          }
        } else {
          // 按集装箱计费：处理每个箱型的费用
          if (fee.seFreiPriceCtnFees) {
            fee.seFreiPriceCtnFees.forEach((ctnFee) => {
              const ctnInfo = detail.seFreiPriceCtns?.find(
                (ctn) => ctn.id === ctnFee.seFreiPriceCtnId,
              );

              if (ctnInfo) {
                const ctnCodeIdStr = String(ctnInfo.ctnCodeId);

                // 判断是否需要启用条件模式
                const hasConditionData =
                  (ctnFee.operatorType !== undefined &&
                    ctnFee.operatorType !== null) ||
                  (ctnFee.value !== undefined && ctnFee.value !== null) ||
                  (ctnFee.otherPrice !== undefined &&
                    ctnFee.otherPrice !== null);

                if (hasConditionData) {
                  initConditionalConfig(String(feeIndex), ctnCodeIdStr);
                  const config =
                    conditionalFeeConfigs.value[String(feeIndex)]?.[
                      ctnCodeIdStr
                    ];
                  if (config) {
                    config.enabled = true;
                  }
                }

                surchargeItem.prices[ctnCodeIdStr] = {
                  price: ctnFee.price,
                  value: ctnFee.value,
                  conditionType: ctnFee.conditionType || 1,
                  operatorType: ctnFee.operatorType,
                  otherPrice: ctnFee.otherPrice,
                };

                surchargeItem.seFreiPriceCtnFees?.push({
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
        }

        return surchargeItem;
      });
    }

    // 填充关联日子表（日期模式）
    if (detail.seFreiPriceDays && detail.seFreiPriceDays.length > 0) {
      etdList.value = detail.seFreiPriceDays.map((day) => ({
        id: day.id,
        etd: day.etd,
        closeDocTime: day.closeDocTime,
        closingTime: day.closingTime,
      }));
    }

    // 填充关联周几子表（星期模式）
    if (detail.seFreiPriceWeekDays && detail.seFreiPriceWeekDays.length > 0) {
      etdDayList.value = detail.seFreiPriceWeekDays.map((weekDay) => ({
        id: weekDay.id,
        etdDayOfWeek: weekDay.etdDayOfWeek,
        etdDayTime: weekDay.etdDayTime,
        closeDocDayOfWeek: weekDay.closeDocDayOfWeek,
        closeDocDayTime: weekDay.closeDocDayTime,
        closingDayOfWeek: weekDay.closingDayOfWeek,
        closingDayTime: weekDay.closingDayTime,
      }));
    }

    // 设置开船日子表输入模式（用于互斥）
    // 优先判断是否有星期数据，如果有则设为 weekday，否则如果有日期数据则设为 date
    if (detail.seFreiPriceWeekDays && detail.seFreiPriceWeekDays.length > 0) {
      etdInputMode.value = 'weekday';
    } else if (detail.seFreiPriceDays && detail.seFreiPriceDays.length > 0) {
      etdInputMode.value = 'date';
    } else {
      etdInputMode.value = null; // 默认无数据时不锁定模式
    }

    // 设置截单/截关时间编辑模式（用于独立日期模块）
    // 优先判断是否有星期数据，如果有则设为 week，否则如果有日期数据则设为 date
    if (detail.seFreiPriceWeekDays && detail.seFreiPriceWeekDays.length > 0) {
      dateEditMode.value = 'week';
    } else if (detail.seFreiPriceDays && detail.seFreiPriceDays.length > 0) {
      dateEditMode.value = 'date';
    } else {
      dateEditMode.value = 'date'; // 默认
    }
  } catch (error) {
    message.error('加载详情失败');
    console.error(error);
  }
}

// ==================== 箱型管理 ====================

/**
 * 获取可用的箱型选项（排除已添加的）
 */
const availableCtnOptions = computed(() => {
  const addedIds = new Set(
    formData.value?.seFreiPriceCtns?.map((c) => String(c.ctnCodeId)) || [],
  );
  return allCtnOptions.value.filter((c) => !addedIds.has(String(c.ctnCodeId)));
});

/**
 * 箱型选项模糊搜索过滤函数
 */
function filterCtnOption(input: string, option: any) {
  if (!input) return true;
  const ctnName = option?.ctnName || '';
  return ctnName.toLowerCase().includes(input.toLowerCase());
}

/**
 * 添加箱型
 */
async function addCtn() {
  if (!selectedCtnId.value) {
    message.warning('请先选择箱型');
    return;
  }

  const ctnCodeId = selectedCtnId.value;

  // 检查是否已添加
  if (
    formData.value?.seFreiPriceCtns?.some(
      (ctn) => String(ctn.ctnCodeId) === String(ctnCodeId),
    )
  ) {
    message.warning('该箱型已添加');
    return;
  }

  // 查找箱型信息
  const ctn = allCtnOptions.value.find(
    (c) => String(c.ctnCodeId) === String(ctnCodeId),
  );
  if (!ctn) {
    message.error('未找到箱型信息');
    return;
  }

  // 初始化formData中的箱型数组
  if (!formData.value) {
    formData.value = {
      id: '',
      recommend: false,
      carrierId: 0,
      polId: 0,
      podId: 0,
      isDirect: true,
      validTimeStart: '',
      validTimeEnd: '',
      currencyId: 0, // 初始化为0，用户必须选择
      creationTime: '',
      isValid: true,
      seFreiPriceCtns: [],
      seFreiPriceFees: [],
    } as SeFreiPriceOutDto;
  }

  if (!formData.value.seFreiPriceCtns) {
    formData.value.seFreiPriceCtns = [];
  }

  // 添加新箱型（使用类型断言，因为新增时不需要id和seFreiPriceId）
  formData.value.seFreiPriceCtns.push({
    id: '',
    seFreiPriceId: '',
    ctnCodeId: ctn.ctnCodeId,
    cost: 0,
    remark: undefined,
    ctnCode: {
      id: ctn.ctnCodeId,
      ctnName: ctn.ctnName,
    } as any,
  } as any);

  // 清空选中的箱型ID，方便下次选择
  selectedCtnId.value = undefined;

  message.success('添加箱型成功');
}

/**
 * 删除箱型 (通过索引)
 */
function removeCtn(index: number) {
  if (!formData.value?.seFreiPriceCtns) return;

  const removedCtn = formData.value.seFreiPriceCtns[index];
  if (!removedCtn) return;

  formData.value.seFreiPriceCtns.splice(index, 1);

  // 同时移除该箱型在所有附加费中的价格配置
  cleanupCtnFees(removedCtn.ctnCodeId);
}

/**
 * 删除箱型 (通过CTN Code ID) - 用于表头删除按钮
 */
function removeCtnByCtnCodeId(ctnCodeId: number) {
  if (!formData.value?.seFreiPriceCtns) return;

  const index = formData.value.seFreiPriceCtns.findIndex(
    (c) => c.ctnCodeId === ctnCodeId,
  );
  if (index !== -1) {
    removeCtn(index);
  }
}

/**
 * 清理指定箱型在附加费中的数据
 */
function cleanupCtnFees(ctnCodeId: number) {
  const ctnCodeIdStr = String(ctnCodeId);
  surchargeFees.value.forEach((fee) => {
    delete fee.prices[ctnCodeIdStr];
    if (fee.seFreiPriceCtnFees) {
      fee.seFreiPriceCtnFees = fee.seFreiPriceCtnFees.filter(
        (ctnFee) => ctnFee.ctnCodeId !== ctnCodeId,
      );
    }
  });
}

// ==================== 附加费管理 ====================

function addSurchargeFee() {
  surchargeFees.value.push({
    priceFeeType: 0, // 默认按集装箱
    prices: {},
    seFreiPriceCtnFees: [],
  });
}

function removeSurchargeFee(index: number) {
  surchargeFees.value.splice(index, 1);
}

function handlePriceFeeTypeChange(index: number, value: PriceFeeType) {
  const fee = surchargeFees.value[index];
  if (!fee) return;

  const oldPriceFeeType = fee.priceFeeType;
  fee.priceFeeType = value;

  // 切换计费方式时清空相关数据
  if (value === 0) {
    // 切换到按集装箱：清空按票的价格，保留箱型费用结构
    delete fee.prices['order'];
    // 如果之前是按票且有价格，尝试将价格应用到第一个箱型（如果有箱型的话）
    if (oldPriceFeeType === 1 && dynamicCtnTypes.value.length > 0) {
      const firstCtn = dynamicCtnTypes.value[0];
      if (firstCtn) {
        const firstCtnCodeId = String(firstCtn.ctnCodeId);
        const orderPrice = fee.prices['order']?.price;
        if (orderPrice !== undefined) {
          fee.prices[firstCtnCodeId] = { price: orderPrice };
        }
      }
    }
  } else {
    // 切换到按票：清空所有箱型费用，只保留一个统一价格结构（如果需要）
    const allPrices = Object.keys(fee.prices);
    allPrices.forEach((key) => {
      if (key !== 'order') {
        delete fee.prices[key];
      }
    });
    fee.seFreiPriceCtnFees = [];
    // 清除条件配置
    const feeIndexStr = String(index);
    const feeConfig = conditionalFeeConfigs.value[feeIndexStr];
    if (feeConfig) {
      Object.keys(feeConfig).forEach((ctnCodeId) => {
        delete feeConfig[ctnCodeId];
      });
    }
  }
}

// ==================== 条件费用配置 ====================

function initConditionalConfig(feeIndex: string, ctnCodeId: string) {
  if (!conditionalFeeConfigs.value[feeIndex]) {
    conditionalFeeConfigs.value[feeIndex] = {};
  }
  if (!conditionalFeeConfigs.value[feeIndex][ctnCodeId]) {
    conditionalFeeConfigs.value[feeIndex][ctnCodeId] = {
      enabled: false,
      threshold: undefined,
      valueIfGreater: undefined,
      valueOtherwise: undefined,
    };
  }
}

function getConditionalConfig(
  feeIndex: string,
  ctnCodeId: string,
): ConditionalFeeConfig {
  initConditionalConfig(feeIndex, ctnCodeId);
  return conditionalFeeConfigs.value[feeIndex]?.[
    ctnCodeId
  ] as ConditionalFeeConfig;
}

function showConditionPopup(
  event: MouseEvent,
  feeIndex: number,
  ctnCodeId: string,
) {
  event.stopPropagation();
  const target = event.target as HTMLElement;
  const rect = target.getBoundingClientRect();

  currentConditionCell.value = {
    feeIndex: feeIndex,
    ctnCodeId: String(ctnCodeId),
  };
  conditionPopupPosition.value = {
    top: rect.top + window.scrollY - 2,
    left: rect.right + window.scrollX + 3,
  };
  conditionPopupVisible.value = true;

  setTimeout(() => {
    document.addEventListener('click', hideConditionPopup);
  }, 0);
}

function hideConditionPopup() {
  conditionPopupVisible.value = false;
  currentConditionCell.value = null;
  // 使用 try-catch 避免在 DOM 销毁时出错
  try {
    document.removeEventListener('click', hideConditionPopup);
  } catch (error) {
    // 忽略移除事件监听器时的错误
  }
}

function toggleConditionEnabled(enabled: boolean) {
  if (currentConditionCell.value) {
    const config = getConditionalConfig(
      String(currentConditionCell.value.feeIndex),
      currentConditionCell.value.ctnCodeId,
    );
    config.enabled = enabled;

    if (!enabled) {
      config.threshold = undefined;
      config.valueIfGreater = undefined;
      config.valueOtherwise = undefined;
    }
  }
  hideConditionPopup();
}

function updateSurchargePriceValue(
  feeIndex: number,
  ctnCodeId: string,
  field: keyof SurchargePriceItem,
  value: string,
) {
  const fee = surchargeFees.value[feeIndex];
  if (!fee) return;

  if (!fee.prices[ctnCodeId]) {
    fee.prices[ctnCodeId] = {};
  }

  const numValue = value ? Number(value) : undefined;
  fee.prices[ctnCodeId][field] = numValue;
}

function toggleOperator(feeIndex: number, ctnCodeId: string) {
  const currentOperator =
    surchargeFees.value[feeIndex]?.prices[ctnCodeId]?.operatorType || 1;
  const operatorSequence = conditionComparisonTypeOptions.value.map(
    (opt) => opt.value,
  );
  const currentIndex = operatorSequence.indexOf(currentOperator ?? 0);
  const nextIndex = (currentIndex + 1) % operatorSequence.length;
  const nextOperator = operatorSequence[nextIndex];

  updateSurchargePriceValue(
    feeIndex,
    ctnCodeId,
    'operatorType',
    String(nextOperator),
  );
}

function getOperatorSymbol(operatorType?: number): string {
  return (
    conditionComparisonTypeOptions.value.find(
      (opt) => opt.value === operatorType,
    )?.label || '≥'
  );
}

// ==================== 日期时间管理 ====================

/**
 * 切换到日期模式
 */
function switchToDateMode() {
  if (dateEditMode.value === 'week') {
    // 清空星期模式数据
    etdDayList.value = [];
  }
  dateEditMode.value = 'date';
}

/**
 * 切换到星期模式
 */
function switchToWeekMode() {
  if (dateEditMode.value === 'date') {
    // 清空日期模式数据
    etdList.value = [];
  }
  dateEditMode.value = 'week';
}

/**
 * 添加一组日期/星期数据
 */
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
      etdDayTime: undefined,
      closeDocDayOfWeek: undefined,
      closeDocDayTime: undefined,
      closingDayOfWeek: undefined,
      closingDayTime: undefined,
    });
  }
}

/**
 * 删除一组日期数据
 */
function removeDateGroup(index: number) {
  etdList.value.splice(index, 1);
}

/**
 * 删除一组星期数据
 */
function removeWeekGroup(index: number) {
  etdDayList.value.splice(index, 1);
}

// ==================== 提交表单 ====================

async function handleSubmit() {
  try {
    // 验证表单
    const result = await formApi.validate();
    if (!result.valid) {
      message.error('请检查表单填写');
      return;
    }

    const values = await formApi.getValues();

    console.log('=== 提交前调试信息 ===');
    console.log('formData.value:', formData.value);
    console.log('formData.value?.currencyId:', formData.value?.currencyId);
    console.log('values.currencyId:', values.currencyId);

    // 优先使用 formData 中的 currencyId，如果不存在则使用 values 中的
    const finalCurrencyId =
      formData.value?.currencyId !== undefined &&
      formData.value?.currencyId !== null
        ? formData.value.currencyId
        : values.currencyId;

    console.log('最终使用的 currencyId:', finalCurrencyId);

    // 验证币别是否存在
    if (!finalCurrencyId) {
      message.error('请选择币别');
      return;
    }

    // 构建箱型数据
    const seFreiPriceCtns =
      formData.value?.seFreiPriceCtns?.map((ctn) => ({
        ...(ctn.id ? { id: ctn.id } : {}),
        ctnCodeId: ctn.ctnCodeId,
        cost: ctn.cost,
        remark: ctn.remark,
      })) || [];

    // 构建附加费数据
    const seFreiPriceFees = surchargeFees.value.map((fee, feeIndex) => {
      // 判断是否为按票计费
      const isOrderFee = fee.priceFeeType === 1;

      let ctnFees:
        | Array<{
            ctnCodeId: number;
            price: number;
            conditionType?: number;
            operatorType?: number;
            value?: number;
            otherPrice?: number;
          }>
        | undefined;

      if (isOrderFee) {
        // 按票计费：不需要箱型费用列表，价格存储在 fee.price 中
        ctnFees = undefined;
      } else {
        // 按集装箱计费：构建箱型费用列表
        ctnFees = Object.entries(fee.prices)
          .map(([ctnCodeIdStr, priceItem]) => {
            // 从formData的箱型列表中查找原始的ctnCodeId（number类型），避免精度丢失
            const ctnInfo = formData.value?.seFreiPriceCtns?.find(
              (ctn) => String(ctn.ctnCodeId) === ctnCodeIdStr,
            );

            if (!ctnInfo) {
              console.warn(`未找到箱型ID为 ${ctnCodeIdStr} 的箱型信息`);
              return null;
            }

            return {
              ctnCodeId: ctnInfo.ctnCodeId, // 使用原始的number类型ctnCodeId
              price: priceItem.price ?? 0,
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

      // 获取按票计费的价格
      const orderPrice = isOrderFee
        ? (fee.prices['order']?.price ?? 0)
        : undefined;

      // 确保 price 和 seFreiPriceCtnFees 互斥
      return {
        ...(fee.id ? { id: fee.id } : {}),
        feeCodeId: fee.feeCodeId!,
        currencyId: fee.currencyId!,
        priceFeeType: fee.priceFeeType,
        // 按票计费时，price 有值，seFreiPriceCtnFees 为 undefined
        // 按集装箱计费时，price 为 undefined，seFreiPriceCtnFees 有值
        price: orderPrice,
        seFreiPriceCtnFees: ctnFees && ctnFees.length > 0 ? ctnFees : undefined,
      };
    });

    // 构建提交数据
    const baseData = {
      recommend: false,
      carrierId: values.carrierId,
      polId: values.polId,
      podId: values.podId,
      currencyId: finalCurrencyId,
      isDirect: values.isDirect ?? true,
      poT1Id: values.poT1Id,
      poT2Id: values.poT2Id,
      voyage: values.voyage,
      contractNo: values.contractNo,
      polFreeDays: values.polFreeDays,
      podFreeDays: values.podFreeDays,
      poddem: values.poddem,
      poddet: values.poddet,
      validTimeStart: formData.value?.validTimeStart,
      validTimeEnd: formData.value?.validTimeEnd,
      remark: values.remark,
      seFreiPriceCtns,
      seFreiPriceFees,
      // 构建关联日列表（seFreiPriceDays）- 日期模式
      seFreiPriceDays:
        dateEditMode.value === 'date'
          ? etdList.value
              .filter((day) => day.etd || day.closeDocTime || day.closingTime)
              .map((day) => ({
                ...(day.id ? { id: day.id } : {}),
                etd: day.etd,
                closeDocTime: day.closeDocTime,
                closingTime: day.closingTime,
              }))
          : [],
      // 构建关联周几列表（seFreiPriceWeekDays）- 星期模式
      seFreiPriceWeekDays:
        dateEditMode.value === 'week'
          ? etdDayList.value
              .filter(
                (weekDay) =>
                  weekDay.etdDayOfWeek !== undefined ||
                  weekDay.closeDocDayOfWeek !== undefined ||
                  weekDay.closingDayOfWeek !== undefined,
              )
              .map((weekDay) => ({
                ...(weekDay.id ? { id: weekDay.id } : {}),
                etdDayOfWeek: weekDay.etdDayOfWeek,
                etdDayTime: weekDay.etdDayTime,
                closeDocDayOfWeek: weekDay.closeDocDayOfWeek,
                closeDocDayTime: weekDay.closeDocDayTime,
                closingDayOfWeek: weekDay.closingDayOfWeek,
                closingDayTime: weekDay.closingDayTime,
              }))
          : [],
    };

    const hideLoading = message.loading({
      content: isEditMode.value ? '保存中...' : '新增中...',
      duration: 0,
    });

    if (isEditMode.value) {
      await editSeFreiPrice({
        ...baseData,
        id: id.value!,
      } as EditSeFreiPriceInput);
      message.success('编辑成功');
    } else {
      await addSeFreiPrice(baseData as AddSeFreiPriceInput);
      message.success('新增成功');
    }

    hideLoading();
    modalApi.close();
    emits('success');
  } catch (error) {
    console.error('提交失败:', error);
    message.error('操作失败');
  }
}

// ==================== 初始化 ====================

onMounted(() => {
  loadSelectData();
});
</script>

<template>
  <Modal title="运价信息" class="w-[1400px]" :footer="false">
    <div class="edit-form-container">
      <!-- 有效期醒目提示区域 -->
      <div class="validity-period-banner">
        <div class="banner-icon">
          <IconifyIcon icon="mdi:calendar-clock" class="size-8" />
        </div>
        <div class="banner-content">
          <div class="banner-title">请设置运价有效期</div>
          <div class="banner-subtitle">
            有效起始日期和截止日期为必填项，请务必准确填写
          </div>
        </div>
        <div class="banner-fields">
          <div class="field-item">
            <label class="field-label"
              >有效起始 <span class="required">*</span></label
            >
            <DatePicker
              v-if="formData"
              v-model:value="formData.validTimeStart"
              placeholder="请选择有效起始时间"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              class="field-input"
            />
          </div>
          <div class="field-divider">至</div>
          <div class="field-item">
            <label class="field-label"
              >有效截止 <span class="required">*</span></label
            >
            <DatePicker
              v-if="formData"
              v-model:value="formData.validTimeEnd"
              placeholder="请选择有效截止时间"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              class="field-input"
            />
          </div>
        </div>
      </div>

      <!-- 基础信息 -->
      <div class="form-section">
        <h3 class="section-title">基础信息</h3>
        <Form />
      </div>

      <!-- 日期时间设置（独立模块） -->
      <div class="form-section">
        <h3 class="section-title">
          <span>日期时间设置</span>
          <div class="flex items-center gap-2">
            <!-- 模式切换按钮 -->
            <Button
              :type="dateEditMode === 'date' ? 'primary' : 'default'"
              size="small"
              @click="switchToDateMode"
              :class="{
                'mode-btn-active': dateEditMode === 'date',
                'mode-btn-inactive': dateEditMode !== 'date',
              }"
            >
              <IconifyIcon icon="mdi:calendar-range" class="mr-1 size-4" />
              日期模式
            </Button>
            <Button
              :type="dateEditMode === 'week' ? 'primary' : 'default'"
              size="small"
              @click="switchToWeekMode"
              :class="{
                'mode-btn-active': dateEditMode === 'week',
                'mode-btn-inactive': dateEditMode !== 'week',
              }"
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
        </h3>

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
                @click="removeWeekGroup(index)"
                class="delete-btn"
              >
                <IconifyIcon icon="mdi:delete-outline" class="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- 箱型费率 -->
      <div class="form-section">
        <h3 class="section-title">
          <span>箱型费率</span>
          <div v-if="formData" class="flex items-center gap-2">
            <span class="required-label"
              >币别 <span class="required-star">*</span></span
            >
            <Select
              class="currency-select"
              v-model:value="formData.currencyId"
              style="width: 150px"
              show-search
              :filter-option="
                (input: string, option: any) => {
                  if (!input) return true;
                  const currencyItem = currencyList.find(
                    (item) => item.value === option.value,
                  );
                  const label = currencyItem?.label || '';
                  return String(label)
                    .toLowerCase()
                    .includes(input.toLowerCase());
                }
              "
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
            <Select
              v-model:value="selectedCtnId"
              style="width: 200px"
              placeholder="选择箱型"
              show-search
              :filter-option="filterCtnOption"
              :options="availableCtnOptions"
              :field-names="{ label: 'ctnName', value: 'ctnCodeId' }"
              @change="addCtn"
            />
          </div>
        </h3>

        <!-- 无箱型时的提示 -->
        <div
          v-if="
            !formData?.seFreiPriceCtns || formData.seFreiPriceCtns.length === 0
          "
          class="empty-tip"
        >
          暂无箱型，请从上方下拉框选择箱型添加
        </div>

        <!-- 箱型费率表格 - 参考 form.vue 的布局 -->
        <div v-else class="overflow-x-auto">
          <table class="w-full border-collapse border border-gray-300">
            <thead>
              <tr class="bg-gray-100">
                <th class="border border-gray-300 px-3 py-2 text-left">
                  费用类型
                </th>
                <th
                  v-for="ctn in formData?.seFreiPriceCtns || []"
                  :key="ctn.ctnCodeId"
                  class="border border-gray-300 px-3 py-2 text-center"
                >
                  <div class="flex items-center justify-between">
                    <span>{{
                      ctn.ctnCode?.ctnName || `箱型${ctn.ctnCodeId}`
                    }}</span>
                    <button
                      class="ml-2 text-red-500 hover:text-red-700"
                      @click="removeCtnByCtnCodeId(ctn.ctnCodeId)"
                      title="删除箱型"
                    >
                      ×
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border border-gray-300 px-3 py-2 font-medium">
                  海运费
                </td>
                <!-- 箱型成本输入 -->
                <td
                  v-for="(ctn, index) in formData?.seFreiPriceCtns || []"
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
      <div class="form-section">
        <h3 class="section-title">
          <span>附加费明细</span>
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
        </h3>

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
                    :filter-option="
                      (input: string, option: any) => {
                        if (!input) return true;
                        const feeItem = feeCodeList.find(
                          (item) => item.value === option.value,
                        );
                        const label = feeItem?.label || '';
                        return String(label)
                          .toLowerCase()
                          .includes(input.toLowerCase());
                      }
                    "
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
                    v-model:value="surcharge.currencyId"
                    class="w-full"
                    show-search
                    :filter-option="
                      (input: string, option: any) => {
                        if (!input) return true;
                        const currencyItem = currencyList.find(
                          (item) => item.value === option.value,
                        );
                        const label = currencyItem?.label || '';
                        return String(label)
                          .toLowerCase()
                          .includes(input.toLowerCase());
                      }
                    "
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
                  v-for="ctn in dynamicCtnTypes"
                  :key="`fee${ctn.ctnCodeId}`"
                  class="relative border border-gray-300 py-2 pl-4 pr-3"
                >
                  <!-- 按票计费模式：只显示第一个箱型列的输入框 -->
                  <div
                    v-if="surcharge.priceFeeType === 1"
                    class="relative mt-6"
                  >
                    <!-- 只在第一个箱型列显示价格输入框 -->
                    <template
                      v-if="
                        index === 0 ||
                        ctn.ctnCodeId === dynamicCtnTypes[0]?.ctnCodeId
                      "
                    >
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
                        placeholder="请输入按票价格"
                      />
                      <div class="mt-1 text-center text-xs text-gray-500">
                        按票计费（所有箱型统一价格）
                      </div>
                    </template>
                    <!-- 其他箱型列显示提示 -->
                    <template v-else>
                      <div
                        class="flex h-full items-center justify-center text-gray-400"
                      >
                        <span class="text-sm">-</span>
                      </div>
                    </template>
                  </div>

                  <!-- 按集装箱计费模式：每个箱型独立输入 -->
                  <div v-else class="relative mt-6">
                    <!-- 条件模式图标 -->
                    <div class="absolute left-1 top-1 z-10">
                      <button
                        type="button"
                        class="flex h-5 w-5 items-center justify-center rounded bg-white text-gray-400 shadow-sm transition-all hover:text-blue-600 hover:shadow-md"
                        @click="
                          showConditionPopup($event, index, ctn.ctnCodeId)
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
                                String(index),
                                String(ctn.ctnCodeId),
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
                        getConditionalConfig(
                          String(index),
                          String(ctn.ctnCodeId),
                        ).enabled
                      "
                      class="mt-6 space-y-2"
                    >
                      <!-- 条件配置行 -->
                      <div class="flex items-center gap-1.5">
                        <Select
                          size="small"
                          :value="
                            surcharge.prices[String(ctn.ctnCodeId)]
                              ?.conditionType
                          "
                          :options="freightConditionItemOptions"
                          class="flex-1"
                          @change="
                            (val) =>
                              updateSurchargePriceValue(
                                index,
                                String(ctn.ctnCodeId),
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
                          @click="toggleOperator(index, String(ctn.ctnCodeId))"
                          :title="'点击切换算符'"
                        >
                          {{
                            getOperatorSymbol(
                              surcharge.prices[String(ctn.ctnCodeId)]
                                ?.operatorType,
                            )
                          }}
                        </button>

                        <Input
                          size="small"
                          :value="
                            surcharge.prices[String(ctn.ctnCodeId)]?.value
                          "
                          @input="
                            updateSurchargePriceValue(
                              index,
                              String(ctn.ctnCodeId),
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
                          v-if="
                            surcharge.prices[String(ctn.ctnCodeId)]
                              ?.conditionType
                          "
                          class="whitespace-nowrap text-xs text-gray-500"
                        >
                          {{
                            freightConditionItemOptions.find(
                              (o) =>
                                o.value ===
                                surcharge.prices[String(ctn.ctnCodeId)]
                                  ?.conditionType,
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
                              :value="
                                surcharge.prices[String(ctn.ctnCodeId)]?.price
                              "
                              @input="
                                updateSurchargePriceValue(
                                  index,
                                  String(ctn.ctnCodeId),
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
                                surcharge.prices[String(ctn.ctnCodeId)]
                                  ?.otherPrice
                              "
                              @input="
                                updateSurchargePriceValue(
                                  index,
                                  String(ctn.ctnCodeId),
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
                        :value="surcharge.prices[String(ctn.ctnCodeId)]?.price"
                        @input="
                          updateSurchargePriceValue(
                            index,
                            String(ctn.ctnCodeId),
                            'price',
                            ($event.target as HTMLInputElement).value,
                          )
                        "
                        type="number"
                        class="w-full rounded-lg border border-gray-300 py-2 pl-2 pr-2 text-center transition-colors hover:border-blue-400 focus:outline-none"
                        placeholder="0"
                      />
                    </div>
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

      <!-- 底部按钮 -->
      <div class="form-footer">
        <Button @click="modalApi.close">取消</Button>
        <Button type="primary" @click="handleSubmit">确定</Button>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
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

@media (max-width: 1200px) {
  .date-group-content {
    grid-template-columns: 1fr;
  }

  .week-group-content {
    grid-template-columns: 1fr;
  }
}

.edit-form-container {
  max-height: 70vh;
  padding: 16px;
  overflow-y: auto;
}

/* 有效期醒目提示横幅样式 */
.validity-period-banner {
  display: flex;
  gap: 20px;
  align-items: center;
  padding: 20px 24px;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgb(102 126 234 / 30%);
  animation: fade-in 0.4s ease-in-out;
}

.banner-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  color: white;
  background: rgb(255 255 255 / 20%);
  border-radius: 50%;
}

.banner-content {
  flex: 1;
  min-width: 0;
}

.banner-title {
  margin-bottom: 4px;
  font-size: 18px;
  font-weight: 600;
  color: white;
}

.banner-subtitle {
  font-size: 13px;
  color: rgb(255 255 255 / 85%);
}

.banner-fields {
  display: flex;
  gap: 16px;
  align-items: flex-end;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: white;
}

.required {
  color: #ffd700;
}

.field-input {
  width: 180px;
}

.field-input :deep(.ant-picker) {
  background: rgb(255 255 255 / 95%);
  border: none;
  border-radius: 6px;
}

.field-input :deep(.ant-picker:hover),
.field-input :deep(.ant-picker-focused) {
  border-color: #ffd700;
  box-shadow: 0 0 0 2px rgb(255 215 0 / 30%);
}

.field-divider {
  padding-bottom: 8px;
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.form-section {
  padding: 16px;
  margin-bottom: 24px;
  background: #fafafa;
  border-radius: 8px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.sub-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sub-table-row {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

.empty-tip {
  padding: 32px 16px;
  font-size: 14px;
  color: #94a3b8;
  text-align: center;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.empty-tip:hover {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-color: #94a3b8;
}

.form-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #e8e8e8;
}

/* 模式切换按钮样式增强 */
.mode-toggle {
  padding: 10px 20px;
  color: #fff;
  cursor: pointer;
  background-color: #333;
  border: none;
  border-radius: 5px;
}

/* 表格样式 */
table {
  border-collapse: collapse;
}

th,
td {
  border: 1px solid #d1d5db;
}

/* 条件模式图标按钮样式 */
button[title='设置条件费用'] {
  transition: all 0.2s ease;
}

button[title='设置条件费用']:hover {
  transform: scale(1.1);
}

/* 输入框焦点效果 */
input[type='number'],
input[type='text'] {
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

input[type='number']:focus,
input[type='text']:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgb(59 130 246 / 10%);
}

/* 价格输入区域渐变背景增强 */
.bg-gradient-to-r {
  background-size: 200% 100%;
  transition: background-position 0.3s ease;
}

.bg-gradient-to-r:hover {
  background-position: right center;
}

/* 条件配置区域动画 */
.space-y-2 {
  animation: fade-in 0.3s ease-in-out;
}

.currency-select :deep(.ant-select-selector) {
  border-color: #f59e0b;
  border-width: 2px;
}

.currency-select :deep(.ant-select-selector:hover),
.currency-select :deep(.ant-select-focused .ant-select-selector) {
  border-color: #f59e0b !important;
  box-shadow: 0 0 0 2px rgb(245 158 11 / 20%) !important;
}

/* 必填标签样式 */
.required-label {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: #262626;
}

.required-star {
  font-size: 16px;
  font-weight: bold;
  line-height: 1;
  color: #ff4d4f;
}

/* 日期时间设置模块样式 */
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

/* .date-group-row:hover,
.week-group-row:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgb(59 130 246 / 15%);
  transform: translateY(-2px);
} */

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

/* 模式切换按钮样式增强 */
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

.mode-btn-active:active {
  transform: scale(1.05);
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

.section-title .ant-btn {
  color: #333;
  background-color: #f0f0f0;
  border-color: #d9d9d9;
}

.section-title .ant-btn:hover {
  background-color: #e0e0e0;
  border-color: #c1c1c1;
}

.section-title .ant-btn-primary {
  box-shadow: 0 2px 4px rgb(59 130 246 / 30%);
}

.section-title .ant-btn-primary:hover {
  box-shadow: 0 4px 8px rgb(59 130 246 / 40%);
  transform: translateY(-1px);
}

/* 添加一组按钮样式 */
.section-title .ant-btn-link {
  font-weight: 500;
  color: #10b981;
}

.section-title .ant-btn-link:hover {
  color: #059669;
  background: rgb(16 185 129 / 5%);
}
</style>
