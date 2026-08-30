<script setup lang="ts">
import type {
  LoadingOrderListItemDto,
  LoadingOrderQuery,
} from '@/api/loading-order';

import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
import { computed, ref, watch } from 'vue';

import {
  getMyLoadingOrders,
  isNoSupervisionError,
  STATUS_TABS,
  STATUS_TEXT,
} from '@/api/loading-order';
import { isLoggedIn } from '@/stores/auth';
import { formatDate, joinNames, textOr, vesselVoyage } from '@/utils/format';

const tabLabels = STATUS_TABS.map((tab) => tab.label);

const PAGE_SIZE = 10;

const statusBarHeight = ref(uni.getSystemInfoSync().statusBarHeight ?? 20);
const activeTab = ref(0);
const list = ref<LoadingOrderListItemDto[]>([]);
const total = ref(0);
const pageIndex = ref(1);
const loading = ref(false);
const noPermission = ref(false);
const searchVisible = ref(false);
const filters = ref({
  estimatedArrivalDate: '',
  loadingOrderNum: '',
  mblNum: '',
});

const hasMore = computed(() => list.value.length < total.value);
const hasFilter = computed(() =>
  Object.values(filters.value).some((value) => Boolean(value)),
);

function openSearchDrawer() {
  searchVisible.value = true;
}

function closeSearchDrawer() {
  searchVisible.value = false;
}

function buildQuery(): LoadingOrderQuery {
  return {
    status: STATUS_TABS[activeTab.value]!.status,
    pageIndex: pageIndex.value,
    pageSize: PAGE_SIZE,
    estimatedArrivalDate: filters.value.estimatedArrivalDate || undefined,
    loadingOrderNum: filters.value.loadingOrderNum || undefined,
    mblNum: filters.value.mblNum || undefined,
  };
}

async function fetchList(reset = false) {
  if (loading.value) return;
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/login/index' });
    return;
  }
  loading.value = true;
  if (reset) {
    pageIndex.value = 1;
  }
  try {
    const result = await getMyLoadingOrders(buildQuery());
    noPermission.value = false;
    list.value = reset ? result.items : [...list.value, ...result.items];
    total.value = result.totalCount ?? list.value.length;
  } catch (error) {
    if (isNoSupervisionError(error)) {
      // 没有监装属性时整页降级为提示，不再弹 Toast 骚扰
      noPermission.value = true;
      list.value = [];
      total.value = 0;
    } else {
      uni.showToast({
        icon: 'none',
        title: error instanceof Error ? error.message : '加载失败',
      });
    }
  } finally {
    loading.value = false;
  }
}

watch(activeTab, (index, prev) => {
  if (index === prev) return;
  list.value = [];
  total.value = 0;
  void fetchList(true);
});

function applyFilter() {
  closeSearchDrawer();
  void fetchList(true);
}

function resetFilter() {
  filters.value = {
    estimatedArrivalDate: '',
    loadingOrderNum: '',
    mblNum: '',
  };
  void fetchList(true);
}

function onArrivalDateChange(event: { detail: { value: string } }) {
  filters.value.estimatedArrivalDate = event.detail.value;
}

function goDetail(item: LoadingOrderListItemDto) {
  uni.navigateTo({
    url: `/pages/loading/detail?id=${item.id}&status=${item.status}`,
  });
}

/** 明细包装 + 件数，列表接口不返回箱型，这里退回包装口径 */
function packageBadge(item: LoadingOrderListItemDto) {
  const name = item.codePackageItem?.name;
  if (!name) return '';
  return item.pkgs ? `${name}*${item.pkgs}` : name;
}

function statusClass(status: number) {
  if (status === 3) return 'badge--done';
  if (status === 2) return 'badge--doing';
  return 'badge--pending';
}

onShow(() => {
  setTimeout(() => {
    uni.showTabBar({ animation: false });
  }, 50);
  void fetchList(true);
});

onPullDownRefresh(async () => {
  await fetchList(true);
  uni.stopPullDownRefresh();
});

onReachBottom(() => {
  if (!hasMore.value || loading.value) return;
  pageIndex.value += 1;
  void fetchList();
});
</script>

<template>
  <view class="page">
    <view class="hero-bg" />

    <view class="nav" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav__action" @tap="openSearchDrawer">
        <image
          class="nav__search"
          src="/static/icons/icon-search.svg"
          mode="aspectFit"
        />
        <view v-if="hasFilter" class="nav__dot" />
      </view>
      <text class="nav__title">检索条件</text>
    </view>

    <view class="hero">
      <view class="hero__text">
        <view class="hero__title">一键托付 高效省心</view>
        <text class="hero__sub">简易托付，全程服务安心无忧</text>
      </view>
      <image
        class="hero__img"
        src="/static/images/banner-worker.png"
        mode="aspectFit"
      />
    </view>

    <view class="sheet">
      <skew-tabs
        v-model="activeTab"
        :hidden="searchVisible"
        :tabs="tabLabels"
      />

      <view class="list">
        <view class="list__fade" />
        <view v-if="noPermission" class="placeholder">
          <text class="placeholder__title">当前账号无监装权限</text>
          <text class="placeholder__desc">
            请联系管理员为你的账号开通监装属性后再进入
          </text>
        </view>

        <template v-else>
          <view
            v-for="item in list"
            :key="item.id"
            class="card"
            @tap="goDetail(item)"
          >
            <image
              class="card__watermark"
              src="/static/images/card-watermark.png"
              mode="aspectFit"
            />

            <view class="card__head">
              <view class="card__no">
                <image
                  class="card__no-icon"
                  src="/static/icons/icon-grid.svg"
                  mode="aspectFit"
                />
                <text class="card__no-text">
                  监装工号 {{ textOr(item.loadingOrderNum) }}
                </text>
              </view>
              <text :class="['badge', statusClass(item.status)]">
                {{ STATUS_TEXT[item.status] }}
              </text>
            </view>

            <view class="card__title-row">
              <text class="card__title">
                {{ textOr(item.seaExport?.mblNum) }}
              </text>
              <text v-if="packageBadge(item)" class="card__chip">
                {{ packageBadge(item) }}
              </text>
            </view>

            <view class="card__grid">
              <view class="card__cell">
                <text class="card__value">
                  {{
                    vesselVoyage(
                      item.seaExport?.vessel,
                      item.seaExport?.innerVoyno,
                    )
                  }}
                </text>
                <text class="card__label">船名/航次</text>
              </view>
              <view class="card__cell">
                <text class="card__value">
                  {{ textOr(item.carrierYard?.name) }}
                </text>
                <text class="card__label">堆场</text>
              </view>
              <view class="card__cell">
                <text class="card__value">
                  {{ joinNames(item.seaExport?.codeGoodss) }}
                </text>
                <text class="card__label">品名</text>
              </view>
            </view>

            <view class="card__foot">
              <view class="card__foot-item">
                <text class="card__foot-label">下单日期：</text>
                <text class="card__foot-date">
                  {{ formatDate(item.creationTime) }}
                </text>
              </view>
              <view class="card__foot-item">
                <text class="card__foot-label">预计到货日期：</text>
                <text class="card__foot-date">
                  {{ formatDate(item.estimatedArrivalTime) }}
                </text>
              </view>
            </view>
          </view>

          <view v-if="!loading && list.length === 0" class="placeholder">
            <text class="placeholder__title">暂无工单</text>
            <text class="placeholder__desc">换个分类或调整筛选条件看看</text>
          </view>

          <view v-if="loading" class="loading">加载中…</view>
          <view v-else-if="list.length > 0 && !hasMore" class="loading">
            没有更多了
          </view>
        </template>
      </view>
    </view>

    <search-drawer v-model="searchVisible">
      <view
        class="filter-drawer"
        :style="{ paddingTop: `${statusBarHeight + 24}px` }"
      >
        <view class="filter-drawer__head">
          <text class="filter-drawer__title">检索条件</text>
          <view class="filter-drawer__close" @tap="closeSearchDrawer">
            <text>×</text>
          </view>
        </view>

        <view class="filter-drawer__body">
          <view class="filter__row">
            <text class="filter__label">监装工单号</text>
            <input
              v-model="filters.loadingOrderNum"
              class="filter__input"
              placeholder="支持模糊搜索"
              placeholder-class="filter__placeholder"
            />
          </view>
          <view class="filter__row">
            <text class="filter__label">主提单号</text>
            <input
              v-model="filters.mblNum"
              class="filter__input"
              placeholder="支持模糊搜索"
              placeholder-class="filter__placeholder"
            />
          </view>
          <view class="filter__row">
            <text class="filter__label">预计到货日</text>
            <picker
              class="filter__picker"
              mode="date"
              :value="filters.estimatedArrivalDate"
              @change="onArrivalDateChange"
            >
              <text
                :class="[
                  'filter__value',
                  { 'is-empty': !filters.estimatedArrivalDate },
                ]"
              >
                {{ filters.estimatedArrivalDate || '请选择' }}
              </text>
            </picker>
          </view>
        </view>

        <view class="filter__actions">
          <view class="filter__btn filter__btn--ghost" @tap="resetFilter">
            重置
          </view>
          <view class="filter__btn" @tap="applyFilter">查询</view>
        </view>
      </view>
    </search-drawer>
  </view>
</template>

<style lang="scss" scoped>
.page {
  position: relative;
  min-height: 100vh;
  padding-bottom: 24rpx;
  background: $page-bg;
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  width: 100%;
  height: 565rpx;
  pointer-events: none;
  background: $hero-gradient;
}

.nav,
.hero,
.sheet {
  position: relative;
  z-index: 1;
}

.nav {
  position: relative;
  box-sizing: content-box;
  display: flex;
  align-items: center;
  height: 88rpx;
}

.nav__action {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 88rpx;
  margin-left: 10rpx;
}

.nav__search {
  width: 32rpx;
  height: 32rpx;
}

.nav__dot {
  position: absolute;
  top: 18rpx;
  right: 12rpx;
  width: 12rpx;
  height: 12rpx;
  background: #ff4d4f;
  border-radius: 50%;
}

.nav__title {
  position: absolute;
  left: 0;
  width: 100%;
  font-size: 38rpx;
  font-weight: 500;
  line-height: 38rpx;
  color: $text-title;
  text-align: center;
}

.hero {
  position: relative;
  z-index: 2;
  min-height: 182rpx;
  padding: 18rpx 32rpx 0;
}

.hero__text {
  display: flex;
  flex-direction: column;
  width: 420rpx;
}

.hero__title {
  font-size: 36rpx;
  font-weight: 500;
  line-height: 36rpx;
  color: #00689c;
  background-image: $title-gradient;
  /* stylelint-disable-next-line property-no-vendor-prefix */
  -webkit-background-clip: text;
  background-clip: text;
  /* stylelint-disable-next-line property-no-vendor-prefix */
  -webkit-text-fill-color: transparent;
}

.hero__sub {
  margin-top: 24rpx;
  font-size: 24rpx;
  line-height: 24rpx;
  color: $text-label;
}

.hero__img {
  position: absolute;
  top: -70rpx;
  right: 52rpx;
  z-index: 0;
  width: 294rpx;
  height: 320rpx;
  pointer-events: none;
}

.filter-drawer {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 620rpx;
  height: 100vh;
  background: $page-bg;
}

.filter-drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 28rpx 0 32rpx;
  background: $card-bg;
}

.filter-drawer__title {
  font-size: 34rpx;
  font-weight: 600;
  color: $text-title;
}

.filter-drawer__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  font-size: 56rpx;
  font-weight: 300;
  line-height: 56rpx;
  color: $text-label;
}

.filter-drawer__body {
  padding: 8rpx 28rpx;
  margin: 24rpx 20rpx 0;
  background: $card-bg;
  border-radius: 24rpx;
}

.filter__row {
  display: flex;
  align-items: center;
  min-height: 88rpx;
  border-bottom: 1rpx solid $divider;
}

.filter__label {
  width: 180rpx;
  font-size: 26rpx;
  color: $text-label;
}

.filter__input,
.filter__picker {
  flex: 1;
  font-size: 28rpx;
  color: $text-title;
}

.filter__value.is-empty {
  color: #c2c8d2;
}

.filter__placeholder {
  color: #c2c8d2;
}

.filter__actions {
  display: flex;
  gap: 20rpx;
  padding: 24rpx 28rpx calc(24rpx + env(safe-area-inset-bottom));
  margin-top: auto;
  background: $card-bg;
}

.filter__btn {
  flex: 1;
  height: 72rpx;
  font-size: 28rpx;
  line-height: 72rpx;
  color: #fff;
  text-align: center;
  background: $brand-primary;
  border-radius: 36rpx;
}

.filter__btn--ghost {
  color: $text-title;
  background: $brand-primary-soft;
}

.sheet {
  z-index: 3;
  padding: 0 28rpx;
}

.list {
  position: relative;
  padding-top: 24rpx;
}

.list__fade {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  width: 100%;
  height: 200rpx;
  pointer-events: none;
  background: linear-gradient(180deg, #f9fafd 0%, #f0f2f8 52.55%);
}

.card {
  position: relative;
  z-index: 1;
  padding: 24rpx 28rpx 0;
  margin-bottom: 20rpx;
  overflow: hidden;
  background: $card-bg;
  border-radius: 28rpx;
}

.card__watermark {
  position: absolute;
  right: 0;
  bottom: 72rpx;
  width: 177rpx;
  height: 177rpx;
  pointer-events: none;
  opacity: 0.2;
}

.card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44rpx;
}

.card__no {
  display: flex;
  flex: 1;
  gap: 10rpx;
  align-items: center;
  min-width: 0;
}

.card__no-icon {
  flex-shrink: 0;
  width: 16rpx;
  height: 16rpx;
}

.card__no-text {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 20rpx;
  line-height: 20rpx;
  color: $text-label;
  white-space: nowrap;
}

.badge {
  flex-shrink: 0;
  min-width: 100rpx;
  height: 44rpx;
  padding: 0 16rpx;
  font-size: 20rpx;
  font-weight: 500;
  line-height: 44rpx;
  text-align: center;
  border-radius: 22rpx;
}

.badge--pending {
  color: $status-pending;
  background: rgb(255 149 62 / 12%);
}

.badge--doing {
  color: $brand-primary;
  background: $brand-primary-soft;
}

.badge--done {
  color: $status-done;
  background: #e6f8ee;
}

.card__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40rpx;
  margin-top: 18rpx;
}

.card__title {
  font-size: 36rpx;
  font-weight: 700;
  line-height: 36rpx;
  color: $text-title;
}

.card__chip {
  height: 40rpx;
  padding: 0 16rpx;
  font-size: 24rpx;
  font-weight: 500;
  line-height: 38rpx;
  color: $text-title;
  background: $chip-bg;
  border: 1rpx solid $chip-border;
  border-radius: 20rpx;
}

.card__grid {
  display: flex;
  padding: 28rpx 0 24rpx;
}

.card__cell {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.card__value {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 24rpx;
  font-weight: 500;
  line-height: 24rpx;
  color: $text-title;
  white-space: nowrap;
}

.card__label {
  margin-top: 17rpx;
  font-size: 20rpx;
  line-height: 20rpx;
  color: $text-label;
}

.card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72rpx;
  padding: 0 28rpx;
  margin: 0 -28rpx;
  background: $chip-bg;
  border-radius: 0 0 24rpx 24rpx;
}

.card__foot-item {
  display: flex;
  align-items: center;
}

.card__foot-label,
.card__foot-date {
  font-size: 24rpx;
  line-height: 24rpx;
}

.card__foot-label {
  font-weight: 500;
  color: $text-label;
}

.card__foot-date {
  font-weight: 700;
  color: $text-title;
}

.placeholder {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx;
  background: $card-bg;
  border-radius: 28rpx;
}

.placeholder__title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-title;
}

.placeholder__desc {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: $text-label;
  text-align: center;
}

.loading {
  padding: 24rpx 0 40rpx;
  font-size: 24rpx;
  color: $text-label;
  text-align: center;
}
</style>
