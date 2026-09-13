<script lang="ts" setup>
import type { LoadingOrderAdminApi } from '#/api/sea-export/loading-order-admin';

import type { LoadingShareLang } from './share-text';

import { computed, onBeforeUnmount, ref, watch } from 'vue';
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
import LiveVideo from './live-video.vue';

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

function isFilled(value: string) {
  return value !== EMPTY && value.trim() !== '';
}

const basicGroups = computed(() => {
  const item = detail.value;
  if (!item) return [];
  const labels = t.value.fields;
  const groups = [
    {
      key: 'voyage',
      title: t.value.groups.voyage,
      rows: [
        { label: labels.vesselVoyage, value: vesselVoyage.value },
        { label: labels.ctnQty, value: ctnQtyText.value },
        { label: labels.eta, value: formatDateTime(item.estimatedArrivalTime) },
      ],
    },
    {
      key: 'cargo',
      title: t.value.groups.cargo,
      rows: [
        { label: labels.goods, value: goodsText.value },
        {
          label: labels.kgs,
          value: sea.value?.kgs == null ? EMPTY : t.value.kg(sea.value.kgs),
        },
        { label: labels.pkgs, value: textOr(sea.value?.pkgs) },
        { label: labels.package, value: textOr(sea.value?.codePackage?.name) },
        {
          label: labels.packageItem,
          value: textOr(item.codePackageItem?.name),
        },
        { label: labels.packageItemQty, value: textOr(item.pkgs) },
      ],
    },
    {
      key: 'site',
      title: t.value.groups.site,
      rows: [
        { label: labels.yard, value: textOr(item.carrierYard?.name) },
        { label: labels.supervisors, value: supervisorText.value },
      ],
    },
  ];
  return groups
    .map((group) => ({
      ...group,
      rows: group.rows.filter((row) => isFilled(row.value)),
    }))
    .filter((group) => group.key === 'site' || group.rows.length > 0);
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

let detailRequest = 0;
onBeforeUnmount(() => {
  ++detailRequest;
});

async function loadDetail() {
  const requestId = ++detailRequest;
  detail.value = null;
  if (!hasQuery.value) {
    detail.value = null;
    errorText.value = '';
    return;
  }

  loading.value = true;
  errorText.value = '';
  try {
    const result = await getLoadingOrderPublicDetail({
      mblNum: mblNum.value,
      loadingOrderNum: loadingOrderNum.value,
    });
    if (requestId !== detailRequest) return;
    detail.value = result;
  } catch (error) {
    if (requestId !== detailRequest) return;
    detail.value = null;
    errorText.value = extractAbpMessage(error);
  } finally {
    if (requestId === detailRequest) loading.value = false;
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

        <article v-else class="loading-share__sheet">
          <header class="loading-share__band" aria-labelledby="share-heading">
            <dl class="loading-share__facts" :aria-label="t.basicInfo">
              <div class="loading-share__mbl">
                <dt>{{ t.mblNum }}</dt>
                <dd>
                  <h1 id="share-heading">{{ textOr(sea?.mblNum) }}</h1>
                </dd>
              </div>
            </dl>
            <LiveVideo
              :key="`${mblNum}-${loadingOrderNum}-${detail.status}-${detail.cameraNo}`"
              compact
              :mbl-num="mblNum"
              :loading-order-num="loadingOrderNum"
              :lang="shareLang"
              :completed="detail.status === LoadingOrderStatus.Completed"
              :camera-no="detail.cameraNo"
            />
          </header>

          <div class="loading-share__groups">
            <section
              v-for="group in basicGroups"
              :key="group.key"
              class="loading-share__group"
            >
              <h2>{{ group.title }}</h2>
              <dl class="loading-share__facts">
                <div v-if="group.key === 'site'" class="loading-share__order">
                  <dt>{{ t.loadingOrder }}</dt>
                  <dd>
                    <strong>{{ textOr(detail.loadingOrderNum) }}</strong>
                    <span
                      v-if="statusLabel"
                      class="loading-share__status"
                      :class="{
                        'is-done':
                          detail.status === LoadingOrderStatus.Completed,
                        'is-pending':
                          detail.status === LoadingOrderStatus.Pending,
                        'is-active':
                          detail.status === LoadingOrderStatus.Claimed,
                      }"
                    >
                      <span class="loading-share__status-dot" />
                      {{ t.orderStatus }} · {{ statusLabel }}
                    </span>
                  </dd>
                </div>
                <div v-for="row in group.rows" :key="row.label">
                  <dt>{{ row.label }}</dt>
                  <dd>{{ row.value }}</dd>
                </div>
              </dl>
            </section>
          </div>

          <section class="loading-share__boxes" :aria-label="t.containers">
            <div class="loading-share__boxes-head">
              <h2>{{ t.containers }}</h2>
              <span>
                {{
                  t.completedCount(
                    completedCount,
                    detail.orderCtns?.length ?? 0,
                  )
                }}
              </span>
            </div>

            <p v-if="!detail.orderCtns?.length" class="loading-share__hint">
              {{ t.noContainers }}
            </p>

            <article
              v-for="ctn in detail.orderCtns"
              :key="String(ctn.id)"
              class="loading-share__ctn"
            >
              <div class="loading-share__ctn-head">
                <strong>{{ ctnTypeName(ctn.ctnCode) }}</strong>
                <div class="loading-share__ctn-meta">
                  <span
                    >{{ t.ctnNo }} <b>{{ textOr(ctn.ctnNo) }}</b></span
                  >
                  <span
                    >{{ t.sealNo }} <b>{{ textOr(ctn.sealNo) }}</b></span
                  >
                </div>
                <em
                  class="loading-share__ctn-status"
                  :class="ctn.isLoadingCompleted ? 'is-done' : 'is-pending'"
                >
                  {{ t.containerStatus }} ·
                  {{ ctn.isLoadingCompleted ? t.done : t.pending }}
                </em>
              </div>

              <p
                v-if="!visiblePhotoSlots(ctn).length"
                class="loading-share__photo-empty"
              >
                <strong>{{ t.noPhotos }}</strong>
                <span>{{ t.noPhotosHint }}</span>
              </p>
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
        </article>
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
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100%;
  overflow: hidden;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #24344a;
  background: #e8edf3;
  -webkit-font-smoothing: antialiased;
}

.loading-share__header {
  z-index: 20;
  display: flex;
  flex-shrink: 0;
  gap: 24px;
  align-items: center;
  min-height: 56px;
  padding: 8px max(24px, calc((100% - 1312px) / 2));
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
  flex: 1 1 auto;
  width: 100%;
  max-width: 1360px;
  min-height: 0;
  padding: 24px 24px 0;
  margin: 0 auto;
  overflow: auto;
}

.loading-share__sheet {
  width: 100%;
  overflow: hidden;
  background: #fff;
  border: 1px solid #d5dde7;
  border-radius: 14px;
  box-shadow: 0 10px 28px rgb(28 43 61 / 6%);
}

.loading-share__band {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px 20px;
  align-items: start;
  padding: 24px 28px;
}

.loading-share__band :deep(.live-video.is-compact) {
  margin-top: 0;
}

.loading-share__mbl {
  min-width: 0;
}

.loading-share__mbl h1 {
  margin: 0;
  font-size: clamp(18px, 1.5vw, 22px);
  font-weight: 650;
  line-height: 1.25;
  letter-spacing: 0.2px;
  overflow-wrap: anywhere;
}

.loading-share__order dd {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.loading-share__order strong {
  font-weight: 600;
  color: #24344a;
}

.loading-share__status,
.loading-share__ctn-status {
  display: inline-flex;
  flex-shrink: 0;
  gap: 6px;
  align-items: center;
  padding: 4px 10px;
  font-size: 12px;
  font-style: normal;
  font-weight: 500;
  color: #53647a;
  background: #e8eef4;
  border-radius: 999px;
}

.loading-share__status-dot {
  width: 6px;
  height: 6px;
  background: currentcolor;
  border-radius: 50%;
}

.loading-share .is-done,
.loading-share .is-active {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
}

.loading-share .is-pending {
  color: #9a5d16;
  background: #fff3df;
}

.loading-share__facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 20px;
  padding: 0;
  margin: 0;
}

.loading-share__band .loading-share__facts {
  display: block;
}

.loading-share__groups {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 32px;
  padding: 0 28px 24px;
}

.loading-share__group {
  min-width: 0;
}

.loading-share__group h2 {
  margin: 0 0 14px;
  font-size: 14px;
  font-weight: 600;
  color: #43556d;
}

.loading-share__order {
  grid-column: 1 / -1;
}

.loading-share__facts dt {
  margin-bottom: 4px;
  font-size: 12px;
  color: #65758a;
}

.loading-share__facts dd {
  margin: 0;
  font-size: 15px;
  font-weight: 550;
  line-height: 1.45;
  color: #24344a;
  overflow-wrap: anywhere;
}

.loading-share__boxes {
  padding: 16px 28px 22px;
  border-top: 1px solid #e8edf3;
}

.loading-share__boxes-head {
  display: flex;
  gap: 16px;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}

.loading-share__boxes-head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.loading-share__boxes-head span {
  font-size: 13px;
  color: #65758a;
}

.loading-share__ctn + .loading-share__ctn {
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid #eef2f6;
}

.loading-share__ctn-head {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  align-items: center;
}

.loading-share__ctn-head strong {
  font-size: 16px;
  font-weight: 650;
}

.loading-share__ctn-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  min-width: 0;
  font-size: 13px;
  color: #5d6d80;
}

.loading-share__ctn-head .loading-share__ctn-status {
  margin-left: 0;
}

.loading-share__photo-empty,
.loading-share__hint {
  margin: 12px 0 0;
  font-size: 13px;
  color: #65758a;
}

.loading-share__photo-empty {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 20px;
  line-height: 1.6;
  background: #f6f8fb;
  border-radius: 8px;
}

.loading-share__photo-empty strong {
  font-size: 14px;
  font-weight: 500;
  color: #43556d;
}

.loading-share__ctn-meta b {
  font-weight: 600;
  color: #24344a;
  overflow-wrap: anywhere;
}

.loading-share__photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 180px));
  gap: 14px 16px;
  margin-top: 16px;
}

.loading-share__photo-slot {
  min-width: 0;
}

.loading-share__photo-label {
  height: 22px;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  line-height: 22px;
  color: #6f7d8e;
  white-space: nowrap;
}

.loading-share__photo {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1;
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

.loading-share__footer {
  flex-shrink: 0;
  padding: 10px 24px 16px;
  font-size: 12px;
  color: #65758a;
  text-align: center;
  background: #e8edf3;
}

.loading-share__preview-host {
  display: none;
}

@media (max-width: 800px) {
  .loading-share__groups {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 20px 16px;
  }

  .loading-share__group + .loading-share__group {
    padding-top: 20px;
    border-top: 1px solid #e8edf3;
  }

  .loading-share__band {
    grid-template-columns: 1fr;
    padding: 20px 16px;
  }

  .loading-share__boxes {
    padding: 20px 16px;
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
    padding: 10px 14px 0;
  }

  .loading-share__facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .loading-share__mbl {
    min-width: 0;
  }

  .loading-share__mbl h1 {
    font-size: 20px;
  }

  .loading-share__ctn-head .loading-share__ctn-status {
    margin-left: 0;
  }

  .loading-share__photo-grid {
    grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
    gap: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-share__photo img {
    transition: none;
  }
}
</style>
