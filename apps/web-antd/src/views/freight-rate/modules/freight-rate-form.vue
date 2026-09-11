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
const hasPermission = ref<boolean>(false); // 是否有编辑权限（从父组件传入）
const isEditMode = computed(() => !!id.value);

// 添加有效期验证状态
const validityPeriodError = ref<string>('');

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
      code: item.code,
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
    freightConditionItemOptions.value = freightConditionItemOptions.value.map(
      (item) => ({
        ...item,
        label: item.displayName,
        value: item.value,
      }),
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
      component: 'ClientSelect',
      fieldName: 'bookingAgentId',
      label: '订舱代理',
      componentProps: {
        placeholder: '请选择订舱代理',
        allowClear: true,
        industryCategory: 'o', // 只展示行业类别包含"o"（订舱代理）的客户
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
    //         formApi.setgle({ closingTime: undefined });
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

// ==================== 方法定义 ====================

/**
 * 验证有效期时间范围
 */
function validateValidityPeriod(): boolean {
  if (!formData.value?.validTimeStart || !formData.value?.validTimeEnd) {
    validityPeriodError.value = '有效起始时间和有效截止时间为必填项';
    return false; // 如果任一日期为空，则验证失败
  }

  const startDate = new Date(formData.value.validTimeStart);
  const endDate = new Date(formData.value.validTimeEnd);

  if (endDate < startDate) {
    validityPeriodError.value = '有效截止时间不能早于有效起始时间';
    return false;
  }

  validityPeriodError.value = '';
  return true;
}

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
    hasPermission.value = data.permission ?? false; // 从传入数据设置权限
    if (data?.id) {
      // 编辑模式
      id.value = data.id;
      await loadDetail(data.id);
    } else if (data?.copyId) {
      // 复制模式：加载原单后清除 id，按新增提交
      id.value = undefined;
      await loadDetail(data.copyId);
      if (formData.value) {
        formData.value = {
          ...formData.value,
          id: '',
          creationTime: '',
          creatorUserId: undefined as any,
          creatorUserName: undefined as any,
          lastModificationTime: undefined as any,
          lastModifierUserId: undefined as any,
        };
      }
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
        isValid: 0, // 0=已生效
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
    if (detail.carrier) {
      formApi.updateSchema([
        {
          fieldName: 'carrierId',
          componentProps: {
            selectedItems: [detail.carrier],
          },
        },
      ]);
    }

    if (detail.bookingAgent) {
      formApi.updateSchema([
        {
          fieldName: 'bookingAgentId',
          componentProps: {
            selectedItems: [detail.bookingAgent],
          },
        },
      ]);
    }

    await formApi.setValues({
      carrierId: detail.carrierId,
      currencyId: detail.currencyId,
      bookingAgentId: detail.bookingAgentId,
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
  // 使用 try-catch 遥避在 DOM 销毁时出错
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

    // 验证有效期时间范围
    if (!validateValidityPeriod()) {
      message.error(validityPeriodError.value);
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
      bookingAgentId: values.bookingAgentId || null,
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
                closeDocDayOfWeek: weekDay.closeDocDayOfWeek,
                closeDocDayTime: weekDay.closeDocDayTime,
                closingDayOfWeek: weekDay.closingDayOfWeek,
                closingDayTime: weekDay.closingDayTime,
              }))
          : [],
    };

    // const hideLoading = message.loading({
    //   content: isEditMode.value ? '保存中...' : '新增中...',
    //   duration: 0,
    // });

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

    modalApi.close();
    emits('success');
  } catch (error) {
    console.error('提交失败:', error);
    //message.error('操作失败');
  }
}

// ==================== 初始化 ====================

onMounted(() => {
  loadSelectData();
});
</script>

<template>
  <Modal
    title="运价信息"
    class="freight-edit-form-modal w-[1400px]"
    :footer="false"
  >
    <div class="edit-form-container">
      <!-- 有效期醒目提示区域 -->
      <div class="validity-period-banner">
        <div class="banner-icon">
          <IconifyIcon icon="mdi:calendar-clock" class="size-7" />
        </div>
        <div class="banner-content">
          <div class="banner-title">运价有效期</div>
          <div class="banner-subtitle">
            起始与截止日期为必填项，请准确填写后再维护下方费率信息
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
          </div>
        </header>
        <div class="section-body">
          <Form />
        </div>
      </section>

      <!-- 日期时间设置（独立模块） -->
      <section class="form-section">
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
                  </div>

                  <!-- 截单星期组 -->
                  <div class="week-pair">
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
      </section>

      <!-- 箱型费率 -->
      <section class="form-section">
        <header class="section-header">
          <div class="section-title">
            <div class="section-title-icon icon-amber">
              <IconifyIcon icon="mdi:cube-outline" class="size-4" />
            </div>
            <span class="section-title-text">箱型费率</span>
          </div>
          <div v-if="formData" class="section-actions">
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
        </header>

        <div class="section-body">
          <!-- 无箱型时的提示 -->
          <div
            v-if="
              !formData?.seFreiPriceCtns ||
              formData.seFreiPriceCtns.length === 0
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
      </section>

      <!-- 附加费明细 -->
      <section class="form-section form-section--surcharge">
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
                >先选费用与计费方式，再按箱型填写单价；可按条件拆分报价</span
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
              点击右上角「添加」录入 THC、DOC 等附加费用
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
                  <th
                    v-for="ctn in dynamicCtnTypes"
                    :key="ctn.ctnCodeId"
                    class="col-price"
                  >
                    <span class="ctn-chip">{{ ctn.name }}</span>
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
                      :filter-option="
                        (input: string, option: any) => {
                          if (!input) return true;
                          const feeItem = feeCodeList.find(
                            (item) => item.value === option.value,
                          );
                          const label = feeItem?.code
                            ? feeItem.code + '-' + feeItem.label
                            : feeItem?.label || '';
                          return String(label)
                            .toLowerCase()
                            .includes(input.toLowerCase());
                        }
                      "
                      placeholder="请选择费用名称"
                      allow-clear
                      :dropdown-match-select-width="false"
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
                    <Select
                      v-model:value="surcharge.currencyId"
                      class="currency-select-fixed w-full"
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
                      placeholder="币别"
                      allow-clear
                    >
                      <Select.Option
                        v-for="currency in currencyList"
                        :key="currency.value"
                        :value="currency.value"
                        :title="currency.label"
                      >
                        {{ currency.label }}
                      </Select.Option>
                    </Select>
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
                    v-for="ctn in dynamicCtnTypes"
                    :key="`fee${ctn.ctnCodeId}`"
                    class="col-price"
                    :class="{
                      'col-price--order': surcharge.priceFeeType === 1,
                      'col-price--condition':
                        surcharge.priceFeeType !== 1 &&
                        getConditionalConfig(
                          String(index),
                          String(ctn.ctnCodeId),
                        ).enabled,
                    }"
                  >
                    <!-- 按票计费：仅首个箱型列录入 -->
                    <div
                      v-if="surcharge.priceFeeType === 1"
                      class="price-cell price-cell--order"
                    >
                      <template
                        v-if="ctn.ctnCodeId === dynamicCtnTypes[0]?.ctnCodeId"
                      >
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

                    <!-- 按集装箱计费 -->
                    <div
                      v-else
                      class="price-cell"
                      :class="{
                        'price-cell--conditioned': getConditionalConfig(
                          String(index),
                          String(ctn.ctnCodeId),
                        ).enabled,
                      }"
                    >
                      <div
                        v-if="
                          getConditionalConfig(
                            String(index),
                            String(ctn.ctnCodeId),
                          ).enabled
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
                                showConditionPopup($event, index, ctn.ctnCodeId)
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
                                  ctn.ctnCodeId
                              "
                              class="condition-popup"
                              @click.stop
                            >
                              <label class="condition-popup-item">
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
                              surcharge.prices[String(ctn.ctnCodeId)]
                                ?.conditionType
                            "
                            class="condition-panel__unit"
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

                        <div class="condition-rule-row">
                          <Select
                            size="small"
                            :value="
                              surcharge.prices[String(ctn.ctnCodeId)]
                                ?.conditionType
                            "
                            :options="freightConditionItemOptions"
                            class="condition-select"
                            @change="
                              (val) =>
                                updateSurchargePriceValue(
                                  index,
                                  String(ctn.ctnCodeId),
                                  'conditionType',
                                  String(val),
                                )
                            "
                            placeholder="条件"
                          />

                          <button
                            type="button"
                            class="operator-btn"
                            @click="
                              toggleOperator(index, String(ctn.ctnCodeId))
                            "
                            title="点击切换算符"
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
                            class="condition-threshold"
                            placeholder="阈值"
                          />
                        </div>

                        <div class="condition-price-split">
                          <div class="split-item split-item--yes">
                            <div class="split-label">是</div>
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
                              class="condition-amount"
                              placeholder="0"
                            />
                          </div>
                          <div class="split-item split-item--else">
                            <div class="split-label">否则</div>
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
                              showConditionPopup($event, index, ctn.ctnCodeId)
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
                              currentConditionCell?.ctnCodeId === ctn.ctnCodeId
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

      <!-- 底部按钮 -->
      <div class="form-footer">
        <Button class="footer-btn" @click="modalApi.close">取消</Button>
        <Button
          type="primary"
          class="footer-btn footer-btn--primary"
          @click="handleSubmit"
          :disabled="!hasPermission"
        >
          确定
        </Button>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
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

  .validity-period-banner {
    flex-direction: column;
    align-items: stretch;
  }

  .banner-fields {
    flex-wrap: wrap;
  }
}

.edit-form-container {
  max-height: 70vh;
  padding: 4px 8px 8px;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

/* 有效期：主色浅底，替代原先紫渐变，贴近系统风格 */
.validity-period-banner {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 16px 20px;
  margin-bottom: 16px;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 12%) 0%,
    hsl(var(--primary) / 4%) 55%,
    hsl(var(--card)) 100%
  );
  border: 1px solid hsl(var(--primary) / 22%);
  border-radius: 12px;
  box-shadow: 0 2px 8px hsl(var(--primary) / 8%);
  animation: fade-in 0.35s ease;
}

.banner-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  color: hsl(var(--primary));
  background: hsl(var(--card));
  border: 1px solid hsl(var(--primary) / 20%);
  border-radius: 12px;
}

.banner-content {
  flex: 1;
  min-width: 0;
}

.banner-title {
  margin-bottom: 2px;
  font-size: 15px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.banner-subtitle {
  font-size: 12px;
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
}

.banner-fields {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.validity-period-banner .field-label {
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.required {
  color: #ff4d4f;
}

.field-input {
  width: 180px;
}

.field-input :deep(.ant-picker) {
  background: hsl(var(--card));
  border-color: hsl(var(--border));
  border-radius: 6px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.field-input :deep(.ant-picker:hover),
.field-input :deep(.ant-picker-focused) {
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 2px hsl(var(--primary) / 15%);
}

.field-divider {
  padding-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
}

/* 分区卡片 */
.form-section {
  margin-bottom: 14px;
  overflow: hidden;
  background: hsl(var(--card));
  border: 1px solid #e8ecf3;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgb(16 42 83 / 5%);
  transition: box-shadow 0.25s ease;
}

.form-section:hover {
  box-shadow: 0 4px 14px rgb(16 42 83 / 8%);
}

.section-header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  padding: 10px 16px;
  background: linear-gradient(90deg, #f4f8ff 0%, #fafbfd 55%, #fff 100%);
  border-bottom: 1px solid #e4e8ef;
}

.section-title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 0;
}

.section-title-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
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

.section-title-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  color: #006ce6;
  background: #eaf2ff;
  border-radius: 8px;
}

.section-title-icon.icon-teal {
  color: #0d9488;
  background: #e6fffa;
}

.section-title-icon.icon-amber {
  color: #d97706;
  background: #fff7ed;
}

.section-title-icon.icon-violet {
  color: #4f46e5;
  background: #eef2ff;
}

.section-title-text {
  font-size: 14px;
  font-weight: 600;
  color: #252a31;
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
}

.mode-chip:hover {
  color: #334155;
  background: rgb(255 255 255 / 70%);
}

.mode-chip--active {
  color: #006ce6;
  background: #fff;
  box-shadow: 0 1px 3px rgb(16 42 83 / 10%);
}

.mode-chip--active:hover {
  color: #006ce6;
  background: #fff;
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
  color: hsl(var(--muted-foreground));
  text-align: center;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.empty-tip:hover {
  background: #f1f5f9;
  border-color: hsl(var(--primary) / 40%);
}

.form-footer {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 14px 4px 4px;
  margin-top: 4px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    hsl(var(--card)) 28%,
    hsl(var(--card)) 100%
  );
  border-top: 1px solid #e8ecf3;
}

.footer-btn {
  min-width: 88px;
  transition:
    transform 0.15s ease,
    box-shadow 0.2s ease;
}

.footer-btn:hover {
  transform: translateY(-1px);
}

.footer-btn--primary:hover {
  box-shadow: 0 4px 12px hsl(var(--primary) / 28%);
}

table {
  border-collapse: collapse;
}

.section-body :deep(table) {
  overflow: hidden;
  border: 1px solid #e4e8ef !important;
  border-radius: 8px;
}

.section-body :deep(th),
.section-body :deep(td) {
  border-color: #e8ecf3 !important;
}

.section-body :deep(thead tr) {
  background: #f4f8ff !important;
}

.section-body :deep(tbody tr) {
  transition: background-color 0.15s ease;
}

.section-body :deep(tbody tr:hover) {
  background: #fafbfd;
}

.section-body--surcharge .surcharge-table {
  overflow: visible;
  border: none !important;
  border-radius: 0 !important;
}

.section-body--surcharge :deep(th),
.section-body--surcharge :deep(td) {
  border-color: #e8ecf3 !important;
}

.section-body--surcharge :deep(thead tr) {
  background: transparent !important;
}

.section-body--surcharge :deep(tbody tr:hover) {
  background: transparent;
}

button[title='设置条件费用'] {
  transition:
    color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;
}

button[title='设置条件费用']:hover {
  transform: scale(1.06);
}

input[type='number'],
input[type='text'] {
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

input[type='number']:focus,
input[type='text']:focus {
  outline: none;
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 2px hsl(var(--primary) / 12%);
}

.currency-select :deep(.ant-select-selector) {
  border-color: #f59e0b;
  border-width: 1.5px;
}

.currency-select :deep(.ant-select-selector:hover),
.currency-select :deep(.ant-select-focused .ant-select-selector) {
  border-color: #d97706 !important;
  box-shadow: 0 0 0 2px rgb(245 158 11 / 18%) !important;
}

.fee-name-select {
  min-width: 200px;
}

.fee-name-select :deep(.ant-select-selector) {
  min-width: 200px;
}

.fee-name-select :deep(.ant-select-selection-item) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.currency-select-fixed {
  min-width: 120px;
}

.currency-select-fixed :deep(.ant-select-selector) {
  min-width: 120px;
}

.currency-select-fixed :deep(.ant-select-selection-item) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.required-label {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  color: #252a31;
}

.required-star {
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  color: #ff4d4f;
}

.date-group-row,
.week-group-row {
  position: relative;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 14px 14px 16px;
  background: #fff;
  border: 1px solid #e8ecf3;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgb(16 42 83 / 4%);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.date-group-row::before,
.week-group-row::before {
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 0;
  width: 3px;
  content: '';
  background: hsl(var(--primary));
  border-radius: 0 3px 3px 0;
}

.date-group-row:hover,
.week-group-row:hover {
  border-color: hsl(var(--primary) / 35%);
  box-shadow: 0 3px 10px hsl(var(--primary) / 10%);
}

.date-group-content {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
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
  color: #64748b;
  letter-spacing: 0.2px;
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
  margin-top: 22px;
  opacity: 0.55;
  transition: opacity 0.2s ease;
}

.delete-btn:hover {
  opacity: 1;
}

.section-body :deep(.ant-form) {
  margin-bottom: 0;
}

/* —— 附加费表格分区 —— */
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
}

.surcharge-action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
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
}

.surcharge-table th,
.surcharge-table td {
  vertical-align: middle;
  border-right: 1px solid #e8ecf3;
  border-bottom: 1px solid #e8ecf3;
}

.surcharge-table th:last-child,
.surcharge-table td:last-child {
  border-right: none;
}

.surcharge-table thead th {
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  text-align: center;
  letter-spacing: 0.2px;
  background: linear-gradient(180deg, #f4f8ff 0%, #eef3fb 100%);
  border-bottom: 1px solid #dbe3f0;
}

.surcharge-table .col-index {
  width: 44px;
  min-width: 44px;
  text-align: center;
  background: #f8fafc;
}

.surcharge-table thead .col-index {
  background: linear-gradient(180deg, #f4f8ff 0%, #eef3fb 100%);
}

.surcharge-table .col-meta {
  background: #fafbfd;
}

.surcharge-table thead .col-meta {
  background: linear-gradient(180deg, #f4f8ff 0%, #eef3fb 100%);
}

.surcharge-table .col-fee {
  width: 180px;
  min-width: 180px;
  padding: 10px 12px;
}

.surcharge-table .col-currency {
  width: 110px;
  min-width: 110px;
  padding: 10px;
}

.surcharge-table .col-billing {
  width: 120px;
  min-width: 120px;
  padding: 10px;
}

.surcharge-table .col-price {
  min-width: 228px;
  padding: 10px 12px;
  background: #fff;
  transition: background-color 0.15s ease;
}

.surcharge-table .col-price--order {
  background: #f8fbff;
}

.surcharge-table .col-price--condition {
  width: 180px;
  min-width: 168px;
  max-width: 196px;
  background: #f5f7ff;
}

.surcharge-table .col-action {
  width: 64px;
  min-width: 64px;
  text-align: center;
  background: #fafbfd;
}

.surcharge-table thead .col-action {
  background: linear-gradient(180deg, #f4f8ff 0%, #eef3fb 100%);
}

.ctn-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #006ce6;
  background: #eaf2ff;
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
}

.surcharge-row:hover .col-meta,
.surcharge-row:hover .col-index,
.surcharge-row:hover .col-action {
  background: #f1f5f9;
}

.surcharge-row:hover .col-price {
  background: #f8fafc;
}

.surcharge-row:hover .col-price--order {
  background: #eef6ff;
}

.surcharge-row:hover .col-price--condition {
  background: #eef0ff;
}

.surcharge-row:hover .row-index {
  color: #fff;
  background: #006ce6;
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
}

.condition-trigger--inline {
  position: relative;
  top: auto;
  left: auto;
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
}

.condition-btn:hover {
  color: #006ce6;
  border-color: #93c5fd;
  box-shadow: 0 2px 6px rgb(0 108 230 / 16%);
  transform: scale(1.06);
}

.condition-btn--active {
  color: #fff;
  background: #4f46e5;
  border-color: #4f46e5;
  box-shadow: 0 2px 6px rgb(79 70 229 / 28%);
}

.condition-btn--active:hover {
  color: #fff;
  background: #4338ca;
  border-color: #4338ca;
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
}

.condition-popup-item:hover {
  background: #f1f5f9;
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

.condition-select {
  width: 100%;
  min-width: 0;
}

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
  color: #006ce6;
  cursor: pointer;
  background: #f8fbff;
  border: 1px solid #d0d7e2;
  border-radius: 6px;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    transform 0.12s ease;
}

.operator-btn:hover {
  background: #eaf2ff;
  border-color: #93c5fd;
  transform: translateY(-1px);
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
}

.split-item--yes {
  background: #eff6ff;
  border: 1px solid #dbeafe;
}

.split-item--else {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.split-label {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
}

.split-item--yes .split-label {
  color: #1d4ed8;
}

.split-item--else .split-label {
  color: #64748b;
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
}

.row-delete-btn:hover {
  color: #ef4444;
  background: #fef2f2;
  border-color: #fecaca;
  transform: scale(1.05);
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
