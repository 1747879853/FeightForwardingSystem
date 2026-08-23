<script setup lang="ts">
function goLoading() {
  uni.switchTab({ url: '/pages/loading/list' });
}
</script>

<template>
  <view class="page">
    <image
      class="page__img"
      src="/static/images/banner-worker.png"
      mode="aspectFit"
    />
    <text class="page__title">首页建设中</text>
    <text class="page__desc">
      第一期先开放监装工单，其余业务入口后续版本接入
    </text>
    <view class="page__btn" @tap="goLoading">去看监装工单</view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 140rpx 60rpx;
  background: linear-gradient(180deg, #d8e7ff 0%, $page-bg 420rpx);
}

.page__img {
  width: 320rpx;
  height: 340rpx;
}

.page__title {
  margin-top: 32rpx;
  font-size: 34rpx;
  font-weight: 600;
  color: $text-title;
}

.page__desc {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: $text-label;
  text-align: center;
}

.page__btn {
  padding: 0 60rpx;
  margin-top: 48rpx;
  font-size: 28rpx;
  line-height: 80rpx;
  color: #fff;
  background: $brand-primary;
  border-radius: 40rpx;
}
</style>
