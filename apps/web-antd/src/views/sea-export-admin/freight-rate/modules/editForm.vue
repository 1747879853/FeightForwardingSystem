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

// 时间模式控制
const closeDocMode = ref<'datetime' | 'week' | null>(null);
const closingMode = ref<'datetime' | 'week' | null>(null);

// 开船日子表输入模式控制（用于互斥）
const etdInputMode = ref<'date' | 'weekday' | null>(null);

// 下拉数据源
const currencyList = ref<any[]>([]);
const feeCodeList = ref<any[]>([]);
const allCtnOptions = ref<Array<{ ctnCodeId: number; ctnName: string }>>([]);

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

// 开船日子表
const etdList = ref<
  Array<{
    id?: string;
    etd?: string;
  }>
>([]);

const etdDayList = ref<
  Array<{
    id?: string;
    etdDayOfWeek?: number;
    etdDayTime?: string;
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
    // 第一行：船公司
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
        placeholder: '请选择船公司',
        allowClear: true,
      },
      rules: 'required',
    },
    // 第二行：起运港、目的港
    {
      component: 'PortSelect',
      fieldName: 'polId',
      label: '起运港',
      componentProps: {
        placeholder: '请选择起运港',
        allowClear: true,
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
      },
      rules: 'required',
    },
    // 第三行：是否直达、中转港1、中转港2
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
      },
    },
    // 第四行：航程、约号
    {
      component: 'Input',
      fieldName: 'voyage',
      label: '航程(天)',
      componentProps: {
        placeholder: '请输入航程',
        maxlength: 100,
      },
    },
    {
      component: 'Input',
      fieldName: 'contractNo',
      label: '约号',
      componentProps: {
        placeholder: '请输入约号',
        maxlength: 128,
      },
    },
    // 第五行：免用箱天数、免堆期、免箱期
    {
      component: 'InputNumber',
      fieldName: 'polFreeDays',
      label: '起运港免用箱',
      componentProps: {
        placeholder: '请输入免用箱天数',
        min: 0,
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'podFreeDays',
      label: '目的港免用箱',
      componentProps: {
        placeholder: '请输入免用箱天数',
        min: 0,
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'poddem',
      label: '目的港免堆期',
      componentProps: {
        placeholder: '请输入免堆期天数',
        min: 0,
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'poddet',
      label: '目的港免箱期',
      componentProps: {
        placeholder: '请输入免箱期天数',
        min: 0,
      },
    },
    // 第六行：截单时间（互斥）
    {
      component: 'DatePicker',
      fieldName: 'closeDocTime',
      label: '截单时间',
      componentProps: {
        placeholder: '请选择截单时间',
        format: 'YYYY-MM-DD HH:mm',
        valueFormat: 'YYYY-MM-DD HH:mm',
        showTime: true,
        timePicker: { format: 'HH:mm' },
        onChange: (value: any) => {
          if (value) {
            closeDocMode.value = 'datetime';
            formApi.setValues({
              closeDocDayOfWeek: undefined,
              closeDocDayTime: undefined,
            });
          } else {
            closeDocMode.value = null;
          }
        },
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
        placeholder: '请选择截单星期',
        allowClear: true,
        disabled: computed(() => closeDocMode.value === 'datetime'),
        onChange: (value: any) => {
          if (value !== undefined && value !== null) {
            closeDocMode.value = 'week';
            formApi.setValues({ closeDocTime: undefined });
          } else {
            closeDocMode.value = null;
          }
        },
      },
    },
    {
      component: 'TimePicker',
      fieldName: 'closeDocDayTime',
      label: '截单时间点',
      componentProps: {
        placeholder: '请选择时间点',
        format: 'HH:mm',
        valueFormat: 'HH:mm:ss',
        disabled: computed(() => closeDocMode.value !== 'week'),
      },
    },
    // 第七行：截关时间（互斥）
    {
      component: 'DatePicker',
      fieldName: 'closingTime',
      label: '截关时间',
      componentProps: {
        placeholder: '请选择截关时间',
        format: 'YYYY-MM-DD HH:mm',
        valueFormat: 'YYYY-MM-DD HH:mm',
        showTime: true,
        timePicker: { format: 'HH:mm' },
        onChange: (value: any) => {
          if (value) {
            closingMode.value = 'datetime';
            formApi.setValues({
              closingDayOfWeek: undefined,
              closingDayTime: undefined,
            });
          } else {
            closingMode.value = null;
          }
        },
      },
    },
    {
      component: 'Select',
      fieldName: 'closingDayOfWeek',
      label: '截关星期',
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
        placeholder: '请选择截关星期',
        allowClear: true,
        disabled: computed(() => closingMode.value === 'datetime'),
        onChange: (value: any) => {
          if (value !== undefined && value !== null) {
            closingMode.value = 'week';
            formApi.setValues({ closingTime: undefined });
          } else {
            closingMode.value = null;
          }
        },
      },
    },
    {
      component: 'TimePicker',
      fieldName: 'closingDayTime',
      label: '截关时间点',
      componentProps: {
        placeholder: '请选择时间点',
        format: 'HH:mm',
        valueFormat: 'HH:mm:ss',
        disabled: computed(() => closingMode.value !== 'week'),
      },
    },
    // 第八行：备注
    {
      component: 'Input',
      fieldName: 'remark',
      label: '备注',
      componentProps: {
        placeholder: '请输入备注',
        maxlength: 500,
      },
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
      id.value = undefined;
      formData.value = undefined;
      surchargeFees.value = [];
      etdList.value = [];
      etdDayList.value = [];
      conditionalFeeConfigs.value = {};
      await formApi.resetForm();
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
        currencyId: 0,
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
      closeDocTime: detail.closeDocTime,
      closeDocDayOfWeek: detail.closeDocDayOfWeek,
      closeDocDayTime: detail.closeDocDayTime,
      closingTime: detail.closingTime,
      closingDayOfWeek: detail.closingDayOfWeek,
      closingDayTime: detail.closingDayTime,
      validTimeStart: detail.validTimeStart,
      validTimeEnd: detail.validTimeEnd,
      isDirect: detail.isDirect,
      remark: detail.remark,
    });

    // 设置时间模式
    if (detail.closeDocTime) closeDocMode.value = 'datetime';
    else if (detail.closeDocDayOfWeek !== undefined)
      closeDocMode.value = 'week';

    if (detail.closingTime) closingMode.value = 'datetime';
    else if (detail.closingDayOfWeek !== undefined) closingMode.value = 'week';

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
                (ctnFee.otherPrice !== undefined && ctnFee.otherPrice !== null);

              if (hasConditionData) {
                initConditionalConfig(String(feeIndex), ctnCodeIdStr);
                const config =
                  conditionalFeeConfigs.value[String(feeIndex)]?.[ctnCodeIdStr];
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

        return surchargeItem;
      });
    }

    // 填充开船日子表
    if (detail.seFreiPriceETDs && detail.seFreiPriceETDs.length > 0) {
      etdList.value = detail.seFreiPriceETDs.map((etd) => ({
        id: etd.id,
        etd: etd.etd,
      }));
      // 如果有开船日期，设置为日期模式
      etdInputMode.value = 'date';
    }

    if (detail.seFreiPriceETDDays && detail.seFreiPriceETDDays.length > 0) {
      etdDayList.value = detail.seFreiPriceETDDays.map((etdDay) => ({
        id: etdDay.id,
        etdDayOfWeek: etdDay.etdDayOfWeek,
        etdDayTime: etdDay.etdDayTime,
      }));
      // 如果有开船星期，设置为星期模式
      etdInputMode.value = 'weekday';
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
      currencyId: 0,
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
 * 删除箱型
 */
function removeCtn(index: number) {
  if (!formData.value?.seFreiPriceCtns) return;

  const removedCtn = formData.value.seFreiPriceCtns[index];
  if (!removedCtn) return;

  formData.value.seFreiPriceCtns.splice(index, 1);

  // 同时移除该箱型在所有附加费中的价格配置
  const ctnCodeIdStr = String(removedCtn.ctnCodeId);
  surchargeFees.value.forEach((fee) => {
    delete fee.prices[ctnCodeIdStr];
    if (fee.seFreiPriceCtnFees) {
      fee.seFreiPriceCtnFees = fee.seFreiPriceCtnFees.filter(
        (ctnFee) => ctnFee.ctnCodeId !== removedCtn!.ctnCodeId,
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

  fee.priceFeeType = value;
  // 切换计费方式时清空相关数据
  if (value === 0) {
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
  document.removeEventListener('click', hideConditionPopup);
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

// ==================== 开船日管理 ====================

function addEtd() {
  // 如果当前是星期模式，清空星期列表
  if (etdInputMode.value === 'weekday') {
    etdDayList.value = [];
  }
  etdInputMode.value = 'date';
  etdList.value.push({ etd: undefined });
}

function removeEtd(index: number) {
  etdList.value.splice(index, 1);
  // 如果删除后为空，重置模式
  if (etdList.value.length === 0) {
    etdInputMode.value = null;
  }
}

function addEtdDay() {
  // 如果当前是日期模式，清空日期列表
  if (etdInputMode.value === 'date') {
    etdList.value = [];
  }
  etdInputMode.value = 'weekday';
  etdDayList.value.push({ etdDayOfWeek: undefined, etdDayTime: undefined });
}

function removeEtdDay(index: number) {
  etdDayList.value.splice(index, 1);
  // 如果删除后为空，重置模式
  if (etdDayList.value.length === 0) {
    etdInputMode.value = null;
  }
}

function handleEtdDateChange(value: any) {
  if (value) {
    etdInputMode.value = 'date';
    // 清空开船星期列表
    if (etdDayList.value.length > 0) {
      etdDayList.value = [];
      message.info('已切换为开船日期模式，开船星期数据已清空');
    }
  } else {
    // 如果所有日期都被清空，重置模式
    const hasValidDate = etdList.value.some((etd) => etd.etd);
    if (!hasValidDate) {
      etdInputMode.value = null;
    }
  }
}

function handleEtdWeekdayChange(value: any) {
  if (value !== undefined && value !== null) {
    etdInputMode.value = 'weekday';
    // 清空开船日期列表
    if (etdList.value.length > 0) {
      etdList.value = [];
      message.info('已切换为开船星期模式，开船日期数据已清空');
    }
  } else {
    // 如果所有星期都被清空，重置模式
    const hasValidWeekday = etdDayList.value.some(
      (etdDay) =>
        etdDay.etdDayOfWeek !== undefined && etdDay.etdDayOfWeek !== null,
    );
    if (!hasValidWeekday) {
      etdInputMode.value = null;
    }
  }
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
      const ctnFees = Object.entries(fee.prices)
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

      return {
        ...(fee.id ? { id: fee.id } : {}),
        feeCodeId: fee.feeCodeId!,
        currencyId: fee.currencyId!,
        priceFeeType: fee.priceFeeType,
        seFreiPriceCtnFees: ctnFees.length > 0 ? ctnFees : undefined,
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
      closeDocTime: values.closeDocTime,
      closeDocDayOfWeek: values.closeDocDayOfWeek,
      closeDocDayTime: values.closeDocDayTime,
      closingTime: values.closingTime,
      closingDayOfWeek: values.closingDayOfWeek,
      closingDayTime: values.closingDayTime,
      validTimeStart: values.validTimeStart,
      validTimeEnd: values.validTimeEnd,
      remark: values.remark,
      seFreiPriceCtns,
      seFreiPriceFees,
      seFreiPriceETDs: etdList.value
        .filter((etd) => etd.etd)
        .map((etd) => ({
          etd: etd.etd!,
        })),
      seFreiPriceETDDays: etdDayList.value
        .filter((etdDay) => etdDay.etdDayOfWeek !== undefined)
        .map((etdDay) => ({
          etdDayOfWeek: etdDay.etdDayOfWeek!,
          etdDayTime: etdDay.etdDayTime || '00:00:00',
        })),
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
              v-model:value="formData!.validTimeStart"
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
              v-model:value="formData!.validTimeEnd"
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

      <!-- 开船日子表 -->
      <div class="form-section">
        <h3 class="section-title">
          <span>开船日期</span>
          <Button
            type="link"
            size="small"
            @click="addEtd"
            :disabled="etdInputMode === 'weekday'"
          >
            <IconifyIcon icon="mdi:plus" class="size-4" />
            添加
          </Button>
        </h3>
        <div v-if="etdList.length === 0" class="empty-tip">
          暂无开船日期，请点击添加（与开船星期互斥）
        </div>
        <div v-else class="sub-table">
          <div
            v-for="(etd, index) in etdList"
            :key="index"
            class="sub-table-row"
          >
            <DatePicker
              v-model:value="etd.etd"
              placeholder="请选择开船日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 200px"
              @change="handleEtdDateChange"
            />
            <Button type="link" danger size="small" @click="removeEtd(index)">
              <IconifyIcon icon="mdi:delete-outline" class="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <!-- 开船日周几子表 -->
      <div class="form-section">
        <h3 class="section-title">
          <span>开船星期</span>
          <Button
            type="link"
            size="small"
            @click="addEtdDay"
            :disabled="etdInputMode === 'date'"
          >
            <IconifyIcon icon="mdi:plus" class="size-4" />
            添加
          </Button>
        </h3>
        <div v-if="etdDayList.length === 0" class="empty-tip">
          暂无开船星期，请点击添加（与开船日期互斥）
        </div>
        <div v-else class="sub-table">
          <div
            v-for="(etdDay, index) in etdDayList"
            :key="index"
            class="sub-table-row"
          >
            <Select
              v-model:value="etdDay.etdDayOfWeek"
              placeholder="请选择星期"
              style="width: 120px"
              :options="[
                { label: '周日', value: 0 },
                { label: '周一', value: 1 },
                { label: '周二', value: 2 },
                { label: '周三', value: 3 },
                { label: '周四', value: 4 },
                { label: '周五', value: 5 },
                { label: '周六', value: 6 },
              ]"
              @change="handleEtdWeekdayChange"
            />
            <TimePicker
              v-model:value="etdDay.etdDayTime"
              placeholder="请选择时间点"
              format="HH:mm"
              value-format="HH:mm:ss"
              style="width: 120px"
            />
            <Button
              type="link"
              danger
              size="small"
              @click="removeEtdDay(index)"
            >
              <IconifyIcon icon="mdi:delete-outline" class="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <!-- 箱型费率 -->
      <div class="form-section">
        <h3 class="section-title">
          <span>箱型费率</span>
          <div class="flex items-center gap-2">
            <Select
              v-model:value="formData!.currencyId"
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
        <div
          v-if="
            !formData?.seFreiPriceCtns || formData.seFreiPriceCtns.length === 0
          "
          class="empty-tip"
        >
          暂无箱型，请从上方下拉框选择箱型添加
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full border-collapse border border-gray-300">
            <thead>
              <tr class="bg-gray-100">
                <!-- <th class="border border-gray-300 px-3 py-2 text-center" style="width: 120px">
                  箱型
                </th> -->
                <th
                  class="border border-gray-300 px-3 py-2 text-center"
                  style="width: 150px"
                >
                  箱型名称
                </th>
                <th
                  class="border border-gray-300 px-3 py-2 text-center"
                  style="width: 120px"
                >
                  成本
                </th>
                <th
                  class="border border-gray-300 px-3 py-2 text-center"
                  style="width: 150px"
                >
                  备注
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
              <tr
                v-for="(ctn, index) in formData?.seFreiPriceCtns || []"
                :key="ctn.ctnCodeId"
              >
                <!-- <td class="border border-gray-300 px-2 py-2 text-center">
                  {{ ctn.ctnCodeId }}
                </td> -->
                <td
                  class="border border-gray-300 px-2 py-2 text-center font-medium"
                >
                  {{ ctn.ctnCode?.ctnName || `箱型${ctn.ctnCodeId}` }}
                </td>
                <td class="border border-gray-300 px-2 py-2">
                  <input
                    v-model.number="
                      (formData?.seFreiPriceCtns[index] as any).cost
                    "
                    type="number"
                    class="w-full rounded border border-gray-300 px-2 py-1 text-center text-sm"
                    placeholder="-"
                  />
                </td>
                <td class="border border-gray-300 px-2 py-2">
                  <input
                    v-model="(formData?.seFreiPriceCtns[index] as any).remark"
                    type="text"
                    class="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="请输入备注"
                  />
                </td>
                <td class="border border-gray-300 px-2 py-2 text-center">
                  <Button
                    type="link"
                    danger
                    size="small"
                    @click="removeCtn(index)"
                  >
                    <IconifyIcon icon="mdi:delete-outline" class="size-4" />
                  </Button>
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
                  <!-- 条件模式图标 -->
                  <div class="absolute left-1 top-1 z-10">
                    <button
                      type="button"
                      class="flex h-5 w-5 items-center justify-center rounded bg-white text-gray-400 shadow-sm transition-all hover:text-blue-600 hover:shadow-md"
                      @click="showConditionPopup($event, index, ctn.ctnCodeId)"
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
                      getConditionalConfig(String(index), String(ctn.ctnCodeId))
                        .enabled
                    "
                    class="mt-6 space-y-2"
                  >
                    <!-- 条件配置行 -->
                    <div class="flex items-center gap-1.5">
                      <Select
                        size="small"
                        :value="
                          surcharge.prices[String(ctn.ctnCodeId)]?.conditionType
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
                        :value="surcharge.prices[String(ctn.ctnCodeId)]?.value"
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
                          surcharge.prices[String(ctn.ctnCodeId)]?.conditionType
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
  padding: 16px;
  font-size: 14px;
  color: #999;
  text-align: center;
  background: #fff;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
}

.form-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #e8e8e8;
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
</style>
