<script lang="ts" setup>
import type { AirPortAdminApi } from '#/api/system/base-data/air-port-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addAirPort,
  editAirPort,
  getAirPortDetail,
} from '#/api/system/base-data/air-port-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<AirPortAdminApi.AirPortDto>();

const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.airPort.name')])
    : $t('ui.actionTitle.create', [$t('system.basicData.airPort.name')]);
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
});

const isEmpty = (value: unknown) =>
  value === undefined || value === null || value === '';

/** 编辑为全量提交，非必填字段须显式传 null 才能清空原值 */
const toNullableText = (value: unknown): null | string =>
  isEmpty(value) ? null : String(value);

const toNullableNumber = (value: unknown): null | number =>
  isEmpty(value) ? null : Number(value);

/**
 * 大数 ID（json-bigint 解析为 string）必须原样透传，
 * 禁止 Number() 转换，超过 2^53-1 会丢精度
 */
const toNullableId = (value: unknown): null | number | string => {
  if (isEmpty(value)) return null;
  return typeof value === 'number' ? value : String(value);
};

const buildPayload = (
  values: Record<string, any>,
): AirPortAdminApi.AirPortAddDto => ({
  iataCode: values.iataCode,
  enName: values.enName,
  cnName: toNullableText(values.cnName),
  icaoCode: toNullableText(values.icaoCode),
  countryId: toNullableId(values.countryId),
  city: toNullableText(values.city),
  timeZone: toNullableNumber(values.timeZone),
  status: values.status,
  sortId: values.sortId,
  remark: toNullableText(values.remark),
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    modalApi.lock();
    const values = await formApi.getValues();

    try {
      await (formData.value?.id
        ? editAirPort({ ...buildPayload(values), id: formData.value.id })
        : addAirPort(buildPayload(values)));

      message.success($t('ui.actionMessage.operationSuccess'));
      modalApi.close();
      emit('success');
    } finally {
      modalApi.lock(false);
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) return;

    const data = modalApi.getData<{ id?: number | string }>();
    if (!data?.id) {
      formData.value = undefined;
      formApi.resetForm();
      return;
    }

    modalApi.lock();
    try {
      const detail = await getAirPortDetail(data.id);
      formData.value = detail;
      formApi.setValues({
        iataCode: detail.iataCode,
        enName: detail.enName,
        cnName: detail.cnName,
        icaoCode: detail.icaoCode,
        countryId: detail.countryId ?? undefined,
        city: detail.city,
        timeZone: detail.timeZone ?? undefined,
        status: detail.status,
        sortId: detail.sortId,
        remark: detail.remark,
      });
    } finally {
      modalApi.lock(false);
    }
  },
});
</script>

<template>
  <Modal :title="getTitle">
    <Form class="mx-4" />
  </Modal>
</template>
