<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import dayjs from 'dayjs';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, Card, message, Space, Spin } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addSeaExport,
  editSeaExport,
  getSeaExportDetail,
} from '#/api/sea-export/sea-export-admin';
import { $t } from '#/locales';

import {
  useLeftFormSchema,
  useMiddleFormSchema,
  useRightFormSchema,
} from './data';

const route = useRoute();
const router = useRouter();

const editId = computed(() => {
  const id = route.params.id;
  return id ? Number(id) : undefined;
});

const isEdit = computed(() => !!editId.value);

const pageTitle = computed(() => {
  return isEdit.value
    ? $t('ui.actionTitle.edit', [$t('seaExport.export.name')])
    : $t('ui.actionTitle.create', [$t('seaExport.export.name')]);
});

const pageLoading = ref(false);
const submitting = ref(false);
const transportOrderId = ref<number | undefined>();

/** 左侧表单：信息概览 */
const [LeftForm, leftFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useLeftFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2 gap-x-4',
});

/** 中间表单：发货人、收货人、通知人、第二通知人、目的港代理及其内容 */
const [MiddleForm, middleFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useMiddleFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'flex flex-col ',
});

/** 右侧表单：主表单 */
const [RightForm, rightFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useRightFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-4 gap-x-4',
});

/** DatePicker 需要的 dayjs 对象，API 返回的是字符串 */
const toDayjs = (val: string | null | undefined) =>
  val && dayjs(val).isValid() ? dayjs(val) : undefined;

/** 提交时 dayjs/日期 转回 ISO 字符串 */
const toDateString = (val: unknown) => {
  if (val == null) return undefined;
  const d = dayjs(val as string | Date);
  return d.isValid() ? d.toISOString() : undefined;
};

const flattenDetail = (
  detail: SeaExportAdminApi.SeaExportDto,
): Record<string, any> => {
  const to = detail.transportOrder;
  return {
    blType: detail.blType,
    billType: detail.billType,
    issueType: detail.issueType,
    vessel: detail.vessel,
    innerVoyno: detail.innerVoyno,
    carrierId: detail.carrierId,
    secondNotifierId: detail.secondNotifierId,
    secondNotifierContent: detail.secondNotifierContent,
    podAgentId: detail.podAgentId,
    podAgentContent: detail.podAgentContent,
    bookingAgentId: detail.bookingAgentId,
    shipAgentId: detail.shipAgentId,
    yardId: detail.yardId,
    noBillEnum: detail.noBillEnum,
    copyNoBillEnum: detail.copyNoBillEnum,
    goodsCompleteTime: toDayjs(detail.goodsCompleteTime),
    etd: toDayjs(detail.etd),
    eta: toDayjs(detail.eta),
    closingTime: toDayjs(detail.closingTime),
    closeVgmTime: toDayjs(detail.closeVgmTime),
    closeDocTime: toDayjs(detail.closeDocTime),
    closeManifestTime: toDayjs(detail.closeManifestTime),
    signingTime: toDayjs(detail.signingTime),
    sortId: detail.sortId,
    remark: detail.remark,
    commissionNum: to?.commissionNum,
    mblNum: to?.mblNum,
    bookingNum: to?.bookingNum,
    accountDate: toDayjs(to?.accountDate),
    settlementDate: toDayjs(to?.settlementDate),
    codeSourceId: to?.codeSourceId,
    isBusinessLocking: to?.isBusinessLocking,
    isFeeLocking: to?.isFeeLocking,
    codeFrtId: to?.codeFrtId,
    codeServiceId: to?.codeServiceId,
    tradeTermsType: to?.tradeTermsType,
    polId: to?.polId,
    podId: to?.podId,
    poT1Id: to?.poT1Id,
    poT2Id: to?.poT2Id,
    receivePortId: to?.receivePortId,
    deliverPortId: to?.deliverPortId,
    signingPortId: to?.signingPortId,
    clientId: to?.clientId,
    teamId: to?.teamId,
    custBrokerId: to?.custBrokerId,
    warehouseId: to?.warehouseId,
    insuranceId: to?.insuranceId,
    consigneeId: to?.consigneeId,
    consigneeContent: to?.consigneeContent,
    shipperId: to?.shipperId,
    shipperContent: to?.shipperContent,
    notifierId: to?.notifierId,
    notifierContent: to?.notifierContent,
    marks: to?.marks,
    noPkgs: to?.noPkgs,
    goodsDes: to?.goodsDes,
    kgs: to?.kgs,
    cbm: to?.cbm,
    internalRemark: to?.internalRemark,
  };
};

const loadEditData = async () => {
  if (!editId.value) return;

  pageLoading.value = true;
  try {
    const detail = await getSeaExportDetail(editId.value);
    transportOrderId.value = detail.transportOrder?.id;
    const formValues = flattenDetail(detail);
    await leftFormApi.setValues(formValues);
    await middleFormApi.setValues(formValues);
    await rightFormApi.setValues(formValues);
  } finally {
    pageLoading.value = false;
  }
};

const buildDto = (values: Record<string, any>) => {
  const seaExportFields: Record<string, any> = {
    blType: values.blType ?? undefined,
    billType: values.billType ?? undefined,
    issueType: values.issueType ?? undefined,
    vessel: values.vessel,
    innerVoyno: values.innerVoyno,
    carrierId: values.carrierId ?? undefined,
    secondNotifierId: values.secondNotifierId ?? undefined,
    secondNotifierContent: values.secondNotifierContent,
    podAgentId: values.podAgentId ?? undefined,
    podAgentContent: values.podAgentContent,
    bookingAgentId: values.bookingAgentId ?? undefined,
    shipAgentId: values.shipAgentId ?? undefined,
    yardId: values.yardId ?? undefined,
    noBillEnum: values.noBillEnum ?? undefined,
    copyNoBillEnum: values.copyNoBillEnum ?? undefined,
    goodsCompleteTime: toDateString(values.goodsCompleteTime),
    etd: toDateString(values.etd),
    eta: toDateString(values.eta),
    closingTime: toDateString(values.closingTime),
    closeVgmTime: toDateString(values.closeVgmTime),
    closeDocTime: toDateString(values.closeDocTime),
    closeManifestTime: toDateString(values.closeManifestTime),
    signingTime: toDateString(values.signingTime),
    sortId: values.sortId,
    remark: values.remark,
  };

  const transportOrderFields: Record<string, any> = {
    commissionNum: values.commissionNum,
    mblNum: values.mblNum,
    bookingNum: values.bookingNum,
    accountDate: toDateString(values.accountDate),
    settlementDate: toDateString(values.settlementDate),
    codeSourceId: values.codeSourceId ?? undefined,
    isBusinessLocking: values.isBusinessLocking ?? false,
    isFeeLocking: values.isFeeLocking ?? false,
    codeFrtId: values.codeFrtId ?? undefined,
    codeServiceId: values.codeServiceId ?? undefined,
    tradeTermsType: values.tradeTermsType ?? undefined,
    polId: values.polId ?? undefined,
    podId: values.podId ?? undefined,
    poT1Id: values.poT1Id ?? undefined,
    poT2Id: values.poT2Id ?? undefined,
    receivePortId: values.receivePortId ?? undefined,
    deliverPortId: values.deliverPortId ?? undefined,
    signingPortId: values.signingPortId ?? undefined,
    clientId: values.clientId,
    teamId: values.teamId ?? undefined,
    custBrokerId: values.custBrokerId ?? undefined,
    warehouseId: values.warehouseId ?? undefined,
    insuranceId: values.insuranceId ?? undefined,
    consigneeId: values.consigneeId ?? undefined,
    consigneeContent: values.consigneeContent,
    shipperId: values.shipperId ?? undefined,
    shipperContent: values.shipperContent,
    notifierId: values.notifierId ?? undefined,
    notifierContent: values.notifierContent,
    marks: values.marks,
    noPkgs: values.noPkgs,
    goodsDes: values.goodsDes,
    kgs: values.kgs,
    cbm: values.cbm,
    internalRemark: values.internalRemark,
  };

  if (isEdit.value && transportOrderId.value) {
    (transportOrderFields as any).id = transportOrderId.value;
  }

  return {
    ...seaExportFields,
    ...(isEdit.value && editId.value ? { id: editId.value } : {}),
    transportOrder: transportOrderFields,
  };
};

const handleSubmit = async () => {
  const [leftResult, middleResult, rightResult] = await Promise.all([
    leftFormApi.validate(),
    middleFormApi.validate(),
    rightFormApi.validate(),
  ]);
  if (!leftResult.valid || !middleResult.valid || !rightResult.valid) return;

  submitting.value = true;
  const [leftValues, middleValues, rightValues] = await Promise.all([
    leftFormApi.getValues(),
    middleFormApi.getValues(),
    rightFormApi.getValues(),
  ]);
  const values = { ...leftValues, ...middleValues, ...rightValues };
  const dto = buildDto(values);

  try {
    if (isEdit.value) {
      await editSeaExport(dto as SeaExportAdminApi.SeaExportEditDto);
    } else {
      await addSeaExport(dto as SeaExportAdminApi.SeaExportAddDto);
    }

    message.success($t('ui.actionMessage.operationSuccess'));
    router.push('/sea-exports');
  } finally {
    submitting.value = false;
  }
};

const handleCancel = () => {
  router.push('/sea-exports');
};

onMounted(() => {
  loadEditData();
});
</script>

<template>
  <Page auto-content-height>
    <Card :title="pageTitle">
      <Spin :spinning="pageLoading">
        <div class="mx-4 flex gap-6">
          <div class="w-[220px] shrink-0 border-r border-gray-200 pr-6">
            <LeftForm />
          </div>
          <div class="w-[280px] shrink-0 pr-6">
            <MiddleForm />
          </div>
          <div class="min-w-0 flex-1">
            <RightForm />
          </div>
        </div>

        <div class="mx-4 mt-4 flex justify-end">
          <Space>
            <Button @click="handleCancel">
              {{ $t('common.cancel') }}
            </Button>
            <Button type="primary" :loading="submitting" @click="handleSubmit">
              {{ $t('common.confirm') }}
            </Button>
          </Space>
        </div>
      </Spin>
    </Card>
  </Page>
</template>
