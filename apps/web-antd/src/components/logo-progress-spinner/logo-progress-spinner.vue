<script lang="ts" setup>
import { ref, watch } from 'vue';

import { brandLoadingMaskClass, brandLogoText } from '#/utils/brand-assets';

interface Props {
  class?: string;
  /**
   * @zh_CN 最小加载时间
   */
  minLoadingTime?: number;
  /**
   * @zh_CN loading状态开启
   */
  spinning?: boolean;
}

defineOptions({
  name: 'LogoProgressSpinner',
});

const props = withDefaults(defineProps<Props>(), {
  minLoadingTime: 50,
});

const showSpinner = ref(false);
const renderSpinner = ref(false);
const timer = ref<ReturnType<typeof setTimeout>>();

watch(
  () => props.spinning,
  (show) => {
    if (!show) {
      showSpinner.value = false;
      clearTimeout(timer.value);
      return;
    }

    timer.value = setTimeout(() => {
      showSpinner.value = true;
      if (showSpinner.value) {
        renderSpinner.value = true;
      }
    }, props.minLoadingTime);
  },
  {
    immediate: true,
  },
);

function onTransitionEnd() {
  if (!showSpinner.value) {
    renderSpinner.value = false;
  }
}
</script>

<template>
  <div
    :class="[
      'absolute left-0 top-0 z-100 flex size-full flex-col items-center justify-center bg-overlay-content backdrop-blur-sm transition-all duration-500',
      { 'invisible opacity-0': !showSpinner },
      props.class,
    ]"
    @transitionend="onTransitionEnd"
  >
    <div v-if="renderSpinner" class="loader-fill-panel">
      <div class="loader-fill" :class="brandLoadingMaskClass">
        <img :src="brandLogoText" alt="" class="logo-bg" />
        <img
          :src="brandLogoText"
          alt=""
          class="logo-color"
          :class="{ paused: !showSpinner }"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.loader-fill-panel {
  padding: 20px 28px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgb(15 23 42 / 12%);
}

:global(.dark) .loader-fill-panel {
  background: #1a1a22;
  box-shadow: 0 8px 32px rgb(0 0 0 / 35%);
}

.loader-fill {
  position: relative;
  display: block;
  width: fit-content;
  max-width: min(90vw, 320px);
  height: 54px;
  line-height: 0;
}

.loader-fill img {
  display: block;
  width: auto;
  max-width: 100%;
  height: 54px;
  object-fit: contain;
  object-position: center center;
}

.logo-bg {
  opacity: 0.28;
  filter: grayscale(100%) brightness(0.75);
}

.loader-fill--brand-jht .logo-bg {
  opacity: 0.2;
  filter: grayscale(100%) brightness(1.15) contrast(0.92);
}

:global(.dark) .logo-bg {
  opacity: 0.4;
  filter: grayscale(100%) brightness(1.1);
}

:global(.dark) .loader-fill--brand-jht .logo-bg {
  opacity: 0.32;
  filter: grayscale(100%) brightness(1.2) contrast(0.9);
}

.logo-color {
  position: absolute;
  top: 0;
  left: 0;
  clip-path: inset(0 100% 0 0);
  animation: logo-fill-progress 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  will-change: clip-path;
}

.logo-color.paused {
  animation-play-state: paused;
}

@keyframes logo-fill-progress {
  0% {
    clip-path: inset(0 100% 0 0);
  }

  50%,
  100% {
    clip-path: inset(0 0 0 0);
  }
}
</style>
