<script lang="ts" setup>
import type { SpotCard, SpotCardPrice, SpotSortMode } from './data';

import { computed, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Alert, Button, Empty, message, Spin, Tag } from 'ant-design-vue';

import { CtnSelect, PortSelect } from '#/adapter/component/biz-select';
import { spotQueryAsync } from '#/api/rong-e-tong/rong-e-tong-admin';

import {
  buildSpotViewModel,
  formatMoney,
  formatSpotDate,
  pickBestCardKey,
  sortSpotCards,
  SPOT_SORT_OPTIONS,
} from './data';
import FeeDetailDrawer from './modules/fee-detail-drawer.vue';

defineOptions({ name: 'SpotFreightQuery' });

const loading = ref(false);
const searched = ref(false);
/** 港口/箱型雪花 ID 一律字符串，禁止 Number() 以免精度丢失与下拉 label 对不上 */
const polId = ref<null | string>(null);
const podId = ref<null | string>(null);
const ctnCodeIds = ref<string[]>([]);
const polLabel = ref('');
const podLabel = ref('');
const sortMode = ref<SpotSortMode>('lowestPrice');

const rawResults = ref<ReturnType<typeof buildSpotViewModel> | null>(null);
const feeDrawerRef = ref<InstanceType<typeof FeeDetailDrawer>>();
const activeFeePrice = ref<null | SpotCardPrice>(null);

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
    Boolean(polId.value) && Boolean(podId.value) && ctnCodeIds.value.length > 0,
);

const bestBadgeText = computed(() => {
  if (sortMode.value === 'lowestPrice') return '运价最低';
  if (sortMode.value === 'earliestEtd') return '最早开船';
  return '航程最短';
});

const emptyDescription = computed(() => {
  if (!searched.value) return '请选择起运港、目的港和箱型后查询';
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

function handlePolChange(value: unknown, option: any) {
  polId.value = normalizeId(value);
  polLabel.value = polId.value ? resolvePortLabel(option) : '';
}

function handlePodChange(value: unknown, option: any) {
  podId.value = normalizeId(value);
  podLabel.value = podId.value ? resolvePortLabel(option) : '';
}

function handleCtnChange(value: unknown) {
  ctnCodeIds.value = normalizeIdList(value);
}

async function handleQuery() {
  if (loading.value) return;
  if (!canQuery.value) {
    message.warning('请选择起运港、目的港和至少一个箱型');
    return;
  }

  loading.value = true;
  try {
    const data = await spotQueryAsync({
      polId: polId.value!,
      podId: podId.value!,
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

function openFeeDetail(price: SpotCardPrice) {
  activeFeePrice.value = price;
  feeDrawerRef.value?.open();
}

function voyageText(card: SpotCard): string {
  const days =
    typeof card.voyage === 'number' && Number.isFinite(card.voyage)
      ? `${card.voyage}天`
      : '-';
  return `${days} · ${card.isDirect ? '直达' : '中转'}`;
}
</script>

<template>
  <Page content-class="spot-page">
    <div class="spot-shell">
      <section class="spot-panel spot-panel--query">
        <div class="spot-panel__head">
          <h1 class="spot-panel__title">即时运价</h1>
          <p class="spot-panel__desc">
            按起运港、目的港与箱型查询各船司即时运价
          </p>
        </div>

        <div class="spot-toolbar">
          <div class="spot-port-pair">
            <div class="spot-field">
              <span class="spot-field__label">起运港</span>
              <PortSelect
                v-model="polId"
                allow-clear
                class="w-full"
                label-key="portNameEdi"
                placeholder="请选择起运港"
                @change="handlePolChange"
              />
            </div>
            <span class="spot-port-pair__arrow" aria-hidden="true">→</span>
            <div class="spot-field">
              <span class="spot-field__label">目的港</span>
              <PortSelect
                v-model="podId"
                allow-clear
                class="w-full"
                label-key="portNameEdi"
                placeholder="请选择目的港"
                @change="handlePodChange"
              />
            </div>
          </div>

          <div class="spot-field spot-field--ctn">
            <span class="spot-field__label">箱型</span>
            <CtnSelect
              v-model="ctnCodeIds"
              allow-clear
              class="w-full"
              mode="multiple"
              placeholder="请选择箱型（可多选）"
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
            查询运价
          </Button>
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
              <div class="spot-card__main">
                <div class="spot-card__carrier">
                  <div class="spot-card__carrier-code">
                    {{ card.carrierCode }}
                  </div>
                  <div class="spot-card__tags">
                    <Tag v-if="card.isSoldOut" class="spot-tag spot-tag--muted">
                      售罄
                    </Tag>
                    <span v-if="bestCardKey === card.key" class="spot-badge">
                      {{ bestBadgeText }}
                    </span>
                  </div>
                </div>

                <div class="spot-card__schedule">
                  <div class="spot-card__port-time">
                    <div class="spot-card__date">
                      {{ formatSpotDate(card.etd) }}
                    </div>
                    <div class="spot-card__port">
                      {{ polLabel || '起运港' }}
                    </div>
                  </div>
                  <div class="spot-card__voyage">
                    <div class="spot-card__voyage-line" />
                    <div class="spot-card__voyage-text">
                      {{ voyageText(card) }}
                    </div>
                  </div>
                  <div class="spot-card__port-time spot-card__port-time--end">
                    <div class="spot-card__date">
                      {{ formatSpotDate(card.eta) }}
                    </div>
                    <div class="spot-card__port">
                      {{ podLabel || '目的港' }}
                    </div>
                  </div>
                </div>

                <div class="spot-card__prices">
                  <button
                    v-for="price in card.prices"
                    :key="`${price.ctnCodeId}-${price.ctnName}`"
                    type="button"
                    class="spot-card__price"
                    @click="openFeeDetail(price)"
                  >
                    <div class="spot-card__ctn">{{ price.ctnName }}</div>
                    <div class="spot-card__amount">
                      {{
                        formatMoney(price.freightAmount, price.freightCurrency)
                      }}
                    </div>
                    <div class="spot-card__total">
                      Total
                      {{ formatMoney(price.totalAmount, price.totalCurrency) }}
                    </div>
                    <span class="spot-card__fee-link">费用明细</span>
                  </button>
                </div>
              </div>

              <div class="spot-card__meta">
                <span>航线代码 {{ card.routeCode }}</span>
                <span class="spot-card__dot" aria-hidden="true" />
                <span>船名 {{ card.vessel }}</span>
                <span class="spot-card__dot" aria-hidden="true" />
                <span>航次 {{ card.innerVoyno }}</span>
                <span class="spot-card__dot" aria-hidden="true" />
                <span>运输条款 CY-CY</span>
              </div>
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
      :price="activeFeePrice"
      :pol-label="polLabel"
      :pod-label="podLabel"
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
  padding: 18px 20px;
  background: var(--spot-surface);
  border: 1px solid var(--spot-line);
  border-radius: 12px;
  box-shadow: var(--spot-shadow);
}

.spot-panel--query {
  background: linear-gradient(
    180deg,
    hsl(var(--primary) / 4%) 0%,
    var(--spot-surface) 48%
  );
}

.spot-panel__head {
  margin-bottom: 14px;
}

.spot-panel__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--spot-ink);
  letter-spacing: 0.01em;
}

.spot-panel__desc {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--spot-muted);
}

.spot-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
}

.spot-port-pair {
  display: flex;
  flex: 1 1 420px;
  gap: 10px;
  align-items: flex-end;
  min-width: 280px;
  max-width: 640px;
  padding: 10px 12px;
  background: var(--spot-fill);
  border: 1px solid var(--spot-line);
  border-radius: var(--spot-radius);
}

.spot-port-pair__arrow {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 32px;
  margin-bottom: 1px;
  font-size: 14px;
  color: var(--spot-muted);
}

.spot-field {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.spot-field--ctn {
  flex: 1 1 240px;
  min-width: 200px;
  max-width: 420px;
}

.spot-field__label {
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  color: var(--spot-muted);
}

.spot-query-btn {
  min-width: 104px;
  height: 36px;
  margin-bottom: 1px;
  border-radius: var(--spot-radius-sm);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    opacity 0.15s ease;

  &:not(:disabled):hover {
    box-shadow: 0 4px 12px hsl(var(--primary) / 22%);
    transform: translateY(-1px);
  }

  &:not(:disabled):active {
    transform: translateY(0);
  }
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
  padding: 16px 18px 12px;
  background: var(--spot-surface);
  border: 1px solid var(--spot-line);
  border-radius: var(--spot-radius);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: hsl(var(--primary) / 28%);
    box-shadow: var(--spot-shadow-hover);
    transform: translateY(-1px);
  }

  &.is-best {
    background: linear-gradient(
      180deg,
      var(--spot-accent-soft) 0%,
      var(--spot-surface) 42%
    );
    border-color: hsl(var(--primary) / 35%);
  }
}

.spot-card__main {
  display: grid;
  grid-template-columns: 112px minmax(220px, 1.25fr) minmax(220px, 1fr);
  gap: 16px 18px;
  align-items: center;
}

.spot-card__carrier {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.spot-card__carrier-code {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--spot-ink);
  letter-spacing: 0.03em;
}

.spot-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.spot-tag--muted {
  margin: 0;
  color: var(--spot-muted) !important;
  background: var(--spot-fill) !important;
  border: 1px solid var(--spot-line) !important;
}

.spot-badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  color: var(--spot-accent);
  background: var(--spot-accent-soft);
  border: 1px solid hsl(var(--primary) / 18%);
  border-radius: 999px;
}

.spot-card__schedule {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 10px;
  align-items: center;
}

.spot-card__port-time--end {
  text-align: right;
}

.spot-card__date {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--spot-ink);
}

.spot-card__port {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--spot-muted);
  overflow-wrap: anywhere;
}

.spot-card__voyage {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  min-width: 92px;
}

.spot-card__voyage-line {
  width: 56px;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    hsl(var(--primary) / 45%),
    transparent
  );
  border-radius: 999px;
}

.spot-card__voyage-text {
  font-size: 12px;
  line-height: 1;
  color: var(--spot-muted);
  white-space: nowrap;
}

.spot-card__prices {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.spot-card__price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 112px;
  padding: 8px 10px;
  text-align: right;
  cursor: pointer;
  background: var(--spot-fill);
  border: 1px solid transparent;
  border-radius: var(--spot-radius-sm);
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;

  &:hover {
    background: hsl(var(--primary) / 6%);
    border-color: hsl(var(--primary) / 22%);
    box-shadow: 0 2px 8px hsl(var(--foreground) / 4%);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

.spot-card__ctn {
  font-size: 12px;
  font-weight: 500;
  color: var(--spot-muted);
}

.spot-card__amount {
  margin-top: 4px;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--spot-ink);
  letter-spacing: 0.01em;
}

.spot-card__total {
  margin-top: 3px;
  font-size: 12px;
  color: var(--spot-muted);
}

.spot-card__fee-link {
  margin-top: 6px;
  font-size: 12px;
  color: var(--spot-accent);
  opacity: 0.85;
  transition: opacity 0.15s ease;

  .spot-card__price:hover & {
    opacity: 1;
  }
}

.spot-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 4px;
  align-items: center;
  padding-top: 12px;
  margin-top: 14px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--spot-muted);
  border-top: 1px solid hsl(var(--border) / 80%);
}

.spot-card__dot {
  width: 3px;
  height: 3px;
  margin: 0 6px;
  background: hsl(var(--muted-foreground) / 45%);
  border-radius: 50%;
}

.spot-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  padding: 24px 12px;
}

@media (max-width: 960px) {
  .spot-port-pair,
  .spot-field--ctn,
  .spot-query-btn {
    flex: 1 1 100%;
    width: 100%;
    max-width: none;
  }

  .spot-result-bar {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .spot-card__main {
    grid-template-columns: 1fr;
  }

  .spot-card__prices {
    justify-content: flex-start;
  }

  .spot-card__price {
    align-items: flex-start;
    text-align: left;
  }
}
</style>

<style lang="scss">
.spot-page {
  background: hsl(var(--muted) / 28%);
}
</style>
