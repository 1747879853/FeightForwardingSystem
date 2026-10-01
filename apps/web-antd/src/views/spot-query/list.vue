<script lang="ts" setup>
import type { SpotCard, SpotSortMode } from './data';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Alert,
  Button,
  Empty,
  message,
  Select,
  Spin,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { PortSelect } from '#/adapter/component/biz-select';
import { spotQueryAsync } from '#/api/rong-e-tong/rong-e-tong-admin';
import { getCtnCodePagedList } from '#/api/system/base-data/ctn-code-admin';

import {
  buildSpotViewModel,
  formatSpotDate,
  formatSpotPortLabel,
  formatSpotPrice,
  pickBestCardKey,
  sortSpotCards,
  SPOT_SERVICE_TYPE_OPTIONS,
  SPOT_SORT_OPTIONS,
  type SpotServiceType,
} from './data';
import FeeDetailDrawer from './modules/fee-detail-drawer.vue';
import {
  getSpotCtnSortIndex,
  isSupportedSpotCtnName,
} from './supported-ctn-names';
import { isSupportedSpotEdiCode } from './supported-edi-codes';

defineOptions({ name: 'SpotFreightQuery' });

interface SpotCtnOption {
  disabled?: boolean;
  label: string;
  value: string;
}

const loading = ref(false);
const searched = ref(false);
const ctnOptionsLoading = ref(false);
/** 港口/箱型雪花 ID 一律字符串，禁止 Number() 以免精度丢失与下拉 label 对不上 */
const polId = ref<null | string>(null);
const podId = ref<null | string>(null);
const ctnCodeIds = ref<string[]>([]);
const ctnOptions = ref<SpotCtnOption[]>([]);
const polLabel = ref('');
const podLabel = ref('');
const polEdiCode = ref('');
const podEdiCode = ref('');
const polServiceType = ref<null | SpotServiceType>('CY');
const podServiceType = ref<null | SpotServiceType>('CY');
const sortMode = ref<SpotSortMode>('lowestPrice');

const rawResults = ref<ReturnType<typeof buildSpotViewModel> | null>(null);
const feeDrawerRef = ref<InstanceType<typeof FeeDetailDrawer>>();
const activeFeeCard = ref<null | SpotCard>(null);

async function loadSupportedCtnOptions() {
  if (ctnOptionsLoading.value) return;
  ctnOptionsLoading.value = true;
  try {
    const res = await getCtnCodePagedList({
      PageIndex: 1,
      PageSize: 200,
      Sorting: 'OrderNo ASC, Id DESC',
      Status: 0,
    });
    const items = (res.items ?? [])
      .filter((item) => isSupportedSpotCtnName(item.ctnName))
      .sort(
        (a, b) =>
          getSpotCtnSortIndex(a.ctnName) - getSpotCtnSortIndex(b.ctnName),
      );
    ctnOptions.value = items.map((item) => ({
      disabled: item.status === 1,
      label: String(item.ctnName ?? '').trim(),
      value: String(item.id ?? '').trim(),
    }));
  } catch {
    ctnOptions.value = [];
  } finally {
    ctnOptionsLoading.value = false;
  }
}

onMounted(() => {
  void loadSupportedCtnOptions();
});

const cards = computed(() =>
  sortSpotCards(rawResults.value?.cards ?? [], sortMode.value),
);
const fails = computed(() => rawResults.value?.fails ?? []);
const reuseHints = computed(() => rawResults.value?.reuseHints ?? []);
const bestCardKey = computed(() =>
  pickBestCardKey(rawResults.value?.cards ?? [], sortMode.value),
);
const hasCards = computed(() => cards.value.length > 0);
const canQuery = computed(
  () =>
    Boolean(polId.value) &&
    Boolean(podId.value) &&
    Boolean(polServiceType.value) &&
    Boolean(podServiceType.value) &&
    ctnCodeIds.value.length > 0,
);

const serviceTermText = computed(() => {
  const pol = polServiceType.value ?? '-';
  const pod = podServiceType.value ?? '-';
  return `${pol}-${pod}`;
});

const bestBadgeText = computed(() => {
  if (sortMode.value === 'lowestPrice') return '运价最低';
  if (sortMode.value === 'earliestEtd') return '最早开船';
  return '航程最短';
});

const emptyDescription = computed(() => {
  if (!searched.value) {
    return '请选择起运港、目的港、运输类型和箱型后查询';
  }
  if (fails.value.length > 0 && !hasCards.value) return '所选箱型均未查到运价';
  return '暂无匹配运价';
});

const reuseTipText = computed(() => {
  if (reuseHints.value.length === 0) return '';
  const maxMinutes = Math.max(...reuseHints.value.map((h) => h.minutesAgo));
  if (maxMinutes <= 0) return '以下为刚刚查询过的运价（1 小时内复用）';
  if (maxMinutes < 60) {
    return `以下为 ${maxMinutes} 分钟前的运价（1 小时内复用）`;
  }
  return `以下为约 ${Math.floor(maxMinutes / 60)} 小时前的运价（1 小时内复用）`;
});

function normalizeId(value: unknown): null | string {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeIdList(value: unknown): string[] {
  const list = Array.isArray(value)
    ? value
    : value == null || value === ''
      ? []
      : [value];
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const id = normalizeId(item);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function resolvePortLabel(option: any): string {
  const raw = option?.raw ?? option;
  const portName = String(raw?.portName ?? '').trim();
  const edi = String(raw?.ediCode ?? '').trim();
  if (portName && edi) return `${portName} (${edi})`;
  return portName || edi || String(option?.label ?? '').trim();
}

function resolvePortEdi(option: any): string {
  const raw = option?.raw ?? option;
  return String(raw?.ediCode ?? '').trim();
}

function handlePolChange(value: unknown, option: any) {
  polId.value = normalizeId(value);
  polLabel.value = polId.value ? resolvePortLabel(option) : '';
  polEdiCode.value = polId.value ? resolvePortEdi(option) : '';
}

function handlePodChange(value: unknown, option: any) {
  podId.value = normalizeId(value);
  podLabel.value = podId.value ? resolvePortLabel(option) : '';
  podEdiCode.value = podId.value ? resolvePortEdi(option) : '';
}

function handleCtnChange(value: unknown) {
  ctnCodeIds.value = normalizeIdList(value);
}

/** 起运 / 目的港及运输类型互换 */
function swapRouteEnds() {
  const nextPolId = podId.value;
  const nextPodId = polId.value;
  const nextPolLabel = podLabel.value;
  const nextPodLabel = polLabel.value;
  const nextPolEdi = podEdiCode.value;
  const nextPodEdi = polEdiCode.value;
  const nextPolService = podServiceType.value;
  const nextPodService = polServiceType.value;

  polId.value = nextPolId;
  podId.value = nextPodId;
  polLabel.value = nextPolLabel;
  podLabel.value = nextPodLabel;
  polEdiCode.value = nextPolEdi;
  podEdiCode.value = nextPodEdi;
  polServiceType.value = nextPolService;
  podServiceType.value = nextPodService;
}

function assertReadyToQuery(): boolean {
  if (!polId.value || !podId.value || ctnCodeIds.value.length === 0) {
    message.warning('请选择起运港、目的港和至少一个箱型');
    return false;
  }
  if (!polServiceType.value || !podServiceType.value) {
    message.warning('请选择起运港与目的港运输类型');
    return false;
  }
  if (
    !isSupportedSpotEdiCode(polEdiCode.value) ||
    !isSupportedSpotEdiCode(podEdiCode.value)
  ) {
    message.warning('港口不支持');
    return false;
  }
  return true;
}

async function handleQuery() {
  if (loading.value) return;
  if (!assertReadyToQuery()) return;

  loading.value = true;
  try {
    const data = await spotQueryAsync({
      polId: polId.value!,
      podId: podId.value!,
      polServiceType: polServiceType.value!,
      podServiceType: podServiceType.value!,
      ctnCodeIds: [...ctnCodeIds.value],
    });
    rawResults.value = buildSpotViewModel(Array.isArray(data) ? data : []);
    searched.value = true;
    if (
      (rawResults.value?.cards.length ?? 0) === 0 &&
      (rawResults.value?.fails.length ?? 0) === 0
    ) {
      message.info('暂无匹配运价');
    }
  } catch {
    searched.value = true;
  } finally {
    loading.value = false;
  }
}

function openFeeDetail(
  card: SpotCard,
  tab: 'basic' | 'fees' | 'schedule' = 'fees',
) {
  activeFeeCard.value = card;
  feeDrawerRef.value?.open(tab);
}

function voyageDaysText(card: SpotCard): string {
  return typeof card.voyage === 'number' && Number.isFinite(card.voyage)
    ? `${card.voyage}天`
    : '-';
}
</script>

<template>
  <Page content-class="spot-page">
    <div class="spot-shell">
      <section class="spot-panel spot-panel--query">
        <div class="spot-panel__head">
          <div class="spot-panel__head-text">
            <h1 class="spot-panel__title">即时运价</h1>
            <p class="spot-panel__desc">
              选择起运/目的港、运输类型与箱型，查询船司即时运价
            </p>
          </div>
        </div>

        <div class="spot-search">
          <div class="spot-search__route" role="group" aria-label="航线条件">
            <div class="spot-leg">
              <div class="spot-leg__badge spot-leg__badge--pol">起运</div>
              <div class="spot-leg__fields">
                <div class="spot-field spot-field--port">
                  <span class="spot-field__label">港口</span>
                  <PortSelect
                    v-model="polId"
                    allow-clear
                    class="spot-control w-full"
                    label-key="portNameEdi"
                    placeholder="起运港"
                    @change="handlePolChange"
                  />
                </div>
                <div class="spot-field spot-field--service">
                  <span class="spot-field__label">类型</span>
                  <Select
                    v-model:value="polServiceType"
                    allow-clear
                    class="spot-control w-full"
                    :options="SPOT_SERVICE_TYPE_OPTIONS"
                    placeholder="类型"
                  />
                </div>
              </div>
            </div>

            <div class="spot-search__connector">
              <span class="spot-search__rail" aria-hidden="true" />
              <button
                type="button"
                class="spot-search__swap"
                title="互换起运与目的"
                aria-label="互换起运港与目的港及运输类型"
                @click="swapRouteEnds"
              >
                <IconifyIcon icon="mdi:swap-horizontal" />
              </button>
              <span class="spot-search__rail" aria-hidden="true" />
            </div>

            <div class="spot-leg">
              <div class="spot-leg__badge spot-leg__badge--pod">目的</div>
              <div class="spot-leg__fields">
                <div class="spot-field spot-field--port">
                  <span class="spot-field__label">港口</span>
                  <PortSelect
                    v-model="podId"
                    allow-clear
                    class="spot-control w-full"
                    label-key="portNameEdi"
                    placeholder="目的港"
                    @change="handlePodChange"
                  />
                </div>
                <div class="spot-field spot-field--service">
                  <span class="spot-field__label">类型</span>
                  <Select
                    v-model:value="podServiceType"
                    allow-clear
                    class="spot-control w-full"
                    :options="SPOT_SERVICE_TYPE_OPTIONS"
                    placeholder="类型"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="spot-search__aside">
            <div class="spot-field spot-field--ctn">
              <span class="spot-field__label">箱型</span>
              <Select
                v-model:value="ctnCodeIds"
                allow-clear
                class="spot-control w-full"
                :loading="ctnOptionsLoading"
                max-tag-count="responsive"
                mode="multiple"
                option-filter-prop="label"
                :options="ctnOptions"
                placeholder="可多选箱型"
                show-search
                @change="handleCtnChange"
              />
            </div>
            <Button
              class="spot-query-btn"
              type="primary"
              :loading="loading"
              :disabled="loading || !canQuery"
              @click="handleQuery"
            >
              <IconifyIcon icon="mdi:magnify" class="spot-query-btn__icon" />
              查询运价
            </Button>
          </div>
        </div>
      </section>

      <section class="spot-panel spot-panel--result">
        <Spin :spinning="loading" tip="正在查询运价，最长约 2 分钟…">
          <div v-if="reuseTipText" class="spot-status">
            <Alert type="info" show-icon :message="reuseTipText" />
          </div>
          <div v-if="fails.length > 0" class="spot-status spot-status--stack">
            <Alert
              v-for="item in fails"
              :key="`${item.ctnName}-${item.errorMessage}`"
              type="warning"
              show-icon
              :message="`${item.ctnName}：${item.errorMessage}`"
            />
          </div>

          <div v-if="hasCards" class="spot-result-bar">
            <p class="spot-result-count">
              共
              <strong>{{ cards.length }}</strong>
              条运价方案
              <span v-if="polLabel || podLabel" class="spot-result-route">
                {{ polLabel || '起运港' }}
                <span aria-hidden="true">→</span>
                {{ podLabel || '目的港' }}
              </span>
            </p>
            <div class="spot-sort" role="tablist" aria-label="运价排序">
              <button
                v-for="opt in SPOT_SORT_OPTIONS"
                :key="opt.value"
                type="button"
                class="spot-sort__btn"
                :class="{ 'is-active': sortMode === opt.value }"
                role="tab"
                :aria-selected="sortMode === opt.value"
                @click="sortMode = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <div v-if="hasCards" class="spot-list">
            <article
              v-for="card in cards"
              :key="card.key"
              class="spot-card"
              :class="{ 'is-best': bestCardKey === card.key }"
            >
              <div class="spot-card__body">
                <div class="spot-card__carrier">
                  <div class="spot-card__logo" :title="card.carrierCode">
                    {{ card.carrierCode }}
                  </div>
                </div>

                <div class="spot-card__route">
                  <div class="spot-card__endpoint">
                    <span class="spot-card__when">
                      {{ formatSpotDate(card.etd) }}
                    </span>
                    <span class="spot-card__port">
                      {{ formatSpotPortLabel(polLabel) }}
                    </span>
                  </div>
                  <div class="spot-card__transit">
                    <div class="spot-card__transit-days">
                      {{ voyageDaysText(card) }}
                    </div>
                    <div class="spot-card__transit-line">
                      <span class="spot-card__transit-dot" />
                      <span class="spot-card__transit-rail" />
                      <span class="spot-card__transit-badge">
                        {{ card.isDirect ? '直达' : '中转' }}
                      </span>
                      <span class="spot-card__transit-rail" />
                      <span class="spot-card__transit-dot" />
                    </div>
                  </div>
                  <div class="spot-card__endpoint spot-card__endpoint--end">
                    <span class="spot-card__when">
                      {{ formatSpotDate(card.eta) }}
                    </span>
                    <span class="spot-card__port">
                      {{ formatSpotPortLabel(podLabel) }}
                    </span>
                  </div>
                </div>

                <div class="spot-card__prices">
                  <div
                    v-for="price in card.prices"
                    :key="`${price.ctnCodeId}-${price.ctnName}`"
                    class="spot-card__price-col"
                  >
                    <div class="spot-card__ctn">{{ price.ctnName }}</div>
                    <div class="spot-card__price-row">
                      <span class="spot-card__price-label">Base</span>
                      <span class="spot-card__price-base">
                        {{
                          formatSpotPrice(
                            price.freightAmount,
                            price.freightCurrency,
                          )
                        }}
                      </span>
                    </div>
                    <div class="spot-card__price-row">
                      <span class="spot-card__price-label">Total</span>
                      <span class="spot-card__price-total">
                        {{
                          formatSpotPrice(
                            price.totalAmount,
                            price.totalCurrency,
                          )
                        }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="spot-card__aside">
                  <div class="spot-card__source">
                    <span class="spot-card__source-label">
                      运价来源
                      <Tooltip title="第三方即时运价，以船司实时报价为准">
                        <IconifyIcon
                          icon="mdi:information-outline"
                          class="spot-card__source-icon"
                        />
                      </Tooltip>
                    </span>
                    <Tag class="spot-card__source-tag" color="processing">
                      船司直营
                    </Tag>
                  </div>
                  <Button
                    class="spot-card__fee-btn"
                    size="middle"
                    @click="openFeeDetail(card)"
                  >
                    费用明细
                  </Button>
                  <Tag v-if="card.isSoldOut" class="spot-tag spot-tag--muted">
                    售罄
                  </Tag>
                </div>
              </div>

              <footer class="spot-card__foot">
                <div class="spot-card__meta">
                  <span>航线代码: {{ card.routeCode }}</span>
                  <span class="spot-card__sep" aria-hidden="true">|</span>
                  <span>船名: {{ card.vessel }}</span>
                  <span class="spot-card__sep" aria-hidden="true">|</span>
                  <span>航次: {{ card.innerVoyno }}</span>
                  <span class="spot-card__sep" aria-hidden="true">|</span>
                  <span>运输条款: {{ serviceTermText }}</span>
                  <span class="spot-card__sep" aria-hidden="true">|</span>
                  <button
                    type="button"
                    class="spot-card__link"
                    @click="openFeeDetail(card, 'schedule')"
                  >
                    船期信息
                  </button>
                </div>
                <span
                  v-if="bestCardKey === card.key"
                  class="spot-card__best-tag"
                >
                  {{ bestBadgeText }}
                </span>
              </footer>
            </article>
          </div>

          <div v-else-if="!loading" class="spot-empty">
            <Empty :description="emptyDescription" />
          </div>
        </Spin>
      </section>
    </div>

    <FeeDetailDrawer
      ref="feeDrawerRef"
      :card="activeFeeCard"
      :pol-label="polLabel"
      :pod-label="podLabel"
      :service-term="serviceTermText"
      :best-badge="
        activeFeeCard && bestCardKey === activeFeeCard.key ? bestBadgeText : ''
      "
    />
  </Page>
</template>

<style scoped lang="scss">
.spot-shell {
  --spot-radius: 10px;
  --spot-radius-sm: 8px;
  --spot-gap-lg: 20px;
  --spot-ink: hsl(var(--foreground));
  --spot-muted: hsl(var(--muted-foreground));
  --spot-line: hsl(var(--border));
  --spot-fill: hsl(var(--muted) / 45%);
  --spot-surface: hsl(var(--card, var(--background)));
  --spot-accent: hsl(var(--primary));
  --spot-accent-soft: hsl(var(--primary) / 10%);
  --spot-shadow:
    0 1px 2px hsl(var(--foreground) / 4%),
    0 4px 12px hsl(var(--foreground) / 3%);
  --spot-shadow-hover:
    0 2px 4px hsl(var(--foreground) / 5%),
    0 8px 20px hsl(var(--foreground) / 5%);

  display: flex;
  flex-direction: column;
  gap: var(--spot-gap-lg);
  padding-bottom: 8px;
}

.spot-panel {
  padding: 20px 22px;
  background: var(--spot-surface);
  border: 1px solid var(--spot-line);
  border-radius: 12px;
  box-shadow: var(--spot-shadow);
}

.spot-panel--query {
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 6%) 0%,
    hsl(var(--primary) / 2.5%) 42%,
    #fff 100%
  );
  border-color: #e6ebf2;
}

.spot-panel__head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.spot-panel__title {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
  line-height: 1.3;
  color: #0f172a;
  letter-spacing: 0.01em;
}

.spot-panel__desc {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: #64748b;
}

.spot-search {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: stretch;
}

.spot-search__route {
  display: grid;
  flex: 1 1 560px;
  grid-template-columns: minmax(0, 1fr) 56px minmax(0, 1fr);
  gap: 0;
  align-items: stretch;
  min-width: 0;
  background: #f7f9fc;
  border: 1px solid #e8edf3;
  border-radius: 12px;
}

.spot-leg {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 12px 14px;
}

.spot-leg__badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  height: 22px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  border-radius: 999px;
}

.spot-leg__badge--pol {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
}

.spot-leg__badge--pod {
  color: #334155;
  background: #e2e8f0;
}

.spot-leg__fields {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  min-width: 0;
}

.spot-search__connector {
  display: flex;
  flex-direction: column;
  gap: 0;
  align-items: center;
  justify-content: center;
  padding: 28px 0 8px;
}

.spot-search__rail {
  flex: 1;
  width: 0;
  min-height: 8px;
  border-left: 1px dashed #cbd5e1;
}

.spot-search__swap {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 16px;
  color: #64748b;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  box-shadow: 0 1px 2px hsl(var(--foreground) / 4%);
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;

  &:hover {
    color: hsl(var(--primary));
    background: hsl(var(--primary) / 8%);
    border-color: hsl(var(--primary) / 35%);
    box-shadow: 0 2px 8px hsl(var(--primary) / 16%);
  }

  &:active {
    transform: scale(0.94);
  }
}

.spot-search__aside {
  display: flex;
  flex: 1 1 280px;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-end;
  min-width: 240px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #e8edf3;
  border-radius: 12px;
}

.spot-field {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.spot-field--port {
  flex: 1 1 auto;
  min-width: 120px;
}

.spot-field--service {
  flex: 0 0 108px;
  width: 108px;
}

.spot-field--ctn {
  flex: 1 1 180px;
  min-width: 160px;
}

.spot-field__label {
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  color: #94a3b8;
}

.spot-query-btn {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  min-width: 112px;
  height: 36px;
  padding-inline: 16px;
  font-weight: 600;
  border-radius: 8px;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    opacity 0.15s ease;

  &:not(:disabled):hover {
    box-shadow: 0 6px 16px hsl(var(--primary) / 28%);
    transform: translateY(-1px);
  }

  &:not(:disabled):active {
    transform: translateY(0);
  }
}

.spot-query-btn__icon {
  font-size: 16px;
}

:deep(.spot-control.ant-select),
:deep(.spot-control .ant-select-selector) {
  border-radius: 8px !important;
}

.spot-status {
  margin-bottom: 14px;
}

.spot-status--stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.spot-result-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 14px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--spot-line);
}

.spot-result-count {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--spot-muted);

  strong {
    margin: 0 2px;
    font-size: 15px;
    font-weight: 650;
    color: var(--spot-ink);
  }
}

.spot-result-route {
  margin-left: 8px;
  color: var(--spot-muted);

  span {
    margin: 0 4px;
  }
}

.spot-sort {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 3px;
  background: var(--spot-fill);
  border: 1px solid var(--spot-line);
  border-radius: var(--spot-radius-sm);
}

.spot-sort__btn {
  height: 30px;
  padding: 0 12px;
  font-size: 13px;
  line-height: 1;
  color: var(--spot-muted);
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  transition:
    color 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;

  &:hover:not(.is-active) {
    color: var(--spot-ink);
    background: hsl(var(--background) / 70%);
  }

  &.is-active {
    color: var(--spot-ink);
    background: var(--spot-surface);
    border-color: var(--spot-line);
    box-shadow: 0 1px 2px hsl(var(--foreground) / 6%);
  }
}

.spot-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.spot-card {
  position: relative;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e8ecf1;
  border-radius: 10px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover,
  &.is-best {
    border-color: hsl(var(--primary) / 45%);
    box-shadow: 0 2px 12px hsl(var(--primary) / 10%);
  }
}

.spot-card__body {
  display: grid;
  grid-template-columns: 72px minmax(260px, 1.35fr) minmax(220px, 1fr) minmax(
      140px,
      180px
    );
  gap: 12px 16px;
  align-items: center;
  padding: 16px 18px 12px;
}

.spot-card__carrier {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spot-card__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  overflow: hidden;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.1;
  color: #0f172a;
  text-align: center;
  letter-spacing: 0.02em;
  word-break: break-all;
  background: linear-gradient(145deg, #f8fafc, #eef2f7);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.spot-card__route {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 8px 10px;
  align-items: center;
  min-width: 0;
}

.spot-card__endpoint {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: baseline;
  min-width: 0;
}

.spot-card__endpoint--end {
  justify-content: flex-end;
  text-align: right;
}

.spot-card__when {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  color: #64748b;
  white-space: nowrap;
}

.spot-card__port {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
  color: #0f172a;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.spot-card__transit {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  min-width: 88px;
  padding: 0 4px;
}

.spot-card__transit-days {
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  color: #64748b;
}

.spot-card__transit-line {
  display: flex;
  gap: 0;
  align-items: center;
  width: 100%;
  min-width: 96px;
}

.spot-card__transit-dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  background: #94a3b8;
  border-radius: 50%;
}

.spot-card__transit-rail {
  flex: 1;
  height: 0;
  border-top: 1px dashed #cbd5e1;
}

.spot-card__transit-badge {
  flex-shrink: 0;
  padding: 0 8px;
  margin: 0 2px;
  font-size: 11px;
  font-weight: 500;
  line-height: 18px;
  color: #475569;
  white-space: nowrap;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
}

.spot-card__prices {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 18px;
  justify-content: flex-end;
}

.spot-card__price-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 88px;
}

.spot-card__ctn {
  margin-bottom: 2px;
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  text-align: right;
}

.spot-card__price-row {
  display: flex;
  gap: 8px;
  align-items: baseline;
  justify-content: flex-end;
}

.spot-card__price-label {
  font-size: 11px;
  color: #94a3b8;
}

.spot-card__price-base {
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #e11d48;
}

.spot-card__price-total {
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  color: #e11d48;
}

.spot-card__aside {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
}

.spot-card__source {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}

.spot-card__source-label {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  color: #94a3b8;
}

.spot-card__source-icon {
  font-size: 14px;
  color: #94a3b8;
  cursor: help;
}

.spot-card__source-tag {
  margin: 0;
  font-size: 12px;
  line-height: 22px;
  border-radius: 4px;
}

.spot-card__fee-btn {
  min-width: 96px;
  border-radius: 6px;
}

.spot-tag--muted {
  margin: 0;
  color: #64748b !important;
  background: #f1f5f9 !important;
  border: 1px solid #e2e8f0 !important;
}

.spot-card__foot {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px 12px;
  background: #fafbfc;
  border-top: 1px solid #eef1f5;
}

.spot-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 0;
  align-items: center;
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
}

.spot-card__sep {
  margin: 0 8px;
  color: #cbd5e1;
}

.spot-card__link {
  padding: 0;
  font-size: 12px;
  color: hsl(var(--primary));
  cursor: pointer;
  background: none;
  border: 0;

  &:hover {
    text-decoration: underline;
  }
}

.spot-card__best-tag {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  color: #e11d48;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 4px;
}

.spot-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  padding: 24px 12px;
}

@media (max-width: 1100px) {
  .spot-card__body {
    grid-template-columns: 64px 1fr;
  }

  .spot-card__prices,
  .spot-card__aside {
    grid-column: 1 / -1;
  }

  .spot-card__prices {
    justify-content: flex-start;
  }

  .spot-card__aside {
    flex-flow: row wrap;
    align-items: center;
    justify-content: space-between;
  }
}

@media (max-width: 960px) {
  .spot-search__route {
    flex: 1 1 100%;
    grid-template-columns: 1fr;
  }

  .spot-search__connector {
    flex-direction: row;
    padding: 0 14px;
  }

  .spot-search__rail {
    flex: 1;
    width: auto;
    height: 0;
    border-top: 1px dashed #cbd5e1;
    border-left-style: none;
  }

  .spot-search__aside {
    flex: 1 1 100%;
  }

  .spot-query-btn {
    width: 100%;
  }

  .spot-result-bar {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .spot-card__route {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .spot-card__endpoint--end {
    justify-content: flex-start;
    text-align: left;
  }

  .spot-card__transit {
    align-items: flex-start;
  }
}
</style>

<style lang="scss">
.spot-page {
  background: #f3f5f8;
}
</style>
