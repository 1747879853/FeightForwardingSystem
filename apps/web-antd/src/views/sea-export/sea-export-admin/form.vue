<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

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

import { useFormSchema } from './data';

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

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-3',
});

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
    goodsCompleteTime: detail.goodsCompleteTime,
    etd: detail.etd,
    eta: detail.eta,
    closingTime: detail.closingTime,
    closeVgmTime: detail.closeVgmTime,
    closeDocTime: detail.closeDocTime,
    closeManifestTime: detail.closeManifestTime,
    signingTime: detail.signingTime,
    sortId: detail.sortId,
    remark: detail.remark,
    commissionNum: to?.commissionNum,
    mblNum: to?.mblNum,
    bookingNum: to?.bookingNum,
    accountDate: to?.accountDate,
    settlementDate: to?.settlementDate,
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
    await formApi.setValues(formValues);
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
    goodsCompleteTime: values.goodsCompleteTime,
    etd: values.etd,
    eta: values.eta,
    closingTime: values.closingTime,
    closeVgmTime: values.closeVgmTime,
    closeDocTime: values.closeDocTime,
    closeManifestTime: values.closeManifestTime,
    signingTime: values.signingTime,
    sortId: values.sortId,
    remark: values.remark,
  };

  const transportOrderFields: Record<string, any> = {
    commissionNum: values.commissionNum,
    mblNum: values.mblNum,
    bookingNum: values.bookingNum,
    accountDate: values.accountDate,
    settlementDate: values.settlementDate,
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
  const { valid } = await formApi.validate();
  if (!valid) return;

  submitting.value = true;
  const values = await formApi.getValues();
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
        <Form class="mx-4" />

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
