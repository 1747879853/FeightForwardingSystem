<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';

import {
  authState,
  loginByPassword,
  loginByPhone,
  silentLogin,
} from '@/stores/auth';

const enablePasswordLogin =
  String(import.meta.env.VITE_ENABLE_PASSWORD_LOGIN) === 'true';

const busy = ref(false);
const passwordVisible = ref(false);
const form = ref({ password: '', userName: '' });

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

async function onPasswordLogin() {
  if (!form.value.userName || !form.value.password) {
    uni.showToast({ icon: 'none', title: '请输入账号和密码' });
    return;
  }
  busy.value = true;
  try {
    const ok = await loginByPassword(form.value.userName, form.value.password);
    if (ok) goHome();
  } catch (error) {
    toast(error, '登录失败');
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
        @getphonenumber="onGetPhoneNumber"
      >
        手机号一键登录
      </button>
      <view v-else class="btn" @tap="onSilentLogin">微信登录</view>
      <text class="tip">
        账号需由管理员预先开通，登录手机号必须与系统内账号一致
      </text>
      <!-- #endif -->

      <!-- #ifndef MP-WEIXIN -->
      <text class="tip">非微信环境下请使用账号密码登录</text>
      <!-- #endif -->

      <template v-if="enablePasswordLogin">
        <view class="switch" @tap="passwordVisible = !passwordVisible">
          {{ passwordVisible ? '收起账号登录' : '开发调试：账号密码登录' }}
        </view>

        <view v-if="passwordVisible" class="form">
          <input
            v-model="form.userName"
            class="form__input"
            placeholder="账号"
            placeholder-class="form__placeholder"
          />
          <input
            v-model="form.password"
            class="form__input"
            password
            placeholder="密码"
            placeholder-class="form__placeholder"
          />
          <view class="btn btn--ghost" @tap="onPasswordLogin">登录</view>
        </view>
      </template>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 0 56rpx;
  background: linear-gradient(180deg, #d8e7ff 0%, $page-bg 520rpx);
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
  color: #1a4fb4;
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
  height: 88rpx;
  font-size: 30rpx;
  line-height: 88rpx;
  color: #fff;
  text-align: center;
  background: $brand-primary;
  border-radius: 44rpx;
}

.btn--ghost {
  margin-top: 8rpx;
  color: $brand-primary;
  background: $brand-primary-soft;
}

.tip {
  display: block;
  margin-top: 24rpx;
  font-size: 22rpx;
  line-height: 34rpx;
  color: $text-label;
  text-align: center;
}

.switch {
  margin-top: 32rpx;
  font-size: 24rpx;
  color: $brand-primary;
  text-align: center;
}

.form {
  margin-top: 24rpx;
}

.form__input {
  height: 88rpx;
  padding: 0 24rpx;
  margin-bottom: 20rpx;
  font-size: 28rpx;
  background: #f7f9fc;
  border-radius: 16rpx;
}

.form__placeholder {
  color: #c2c8d2;
}
</style>
