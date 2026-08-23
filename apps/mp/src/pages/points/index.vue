<template>
  <view class="page">
    <text class="page__title">积分兑换建设中</text>
    <text class="page__desc">积分规则与兑换商品尚未开放，敬请期待</text>
  </view>
</template>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 0 60rpx;
}

.page__title {
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
</style>
