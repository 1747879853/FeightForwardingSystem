<script lang="ts" setup>
import type {
  SeFreiPriceCtnAddDto,
  SeFreiPriceOutDto,
} from '#/api/sea-export/freight-rate-admin';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useVbenForm } from '#/adapter/form';
import { editSeFreiPrice } from '#/api/sea-export/freight-rate-admin';
import { message, Tag } from 'ant-design-vue';
import { $t } from '#/locales';

const emits = defineEmits(['success']);

const currentRowId = ref<string>('');
const existingCtnCodeIds = ref<number[]>([]);
const existingCtnNames = ref<string[]>([]); // 已存在箱型的名称列表

// 表单配置
const [Form, formApi] = useVbenForm({
  schema: [
    {
      component: 'CtnSelect',
      fieldName: 'ctnCodeId',
      label: '箱型',
      componentProps: {
        placeholder: '请选择箱型',
        allowClear: true,
      },
      rules: 'required',
    },
    {
      component: 'InputNumber',
      fieldName: 'cost',
      label: '成本',
      componentProps: {
        placeholder: '请输入成本',
        min: 0,
        precision: 2,
        style: { width: '100%' },
      },
      rules: 'required',
    },
  ],
  showDefaultActions: false,
  layout: 'horizontal',
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    const values = await formApi.getValues();

    // 检查是否重复添加
    if (existingCtnCodeIds.value.includes(values.ctnCodeId)) {
      message.warning('该箱型已存在，请勿重复添加');
      modalApi.unlock();
      return;
    }

    // 构建箱型数据
    const newCtn: SeFreiPriceCtnAddDto = {
      ctnCodeId: values.ctnCodeId,
      cost: values.cost,
    };

    modalApi.lock();

    // 先获取当前运价详情
    try {
      const { getSeFreiPriceDetail } =
        await import('#/api/sea-export/freight-rate-admin');
      const detail = await getSeFreiPriceDetail(currentRowId.value);

      // 添加新的箱型到现有列表
      const updatedCtns = [
        ...(detail.seFreiPriceCtns || []),
        {
          id: undefined, // 新增时不需要ID
          ctnCodeId: newCtn.ctnCodeId,
          cost: newCtn.cost,
          remark: newCtn.remark,
        },
      ];
      const seFreiPriceFees =
        detail.seFreiPriceFees?.map((fee) => {
          return {
            id: fee.id,
            feeCodeId: fee.feeCodeId,
            currencyId: fee.currencyId,
            seFreiPriceCtnFees: fee.seFreiPriceCtnFees?.map((ctnFee) => {
              // 从 seFreiPriceCtns 中根据 seFreiPriceCtnId 查找对应的箱型信息，获取 ctnCodeId
              const ctnInfo = detail.seFreiPriceCtns?.find(
                (ctn) => ctn.id === ctnFee.seFreiPriceCtnId,
              );
              return {
                id: ctnFee.id,
                ctnCodeId: ctnInfo?.ctnCodeId ?? 0, // 使用查找到的 ctnCodeId
                price: ctnFee.price,
                conditionType: ctnFee.conditionType,
                operatorType: ctnFee.operatorType,
                value: ctnFee.value,
                otherPrice: ctnFee.otherPrice,
              };
            }),
          };
        }) || [];
      // 调用编辑接口
      await editSeFreiPrice({
        id: currentRowId.value,
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
        freeDays: detail.freeDays,
        voyage: detail.voyage,
        etd: detail.etd,
        closeDocTime: detail.closeDocTime,
        closingTime: detail.closingTime,
        remark: detail.remark,
        seFreiPriceCtns: updatedCtns as any, // 类型转换，因为OutDto和AddDto结构相同
        seFreiPriceFees: seFreiPriceFees,
      });

      emits('success');
      modalApi.close();
    } catch (error) {
      console.error('添加箱型失败:', error);
      modalApi.unlock();
    }
  },

  async onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData<{
        row: SeFreiPriceOutDto;
      }>();

      if (data?.row) {
        currentRowId.value = data.row.id;
        // 记录已存在的箱型ID和名称，用于防止重复添加和显示提示
        existingCtnCodeIds.value =
          data.row.seFreiPriceCtns?.map((ctn) => ctn.ctnCodeId) || [];
        existingCtnNames.value =
          data.row.seFreiPriceCtns
            ?.map((ctn) => ctn.ctnCode?.ctnName)
            .filter((name): name is string => !!name) || [];
      }

      formApi.resetForm();
    }
  },
});
</script>

<template>
  <Modal :title="$t('seaExport.freightRate.addCtn')" class="w-[500px]">
    <div class="px-4">
      <Form />

      <!-- 已存在箱型提示 -->
      <div v-if="existingCtnNames.length > 0" class="mt-4">
        <div class="mb-2 text-sm text-gray-600">已添加的箱型：</div>
        <div class="flex flex-wrap gap-2">
          <Tag v-for="name in existingCtnNames" :key="name" color="blue">
            {{ name }}
          </Tag>
        </div>
      </div>
    </div>
  </Modal>
</template>
