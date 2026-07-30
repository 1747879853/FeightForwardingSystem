<script lang="ts" setup>
import type { OrderFeeTemplateAdminApi } from '#/api/sea-export/order-fee-template-admin';

import { ref, onMounted, nextTick, computed } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { useVbenForm } from '#/adapter/form';
import {
  addOrderFeeTemplate,
  editOrderFeeTemplate,
  getOrderFeeTemplateDetail,
} from '#/api/sea-export/order-fee-template-admin';
// ✅ 新增：导入费用代码、币别和客户API
import { getFeeCodeListAsync } from '#/api/system/base-data/fee-code-admin';
import { getCurrencyPagedList } from '#/api/system/base-data/currency-admin';
import { getClientPagedList } from '#/api/common/client';
import { $t } from '#/locales';
import { Button, message, Tabs, Card } from 'ant-design-vue';
import PortSelect from '#/adapter/component/biz-select/port-select.vue';
import CarrierSelect from '#/adapter/component/biz-select/carrier-select.vue';
import CurrencySelect from '#/adapter/component/biz-select/currency-select.vue';
import ClientSelect from '#/adapter/component/biz-select/client-select.vue';
import FeeCodeSelect from '#/adapter/component/biz-select/fee-code-select.vue';
// ✅ 新增：引入 Handsontable 组件和 composables
import OrderFeeTemplateTable from './order-fee-template-table.vue';
import { useDropdownSources } from './composables/useDropdownSources';

const emit = defineEmits(['success']);

// ==================== 状态定义 ====================

const mode = ref<'create' | 'edit'>('create');
const templateId = ref<string>('');
const loading = ref(false);

// ✅ 使用 composables 管理下拉数据源
const dropdownSources = useDropdownSources();

// 枚举选项（直接定义，不从后端获取）
const bizTypeOptions: Array<{ label: string; value: number }> = [
  { label: '海运出口', value: 0 },
];

const paySideOptions: Array<{ label: string; value: number }> = [
  { label: '应收', value: 0 },
  { label: '应付', value: 1 },
];

const tradeTermsOptions: Array<{ label: string; value: number }> = [
  { label: 'CIF', value: 0 },
  { label: 'FOB', value: 1 },
  { label: 'EXW', value: 2 },
  { label: 'FCA', value: 3 },
  { label: 'DDP', value: 4 },
  { label: 'DDU', value: 5 },
  { label: 'DAP', value: 6 },
  { label: 'C&F', value: 7 },
];

const cargoTypeOptions: Array<{ label: string; value: number }> = [
  { label: '普通货', value: 0 },
  { label: '冷藏货', value: 1 },
  { label: '危险品', value: 2 },
  { label: '超尺寸货', value: 3 },
];

const blTypeOptions: Array<{ label: string; value: number }> = [
  { label: '整柜', value: 0 },
  { label: '拼箱分票', value: 1 },
  { label: '拼箱主票', value: 2 },
];

// ✅ 费用明细数据（使用响应式数组）
const feeItems = ref<OrderFeeTemplateAdminApi.OrderFeeTemplateItemAddDto[]>([]);

// ✅ Handsontable 组件引用
const hotTableRef = ref<InstanceType<typeof OrderFeeTemplateTable>>();

// 创建ClientSelect的schema配置
function createClientSelectSchema(options: {
  fieldName: string;
  label: string;
  industryCategory?: string;
}) {
  return {
    fieldName: options.fieldName,
    label: options.label,
    component: ClientSelect,
    componentProps: {
      placeholder: `请选择${options.label}（留空表示所有）`,
      allowClear: true,
      ...(options.industryCategory
        ? { industryCategory: options.industryCategory }
        : {}),
    },
  };
}

// ==================== 表单配置 ====================

const [Form, formApi] = useVbenForm({
  schema: [
    {
      fieldName: 'name',
      label: '模板名称',
      component: 'Input',
      rules: 'required',
      componentProps: {
        placeholder: '请输入模板名称',
        maxlength: 64,
      },
    },
    {
      fieldName: 'bizType',
      label: '业务类型',
      component: 'Select',
      rules: 'required',
      defaultValue: 0,
      componentProps: {
        placeholder: '请选择业务类型',
        options: bizTypeOptions,
      },
    },
    {
      fieldName: 'paySide',
      label: '收付类型',
      component: 'Select',
      rules: 'required',
      defaultValue: 0,
      componentProps: {
        placeholder: '请选择收付类型',
        options: paySideOptions,
      },
    },
    {
      fieldName: 'efficient',
      label: '长期有效',
      component: 'Switch',
      defaultValue: true,
    },
    {
      fieldName: 'startTime',
      label: '生效开始时间',
      component: 'DatePicker',
      dependencies: {
        triggerFields: ['efficient'],
        if(values) {
          return !values.efficient;
        },
      },
      componentProps: {
        placeholder: '请选择开始时间',
        showTime: true,
        format: 'YYYY-MM-DD HH:mm:ss',
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
      },
    },
    {
      fieldName: 'endTime',
      label: '生效结束时间',
      component: 'DatePicker',
      dependencies: {
        triggerFields: ['efficient'],
        if(values) {
          return !values.efficient;
        },
      },
      componentProps: {
        placeholder: '请选择结束时间',
        showTime: true,
        format: 'YYYY-MM-DD HH:mm:ss',
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
      },
    },
    createClientSelectSchema({
      fieldName: 'clientId',
      industryCategory: 'p',
      label: '委托单位',
    }),
    {
      fieldName: 'tradeTermsType',
      label: '贸易条款',
      component: 'Select',
      componentProps: {
        placeholder: '请选择贸易条款（留空表示所有）',
        options: tradeTermsOptions,
        allowClear: true,
      },
    },
    {
      fieldName: 'cargoId',
      label: '货物类型',
      component: 'Select',
      componentProps: {
        placeholder: '请选择货物类型（留空表示所有）',
        options: cargoTypeOptions,
        allowClear: true,
      },
    },
    {
      fieldName: 'carrierId',
      label: '船公司',
      component: CarrierSelect,
      componentProps: {
        placeholder: '请选择船公司（留空表示所有）',
        allowClear: true,
      },
    },
    createClientSelectSchema({
      fieldName: 'bookingAgentId',
      industryCategory: 'o',
      label: '订舱代理',
    }),
    {
      fieldName: 'polId',
      label: '起运港',
      component: PortSelect,
      componentProps: {
        placeholder: '请选择起运港（留空表示所有）',
        allowClear: true,
      },
    },
    {
      fieldName: 'podId',
      label: '目的港',
      component: PortSelect,
      componentProps: {
        placeholder: '请选择目的港（留空表示所有）',
        allowClear: true,
      },
    },
    {
      fieldName: 'blType',
      label: '装运方式',
      component: 'Select',
      componentProps: {
        placeholder: '请选择装运方式（留空表示所有）',
        options: blTypeOptions,
        allowClear: true,
      },
    },
    {
      fieldName: 'serviceType',
      label: '服务项',
      component: 'InputNumber',
      componentProps: {
        placeholder: '请输入服务项（留空表示所有）',
        min: 0,
      },
    },
    {
      fieldName: 'sortId',
      label: '排序',
      component: 'InputNumber',
      defaultValue: 0,
      componentProps: {
        placeholder: '请输入排序号',
        min: 0,
      },
    },
    {
      fieldName: 'remark',
      label: '备注',
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入备注',
        maxlength: 4096,
        rows: 1,
      },
    },
  ],
  layout: 'horizontal',
  showDefaultActions: false,
  commonConfig: {
    labelWidth: 90,
    wrapperClass: 'gap-x-1 gap-y-3',
  },
  wrapperClass: 'grid-cols-4',
});

// ==================== 模态框逻辑 ====================

const [Modal, modalApi] = useVbenModal({
  async onOpenChange(isOpen: boolean) {
    if (isOpen) {
      const data = modalApi.getData<any>();
      mode.value = data.mode;
      templateId.value = data.id || '';

      // 重置表单
      await formApi.resetForm();

      // 加载下拉数据
      await loadDropdownData();

      // 如果是编辑模式，加载详情
      if (mode.value === 'edit' && templateId.value) {
        await loadDetail();
      } else {
        // 新建模式，初始化空的费用明细
        feeItems.value = [];
        // 初始化表格会在 nextTick 后由组件自身完成
        await nextTick();
      }
    } else {
      // 关闭时由子组件自行销毁 Handsontable
    }
  },
  async onConfirm() {
    await handleSubmit();
  },
});

// ==================== 加载下拉数据源 ====================

async function loadDropdownData() {
  try {
    console.log('🔄 [loadDropdownData] 开始加载下拉数据...');

    // ✅ 1. 加载费用代码列表（使用真实API）
    const feeCodeData = await getFeeCodeListAsync({ isSea: true });
    if (feeCodeData && Array.isArray(feeCodeData)) {
      dropdownSources.feeCodeList.value = feeCodeData.map((item: any) => {
        // ✅ 参考费用录入表格的格式：code-cnName
        const surLabel = item.cnName || item.enName || '';
        const label = item.code ? `${item.code}-${surLabel}` : surLabel;

        return {
          label: label || item.cnName || item.enName || item.code || '',
          value: Number(item.id),
          currencyId: item.currencyId ? Number(item.currencyId) : undefined,
          unit: item.defaultUnit || undefined,
          taxRate:
            item.taxRate !== undefined ? Number(item.taxRate) : undefined,
        };
      });
      console.log(
        `✅ [loadDropdownData] 费用代码加载完成，共 ${dropdownSources.feeCodeList.value.length} 条`,
      );
    }

    // ✅ 2. 加载币别列表（使用分页API）
    const currencyRes = await getCurrencyPagedList({
      PageIndex: 1,
      PageSize: 100,
    });
    if (currencyRes?.items) {
      dropdownSources.currencyList.value = currencyRes.items.map(
        (item: any) => ({
          label: item.code || item.cnName || item.enName || '',
          value: Number(item.id),
        }),
      );
      console.log(
        `✅ [loadDropdownData] 币别加载完成，共 ${dropdownSources.currencyList.value.length} 条`,
      );
    }

    // ✅ 3. 加载客户列表（按行业类别分组）
    // 委托单位 (industryCategory: 'p')
    const clientDataP = await getClientPagedList({
      pageSize: 1000,
      pageIndex: 1,
      industryCategory: 'p' as any,
    });
    if (clientDataP?.items) {
      dropdownSources.clientListByIndustry.value['p'] = clientDataP.items.map(
        (item: any) => ({
          label: item.name || item.clientName || '',
          value: item.id,
        }),
      );
    }

    // 订舱代理 (industryCategory: 'o')
    const clientDataO = await getClientPagedList({
      pageSize: 1000,
      pageIndex: 1,
      industryCategory: 'o' as any,
    });
    if (clientDataO?.items) {
      dropdownSources.clientListByIndustry.value['o'] = clientDataO.items.map(
        (item: any) => ({
          label: item.name || item.clientName || '',
          value: item.id,
        }),
      );
    }

    console.log('✅ [loadDropdownData] 所有下拉数据加载完成');
  } catch (error) {
    console.error('❌ [loadDropdownData] 加载失败:', error);
    message.error('加载下拉数据失败');
  }
}

// ==================== 加载详情 ====================

async function loadDetail() {
  loading.value = true;
  try {
    const detail = await getOrderFeeTemplateDetail(templateId.value);

    // 填充表单数据
    await formApi.setValues({
      name: detail.name,
      bizType: detail.bizType,
      paySide: detail.paySide,
      efficient: detail.efficient,
      startTime: detail.startTime,
      endTime: detail.endTime,
      clientId: detail.clientId,
      tradeTermsType: detail.tradeTermsType,
      cargoId: detail.cargoId,
      carrierId: detail.carrierId,
      bookingAgentId: detail.bookingAgentId,
      polId: detail.polId,
      podId: detail.podId,
      blType: detail.blType,
      serviceType: detail.serviceType,
      sortId: detail.sortId,
      remark: detail.remark,
    });

    // 填充费用明细
    feeItems.value =
      detail.orderFeeTemplateItems?.map((item) => ({
        serviceType: item.serviceType,
        feeCodeId: item.feeCodeId!,
        industryCategory: item.industryCategory!,
        settlementId: item.settlementId!,
        currencyId: item.currencyId!,
        unitPrice: item.unitPrice!,
        noTaxUnitPrice: item.noTaxUnitPrice!,
        unit: item.unit || '',
        taxRate: item.taxRate!,
        amount: item.amount,
        noTaxAmount: item.noTaxAmount,
        sortId: item.sortId,
        remark: item.remark,
      })) || [];

    // 在 nextTick 中更新表格数据
    await nextTick();
    hotTableRef.value?.updateData(feeItems.value);
  } catch (error) {
    message.error('加载详情失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

// ==================== 提交表单 ====================

async function handleSubmit() {
  try {
    // 验证表单
    const valid = await formApi.validate();
    if (!valid) {
      message.warning('请填写必填项');
      return;
    }

    // ✅ 从子组件同步数据
    hotTableRef.value?.syncDataToParent();

    // 验证费用明细
    if (feeItems.value.length === 0) {
      message.warning('请至少添加一条费用明细');
      return;
    }

    // 获取表单值
    const formValues = await formApi.getValues();

    loading.value = true;

    if (mode.value === 'create') {
      // 新建
      const dto: OrderFeeTemplateAdminApi.OrderFeeTemplateAddDto = {
        name: formValues.name,
        bizType: formValues.bizType,
        paySide: formValues.paySide,
        efficient: formValues.efficient,
        startTime: formValues.startTime,
        endTime: formValues.endTime,
        clientId: formValues.clientId,
        tradeTermsType: formValues.tradeTermsType,
        cargoId: formValues.cargoId,
        carrierId: formValues.carrierId,
        bookingAgentId: formValues.bookingAgentId,
        polId: formValues.polId,
        podId: formValues.podId,
        blType: formValues.blType,
        serviceType: formValues.serviceType,
        sortId: formValues.sortId,
        remark: formValues.remark,
        orderFeeTemplateItems: feeItems.value,
      };
      await addOrderFeeTemplate(dto);
      message.success('新建成功');
    } else {
      // 编辑
      const dto: OrderFeeTemplateAdminApi.OrderFeeTemplateEditDto = {
        id: templateId.value,
        name: formValues.name,
        bizType: formValues.bizType,
        paySide: formValues.paySide,
        efficient: formValues.efficient,
        startTime: formValues.startTime,
        endTime: formValues.endTime,
        clientId: formValues.clientId,
        tradeTermsType: formValues.tradeTermsType,
        cargoId: formValues.cargoId,
        carrierId: formValues.carrierId,
        bookingAgentId: formValues.bookingAgentId,
        polId: formValues.polId,
        podId: formValues.podId,
        blType: formValues.blType,
        serviceType: formValues.serviceType,
        sortId: formValues.sortId,
        remark: formValues.remark,
        orderFeeTemplateItems: feeItems.value,
      };
      await editOrderFeeTemplate(dto);
      message.success('编辑成功');
    }

    modalApi.close();
    emit('success');
  } catch (error) {
    message.error(mode.value === 'create' ? '新建失败' : '编辑失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

// ==================== 生命周期 ====================

onMounted(() => {
  // 无需加载枚举，已直接定义
});
</script>

<template>
  <Modal
    :title="mode === 'create' ? '新建自动费用模板' : '编辑自动费用模板'"
    class="w-[1400px]"
  >
    <div v-loading="loading" class="max-h-[70vh] overflow-y-auto">
      <!-- 基础信息 -->
      <Card title="基础信息" class="mb-4">
        <Form />
      </Card>

      <!-- 费用明细 -->
      <Card title="费用明细">
        <OrderFeeTemplateTable
          ref="hotTableRef"
          v-model:data-source="feeItems"
        />
        <div class="mt-2 text-xs text-gray-500">
          提示：右键点击表格可以添加/删除行
        </div>
      </Card>
    </div>
  </Modal>
</template>

<style scoped>
:deep(.ant-card-body) {
  padding: 16px;
}
</style>
