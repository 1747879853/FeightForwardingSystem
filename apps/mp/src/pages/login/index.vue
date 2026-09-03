<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';

import { authState, loginByPhone, silentLogin } from '@/stores/auth';

const busy = ref(false);

function goHome() {
  uni.switchTab({ url: '/pages/loading/list' });
}

function toast(error: unknown, fallback: string) {
  uni.showToast({
    icon: 'none',
    title: error instanceof Error ? error.message : fallback,
  });
}

async function onSilentLogin() {
  if (busy.value) return;
  busy.value = true;
  try {
    const ok = await silentLogin();
    if (ok) {
      goHome();
    } else {
      uni.showToast({ icon: 'none', title: '请点手机号一键登录完成绑定' });
    }
  } catch (error) {
    toast(error, '微信登录失败');
  } finally {
    busy.value = false;
  }
}

/**
 * 手机号快速验证按次收费，扣费发生在拿到 e.detail.code 的那一刻，
 * 所以只在静默登录明确要求绑定时才暴露这个按钮。
 */
async function onGetPhoneNumber(event: any) {
  const code = event?.detail?.code;
  if (!code) {
    uni.showToast({ icon: 'none', title: '已取消手机号授权' });
    return;
  }
  busy.value = true;
  try {
    const ok = await loginByPhone(code);
    if (ok) goHome();
  } catch (error) {
    toast(error, '手机号登录失败');
  } finally {
    busy.value = false;
  }
}

onShow(() => {
  if (authState.token) {
    goHome();
  }
});
</script>

<template>
  <view class="page">
    <view class="hero">
      <image
        class="hero__img"
        src="/static/images/banner-worker.png"
        mode="aspectFit"
      />
      <text class="hero__title">监装师傅端</text>
      <text class="hero__sub">一键托付 高效省心</text>
    </view>

    <view class="panel">
      <!-- #ifdef MP-WEIXIN -->
      <button
        v-if="authState.needPhoneBinding"
        class="btn"
        open-type="getPhoneNumber"
        :disabled="busy"
        hover-class="btn--pressed"
        @getphonenumber="onGetPhoneNumber"
      >
        {{ busy ? '登录中...' : '手机号一键登录' }}
      </button>
      <button
        v-else
        class="btn"
        :disabled="busy"
        hover-class="btn--pressed"
        @tap="onSilentLogin"
      >
        {{ busy ? '登录中...' : '微信登录' }}
      </button>
      <text class="tip">
        账号需由管理员预先开通，登录手机号必须与系统内账号一致
      </text>
      <!-- #endif -->

      <!-- #ifndef MP-WEIXIN -->
      <text class="tip tip--standalone">请在微信小程序中打开并登录</text>
      <!-- #endif -->
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 0 56rpx;
  background: $hero-gradient;
  background-color: $page-bg;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0 60rpx;
}

.hero__img {
  width: 360rpx;
  height: 380rpx;
}

.hero__title {
  margin-top: 24rpx;
  font-size: 44rpx;
  font-weight: 700;
  color: $brand-primary;
}

.hero__sub {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: $text-label;
}

.panel {
  padding: 40rpx 32rpx;
  background: $card-bg;
  border-radius: 24rpx;
}

.btn {
  width: 100%;
  height: 88rpx;
  padding: 0;
  margin: 0;
  font-size: 30rpx;
  font-weight: 600;
  line-height: 88rpx;
  color: #fff;
  text-align: center;
  background: $brand-primary;
  border: 0;
  border-radius: 44rpx;
  box-shadow: 0 14rpx 28rpx rgb(50 122 255 / 22%);
  transition:
    transform 160ms ease,
    opacity 160ms ease;
}

.btn::after {
  border: 0;
}

.btn--pressed {
  opacity: 0.88;
  transform: scale(0.98);
}

.btn[disabled] {
  color: rgb(255 255 255 / 78%);
  background: #8bb1f8;
}

.tip {
  display: block;
  margin-top: 24rpx;
  font-size: 22rpx;
  line-height: 34rpx;
  color: $text-label;
  text-align: center;
}

.tip--standalone {
  margin-top: 0;
}
</style>
