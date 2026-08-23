<script setup lang="ts">
import type {
  LoadingOrderListItemDto,
  LoadingOrderQuery,
} from '@/api/loading-order';

import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

import {
  getMyLoadingOrders,
  isNoSupervisionError,
  STATUS_TABS,
  STATUS_TEXT,
} from '@/api/loading-order';
import { isLoggedIn } from '@/stores/auth';
import { formatDate, joinNames, textOr, vesselVoyage } from '@/utils/format';

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

function switchTab(index: number) {
  if (activeTab.value === index) return;
  activeTab.value = index;
  list.value = [];
  total.value = 0;
  void fetchList(true);
}

function applyFilter() {
  searchVisible.value = false;
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
    <view class="hero">
      <view class="nav" :style="{ paddingTop: `${statusBarHeight}px` }">
        <view class="nav__action" @tap="searchVisible = !searchVisible">
          <wd-icon name="search" size="22px" color="#1d2129" />
          <view v-if="hasFilter" class="nav__dot" />
        </view>
        <text class="nav__title">检索条件</text>
      </view>

      <view class="hero__body">
        <view class="hero__text">
          <text class="hero__title">一键托付 高效省心</text>
          <text class="hero__sub">简易托付，全程服务安心无忧</text>
        </view>
        <image
          class="hero__img"
          src="/static/images/banner-worker.png"
          mode="aspectFit"
        />
      </view>
    </view>

    <view v-if="searchVisible" class="filter">
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
      <view class="filter__actions">
        <view class="filter__btn filter__btn--ghost" @tap="resetFilter">
          重置
        </view>
        <view class="filter__btn" @tap="applyFilter">查询</view>
      </view>
    </view>

    <view class="sheet">
      <view class="tabs">
        <view
          v-for="(tab, index) in STATUS_TABS"
          :key="tab.status"
          :class="['tabs__item', { 'is-active': activeTab === index }]"
          @tap="switchTab(index)"
        >
          {{ tab.label }}
        </view>
      </view>

      <view class="list">
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
              src="/static/images/card-crane.png"
              mode="aspectFit"
            />

            <view class="card__head">
              <view class="card__no">
                <wd-icon name="file-paste" size="16px" color="#8a94a6" />
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
              <text class="card__foot-text">
                下单日期: {{ formatDate(item.creationTime) }}
              </text>
              <text class="card__foot-text">
                预计到货日期: {{ formatDate(item.estimatedArrivalTime) }}
              </text>
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
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding-bottom: 40rpx;
  background: $page-bg;
}

.hero {
  position: relative;
  background: linear-gradient(180deg, #d8e7ff 0%, #eef4fd 60%, $page-bg 100%);
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
  padding-left: 32rpx;
}

.nav__dot {
  position: absolute;
  top: -2rpx;
  right: -6rpx;
  width: 12rpx;
  height: 12rpx;
  background: #ff4d4f;
  border-radius: 50%;
}

.nav__title {
  position: absolute;
  left: 0;
  width: 100%;
  font-size: 34rpx;
  font-weight: 600;
  color: $text-title;
  text-align: center;
}

.hero__body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx 40rpx;
}

.hero__text {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.hero__title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1a4fb4;
}

.hero__sub {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: $text-label;
}

.hero__img {
  width: 260rpx;
  height: 280rpx;
}

.filter {
  padding: 24rpx 28rpx 8rpx;
  margin: 0 28rpx 24rpx;
  background: $card-bg;
  border-radius: 24rpx;
}

.filter__row {
  display: flex;
  align-items: center;
  min-height: 88rpx;
  border-bottom: 2rpx solid $divider;
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
  padding: 24rpx 0;
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
  color: $text-body;
  background: $brand-primary-soft;
}

.sheet {
  padding: 0 28rpx;
}

.tabs {
  display: flex;
  overflow: hidden;
  background: #e4edfb;
  border-radius: 24rpx 24rpx 0 0;
}

.tabs__item {
  flex: 1;
  height: 88rpx;
  font-size: 28rpx;
  line-height: 88rpx;
  color: $text-label;
  text-align: center;
}

.tabs__item.is-active {
  font-weight: 600;
  color: $text-title;
  background: $card-bg;
  border-radius: 24rpx 24rpx 0 0;
}

.list {
  padding-top: 24rpx;
}

.card {
  position: relative;
  padding: 24rpx 28rpx 0;
  margin-bottom: 24rpx;
  overflow: hidden;
  background: $card-bg;
  border-radius: 24rpx;
}

.card__watermark {
  position: absolute;
  right: 0;
  bottom: 72rpx;
  width: 180rpx;
  height: 180rpx;
  opacity: 0.16;
}

.card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card__no {
  display: flex;
  gap: 8rpx;
  align-items: center;
}

.card__no-text {
  font-size: 24rpx;
  color: $text-label;
}

.badge {
  padding: 6rpx 20rpx;
  font-size: 24rpx;
  border-radius: 22rpx;
}

.badge--pending {
  color: $status-pending;
  background: #fff2e2;
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
  margin-top: 20rpx;
}

.card__title {
  font-size: 36rpx;
  font-weight: 700;
  color: $text-title;
}

.card__chip {
  padding: 8rpx 20rpx;
  font-size: 24rpx;
  color: $text-body;
  background: #f2f4f8;
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
}

.card__value {
  font-size: 28rpx;
  color: $text-title;
}

.card__label {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: $text-label;
}

.card__foot {
  display: flex;
  justify-content: space-between;
  padding: 22rpx 0;
  padding-right: 28rpx;
  padding-left: 28rpx;
  margin: 0 -28rpx;
  background: #f7f9fc;
}

.card__foot-text {
  font-size: 24rpx;
  color: $text-label;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx;
  background: $card-bg;
  border-radius: 0 0 24rpx 24rpx;
}

.placeholder__title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-body;
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
