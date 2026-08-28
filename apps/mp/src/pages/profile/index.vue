<script setup lang="ts">
import { computed } from 'vue';

import { buildAttachmentUrl } from '@/api/request';
import { authState, logout } from '@/stores/auth';
import { EMPTY_TEXT, textOr } from '@/utils/format';

const profile = computed(() => authState.profile);

const avatarUrl = computed(() => buildAttachmentUrl(profile.value?.avatar));

const displayName = computed(
  () => profile.value?.nickName || profile.value?.userName || '未登录',
);

const rows = computed(() => [
  { label: '账号', value: textOr(profile.value?.userName) },
  { label: '工号', value: textOr(profile.value?.employeeID) },
  { label: '手机号', value: textOr(profile.value?.phoneNumber) },
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
    <view class="header">
      <image
        v-if="avatarUrl"
        class="header__avatar"
        :src="avatarUrl"
        mode="aspectFill"
      />
      <view v-else class="header__avatar header__avatar--empty">
        <text class="header__initial">
          {{ displayName.slice(0, 1) }}
        </text>
      </view>
      <view class="header__info">
        <text class="header__name">{{ displayName }}</text>
        <text class="header__sub">
          {{ profile?.enName || EMPTY_TEXT }}
        </text>
      </view>
    </view>

    <view class="card">
      <view v-for="row in rows" :key="row.label" class="row">
        <text class="row__label">{{ row.label }}</text>
        <text class="row__value">{{ row.value }}</text>
      </view>
    </view>

    <view class="logout" @tap="onLogout">退出登录</view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 32rpx 28rpx;
  background: $hero-gradient;
  background-color: $page-bg;
}

.header {
  display: flex;
  align-items: center;
  padding: 36rpx 28rpx;
  background: $card-bg;
  border-radius: 24rpx;
}

.header__avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 56rpx;
}

.header__avatar--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: $brand-primary-soft;
}

.header__initial {
  font-size: 40rpx;
  font-weight: 600;
  color: $brand-primary;
}

.header__info {
  display: flex;
  flex-direction: column;
  margin-left: 24rpx;
}

.header__name {
  font-size: 34rpx;
  font-weight: 600;
  color: $text-title;
}

.header__sub {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: $text-label;
}

.card {
  padding: 8rpx 28rpx;
  margin-top: 24rpx;
  background: $card-bg;
  border-radius: 24rpx;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 88rpx;
  border-bottom: 2rpx solid $divider;
}

.row:last-child {
  border-bottom: none;
}

.row__label {
  font-size: 28rpx;
  color: $text-label;
}

.row__value {
  font-size: 28rpx;
  color: $text-title;
}

.logout {
  height: 88rpx;
  margin-top: 40rpx;
  font-size: 30rpx;
  line-height: 88rpx;
  color: #f5222d;
  text-align: center;
  background: $card-bg;
  border-radius: 44rpx;
}
</style>
