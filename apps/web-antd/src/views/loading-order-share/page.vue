<script lang="ts" setup>
import type { LoadingOrderAdminApi } from '#/api/sea-export/loading-order-admin';

import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Empty, Image, Spin } from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  getLoadingOrderPublicDetail,
  LOADING_ORDER_STATUS_TEXT,
} from '#/api/sea-export/loading-order-admin';
import { buildAttachmentUrl } from '#/utils';
import { brandLogo, brandLogoText } from '#/utils/brand-assets';

defineOptions({ name: 'LoadingOrderSharePage' });

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
  const raw = Array.isArray(route.query[key])
    ? route.query[key]?.[0]
    : route.query[key];
  return typeof raw === 'string' ? raw.trim() : '';
}

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
  return '主提单号或监装工单号错误';
}

const mblNum = computed(() => readQuery('mblNum'));
const loadingOrderNum = computed(() => readQuery('loadingOrderNum'));
const hasQuery = computed(
  () => Boolean(mblNum.value) && Boolean(loadingOrderNum.value),
);

const sea = computed(() => detail.value?.seaExport);
const statusLabel = computed(() => {
  const status = detail.value?.status;
  if (status == null) return '';
  return LOADING_ORDER_STATUS_TEXT[status] ?? '';
});

const vesselVoyage = computed(() => {
  const parts = [sea.value?.vessel, sea.value?.innerVoyno].filter(Boolean);
  return parts.length > 0 ? parts.join(' / ') : EMPTY;
});

const goodsText = computed(() => {
  const names = (sea.value?.codeGoodss ?? [])
    .map((item) => item.name)
    .filter(Boolean);
  return names.length > 0 ? names.join('、') : EMPTY;
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
    .map(([name, count]) => `${name}*${count}`)
    .join(' ');
});

const supervisorText = computed(() => {
  const names = (detail.value?.loadingOrderUsers ?? [])
    .map((item) => item.user?.nickName)
    .filter(Boolean);
  return names.length > 0 ? names.join('、') : EMPTY;
});

const basicRows = computed(() => {
  const item = detail.value;
  if (!item) return [];
  return [
    { label: '监装工号', value: textOr(item.loadingOrderNum) },
    { label: '提单号', value: textOr(sea.value?.mblNum) },
    { label: '船名航次', value: vesselVoyage.value },
    { label: '箱型箱量', value: ctnQtyText.value },
    { label: '品名', value: goodsText.value },
    {
      label: '毛重',
      value: sea.value?.kgs == null ? EMPTY : `${sea.value.kgs} KG`,
    },
    { label: '件数', value: textOr(sea.value?.pkgs) },
    { label: '包装', value: textOr(sea.value?.codePackage?.name) },
    { label: '明细包装', value: textOr(item.codePackageItem?.name) },
    { label: '明细包装件数', value: textOr(item.pkgs) },
    { label: '预计到货时间', value: formatDateTime(item.estimatedArrivalTime) },
    { label: '监装堆场', value: textOr(item.carrierYard?.name) },
    { label: '监装师傅', value: supervisorText.value },
  ];
});

function collectCtnPhotos(ctn: LoadingOrderAdminApi.LoadingOrderCtnDto) {
  return (ctn.attachmentGroups ?? []).flatMap((group) =>
    (group.items ?? [])
      .map((item) => buildAttachmentUrl(item.url))
      .filter(Boolean),
  );
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

function visiblePhotoGroups(ctn: LoadingOrderAdminApi.LoadingOrderCtnDto) {
  return (ctn.attachmentGroups ?? []).filter((group) =>
    (group.items ?? []).some((item) => Boolean(item.url)),
  );
}

async function loadDetail() {
  if (!hasQuery.value) {
    detail.value = null;
    errorText.value = '请通过分享给您的链接访问';
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
      <span class="loading-share__title">监装信息</span>
      <span v-if="statusLabel" class="loading-share__status">
        {{ statusLabel }}
      </span>
    </header>

    <main class="loading-share__body">
      <Spin :spinning="loading">
        <div v-if="!detail" class="loading-share__empty">
          <Empty :description="errorText || '请通过分享给您的链接访问'" />
        </div>

        <template v-else>
          <section class="loading-share__card">
            <div class="loading-share__card-head">
              <span class="loading-share__bar" />
              <h2>基本信息</h2>
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
              <span class="loading-share__bar" />
              <h2>集装箱</h2>
              <span class="loading-share__count">
                共 {{ detail.orderCtns?.length ?? 0 }} 个
              </span>
            </div>

            <div v-if="!detail.orderCtns?.length" class="loading-share__hint">
              暂无箱型
            </div>

            <article
              v-for="(ctn, index) in detail.orderCtns"
              :key="String(ctn.id)"
              class="loading-share__ctn"
            >
              <div class="loading-share__ctn-head">
                <strong>{{ index + 1 }}. {{ ctnTypeName(ctn.ctnCode) }}</strong>
                <span
                  class="loading-share__ctn-status"
                  :class="ctn.isLoadingCompleted ? 'is-done' : 'is-pending'"
                >
                  {{ ctn.isLoadingCompleted ? '已完成' : '待处理' }}
                </span>
              </div>
              <div class="loading-share__ctn-meta">
                <span>箱号 {{ textOr(ctn.ctnNo) }}</span>
                <span>封号 {{ textOr(ctn.sealNo) }}</span>
              </div>

              <div
                v-for="group in visiblePhotoGroups(ctn)"
                :key="
                  String(
                    group.attachmentDtlTypeId ??
                      group.attachmentDtlType?.id ??
                      '',
                  )
                "
                class="loading-share__photos"
              >
                <div class="loading-share__photo-label">
                  {{
                    group.attachmentDtlType?.name ||
                    group.attachmentDtlType?.typeName ||
                    '监装照片'
                  }}
                </div>
                <div class="loading-share__photo-grid">
                  <button
                    v-for="(item, photoIndex) in group.items ?? []"
                    v-show="item.url"
                    :key="`${item.id ?? item.attachmentId ?? photoIndex}`"
                    type="button"
                    class="loading-share__photo"
                    @click="openPreview(ctn, buildAttachmentUrl(item.url))"
                  >
                    <img
                      :alt="item.friendlyFileName || '监装照片'"
                      :src="buildAttachmentUrl(item.url)"
                    />
                  </button>
                </div>
              </div>
            </article>
          </section>
        </template>
      </Spin>
    </main>

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
  min-height: 100vh;
  background: #f5f5f7;
}

.loading-share__header {
  display: flex;
  flex-shrink: 0;
  gap: 12px;
  align-items: center;
  min-height: 56px;
  padding: 8px 20px;
  background: #fff;
  border-bottom: 1px solid rgb(60 60 67 / 10%);
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}

.loading-share__brand {
  display: flex;
  align-items: center;
}

.loading-share__logo {
  max-width: 180px;
  height: 32px;
  object-fit: contain;
}

.loading-share__company {
  font-size: 18px;
  font-weight: 600;
  color: rgb(0 0 0 / 88%);
}

.loading-share__title {
  padding-left: 12px;
  font-size: 15px;
  color: rgb(60 60 67 / 60%);
  border-left: 1px solid rgb(60 60 67 / 12%);
}

.loading-share__status {
  padding: 2px 10px;
  margin-left: auto;
  font-size: 12px;
  color: #1677ff;
  background: #e6f4ff;
  border-radius: 999px;
}

.loading-share__body {
  box-sizing: border-box;
  width: 100%;
  max-width: 860px;
  padding: 16px 16px 32px;
  margin: 0 auto;
}

.loading-share__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
}

.loading-share__card {
  padding: 16px 18px 8px;
  margin-bottom: 12px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}

.loading-share__card-head {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.loading-share__bar {
  width: 4px;
  height: 14px;
  background: linear-gradient(180deg, #327aff 0%, rgb(50 122 255 / 50%) 100%);
  border-radius: 2px;
}

.loading-share__card-head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 22px;
  color: #252a31;
}

.loading-share__count {
  font-size: 12px;
  color: #8c95a3;
}

.loading-share__rows {
  margin: 0;
}

.loading-share__row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #eef1f4;
}

.loading-share__row:last-child {
  border-bottom: 0;
}

.loading-share__row dt {
  flex: 0 0 auto;
  font-size: 13px;
  color: #697586;
}

.loading-share__row dd {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #252a31;
  text-align: right;
  word-break: break-all;
}

.loading-share__hint {
  padding: 16px 0 20px;
  font-size: 13px;
  color: #8c95a3;
}

.loading-share__ctn {
  padding: 12px 0 16px;
  border-top: 1px solid #eef1f4;
}

.loading-share__ctn:first-of-type {
  border-top: 0;
}

.loading-share__ctn-head {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.loading-share__ctn-head strong {
  font-size: 14px;
  color: #252a31;
}

.loading-share__ctn-status {
  padding: 1px 8px;
  font-size: 12px;
  border-radius: 999px;
}

.loading-share__ctn-status.is-done {
  color: #389e0d;
  background: #f6ffed;
}

.loading-share__ctn-status.is-pending {
  color: #d46b08;
  background: #fff7e6;
}

.loading-share__ctn-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 8px;
  font-size: 13px;
  color: #697586;
}

.loading-share__photos {
  margin-top: 10px;
}

.loading-share__photo-label {
  margin-bottom: 8px;
  font-size: 12px;
  color: #8c95a3;
}

.loading-share__photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 8px;
}

.loading-share__photo {
  display: block;
  aspect-ratio: 1;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  background: #f5f7fa;
  border: 0;
  border-radius: 8px;
}

.loading-share__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.loading-share__preview-host {
  display: none;
}

@media (max-width: 640px) {
  .loading-share__header {
    padding: 8px 12px;
  }

  .loading-share__logo {
    max-width: 120px;
    height: 26px;
  }

  .loading-share__body {
    padding: 12px 12px 28px;
  }
}
</style>
