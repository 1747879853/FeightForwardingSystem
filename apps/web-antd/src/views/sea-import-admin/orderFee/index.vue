<script lang="ts" setup>
import type { SeaImportAdminApi } from '#/api/sea-import/sea-import-admin';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';
import { Users } from '@vben/icons';

import dayjs from 'dayjs';

import { Card, Spin } from 'ant-design-vue';

import { getSeaImportDetail } from '#/api/sea-import/sea-import-admin';
import { $t } from '#/locales';

import OrderFeeTable from './modules/order-fee-table.vue';

defineOptions({ name: 'OrderFee' });

const route = useRoute();

/** 编辑页保存成功后下发的最新详情：直接替换信息卡片数据 */
const props = defineProps<{
  latestDetail?: SeaImportAdminApi.SeaImportDto;
}>();

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});

const pageLoading = ref(false);
const detail = ref<SeaImportAdminApi.SeaImportDto>();

/** ISO 字符串转展示格式 */
const formatDate = (val: null | string | undefined, format = 'YYYY-MM-DD') => {
  if (!val) return '--';
  const d = dayjs(val);
  return d.isValid() ? d.format(format) : '--';
};

const displayList = computed(() => {
  const data = detail.value;
  const to = data?.transportOrder;
  const t = (key: string) => $t(`seaImport.import.${key}`);
  return [
    { name: t('commissionNum'), value: to?.commissionNum },
    { name: t('mblNum'), value: to?.mblNum },
    { name: t('bookingNum'), value: to?.bookingNum },
    { name: t('clientId'), value: to?.client?.name },
    { name: t('teamId'), value: to?.team?.name },
    { name: t('vessel'), value: data?.vessel },
    { name: t('innerVoyno'), value: data?.innerVoyno },
    { name: t('carrierId'), value: data?.carrier?.cnShortName },
    { name: t('polId'), value: data?.pol?.portName },
    { name: t('podId'), value: data?.pod?.portName },
    { name: t('originCountryId'), value: data?.originCountry?.countryName },
    { name: t('arrivalDate'), value: formatDate(to?.etd) },
    { name: t('exchangeBillDate'), value: formatDate(data?.exchangeBillDate) },
    { name: t('pickUpDate'), value: formatDate(data?.pickUpDate) },
    {
      name: t('customsDeclareDate'),
      value: formatDate(data?.customsDeclareDate),
    },
    { name: t('invoiceNum'), value: data?.invoiceNum },
    { name: t('batchNum'), value: data?.batchNum },
    { name: t('totalCtn'), value: to?.totalCtn },
    { name: t('pkgs'), value: to?.pkgs },
    { name: t('kgs'), value: to?.kgs },
    { name: t('cbm'), value: to?.cbm },
    { name: t('totalNetWeight'), value: data?.totalNetWeight },
    { name: t('goodsDes'), value: to?.goodsDes },
  ].map((item) => ({
    name: item.name,
    value:
      item.value === null || item.value === undefined || item.value === ''
        ? '--'
        : String(item.value),
  }));
});

const loadSeaImportData = async () => {
  if (!editId.value) return;
  pageLoading.value = true;
  try {
    detail.value = await getSeaImportDetail(editId.value);
  } finally {
    pageLoading.value = false;
  }
};

onMounted(() => {
  loadSeaImportData();
});

// 基础信息保存成功后，用最新详情整体替换信息卡片数据
watch(
  () => props.latestDetail,
  (latest) => {
    if (!latest) return;
    detail.value = latest;
  },
);
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="pageLoading">
      <div class="mx-2 flex items-stretch gap-6">
        <Card class="flex w-[280px] shrink-0 flex-col">
          <template #title>
            <span class="flex items-center gap-2">
              <Users class="size-4" />
              {{ $t('seaImport.import.formCardInfo') }}
            </span>
          </template>
          <div
            v-for="item in displayList"
            :key="item.name"
            class="flex flex-1 px-1 py-1"
          >
            <span class="flex w-[85px] shrink-0 text-gray-500">
              {{ `${item.name}：` }}
            </span>
            <span class="flex min-w-0 flex-1 break-all">{{ item.value }}</span>
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
