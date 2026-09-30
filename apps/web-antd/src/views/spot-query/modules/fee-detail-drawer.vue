<script lang="ts" setup>
import type { SpotCard } from '../data';

import { computed, ref, watch } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Empty, Table, Tabs, Tag, Tooltip } from 'ant-design-vue';

import {
  buildSpotFeeMatrix,
  dndTypeLabel,
  formatSpotDate,
  formatSpotDateOnly,
  formatSpotPortLabel,
  formatSpotPrice,
} from '../data';

const props = defineProps<{
  card: null | SpotCard;
  polLabel?: string;
  podLabel?: string;
  serviceTerm?: string;
  bestBadge?: string;
}>();

const activeTab = ref('fees');

const [Drawer, drawerApi] = useVbenDrawer({
  title: '费用明细',
  class: 'w-[980px]',
  footer: false,
});

defineExpose({
  open(tab: 'basic' | 'fees' | 'schedule' = 'fees') {
    activeTab.value = tab;
    drawerApi.open();
  },
  close() {
    drawerApi.close();
  },
});

watch(
  () => props.card?.key,
  () => {
    activeTab.value = 'fees';
  },
);

const ctnNames = computed(() => props.card?.prices.map((p) => p.ctnName) ?? []);

const feeSections = computed(() =>
  props.card ? buildSpotFeeMatrix(props.card) : [],
);

const feeColumns = computed(() => {
  const cols: Array<Record<string, any>> = [
    {
      title: '费用名称',
      dataIndex: 'feeName',
      key: 'feeName',
      ellipsis: true,
      width: 200,
    },
    {
      title: '预/到付',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 88,
      align: 'center',
    },
  ];
  for (const name of ctnNames.value) {
    cols.push({
      title: name,
      dataIndex: ['amounts', name],
      key: `amt-${name}`,
      width: 110,
      align: 'right',
      customRender: ({
        record,
      }: {
        record: { amounts: Record<string, string> };
      }) => record.amounts?.[name] ?? '—',
    });
  }
  cols.push({
    title: '单位',
    dataIndex: 'unit',
    key: 'unit',
    width: 72,
    align: 'center',
  });
  return cols;
});

const dndGroups = computed(() => {
  const first = props.card?.prices[0]?.spot;
  return (first?.dndGroupInfoList ?? []).map((group) => ({
    name: dndTypeLabel(group.type),
    rows: (group.dndDetailInfoList ?? []).map((item, index) => ({
      key: `${index}-${item.destination}-${item.validityPeriod}`,
      destination: item.destination || '-',
      validityPeriod: item.validityPeriod || '-',
      cost: [item.currency, item.cost].filter(Boolean).join(' ') || '—',
    })),
  }));
});

const routeRows = computed(
  () => props.card?.prices[0]?.spot.routeInfoList ?? [],
);

const spotFeeRows = computed(() =>
  (props.card?.prices[0]?.spot.spotFeeInfoList ?? []).map((item, index) => ({
    key: `${index}-${item.spotFeeName}`,
    spotFeeName: item.spotFeeName || '-',
    amount: [item.currency, item.price].filter(Boolean).join(' ') || '—',
  })),
);

const hasFeeContent = computed(
  () =>
    feeSections.value.some((s) => s.rows.length > 0) ||
    spotFeeRows.value.length > 0 ||
    dndGroups.value.some((g) => g.rows.length > 0),
);

const voyageDays = computed(() => {
  const v = props.card?.voyage;
  return typeof v === 'number' && Number.isFinite(v) ? `${v}天` : '-';
});
</script>

<template>
  <Drawer>
    <div v-if="card" class="spot-fee">
      <header class="spot-fee__summary">
        <div class="spot-fee__summary-main">
          <div class="spot-fee__logo" :title="card.carrierCode">
            {{ card.carrierCode }}
          </div>
          <div class="spot-fee__route">
            <div class="spot-fee__endpoint">
              <span class="spot-fee__when">{{ formatSpotDate(card.etd) }}</span>
              <span class="spot-fee__port">
                {{ formatSpotPortLabel(polLabel) }}
              </span>
            </div>
            <div class="spot-fee__transit">
              <div class="spot-fee__transit-days">{{ voyageDays }}</div>
              <div class="spot-fee__transit-line">
                <span class="spot-fee__transit-dot" />
                <span class="spot-fee__transit-rail" />
                <span class="spot-fee__transit-badge">
                  {{ card.isDirect ? '直达' : '中转' }}
                </span>
                <span class="spot-fee__transit-rail" />
                <span class="spot-fee__transit-dot" />
              </div>
            </div>
            <div class="spot-fee__endpoint spot-fee__endpoint--end">
              <span class="spot-fee__when">{{ formatSpotDate(card.eta) }}</span>
              <span class="spot-fee__port">
                {{ formatSpotPortLabel(podLabel) }}
              </span>
            </div>
          </div>
          <div class="spot-fee__prices">
            <div
              v-for="price in card.prices"
              :key="`${price.ctnCodeId}-${price.ctnName}`"
              class="spot-fee__price-col"
            >
              <div class="spot-fee__ctn">{{ price.ctnName }}</div>
              <div class="spot-fee__price-row">
                <span class="spot-fee__price-label">Base</span>
                <span class="spot-fee__price-base">
                  {{
                    formatSpotPrice(price.freightAmount, price.freightCurrency)
                  }}
                </span>
              </div>
              <div class="spot-fee__price-row">
                <span class="spot-fee__price-label">Total</span>
                <span class="spot-fee__price-total">
                  {{ formatSpotPrice(price.totalAmount, price.totalCurrency) }}
                </span>
              </div>
            </div>
          </div>
          <div class="spot-fee__aside">
            <div class="spot-fee__source">
              <span>
                运价来源
                <Tooltip title="第三方即时运价，以船司实时报价为准">
                  <IconifyIcon
                    icon="mdi:information-outline"
                    class="spot-fee__source-icon"
                  />
                </Tooltip>
              </span>
              <Tag color="processing" class="spot-fee__source-tag">
                船司直营
              </Tag>
            </div>
            <span v-if="bestBadge" class="spot-fee__best">{{ bestBadge }}</span>
          </div>
        </div>
        <div class="spot-fee__meta">
          <span>航线代码: {{ card.routeCode }}</span>
          <span class="spot-fee__sep">|</span>
          <span>船名: {{ card.vessel }}</span>
          <span class="spot-fee__sep">|</span>
          <span>航次: {{ card.innerVoyno }}</span>
          <span class="spot-fee__sep">|</span>
          <span>运输条款: {{ serviceTerm || '-' }}</span>
        </div>
      </header>

      <Tabs v-model:active-key="activeTab" class="spot-fee__tabs">
        <Tabs.TabPane key="basic" tab="基础信息">
          <div class="spot-fee__basic">
            <dl class="spot-fee__facts">
              <div>
                <dt>船司代码</dt>
                <dd>{{ card.carrierCode }}</dd>
              </div>
              <div>
                <dt>航线代码</dt>
                <dd>{{ card.routeCode || '-' }}</dd>
              </div>
              <div>
                <dt>船名 / 航次</dt>
                <dd>{{ card.vessel }} / {{ card.innerVoyno }}</dd>
              </div>
              <div>
                <dt>开船 / 预抵</dt>
                <dd>
                  {{ formatSpotDate(card.etd) }} →
                  {{ formatSpotDate(card.eta) }}
                </dd>
              </div>
              <div>
                <dt>航程</dt>
                <dd>
                  {{ voyageDays }} · {{ card.isDirect ? '直达' : '中转' }}
                </dd>
              </div>
              <div>
                <dt>运输条款</dt>
                <dd>{{ serviceTerm || '-' }}</dd>
              </div>
              <div>
                <dt>有效期至</dt>
                <dd>{{ formatSpotDateOnly(card.validTimeEnd) }}</dd>
              </div>
              <div>
                <dt>报价更新</dt>
                <dd>{{ formatSpotDateOnly(card.quotationUpdateTime) }}</dd>
              </div>
            </dl>
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane key="fees" tab="费用明细">
          <div v-if="hasFeeContent" class="spot-fee__sections">
            <section
              v-for="section in feeSections"
              :key="section.name"
              class="spot-fee__section"
            >
              <header class="spot-fee__section-head">
                {{ section.name }}
              </header>
              <Table
                class="spot-fee__table"
                :columns="feeColumns"
                :data-source="section.rows"
                :pagination="false"
                size="small"
                row-key="key"
                :scroll="{ x: true }"
              />
            </section>

            <section v-if="spotFeeRows.length > 0" class="spot-fee__section">
              <header class="spot-fee__section-head">即期费用</header>
              <Table
                class="spot-fee__table"
                :columns="[
                  { title: '费用名称', dataIndex: 'spotFeeName', key: 'n' },
                  {
                    title: '金额',
                    dataIndex: 'amount',
                    key: 'a',
                    align: 'right',
                    width: 140,
                  },
                ]"
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
              <header class="spot-fee__section-head">{{ group.name }}</header>
              <Table
                v-if="group.rows.length > 0"
                class="spot-fee__table"
                :columns="[
                  {
                    title: '描述',
                    dataIndex: 'destination',
                    key: 'd',
                    ellipsis: true,
                  },
                  {
                    title: '区间(天)',
                    dataIndex: 'validityPeriod',
                    key: 'v',
                    width: 100,
                  },
                  {
                    title: '费用',
                    dataIndex: 'cost',
                    key: 'c',
                    width: 120,
                    align: 'right',
                  },
                ]"
                :data-source="group.rows"
                :pagination="false"
                size="small"
                row-key="key"
              />
            </section>
          </div>
          <Empty v-else description="暂无费用明细" />
        </Tabs.TabPane>

        <Tabs.TabPane key="schedule" tab="船期信息">
          <ol v-if="routeRows.length > 0" class="spot-fee__stops">
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
          <Empty v-else description="暂无船期途经信息" />
        </Tabs.TabPane>
      </Tabs>
    </div>
    <Empty v-else description="请选择运价" />
  </Drawer>
</template>

<style scoped lang="scss">
.spot-fee {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 2px 16px;
  color: #0f172a;
}

.spot-fee__summary {
  padding: 14px 16px 12px;
  background: #fff;
  border: 1px solid #e8ecf1;
  border-radius: 10px;
}

.spot-fee__summary-main {
  display: grid;
  grid-template-columns: 64px minmax(220px, 1.3fr) minmax(180px, 1fr) minmax(
      120px,
      160px
    );
  gap: 12px;
  align-items: center;
}

.spot-fee__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  font-size: 12px;
  font-weight: 800;
  text-align: center;
  word-break: break-all;
  background: linear-gradient(145deg, #f8fafc, #eef2f7);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.spot-fee__route {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.spot-fee__endpoint {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: baseline;
  min-width: 0;
}

.spot-fee__endpoint--end {
  justify-content: flex-end;
  text-align: right;
}

.spot-fee__when {
  font-size: 12px;
  color: #64748b;
}

.spot-fee__port {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
}

.spot-fee__transit {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  min-width: 80px;
}

.spot-fee__transit-days {
  font-size: 12px;
  color: #64748b;
}

.spot-fee__transit-line {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 88px;
}

.spot-fee__transit-dot {
  width: 6px;
  height: 6px;
  background: #94a3b8;
  border-radius: 50%;
}

.spot-fee__transit-rail {
  flex: 1;
  border-top: 1px dashed #cbd5e1;
}

.spot-fee__transit-badge {
  padding: 0 6px;
  margin: 0 2px;
  font-size: 11px;
  line-height: 18px;
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
}

.spot-fee__prices {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  justify-content: flex-end;
}

.spot-fee__price-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 88px;
  text-align: right;
}

.spot-fee__ctn {
  margin-bottom: 2px;
  font-size: 12px;
  color: #94a3b8;
}

.spot-fee__price-row {
  display: flex;
  gap: 8px;
  align-items: baseline;
  justify-content: flex-end;
}

.spot-fee__price-label {
  font-size: 11px;
  color: #94a3b8;
}

.spot-fee__price-base {
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #e11d48;
}

.spot-fee__price-total {
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  color: #e11d48;
}

.spot-fee__aside {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.spot-fee__source {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
  font-size: 12px;
  color: #94a3b8;
}

.spot-fee__source-icon {
  margin-left: 2px;
  font-size: 14px;
  vertical-align: -2px;
}

.spot-fee__source-tag {
  margin: 0;
}

.spot-fee__best {
  display: inline-flex;
  height: 22px;
  padding: 0 8px;
  font-size: 12px;
  line-height: 22px;
  color: #e11d48;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 4px;
}

.spot-fee__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 0;
  align-items: center;
  padding-top: 10px;
  margin-top: 10px;
  font-size: 12px;
  color: #64748b;
  border-top: 1px solid #eef1f5;
}

.spot-fee__sep {
  margin: 0 8px;
  color: #cbd5e1;
}

.spot-fee__tabs {
  :deep(.ant-tabs-nav) {
    margin-bottom: 12px;
  }

  :deep(.ant-tabs-tab) {
    font-size: 14px;
  }

  :deep(.ant-tabs-ink-bar) {
    height: 3px;
  }
}

.spot-fee__sections {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.spot-fee__section {
  overflow: hidden;
  background: #fff;
  border: 1px solid #e5e9ef;
  border-radius: 8px;
}

.spot-fee__section-head {
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  background: #eef5ff;
  border-bottom: 1px solid #e5e9ef;
}

.spot-fee__table {
  :deep(.ant-table) {
    background: transparent;
  }

  :deep(.ant-table-thead > tr > th) {
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 500;
    color: #64748b;
    background: #f8fafc;
  }

  :deep(.ant-table-tbody > tr > td) {
    padding: 9px 12px;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
}

.spot-fee__basic {
  padding: 4px 0 8px;
}

.spot-fee__facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
  margin: 0;

  div {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    background: #f8fafc;
    border: 1px solid #eef1f5;
    border-radius: 8px;
  }

  dt {
    margin: 0;
    font-size: 12px;
    color: #94a3b8;
  }

  dd {
    margin: 0;
    font-size: 13px;
    font-weight: 500;
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
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #eef1f5;
  border-radius: 8px;
}

.spot-fee__stop-index {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
}

.spot-fee__stop-title {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
}

.spot-fee__chip {
  padding: 0 6px;
  font-size: 11px;
  font-weight: 500;
  line-height: 18px;
  color: #64748b;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
}

.spot-fee__stop-meta {
  margin: 4px 0 0;
  font-size: 12px;
  color: #64748b;

  span {
    margin: 0 4px;
  }
}

@media (max-width: 900px) {
  .spot-fee__summary-main {
    grid-template-columns: 1fr;
  }

  .spot-fee__facts {
    grid-template-columns: 1fr;
  }
}
</style>
