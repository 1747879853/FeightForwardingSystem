<script lang="ts" setup>
import type { SpotCardPrice } from '../data';

import { computed } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Empty, Table } from 'ant-design-vue';

import {
  dndTypeLabel,
  feeCategoryLabel,
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
  class: 'w-[760px]',
  footer: false,
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
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 120,
    align: 'right',
  },
];

const spotFeeColumns = [
  {
    title: '费用名称',
    dataIndex: 'spotFeeName',
    key: 'spotFeeName',
    ellipsis: true,
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 140,
    align: 'right',
  },
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
  {
    title: '费用',
    dataIndex: 'cost',
    key: 'cost',
    width: 120,
    align: 'right',
  },
];

const feeGroups = computed(() => {
  return (spot.value?.feeGroupInfoList ?? []).map((group) => ({
    name: feeCategoryLabel(group.feeCategoryName),
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
    <div v-if="price && spot" class="spot-fee">
      <header class="spot-fee__hero">
        <p class="spot-fee__route">
          <span>{{ props.polLabel || '起运港' }}</span>
          <span class="spot-fee__arrow" aria-hidden="true">→</span>
          <span>{{ props.podLabel || '目的港' }}</span>
        </p>
        <p class="spot-fee__identity">
          <span>{{ price.ctnName }}</span>
          <span class="spot-fee__dot" aria-hidden="true" />
          <span>{{ spot.carrierCode || '-' }}</span>
          <span class="spot-fee__dot" aria-hidden="true" />
          <span>{{ spot.vessel || '-' }} / {{ spot.innerVoyno || '-' }}</span>
        </p>

        <dl class="spot-fee__facts">
          <div>
            <dt>航线代码</dt>
            <dd>{{ spot.routeCode || '-' }}</dd>
          </div>
          <div>
            <dt>有效期至</dt>
            <dd>{{ formatSpotDateOnly(spot.validTimeEnd) }}</dd>
          </div>
          <div>
            <dt>报价更新</dt>
            <dd>{{ formatSpotDateOnly(spot.quotationUpdateTime) }}</dd>
          </div>
        </dl>

        <div class="spot-fee__amounts">
          <div class="spot-fee__amount">
            <span class="spot-fee__amount-label">海运费</span>
            <span class="spot-fee__amount-value">
              {{ formatMoney(price.freightAmount, price.freightCurrency) }}
            </span>
          </div>
          <div class="spot-fee__amount spot-fee__amount--total">
            <span class="spot-fee__amount-label">总费用</span>
            <span class="spot-fee__amount-value">
              {{ formatMoney(price.totalAmount, price.totalCurrency) }}
            </span>
          </div>
        </div>
      </header>

      <template v-if="hasContent">
        <section
          v-for="group in feeGroups"
          :key="group.name"
          class="spot-fee__section"
        >
          <header class="spot-fee__section-head">
            <h3>{{ group.name }}</h3>
            <span>{{ group.rows.length }} 项</span>
          </header>
          <Table
            v-if="group.rows.length > 0"
            class="spot-fee__table"
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
        </section>

        <section v-if="spotFeeRows.length > 0" class="spot-fee__section">
          <header class="spot-fee__section-head">
            <h3>即期费用</h3>
            <span>{{ spotFeeRows.length }} 项</span>
          </header>
          <Table
            class="spot-fee__table"
            :columns="spotFeeColumns"
            :data-source="spotFeeRows"
            :pagination="false"
            size="small"
            row-key="key"
          />
        </section>

        <section
          v-for="group in dndGroups"
          :key="group.name"
          class="spot-fee__section"
        >
          <header class="spot-fee__section-head">
            <h3>{{ group.name }}</h3>
            <span>{{ group.rows.length }} 项</span>
          </header>
          <Table
            v-if="group.rows.length > 0"
            class="spot-fee__table"
            :columns="dndColumns"
            :data-source="group.rows"
            :pagination="false"
            size="small"
            row-key="key"
          />
        </section>

        <section v-if="routeRows.length > 0" class="spot-fee__section">
          <header class="spot-fee__section-head">
            <h3>航线途经</h3>
            <span>{{ routeRows.length }} 港</span>
          </header>
          <ol class="spot-fee__stops">
            <li
              v-for="(route, index) in routeRows"
              :key="`${route.ediCode}-${index}`"
              class="spot-fee__stop"
            >
              <span class="spot-fee__stop-index">{{ index + 1 }}</span>
              <div class="spot-fee__stop-body">
                <div class="spot-fee__stop-title">
                  <span>{{ route.portName || route.ediCode || '-' }}</span>
                  <span v-if="route.portCountry" class="spot-fee__chip">
                    {{ route.portCountry }}
                  </span>
                </div>
                <p class="spot-fee__stop-meta">
                  ETD {{ formatSpotDateOnly(route.etd) }}
                  <span aria-hidden="true">·</span>
                  ETA {{ formatSpotDateOnly(route.eta) }}
                  <template v-if="route.vessel">
                    <span aria-hidden="true">·</span>
                    {{ route.vessel }} / {{ route.innerVoyno || '-' }}
                  </template>
                </p>
              </div>
            </li>
          </ol>
        </section>
      </template>
      <Empty v-else class="spot-fee__empty" description="暂无费用明细" />
    </div>
    <Empty v-else class="spot-fee__empty" description="请选择运价" />
  </Drawer>
</template>

<style scoped lang="scss">
.spot-fee {
  --spot-radius: 10px;
  --spot-radius-sm: 8px;
  --spot-ink: hsl(var(--foreground));
  --spot-muted: hsl(var(--muted-foreground));
  --spot-line: hsl(var(--border));
  --spot-fill: hsl(var(--muted) / 42%);
  --spot-surface: hsl(var(--card, var(--background)));
  --spot-accent-soft: hsl(var(--primary) / 8%);

  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 2px 2px 20px;
  color: var(--spot-ink);
}

.spot-fee__hero {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 16px 14px;
  background: linear-gradient(
    180deg,
    hsl(var(--primary) / 5%) 0%,
    var(--spot-surface) 46%
  );
  border: 1px solid var(--spot-line);
  border-radius: 12px;
}

.spot-fee__route {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.01em;
}

.spot-fee__arrow,
.spot-fee__dot {
  color: var(--spot-muted);
}

.spot-fee__identity {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--spot-muted);
}

.spot-fee__dot {
  width: 3px;
  height: 3px;
  background: currentcolor;
  border-radius: 50%;
  opacity: 0.7;
}

.spot-fee__facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px 12px;
  margin: 0;

  div {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  dt {
    margin: 0;
    font-size: 12px;
    font-weight: 500;
    line-height: 1;
    color: var(--spot-muted);
  }

  dd {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 13px;
    line-height: 1.4;
    white-space: nowrap;
  }
}

.spot-fee__amounts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.spot-fee__amount {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: var(--spot-fill);
  border: 1px solid var(--spot-line);
  border-radius: var(--spot-radius-sm);
}

.spot-fee__amount--total {
  background: var(--spot-accent-soft);
  border-color: hsl(var(--primary) / 18%);
}

.spot-fee__amount-label {
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  color: var(--spot-muted);
}

.spot-fee__amount-value {
  font-size: 16px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
}

.spot-fee__amount--total .spot-fee__amount-value {
  font-size: 18px;
}

.spot-fee__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: var(--spot-surface);
  border: 1px solid var(--spot-line);
  border-radius: var(--spot-radius);
}

.spot-fee__section-head {
  display: flex;
  gap: 12px;
  align-items: baseline;
  justify-content: space-between;

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
  }

  span {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--spot-muted);
  }
}

.spot-fee__table {
  :deep(.ant-table) {
    background: transparent;
  }

  :deep(.ant-table-container) {
    border: 1px solid var(--spot-line);
    border-radius: var(--spot-radius-sm);
  }

  :deep(.ant-table-thead > tr > th) {
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 500;
    color: var(--spot-muted);
    background: var(--spot-fill);
    border-bottom: 1px solid var(--spot-line);
  }

  :deep(.ant-table-tbody > tr > td) {
    padding: 9px 12px;
    font-size: 13px;
    border-bottom-color: hsl(var(--border) / 65%);
    transition: background-color 0.16s ease;
  }

  :deep(.ant-table-tbody > tr:last-child > td) {
    border-bottom: 0;
  }

  :deep(.ant-table-tbody > tr:hover > td) {
    background: hsl(var(--primary) / 6%) !important;
  }
}

.spot-fee__stops {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.spot-fee__stop {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  background: var(--spot-fill);
  border: 1px solid transparent;
  border-radius: var(--spot-radius-sm);
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease;

  &:hover {
    background: hsl(var(--primary) / 6%);
    border-color: hsl(var(--primary) / 22%);
  }
}

.spot-fee__stop-index {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-top: 1px;
  font-size: 12px;
  font-weight: 600;
  color: var(--spot-muted);
  background: var(--spot-surface);
  border: 1px solid var(--spot-line);
  border-radius: 999px;
}

.spot-fee__stop-body {
  min-width: 0;
}

.spot-fee__stop-title {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
}

.spot-fee__chip {
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--spot-muted);
  background: var(--spot-surface);
  border: 1px solid var(--spot-line);
  border-radius: 999px;
}

.spot-fee__stop-meta {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--spot-muted);

  span {
    margin: 0 4px;
  }
}

.spot-fee__empty {
  padding: 28px 0;
}

@media (max-width: 640px) {
  .spot-fee__facts,
  .spot-fee__amounts {
    grid-template-columns: 1fr;
  }
}
</style>
