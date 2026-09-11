<script setup lang="ts">
import { computed } from 'vue';

import { VbenAvatar } from '../avatar';

interface Props {
  /**
   * @zh_CN 是否收起文本
   */
  collapsed?: boolean;
  /**
   * @zh_CN Logo 图片适应方式
   */
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /**
   * @zh_CN Logo 跳转地址
   */
  href?: string;
  /**
   * @zh_CN Logo 图片大小
   */
  logoSize?: number;
  /**
   * @zh_CN Logo 图标
   */
  src?: string;
  /**
   * @zh_CN 暗色主题 Logo 图标 (可选，若不设置则使用 src)
   */
  srcDark?: string;
  /**
   * @zh_CN Logo 文本
   */
  text: string;
  /**
   * @zh_CN Logo 主题
   */
  theme?: string;
  /**
   * @zh_CN 横版整图 Logo。有值且未收起时只显示该图，不再拼方形图标 + 文本
   */
  fullSrc?: string;
}

defineOptions({
  name: 'VbenLogo',
});

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
  href: 'javascript:void 0',
  logoSize: 32,
  src: '',
  srcDark: '',
  fullSrc: '',
  theme: 'light',
  fit: 'cover',
});

/**
 * @zh_CN 根据主题选择合适的 logo 图标
 */
const logoSrc = computed(() => {
  // 如果是暗色主题且提供了 srcDark，则使用暗色主题的 logo
  if (props.theme === 'dark' && props.srcDark) {
    return props.srcDark;
  }
  // 否则使用默认的 src
  return props.src;
});

const showFullLogo = computed(() => Boolean(props.fullSrc) && !props.collapsed);
</script>

<template>
  <div :class="theme" class="flex h-full items-center text-lg">
    <a
      :class="$attrs.class"
      :href="href"
      class="flex h-full items-center gap-2 overflow-hidden px-3 text-lg leading-normal transition-all duration-500"
    >
      <img
        v-if="showFullLogo"
        :alt="text"
        :src="fullSrc"
        class="h-8 w-auto max-w-[220px] object-contain object-left"
      />
      <template v-else>
        <VbenAvatar
          v-if="logoSrc"
          :alt="text"
          :src="logoSrc"
          :size="logoSize"
          :fit="fit"
          class="relative rounded-none bg-transparent"
        />
        <template v-if="!collapsed">
          <slot name="text">
            <span class="truncate text-nowrap font-semibold text-foreground">
              {{ text }}
            </span>
          </slot>
        </template>
      </template>
    </a>
  </div>
</template>
