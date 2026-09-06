<script setup lang="ts">
import type {
  NamedOption,
  PagedOptionQuery,
  PagedOptionResult,
} from '@/utils/named-picker';

import { ref, watch } from 'vue';

const props = defineProps<{
  loader: (query: PagedOptionQuery) => Promise<PagedOptionResult>;
  selectedId?: string;
  title: string;
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
  select: [option: NamedOption];
}>();

const PAGE_SIZE = 20;
const items = ref<NamedOption[]>([]);
const total = ref(0);
const pageIndex = ref(1);
const keyword = ref('');
const loading = ref(false);
const hasMore = ref(true);
let searchTimer: null | ReturnType<typeof setTimeout> = null;

function mergeItems(next: NamedOption[], reset: boolean) {
  if (reset) return next;
  const seen = new Set(items.value.map((item) => item.id));
  return [...items.value, ...next.filter((item) => !seen.has(item.id))];
}

async function load(reset: boolean) {
  if (loading.value) return;
  if (!reset && !hasMore.value) return;
  loading.value = true;
  if (reset) {
    pageIndex.value = 1;
    hasMore.value = true;
  }
  try {
    const result = await props.loader({
      keyword: keyword.value,
      pageIndex: pageIndex.value,
      pageSize: PAGE_SIZE,
    });
    const next = result.items ?? [];
    items.value = mergeItems(next, reset);
    total.value = result.totalCount ?? items.value.length;
    hasMore.value = items.value.length < total.value && next.length > 0;
  } catch (error) {
    if (reset) {
      items.value = [];
      total.value = 0;
      hasMore.value = false;
    }
    uni.showToast({
      icon: 'none',
      title: error instanceof Error ? error.message : '加载失败',
    });
  } finally {
    loading.value = false;
  }
}

function loadMore() {
  if (loading.value || !hasMore.value) return;
  pageIndex.value += 1;
  void load(false);
}

function onKeywordInput(event: { detail: { value: string } }) {
  keyword.value = event.detail.value;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    void load(true);
  }, 300);
}

function choose(item: NamedOption) {
  emit('select', item);
}

function clear() {
  emit('select', { id: '', name: '' });
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return;
    keyword.value = '';
    items.value = [];
    void load(true);
  },
);
</script>

<template>
  <view v-if="visible" class="mask" @tap="emit('close')">
    <view class="sheet" @tap.stop>
      <view class="sheet__head">
        <text class="sheet__clear" @tap="clear">清空</text>
        <text class="sheet__title">{{ title }}</text>
        <text class="sheet__close" @tap="emit('close')">确定</text>
      </view>
      <view class="sheet__search">
        <input
          class="sheet__input"
          :value="keyword"
          placeholder="输入关键字搜索"
          placeholder-class="sheet__placeholder"
          confirm-type="search"
          @input="onKeywordInput"
        />
      </view>
      <scroll-view
        class="sheet__list"
        scroll-y
        :lower-threshold="80"
        @scrolltolower="loadMore"
      >
        <view
          v-for="item in items"
          :key="item.id"
          :class="['sheet__item', { 'is-active': item.id === selectedId }]"
          @tap="choose(item)"
        >
          <image
            v-if="item.logoUrl"
            class="sheet__logo"
            :src="item.logoUrl"
            mode="aspectFit"
          />
          <view class="sheet__texts">
            <text class="sheet__name">{{ item.name }}</text>
            <text v-if="item.desc" class="sheet__desc">{{ item.desc }}</text>
          </view>
        </view>
        <view class="sheet__foot">
          <text v-if="loading">加载中…</text>
          <text v-else-if="items.length === 0">暂无数据</text>
          <text v-else-if="!hasMore">没有更多了</text>
          <text v-else>上拉加载更多</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 30;
  display: flex;
  align-items: flex-end;
  background: rgb(0 0 0 / 45%);
}

.sheet {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 70vh;
  background: $card-bg;
  border-radius: 24rpx 24rpx 0 0;
}

.sheet__head {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 28rpx;
}

.sheet__title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-title;
}

.sheet__clear,
.sheet__close {
  font-size: 26rpx;
  color: $brand-primary;
}

.sheet__search {
  flex-shrink: 0;
  padding: 0 28rpx 16rpx;
}

.sheet__input {
  height: 72rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: $text-title;
  background: $page-bg;
  border-radius: 36rpx;
}

.sheet__placeholder {
  color: #c2c8d2;
}

.sheet__list {
  flex: 1;
  height: 0;
}

.sheet__item {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid $divider;
}

.sheet__logo {
  flex-shrink: 0;
  width: 48rpx;
  height: 48rpx;
  margin-right: 16rpx;
  border-radius: 8rpx;
}

.sheet__texts {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.sheet__name {
  font-size: 28rpx;
  font-weight: 500;
  color: $text-title;
}

.sheet__desc {
  font-size: 24rpx;
  color: $text-label;
}

.sheet__item.is-active .sheet__name {
  color: $brand-primary;
}

.sheet__foot {
  padding: 24rpx;
  font-size: 24rpx;
  color: $text-label;
  text-align: center;
}
</style>
