<script setup lang="ts">
import { computed } from 'vue';

import { buildAttachmentUrl } from '@/api/request';
import { authState, logout } from '@/stores/auth';
import { textOr } from '@/utils/format';

const profile = computed(() => authState.profile);

const avatarUrl = computed(() => buildAttachmentUrl(profile.value?.avatar));

const displayName = computed(
  () => profile.value?.nickName || profile.value?.userName || '未登录',
);

const rows = computed(() => [
  {
    icon: 'user-circle',
    label: '登录账号',
    tone: 'blue',
    value: textOr(profile.value?.userName),
  },
  {
    icon: 'creditcard',
    label: '员工工号',
    tone: 'violet',
    value: textOr(profile.value?.employeeID),
  },
  {
    icon: 'mobile',
    label: '绑定手机',
    tone: 'cyan',
    value: textOr(profile.value?.phoneNumber),
  },
]);

function onLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出当前账号吗？',
    success: async (res) => {
      if (!res.confirm) return;
      await logout();
      uni.reLaunch({ url: '/pages/login/index' });
    },
  });
}
</script>

<template>
  <view class="page">
    <view class="hero">
      <view class="hero__glow hero__glow--top" />
      <view class="hero__glow hero__glow--bottom" />

      <view class="hero__profile">
        <view class="hero__avatar-wrap">
          <image
            v-if="avatarUrl"
            class="hero__avatar"
            :src="avatarUrl"
            mode="aspectFill"
            aria-hidden="true"
          />
          <view v-else class="hero__avatar hero__avatar--empty">
            <text class="hero__initial">
              {{ displayName.slice(0, 1) }}
            </text>
          </view>
          <view class="hero__online" />
        </view>

        <view class="hero__info">
          <text class="hero__name">{{ displayName }}</text>
          <text class="hero__sub">
            {{
              profile?.enName ||
              (authState.token ? '监装师傅端用户' : '登录后查看账户信息')
            }}
          </text>
          <view class="hero__status">
            <view
              class="hero__status-dot"
              :class="{ 'hero__status-dot--offline': !authState.token }"
            />
            <text>{{
              authState.token ? '账号已安全登录' : '当前尚未登录'
            }}</text>
          </view>
        </view>
      </view>

      <view v-if="profile?.employeeID" class="hero__meta">
        <text class="hero__meta-label">当前工号</text>
        <text class="hero__meta-value">{{ profile.employeeID }}</text>
      </view>
    </view>

    <view class="section-heading">
      <view>
        <text class="section-heading__title">账号信息</text>
        <text class="section-heading__desc">用于身份识别与任务联系</text>
      </view>
      <view
        class="section-heading__tag"
        :class="{ 'section-heading__tag--inactive': !authState.token }"
      >
        {{ authState.token ? '已认证' : '待登录' }}
      </view>
    </view>

    <view class="info-card">
      <view v-for="row in rows" :key="row.label" class="row">
        <view class="row__main">
          <view class="row__icon" :class="`row__icon--${row.tone}`">
            <wd-icon :name="row.icon" size="20px" />
          </view>
          <text class="row__label">{{ row.label }}</text>
        </view>
        <text class="row__value">{{ row.value }}</text>
      </view>
    </view>

    <button class="logout" hover-class="logout--pressed" @tap="onLogout">
      <wd-icon name="logout" size="19px" />
      <text>退出登录</text>
    </button>

    <text class="page__footer">津海通 · 监装师傅端</text>
  </view>
</template>

<style lang="scss" scoped>
.page {
  box-sizing: border-box;
  min-height: calc(100vh - env(safe-area-inset-bottom));
  padding: 28rpx 28rpx calc(120rpx + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, #eaf3ff 0%, $page-bg 440rpx);
}

.hero {
  position: relative;
  box-sizing: border-box;
  min-height: 294rpx;
  padding: 38rpx 32rpx 28rpx;
  overflow: hidden;
  color: #fff;
  background: linear-gradient(135deg, #256ff1 0%, #478fff 54%, #70b6ff 100%);
  border-radius: 32rpx;
  box-shadow: 0 22rpx 54rpx rgb(39 103 204 / 22%);
}

.hero__glow {
  position: absolute;
  pointer-events: none;
  background: rgb(255 255 255 / 10%);
  border: 2rpx solid rgb(255 255 255 / 12%);
  border-radius: 50%;
}

.hero__glow--top {
  top: -150rpx;
  right: -70rpx;
  width: 360rpx;
  height: 360rpx;
}

.hero__glow--bottom {
  right: 150rpx;
  bottom: -170rpx;
  width: 260rpx;
  height: 260rpx;
}

.hero__profile {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
}

.hero__avatar-wrap {
  position: relative;
  flex: 0 0 auto;
  padding: 6rpx;
  background: rgb(255 255 255 / 24%);
  border-radius: 50%;
}

.hero__avatar {
  display: block;
  width: 116rpx;
  height: 116rpx;
  background: #fff;
  border-radius: 50%;
}

.hero__avatar--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #fff 0%, #e6f1ff 100%);
}

.hero__initial {
  font-size: 44rpx;
  font-weight: 700;
  color: $brand-primary;
}

.hero__online {
  position: absolute;
  right: 2rpx;
  bottom: 4rpx;
  width: 22rpx;
  height: 22rpx;
  background: #22c55e;
  border: 5rpx solid #4389fa;
  border-radius: 50%;
}

.hero__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-left: 28rpx;
}

.hero__name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.4;
  color: #fff;
  white-space: nowrap;
}

.hero__sub {
  margin-top: 6rpx;
  font-size: 24rpx;
  line-height: 1.5;
  color: rgb(255 255 255 / 76%);
}

.hero__status {
  display: flex;
  align-items: center;
  align-self: flex-start;
  padding: 6rpx 14rpx;
  margin-top: 14rpx;
  font-size: 20rpx;
  line-height: 1.5;
  color: rgb(255 255 255 / 92%);
  background: rgb(11 56 137 / 18%);
  border-radius: 999rpx;
}

.hero__status-dot {
  width: 8rpx;
  height: 8rpx;
  margin-right: 10rpx;
  background: #9bf2bc;
  border-radius: 50%;
}

.hero__status-dot--offline {
  background: rgb(255 255 255 / 58%);
}

.hero__meta {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 24rpx;
  margin-top: 26rpx;
  border-top: 2rpx solid rgb(255 255 255 / 16%);
}

.hero__meta-label {
  font-size: 22rpx;
  color: rgb(255 255 255 / 68%);
}

.hero__meta-value {
  font-size: 24rpx;
  font-weight: 600;
  color: #fff;
  letter-spacing: 1rpx;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8rpx;
  margin-top: 40rpx;
}

.section-heading__title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.4;
  color: $text-title;
}

.section-heading__desc {
  display: block;
  margin-top: 6rpx;
  font-size: 21rpx;
  line-height: 1.4;
  color: $text-label;
}

.section-heading__tag {
  padding: 8rpx 16rpx;
  font-size: 21rpx;
  font-weight: 600;
  line-height: 1.4;
  color: #17864a;
  background: #e9f9ef;
  border-radius: 999rpx;
}

.section-heading__tag--inactive {
  color: $text-label;
  background: #eef1f5;
}

.info-card {
  padding: 6rpx 28rpx;
  margin-top: 20rpx;
  background: $card-bg;
  border: 2rpx solid rgb(226 232 240 / 76%);
  border-radius: 28rpx;
  box-shadow: 0 12rpx 34rpx rgb(35 73 120 / 7%);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 108rpx;
  border-bottom: 2rpx solid $divider;
}

.row:last-child {
  border-bottom: none;
}

.row__main {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
}

.row__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60rpx;
  height: 60rpx;
  color: $brand-primary;
  background: $brand-primary-soft;
  border-radius: 18rpx;
}

.row__icon--violet {
  color: #7257d9;
  background: #f0edff;
}

.row__icon--cyan {
  color: #168c9d;
  background: #e8f8fa;
}

.row__label {
  margin-left: 20rpx;
  font-size: 26rpx;
  color: $text-label;
}

.row__value {
  min-width: 0;
  margin-left: 24rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 27rpx;
  font-weight: 600;
  color: $text-title;
  text-align: right;
  white-space: nowrap;
}

.logout {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 88rpx;
  padding: 0;
  margin: 34rpx 0 0;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 88rpx;
  color: #d83d4a;
  background: #fff;
  border: 2rpx solid rgb(216 61 74 / 14%);
  border-radius: 22rpx;
  transition:
    background-color 140ms ease,
    opacity 140ms ease;
}

.logout::after {
  border: 0;
}

.logout text {
  margin-left: 12rpx;
}

.logout--pressed {
  background: #fff2f3;
  opacity: 0.86;
}

.page__footer {
  display: block;
  margin-top: 30rpx;
  font-size: 21rpx;
  line-height: 1.5;
  color: #96a0ae;
  text-align: center;
  letter-spacing: 2rpx;
}

@media (orientation: landscape) and (max-height: 500px) {
  .page {
    padding-top: 20rpx;
  }

  .hero {
    min-height: auto;
  }
}
</style>
