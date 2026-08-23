<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';

import { restoreSession } from './stores/auth';

onLaunch(() => {
  // 启动即尝试恢复会话：本地 token 优先，其次微信静默登录
  void restoreSession();
});
</script>

<template>
  <!-- uni-app 要求 App.vue 无根节点内容 -->
</template>

<style lang="scss">
page {
  min-height: 100%;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC',
    'Microsoft YaHei', sans-serif;
  color: $text-title;
  background: $page-bg;
}

view,
text,
image,
scroll-view {
  box-sizing: border-box;
}
</style>
