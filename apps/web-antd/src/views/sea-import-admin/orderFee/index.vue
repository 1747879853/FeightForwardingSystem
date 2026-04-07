<script lang="ts" setup>
import type { SeaImportAdminApi } from '#/api/sea-import/sea-import-admin';

import dayjs from 'dayjs';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  ArrowLeft,
  FileText,
  MapPin,
  Package,
  Save,
  Ship,
  Users,
} from '@vben/icons';

import { Button, Card, message, Space, Spin } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { getSeaImportDetail } from '#/api/sea-import/sea-import-admin';
import { UserAttribute } from '#/api/system/user-admin';
import { $t } from '#/locales';

import OrderFeeTable from './modules/order-fee-table.vue';

const route = useRoute();
const router = useRouter();

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});

const isEdit = computed(() => !!editId.value);

const pageLoading = ref(false);
const submitting = ref(false);
const transportOrderId = ref<number | undefined>();

/** 左侧表单：相关方信息（发货人、收货人、通知人等） */
// const [PartyInfoForm, partyInfoFormApi] = useVbenForm({
//   layout: 'vertical',
//   compact: true,
//   schema: usePartyInfoFormSchema(),
//   showDefaultActions: false,
//   wrapperClass: 'flex flex-col',
// });

/** DatePicker 需要的 dayjs 对象，API 返回的是字符串 */
const toDayjs = (val: string | null | undefined) =>
  val && dayjs(val).isValid() ? dayjs(val) : undefined;

/** 提交时 dayjs/日期 转回 ISO 字符串 */
const toDateString = (val: unknown) => {
  if (val == null) return undefined;
  const d = dayjs(val as string | Date);
  return d.isValid() ? d.toISOString() : undefined;
};
/** ISO 字符串转正常日期格式 */
const formatNormalDate = (
  val: string | null | undefined,
  format = 'YYYY-MM-DD HH:mm:ss',
) => {
  if (!val) return '--';
  const d = dayjs(val);
  return d.isValid() ? d.format(format) : '--';
};

const flattenDetail = (
  detail: SeaImportAdminApi.SeaImportDto,
): Record<string, any> => {
  const to = detail.transportOrder;
  return {
    countryName: (detail as any).countryName,
    laneName: (detail as any).laneName,
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
    feeLocked: to?.feeLocked,
    codeFrtId: to?.codeFrtId,
    codeServiceId: to?.codeServiceId,
    tradeTermsType: to?.tradeTermsType,
    polId: detail.polId,
    polRemark: detail.polRemark,
    podId: detail.podId,
    podRemark: detail.podRemark,
    poT1Id: detail.poT1Id,
    poT1Remark: detail.poT1Remark,
    poT2Id: detail.poT2Id,
    poT2Remark: detail.poT2Remark,
    receivePortId: detail.receivePortId,
    receivePortRemark: detail.receivePortRemark,
    deliverPortId: detail.deliverPortId,
    deliverPortRemark: detail.deliverPortRemark,
    signingPortId: detail.signingPortId,
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
    orderCodeGoodss: to?.orderCodeGoodss ?? [],
    orderUsers: to?.orderUsers ?? [],
  };
};

const formValues = ref<Record<string, any>>();
const to = ref<Record<string, any>>();

const displayList = ref<any[]>([]);

const setDisplayList = () => {
  let mbl = {
    name: $t('seaImport.import.mblNum'),
    value: to.value?.mblNum || '--',
  };
  displayList.value.push(mbl);
  let bookingNum = {
    name: $t('seaImport.import.bookingNum'),
    value: to.value?.bookingNum || '--',
  };
  displayList.value.push(bookingNum);
  let pol = {
    name: $t('seaImport.import.polName'),
    value: formValues.value?.polName || '--',
  };
  displayList.value.push(pol);
  let pod = {
    name: $t('seaImport.import.podName'),
    value: formValues.value?.podName || '--',
  };
  displayList.value.push(pod);
  let receivePort = {
    name: $t('seaImport.import.receivePortId'),
    value: formValues.value?.receivePortName || '--',
  };
  displayList.value.push(receivePort);
  let deliverPort = {
    name: $t('seaImport.import.deliverPortId'),
    value: formValues.value?.deliverPortName || '--',
  };
  displayList.value.push(deliverPort);
  let codeSource = {
    name: $t('seaImport.import.codeSourceId'),
    value: to.value?.codeSourceName || '--',
  };
  displayList.value.push(codeSource);
  let commissionNum = {
    name: $t('seaImport.import.commissionNum'),
    value: to.value?.commissionNum || '--',
  };
  displayList.value.push(commissionNum);
  let clientName = {
    name: $t('seaImport.import.clientId'),
    value: to.value?.clientName || '--',
  };
  displayList.value.push(clientName);
  let teamName = {
    name: $t('seaImport.import.teamId'),
    value: to.value?.teamName || '--',
  };
  displayList.value.push(teamName);
  let vessel = {
    name: $t('seaImport.import.vessel'),
    value: formValues.value?.vessel || '--',
  };
  displayList.value.push(vessel);
  let innerVoyno = {
    name: $t('seaImport.import.innerVoyno'),
    value: formValues.value?.innerVoyno || '--',
  };
  displayList.value.push(innerVoyno);
  let carrier = {
    name: $t('seaImport.import.carrierId'),
    value: formValues.value?.carrierName || '--',
  };
  displayList.value.push(carrier);
  let etd = {
    name: $t('seaImport.import.etd'),
    value: formatNormalDate(formValues.value?.etd) || '--',
  };
  displayList.value.push(etd);
  let eta = {
    name: $t('seaImport.import.eta'),
    value: formatNormalDate(formValues.value?.eta) || '--',
  };
  displayList.value.push(eta);
  let closingTime = {
    name: $t('seaImport.import.closingTime'),
    value: formatNormalDate(formValues.value?.closingTime) || '--',
  };
  displayList.value.push(closingTime);
  let closeVgmTime = {
    name: $t('seaImport.import.closeVgmTime'),
    value: formatNormalDate(formValues.value?.closeVgmTime) || '--',
  };
  displayList.value.push(closeVgmTime);
  let closeDocTime = {
    name: $t('seaImport.import.closeDocTime'),
    value: formatNormalDate(formValues.value?.closeDocTime) || '--',
  };
  displayList.value.push(closeDocTime);
  let closeManifestTime = {
    name: $t('seaImport.import.closeManifestTime'),
    value: formatNormalDate(formValues.value?.closeManifestTime) || '--',
  };
  displayList.value.push(closeManifestTime);
  let signingTime = {
    name: $t('seaImport.import.signingTime'),
    value: formatNormalDate(formValues.value?.signingTime) || '--',
  };
  displayList.value.push(signingTime);
  let codeServiceName = {
    name: $t('seaImport.import.codeServiceId'),
    value: formValues.value?.codeServiceName || '--',
  };
  displayList.value.push(codeServiceName);
  let codeFrtName = {
    name: $t('seaImport.import.codeFrtId'),
    value: formValues.value?.codeFrtName || '--',
  };
  displayList.value.push(codeFrtName);
  let noPkgs = {
    name: $t('seaImport.import.noPkgs'),
    value: to.value?.noPkgs || '--',
  };
  displayList.value.push(noPkgs);
  let kgs = {
    name: $t('seaImport.import.kgs'),
    value: to.value?.kgs || '--',
  };
  displayList.value.push(kgs);
  let cbm = {
    name: $t('seaImport.import.cbm'),
    value: to.value?.cbm || '--',
  };
  displayList.value.push(cbm);
  let goodsDes = {
    name: $t('seaImport.import.goodsDes'),
    value: to.value?.goodsDes || '--',
  };
  displayList.value.push(goodsDes);
};
const loadSeaImportData = async () => {
  if (!editId.value) return;

  //pageLoading.value = true;
  try {
    const detail = await getSeaImportDetail(editId.value);
    transportOrderId.value = detail.transportOrder?.id;
    formValues.value = detail;
    to.value = detail.transportOrder;
    console.log('detail', formValues.value);
    setDisplayList();
  } finally {
    pageLoading.value = false;
  }
};

onMounted(() => {
  loadSeaImportData();
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="pageLoading">
      <div class="mx-2 flex items-stretch gap-6">
        <!-- 垂直方向撑满 -->
        <Card class="flex w-[280px] shrink-0 flex-col">
          <template #title>
            <span class="flex items-center gap-2">
              <Users class="size-4" />
              {{ $t('seaImport.import.formCardInfo') }}
            </span>
          </template>
          <div class="flex flex-1 px-1 py-1" v-for="item in displayList">
            <span class="flex w-[85px]"> {{ `${item.name} : ` }}</span>
            <span class="flex w-[145px]">{{ item.value || '--' }}</span>
          </div>
        </Card>
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <OrderFeeTable :type="0" />

          <OrderFeeTable :type="1" />
        </div>
      </div>
    </Spin>
  </Page>
</template>
