<script lang="ts" setup>
import type { SpotCardPrice } from '../data';

import { computed } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  Descriptions,
  DescriptionsItem,
  Empty,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  dndTypeLabel,
  formatMoney,
  formatSpotDateOnly,
  paymentMethodLabel,
  priceFeeTypeLabel,
} from '../data';

const props = defineProps<{
  price: null | SpotCardPrice;
  polLabel?: string;
  podLabel?: string;
}>();

const [Drawer, drawerApi] = useVbenDrawer({
  title: '费用明细',
  class: 'w-[720px]',
});

defineExpose({
  open() {
    drawerApi.open();
  },
  close() {
    drawerApi.close();
  },
});

const spot = computed(() => props.price?.spot ?? null);

const feeColumns = [
  {
    title: '费用名称',
    dataIndex: 'categoryName',
    key: 'categoryName',
    ellipsis: true,
  },
  {
    title: '付款方式',
    dataIndex: 'paymentMethod',
    key: 'paymentMethod',
    width: 88,
  },
  { title: '计费', dataIndex: 'priceFeeType', key: 'priceFeeType', width: 72 },
  { title: '金额', dataIndex: 'amount', key: 'amount', width: 120 },
];

const spotFeeColumns = [
  {
    title: '费用名称',
    dataIndex: 'spotFeeName',
    key: 'spotFeeName',
    ellipsis: true,
  },
  { title: '金额', dataIndex: 'amount', key: 'amount', width: 140 },
];

const dndColumns = [
  {
    title: '描述',
    dataIndex: 'destination',
    key: 'destination',
    ellipsis: true,
  },
  {
    title: '区间(天)',
    dataIndex: 'validityPeriod',
    key: 'validityPeriod',
    width: 100,
  },
  { title: '费用', dataIndex: 'cost', key: 'cost', width: 120 },
];

const feeGroups = computed(() => {
  return (spot.value?.feeGroupInfoList ?? []).map((group) => ({
    name: group.feeCategoryName || '未分类',
    rows: (group.feeDetailList ?? []).map((item, index) => ({
      key: `${index}-${item.categoryName}`,
      categoryName: item.categoryName || '-',
      paymentMethod: paymentMethodLabel(item.paymentMethod),
      priceFeeType: priceFeeTypeLabel(item.priceFeeType),
      amount: formatMoney(item.price, item.currency),
    })),
  }));
});

const spotFeeRows = computed(() =>
  (spot.value?.spotFeeInfoList ?? []).map((item, index) => ({
    key: `${index}-${item.spotFeeName}`,
    spotFeeName: item.spotFeeName || '-',
    amount: [item.currency, item.price].filter(Boolean).join(' ') || '-',
  })),
);

const dndGroups = computed(() =>
  (spot.value?.dndGroupInfoList ?? []).map((group) => ({
    name: dndTypeLabel(group.type),
    rows: (group.dndDetailInfoList ?? []).map((item, index) => ({
      key: `${index}-${item.destination}-${item.validityPeriod}`,
      destination: item.destination || '-',
      validityPeriod: item.validityPeriod || '-',
      cost: [item.currency, item.cost].filter(Boolean).join(' ') || '-',
    })),
  })),
);

const routeRows = computed(() => spot.value?.routeInfoList ?? []);

const hasContent = computed(() => {
  return (
    feeGroups.value.some((g) => g.rows.length > 0) ||
    spotFeeRows.value.length > 0 ||
    dndGroups.value.some((g) => g.rows.length > 0) ||
    routeRows.value.length > 0
  );
});
</script>

<template>
  <Drawer>
    <div v-if="price && spot" class="spot-fee-detail">
      <Descriptions :column="2" size="small" bordered class="mb-4">
        <DescriptionsItem label="箱型">{{ price.ctnName }}</DescriptionsItem>
        <DescriptionsItem label="船司">{{
          spot.carrierCode || '-'
        }}</DescriptionsItem>
        <DescriptionsItem label="船名">{{
          spot.vessel || '-'
        }}</DescriptionsItem>
        <DescriptionsItem label="航次">{{
          spot.innerVoyno || '-'
        }}</DescriptionsItem>
        <DescriptionsItem label="航线">
          {{ props.polLabel || '-' }} → {{ props.podLabel || '-' }}
        </DescriptionsItem>
        <DescriptionsItem label="航线代码">{{
          spot.routeCode || '-'
        }}</DescriptionsItem>
        <DescriptionsItem label="海运费">
          {{ formatMoney(price.freightAmount, price.freightCurrency) }}
        </DescriptionsItem>
        <DescriptionsItem label="总费用">
          {{ formatMoney(price.totalAmount, price.totalCurrency) }}
        </DescriptionsItem>
        <DescriptionsItem label="有效期至">
          {{ formatSpotDateOnly(spot.validTimeEnd) }}
        </DescriptionsItem>
        <DescriptionsItem label="报价更新">
          {{ formatSpotDateOnly(spot.quotationUpdateTime) }}
        </DescriptionsItem>
      </Descriptions>

      <template v-if="hasContent">
        <div v-for="group in feeGroups" :key="group.name" class="mb-4">
          <div class="mb-2 text-sm font-medium">{{ group.name }}</div>
          <Table
            v-if="group.rows.length > 0"
            :columns="feeColumns"
            :data-source="group.rows"
            :pagination="false"
            size="small"
            row-key="key"
          />
          <Empty
            v-else
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
            description="暂无明细"
          />
        </div>

        <div v-if="spotFeeRows.length > 0" class="mb-4">
          <div class="mb-2 text-sm font-medium">Spot 费用</div>
          <Table
            :columns="spotFeeColumns"
            :data-source="spotFeeRows"
            :pagination="false"
            size="small"
            row-key="key"
          />
        </div>

        <div v-for="group in dndGroups" :key="group.name" class="mb-4">
          <div class="mb-2 text-sm font-medium">{{ group.name }}</div>
          <Table
            v-if="group.rows.length > 0"
            :columns="dndColumns"
            :data-source="group.rows"
            :pagination="false"
            size="small"
            row-key="key"
          />
        </div>

        <div v-if="routeRows.length > 0" class="mb-2">
          <div class="mb-2 text-sm font-medium">航线途经</div>
          <div class="flex flex-col gap-2">
            <div
              v-for="(route, index) in routeRows"
              :key="`${route.ediCode}-${index}`"
              class="rounded border border-border px-3 py-2 text-sm"
            >
              <div class="font-medium">
                {{ route.portName || route.ediCode || '-' }}
                <Tag v-if="route.portCountry" class="ml-1" color="blue">
                  {{ route.portCountry }}
                </Tag>
              </div>
              <div class="mt-1 text-xs text-muted-foreground">
                ETD {{ formatSpotDateOnly(route.etd) }} · ETA
                {{ formatSpotDateOnly(route.eta) }}
                <template v-if="route.vessel">
                  · {{ route.vessel }} / {{ route.innerVoyno || '-' }}
                </template>
              </div>
            </div>
          </div>
        </div>
      </template>
      <Empty v-else description="暂无费用明细" />
    </div>
    <Empty v-else description="请选择运价" />
  </Drawer>
</template>

<style scoped>
.spot-fee-detail {
  padding: 4px 4px 20px;
}
</style>
