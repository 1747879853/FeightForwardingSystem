<script lang="ts" setup>
import type { LoadingOrderAdminApi } from '#/api/sea-export/loading-order-admin';

import type { LoadingShareLang } from './share-text';

import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Empty, Image, Spin } from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  getLoadingOrderPublicDetail,
  LoadingOrderStatus,
} from '#/api/sea-export/loading-order-admin';
import { buildAttachmentUrl } from '#/utils';
import { brandLogo, brandLogoText } from '#/utils/brand-assets';

import { getLoadingShareText } from './share-text';

defineOptions({ name: 'LoadingOrderSharePage' });

const props = withDefaults(
  defineProps<{
    embedded?: boolean;
    lang?: LoadingShareLang;
    loadingOrderNum?: string;
    mblNum?: string;
  }>(),
  {
    embedded: false,
    lang: undefined,
    loadingOrderNum: '',
    mblNum: '',
  },
);

const EMPTY = '—';

const route = useRoute();
const loading = ref(false);
const detail = ref<LoadingOrderAdminApi.LoadingOrderDetailDto | null>(null);
const errorText = ref('');
const previewOpen = ref(false);
const previewUrls = ref<string[]>([]);
const previewIndex = ref(0);

const headerLogo = brandLogoText || brandLogo;
const companyName = (import.meta.env.VITE_APP_TITLE as string) || '';

function readQuery(key: string): string {
  if (props.embedded) return '';
  const raw = Array.isArray(route.query[key])
    ? route.query[key]?.[0]
    : route.query[key];
  return typeof raw === 'string' ? raw.trim() : '';
}

const shareLang = computed<LoadingShareLang>(() => {
  if (props.lang === 'en' || props.lang === 'zh') return props.lang;
  return readQuery('lang') === 'en' ? 'en' : 'zh';
});

const t = computed(() => getLoadingShareText(shareLang.value));

function textOr(value?: null | number | string) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return EMPTY;
  }
  return String(value);
}

function formatDateTime(value?: null | string) {
  if (!value) return EMPTY;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm') : EMPTY;
}

function ctnTypeName(
  ctnCode?: LoadingOrderAdminApi.LoadingOrderCtnDto['ctnCode'],
) {
  return ctnCode?.ctnName || ctnCode?.name || EMPTY;
}

function extractAbpMessage(error: unknown) {
  const payload =
    (error as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data ??
    (error as { data?: { error?: { message?: string } } })?.data;
  const message = payload?.error?.message?.trim();
  if (message) return message;
  if (error instanceof Error && error.message) return error.message;
  return t.value.queryError;
}

const mblNum = computed(() => props.mblNum.trim() || readQuery('mblNum'));
const loadingOrderNum = computed(
  () => props.loadingOrderNum.trim() || readQuery('loadingOrderNum'),
);
const hasQuery = computed(
  () => Boolean(mblNum.value) && Boolean(loadingOrderNum.value),
);

const sea = computed(() => detail.value?.seaExport);
const statusLabel = computed(() => {
  const status = detail.value?.status;
  if (status == null) return '';
  return t.value.status[status] ?? '';
});

const vesselVoyage = computed(() => {
  const parts = [sea.value?.vessel, sea.value?.innerVoyno].filter(Boolean);
  return parts.length > 0 ? parts.join(' / ') : EMPTY;
});

const goodsText = computed(() => {
  const names = (sea.value?.codeGoodss ?? [])
    .map((item) => item.name)
    .filter(Boolean);
  return names.length > 0 ? names.join(t.value.listJoin) : EMPTY;
});

const ctnQtyText = computed(() => {
  const rows = detail.value?.orderCtns ?? [];
  if (rows.length === 0) return EMPTY;
  const counts = new Map<string, number>();
  for (const row of rows) {
    const name = ctnTypeName(row.ctnCode);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => `${name} × ${count}`)
    .join(' ');
});

const supervisorText = computed(() => {
  const names = (detail.value?.loadingOrderUsers ?? [])
    .map((item) => {
      if (shareLang.value === 'en') {
        return item.user?.enName || item.user?.nickName;
      }
      return item.user?.nickName || item.user?.enName;
    })
    .filter(Boolean);
  return names.length > 0 ? names.join(t.value.listJoin) : EMPTY;
});

const completedCount = computed(
  () =>
    detail.value?.orderCtns?.filter((ctn) => ctn.isLoadingCompleted).length ??
    0,
);

const basicRows = computed(() => {
  const item = detail.value;
  if (!item) return [];
  const labels = t.value.fields;
  return [
    { label: labels.vesselVoyage, value: vesselVoyage.value },
    { label: labels.ctnQty, value: ctnQtyText.value },
    { label: labels.goods, value: goodsText.value },
    {
      label: labels.kgs,
      value: sea.value?.kgs == null ? EMPTY : t.value.kg(sea.value.kgs),
    },
    { label: labels.pkgs, value: textOr(sea.value?.pkgs) },
    { label: labels.package, value: textOr(sea.value?.codePackage?.name) },
    { label: labels.packageItem, value: textOr(item.codePackageItem?.name) },
    { label: labels.packageItemQty, value: textOr(item.pkgs) },
    { label: labels.eta, value: formatDateTime(item.estimatedArrivalTime) },
    { label: labels.yard, value: textOr(item.carrierYard?.name) },
    { label: labels.supervisors, value: supervisorText.value },
  ];
});

function collectCtnPhotos(ctn: LoadingOrderAdminApi.LoadingOrderCtnDto) {
  return (ctn.attachmentGroups ?? []).flatMap((group) =>
    (group.items ?? [])
      .map((item) => buildAttachmentUrl(item.url))
      .filter(Boolean),
  );
}

function photoGroupTypeName(
  group: NonNullable<
    LoadingOrderAdminApi.LoadingOrderCtnDto['attachmentGroups']
  >[number],
) {
  return (
    group.attachmentDtlType?.name ||
    group.attachmentDtlType?.typeName ||
    t.value.photoFallback
  );
}

function visiblePhotoSlots(ctn: LoadingOrderAdminApi.LoadingOrderCtnDto) {
  return (ctn.attachmentGroups ?? []).flatMap((group, groupIndex) => {
    const typeName = photoGroupTypeName(group);
    const typeId = String(
      group.attachmentDtlTypeId ?? group.attachmentDtlType?.id ?? groupIndex,
    );
    return (group.items ?? [])
      .filter((item) => Boolean(item.url))
      .map((item, photoIndex) => ({
        key: `${typeId}-${String(item.id ?? item.attachmentId ?? photoIndex)}`,
        typeName,
        url: buildAttachmentUrl(item.url),
        alt: item.friendlyFileName || typeName,
      }));
  });
}

function openPreview(
  ctn: LoadingOrderAdminApi.LoadingOrderCtnDto,
  url: string,
) {
  const urls = collectCtnPhotos(ctn);
  previewUrls.value = urls;
  previewIndex.value = Math.max(urls.indexOf(url), 0);
  previewOpen.value = true;
}

function onPreviewVisibleChange(visible: boolean) {
  previewOpen.value = visible;
}

async function loadDetail() {
  if (!hasQuery.value) {
    detail.value = null;
    errorText.value = '';
    return;
  }

  loading.value = true;
  errorText.value = '';
  try {
    detail.value = await getLoadingOrderPublicDetail({
      mblNum: mblNum.value,
      loadingOrderNum: loadingOrderNum.value,
    });
  } catch (error) {
    detail.value = null;
    errorText.value = extractAbpMessage(error);
  } finally {
    loading.value = false;
  }
}

watch(
  () => [mblNum.value, loadingOrderNum.value],
  () => {
    void loadDetail();
  },
  { immediate: true },
);

watch(
  () => t.value.title,
  (title) => {
    if (!props.embedded) document.title = title;
  },
  { immediate: true },
);
</script>

<template>
  <div class="loading-share">
    <header class="loading-share__header">
      <div class="loading-share__brand">
        <img
          v-if="headerLogo"
          :alt="companyName || 'logo'"
          class="loading-share__logo"
          :src="headerLogo"
        />
        <span v-else class="loading-share__company">{{ companyName }}</span>
      </div>
      <span class="loading-share__title">{{ t.title }}</span>
    </header>

    <main class="loading-share__body">
      <Spin :spinning="loading">
        <div v-if="!detail" class="loading-share__empty">
          <Empty :description="loading ? t.loading : errorText || t.needLink" />
        </div>

        <template v-else>
          <section
            class="loading-share__overview"
            aria-labelledby="share-heading"
          >
            <div>
              <div class="loading-share__eyebrow">{{ t.eyebrow }}</div>
              <h1 id="share-heading">{{ textOr(sea?.mblNum) }}</h1>
              <p class="loading-share__order">
                {{ t.mblNum }}
                <span
                  >{{ t.loadingOrder }}
                  {{ textOr(detail.loadingOrderNum) }}</span
                >
              </p>
            </div>
            <span
              v-if="statusLabel"
              class="loading-share__status"
              :class="{
                'is-done': detail.status === LoadingOrderStatus.Completed,
                'is-pending': detail.status === LoadingOrderStatus.Pending,
                'is-active': detail.status === LoadingOrderStatus.Claimed,
              }"
              ><span class="loading-share__status-dot" />{{ statusLabel }}</span
            >
          </section>
          <section class="loading-share__card">
            <div class="loading-share__card-head">
              <span class="loading-share__section-number">01</span>
              <h2>{{ t.basicInfo }}</h2>
            </div>
            <dl class="loading-share__rows">
              <div
                v-for="row in basicRows"
                :key="row.label"
                class="loading-share__row"
              >
                <dt>{{ row.label }}</dt>
                <dd>{{ row.value }}</dd>
              </div>
            </dl>
          </section>

          <section class="loading-share__card">
            <div class="loading-share__card-head">
              <span class="loading-share__section-number">02</span>
              <h2>{{ t.containers }}</h2>
              <span class="loading-share__count">
                {{
                  t.completedCount(
                    completedCount,
                    detail.orderCtns?.length ?? 0,
                  )
                }}
              </span>
            </div>

            <div v-if="!detail.orderCtns?.length" class="loading-share__hint">
              {{ t.noContainers }}
            </div>

            <article
              v-for="(ctn, index) in detail.orderCtns"
              :key="String(ctn.id)"
              class="loading-share__ctn"
            >
              <div class="loading-share__ctn-head">
                <div class="loading-share__ctn-identity">
                  <span class="loading-share__ctn-index">{{
                    String(index + 1).padStart(2, '0')
                  }}</span
                  ><strong>{{ ctnTypeName(ctn.ctnCode) }}</strong>
                </div>
                <span
                  class="loading-share__ctn-status"
                  :class="ctn.isLoadingCompleted ? 'is-done' : 'is-pending'"
                >
                  {{ ctn.isLoadingCompleted ? t.done : t.pending }}
                </span>
              </div>
              <div class="loading-share__ctn-meta">
                <div>
                  <span>{{ t.ctnNo }}</span
                  ><strong>{{ textOr(ctn.ctnNo) }}</strong>
                </div>
                <div>
                  <span>{{ t.sealNo }}</span
                  ><strong>{{ textOr(ctn.sealNo) }}</strong>
                </div>
              </div>

              <div
                v-if="!visiblePhotoSlots(ctn).length"
                class="loading-share__photo-empty"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <circle cx="8" cy="9" r="1.5" />
                  <path d="m3 17 5-5 4 4 3-3 6 6" />
                </svg>
                <span>{{ t.noPhotos }}</span
                ><span>{{ t.noPhotosHint }}</span>
              </div>
              <div v-else class="loading-share__photo-grid">
                <div
                  v-for="slot in visiblePhotoSlots(ctn)"
                  :key="slot.key"
                  class="loading-share__photo-slot"
                >
                  <div class="loading-share__photo-label">
                    {{ slot.typeName }}
                  </div>
                  <button
                    type="button"
                    class="loading-share__photo"
                    @click="openPreview(ctn, slot.url)"
                  >
                    <img loading="lazy" :alt="slot.alt" :src="slot.url" />
                  </button>
                </div>
              </div>
            </article>
          </section>
        </template>
      </Spin>
    </main>

    <footer class="loading-share__footer">
      {{ t.footer(companyName) }}
    </footer>

    <div class="loading-share__preview-host">
      <Image.PreviewGroup
        :preview="{
          visible: previewOpen,
          current: previewIndex,
          onVisibleChange: onPreviewVisibleChange,
        }"
      >
        <Image
          v-for="(url, index) in previewUrls"
          :key="`${url}-${index}`"
          :src="url"
        />
      </Image.PreviewGroup>
    </div>
  </div>
</template>

<style scoped>
.loading-share {
  height: 100%;
  min-height: 100%;
  overflow: auto;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #24344a;
  background: #f2f5f9;
  -webkit-font-smoothing: antialiased;
}

.loading-share__header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  gap: 24px;
  align-items: center;
  min-height: 72px;
  padding: 12px max(24px, calc((100% - 1080px) / 2));
  background: #fff;
  border-bottom: 1px solid #e3e9f0;
}

.loading-share__brand {
  display: flex;
  align-items: center;
}

.loading-share__logo {
  width: auto;
  max-width: 180px;
  height: 34px;
  object-fit: contain;
}

.loading-share__company {
  font-size: 20px;
  font-weight: 700;
}

.loading-share__title {
  padding-left: 24px;
  font-size: 14px;
  color: #5d6c80;
  border-left: 1px solid #dce3ec;
}

.loading-share__body {
  box-sizing: border-box;
  width: 100%;
  max-width: 1128px;
  padding: 0 24px;
  margin: 0 auto;
}

.loading-share__overview {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  padding: 34px 0 28px;
}

.loading-share__eyebrow {
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 500;
  color: #6b7b90;
  letter-spacing: 1px;
}

.loading-share__overview h1 {
  margin: 0;
  font-size: clamp(26px, 4vw, 34px);
  font-weight: 650;
  line-height: 1.3;
  letter-spacing: 0.5px;
  overflow-wrap: anywhere;
}

.loading-share__order {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin: 10px 0 0;
  font-size: 12px;
  color: #6b7b90;
}

.loading-share__order span {
  color: #43556d;
}

.loading-share__status,
.loading-share__ctn-status {
  display: inline-flex;
  flex-shrink: 0;
  gap: 7px;
  align-items: center;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #53647a;
  background: #e6ebf1;
  border-radius: 6px;
}

.loading-share__status-dot {
  width: 6px;
  height: 6px;
  background: currentcolor;
  border-radius: 50%;
}

.loading-share .is-done,
.loading-share .is-active {
  color: #2160b7;
  background: #eaf2ff;
}

.loading-share .is-pending {
  color: #9a5d16;
  background: #fff3df;
}

.loading-share__card {
  margin-bottom: 22px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e1e7ef;
  border-radius: 12px;
}

.loading-share__card-head {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 19px 24px;
  border-bottom: 1px solid #e8edf3;
}

.loading-share__section-number {
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #8292a8;
}

.loading-share__card-head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #24344a;
}

.loading-share__count {
  margin-left: auto;
  font-size: 12px;
  color: #6b7b90;
}

.loading-share__rows {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 26px 32px;
  padding: 24px;
  margin: 0;
}

.loading-share__row {
  min-width: 0;
}

.loading-share__row dt {
  margin-bottom: 8px;
  font-size: 12px;
  color: #738096;
}

.loading-share__row dd {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.6;
  color: #283b53;
  overflow-wrap: anywhere;
}

.loading-share__ctn {
  padding: 22px 24px 24px;
  border-top: 1px solid #e8edf3;
}

.loading-share__ctn:first-of-type {
  border-top: 0;
}

.loading-share__ctn-head {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.loading-share__ctn-identity {
  display: flex;
  gap: 12px;
  align-items: center;
}

.loading-share__ctn-index {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  font-size: 12px;
  color: #647892;
  background: #f0f4f9;
  border-radius: 5px;
}

.loading-share__ctn-head strong {
  font-size: 17px;
  font-weight: 600;
}

.loading-share__ctn-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  max-width: 540px;
  margin: 20px 0;
}

.loading-share__ctn-meta div {
  display: flex;
  gap: 16px;
  align-items: baseline;
  font-size: 13px;
}

.loading-share__ctn-meta span {
  flex-shrink: 0;
  color: #738096;
}

.loading-share__ctn-meta strong {
  font-weight: 500;
  overflow-wrap: anywhere;
}

.loading-share__photo-empty {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 18px;
  font-size: 12px;
  color: #758397;
  background: #f7f9fc;
  border: 1px dashed #dce4ee;
  border-radius: 7px;
}

.loading-share__photo-empty svg {
  width: 20px;
  height: 20px;
}

.loading-share__photo-empty span:first-of-type {
  color: #52657e;
}

.loading-share__photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 104px);
  gap: 14px 16px;
  justify-content: start;
  margin-top: 20px;
}

.loading-share__photo-slot {
  width: 104px;
  min-width: 0;
}

.loading-share__photo-label {
  height: 22px;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  font-weight: 400;
  line-height: 22px;
  color: #5d6c80;
  white-space: nowrap;
}

.loading-share__photo {
  display: block;
  width: 104px;
  height: 104px;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  background: #f5f7fa;
  border: 0;
  border-radius: 8px;
}

.loading-share__photo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 180ms ease-out;
}

.loading-share__photo:hover img {
  transform: scale(1.04);
}

.loading-share__photo:focus-visible {
  outline: 3px solid #2160b7;
  outline-offset: 3px;
}

.loading-share__empty {
  display: grid;
  place-items: center;
  min-height: 400px;
}

.loading-share__hint {
  padding: 24px;
  font-size: 13px;
  color: #738096;
}

.loading-share__footer {
  padding: 6px 24px 28px;
  font-size: 12px;
  color: #7e8ba0;
  text-align: center;
}

.loading-share__preview-host {
  display: none;
}

@media (max-width: 800px) {
  .loading-share__rows {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 540px) {
  .loading-share__header {
    gap: 16px;
    min-height: 62px;
    padding: 12px 16px;
  }

  .loading-share__logo {
    max-width: 130px;
    height: 28px;
  }

  .loading-share__title {
    padding-left: 16px;
    font-size: 13px;
  }

  .loading-share__body {
    padding: 0 14px;
  }

  .loading-share__overview {
    gap: 12px;
    align-items: flex-start;
    padding: 26px 4px 22px;
  }

  .loading-share__overview > div {
    min-width: 0;
  }

  .loading-share__status {
    padding: 5px 9px;
    margin-top: 27px;
  }

  .loading-share__card {
    margin-bottom: 16px;
  }

  .loading-share__card-head {
    gap: 8px;
    padding: 16px;
  }

  .loading-share__card-head h2 {
    font-size: 15px;
  }

  .loading-share__rows {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 22px 18px;
    padding: 20px 16px;
  }

  .loading-share__ctn {
    padding: 18px 16px;
  }

  .loading-share__ctn-meta {
    gap: 14px;
  }

  .loading-share__ctn-meta div {
    flex-direction: column;
    gap: 6px;
  }

  .loading-share__photo-empty {
    gap: 8px;
    padding: 14px;
  }

  .loading-share__photo-empty span:last-child {
    flex-basis: 100%;
    padding-left: 28px;
  }

  .loading-share__photo-grid {
    grid-template-columns: repeat(auto-fill, 88px);
    gap: 12px;
  }

  .loading-share__photo-slot,
  .loading-share__photo {
    width: 88px;
  }

  .loading-share__photo {
    height: 88px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-share__photo img {
    transition: none;
  }
}
</style>
