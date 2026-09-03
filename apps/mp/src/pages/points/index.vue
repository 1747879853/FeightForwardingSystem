<template>
  <view class="page">
    <view class="glow glow--top" />
    <view class="glow glow--bottom" />

    <view class="coming-card">
      <view class="coming-card__badge">即将上线</view>

      <view class="illustration" aria-hidden="true">
        <view class="illustration__orbit illustration__orbit--outer" />
        <view class="illustration__orbit illustration__orbit--inner" />
        <view class="illustration__spark illustration__spark--left" />
        <view class="illustration__spark illustration__spark--right" />
        <view class="illustration__coin">
          <image
            class="illustration__icon"
            src="/static/icons/tab-points-active.png"
            mode="aspectFit"
          />
        </view>
      </view>

      <text class="page__eyebrow">POINTS MALL</text>
      <text class="page__title">积分好礼，正在准备</text>
      <text class="page__desc">
        积分任务与精选好礼正在加紧筹备中，精彩兑换很快与你见面
      </text>

      <view class="feature-list">
        <view class="feature-item">
          <view class="feature-item__dot" />
          <text>积分任务</text>
        </view>
        <view class="feature-item">
          <view class="feature-item__dot" />
          <text>精选好礼</text>
        </view>
        <view class="feature-item">
          <view class="feature-item__dot" />
          <text>兑换记录</text>
        </view>
      </view>

      <view class="progress">
        <view class="progress__track">
          <view class="progress__bar" />
        </view>
        <text class="progress__text">筹备进行中</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - env(safe-area-inset-bottom));
  padding: 72rpx 36rpx 120rpx;
  overflow: hidden;
  background: linear-gradient(180deg, #edf5ff 0%, $page-bg 56%, #f5f7fb 100%);
}

.glow {
  position: absolute;
  pointer-events: none;
  border-radius: 50%;
  filter: blur(4rpx);
}

.glow--top {
  top: -150rpx;
  right: -120rpx;
  width: 440rpx;
  height: 440rpx;
  background: rgb(50 122 255 / 14%);
}

.glow--bottom {
  bottom: 20rpx;
  left: -180rpx;
  width: 360rpx;
  height: 360rpx;
  background: rgb(93 184 255 / 12%);
}

.coming-card {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 678rpx;
  padding: 48rpx 40rpx 44rpx;
  overflow: hidden;
  background: rgb(255 255 255 / 94%);
  border: 2rpx solid rgb(255 255 255 / 90%);
  border-radius: 36rpx;
  box-shadow: 0 24rpx 64rpx rgb(36 78 133 / 12%);
}

.coming-card__badge {
  align-self: flex-start;
  padding: 10rpx 20rpx;
  font-size: 22rpx;
  font-weight: 600;
  line-height: 1.4;
  color: $brand-primary;
  letter-spacing: 2rpx;
  background: $brand-primary-soft;
  border-radius: 999rpx;
}

.illustration {
  position: relative;
  width: 300rpx;
  height: 268rpx;
  margin-top: 12rpx;
}

.illustration__orbit {
  position: absolute;
  top: 50%;
  left: 50%;
  border: 2rpx solid rgb(50 122 255 / 14%);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.illustration__orbit--outer {
  width: 250rpx;
  height: 250rpx;
}

.illustration__orbit--inner {
  width: 194rpx;
  height: 194rpx;
  background: rgb(50 122 255 / 5%);
}

.illustration__coin {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 142rpx;
  height: 142rpx;
  background: linear-gradient(145deg, #fff 8%, #e9f2ff 100%);
  border: 2rpx solid rgb(50 122 255 / 12%);
  border-radius: 50%;
  box-shadow:
    0 18rpx 36rpx rgb(50 122 255 / 18%),
    inset 0 0 0 12rpx rgb(255 255 255 / 70%);
  transform: translate(-50%, -50%);
}

.illustration__icon {
  width: 76rpx;
  height: 76rpx;
}

.illustration__spark {
  position: absolute;
  width: 14rpx;
  height: 14rpx;
  background: #70b7ff;
  border-radius: 4rpx;
  transform: rotate(45deg);
}

.illustration__spark--left {
  top: 74rpx;
  left: 24rpx;
}

.illustration__spark--right {
  right: 28rpx;
  bottom: 70rpx;
  width: 10rpx;
  height: 10rpx;
  background: #327aff;
}

.page__eyebrow {
  font-size: 20rpx;
  font-weight: 700;
  line-height: 1.4;
  color: $brand-primary;
  letter-spacing: 5rpx;
}

.page__title {
  margin-top: 14rpx;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.35;
  color: $text-title;
}

.page__desc {
  max-width: 530rpx;
  margin-top: 18rpx;
  font-size: 26rpx;
  line-height: 42rpx;
  color: $text-label;
  text-align: center;
}

.feature-list {
  display: flex;
  justify-content: center;
  width: 100%;
  margin-top: 36rpx;
}

.feature-item {
  display: flex;
  align-items: center;
  padding: 0 18rpx;
  font-size: 23rpx;
  line-height: 36rpx;
  color: #526273;
}

.feature-item + .feature-item {
  border-left: 2rpx solid $divider;
}

.feature-item__dot {
  width: 8rpx;
  height: 8rpx;
  margin-right: 10rpx;
  background: $brand-primary;
  border-radius: 50%;
  box-shadow: 0 0 0 6rpx $brand-primary-soft;
}

.progress {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  width: 100%;
  padding: 22rpx 24rpx;
  margin-top: 38rpx;
  background: #f7f9fc;
  border-radius: 18rpx;
}

.progress__track {
  flex: 1;
  height: 10rpx;
  overflow: hidden;
  background: #e3eaf4;
  border-radius: 999rpx;
}

.progress__bar {
  width: 68%;
  height: 100%;
  background: linear-gradient(90deg, #73baff 0%, $brand-primary 100%);
  border-radius: inherit;
}

.progress__text {
  margin-left: 20rpx;
  font-size: 22rpx;
  font-weight: 600;
  line-height: 1.4;
  color: $brand-primary;
  white-space: nowrap;
}

@media (orientation: landscape) and (max-height: 500px) {
  .page {
    align-items: flex-start;
    padding-top: 28rpx;
  }

  .coming-card {
    align-items: flex-start;
    padding: 32rpx 40rpx 36rpx;
  }

  .illustration {
    position: absolute;
    top: 10rpx;
    right: 40rpx;
    width: 180rpx;
    height: 180rpx;
    opacity: 0.72;
  }

  .page__eyebrow {
    margin-top: 24rpx;
  }

  .page__desc {
    max-width: 440rpx;
    text-align: left;
  }

  .feature-list {
    justify-content: flex-start;
  }
}
</style>
