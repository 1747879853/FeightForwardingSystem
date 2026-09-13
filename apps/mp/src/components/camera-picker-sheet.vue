<script setup lang="ts">
import type { LoadingOrderCameraOptionDto } from '@/api/loading-order';

import { cameraOccupiedText, canSelectCamera } from '@/utils/camera-options';

const props = defineProps<{
  cameras: LoadingOrderCameraOptionDto[];
  hasBound: boolean;
  loading: boolean;
  submitting: boolean;
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
  select: [cameraNo: number];
  unbind: [];
}>();

function choose(item: LoadingOrderCameraOptionDto) {
  if (props.submitting || !canSelectCamera(item)) return;
  if (item.isCurrent) {
    emit('close');
    return;
  }
  emit('select', item.cameraNo);
}
</script>

<template>
  <view v-if="visible" class="mask" @tap="emit('close')">
    <view class="sheet" @tap.stop>
      <view class="sheet__head">
        <text
          class="sheet__action"
          :class="{ 'is-disabled': submitting || !hasBound }"
          @tap="hasBound && !submitting && emit('unbind')"
        >
          解绑
        </text>
        <text class="sheet__title">选择摄像头</text>
        <text class="sheet__action" @tap="emit('close')">取消</text>
      </view>
      <scroll-view class="sheet__list" scroll-y>
        <view
          v-for="item in cameras"
          :key="item.cameraNo"
          :class="[
            'sheet__item',
            { 'is-current': item.isCurrent, 'is-occupied': item.isOccupied },
          ]"
          @tap="choose(item)"
        >
          <view class="sheet__texts">
            <text class="sheet__name">{{ item.name }}</text>
            <text v-if="item.isCurrent" class="sheet__desc">当前绑定</text>
            <text v-else-if="item.isOccupied" class="sheet__desc">
              {{ cameraOccupiedText(item) }}
            </text>
          </view>
        </view>
        <view class="sheet__foot">
          <text v-if="loading">加载中…</text>
          <text v-else-if="cameras.length === 0">暂无可用摄像头</text>
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
  z-index: 90;
  display: flex;
  align-items: flex-end;
  background: rgb(0 0 0 / 45%);
}

.sheet {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 70vh;
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

.sheet__action {
  font-size: 26rpx;
  color: $brand-primary;
}

.sheet__action.is-disabled {
  color: $text-label;
}

.sheet__list {
  flex: 1;
  max-height: calc(70vh - 88rpx);
}

.sheet__item {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid $divider;
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

.sheet__item.is-current .sheet__name {
  color: $brand-primary;
}

.sheet__item.is-occupied .sheet__name,
.sheet__item.is-occupied .sheet__desc {
  color: #c2c8d2;
}

.sheet__foot {
  padding: 24rpx;
  font-size: 24rpx;
  color: $text-label;
  text-align: center;
}
</style>
