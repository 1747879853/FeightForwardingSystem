<script lang="ts" setup>
import { IconifyIcon } from '@vben/icons';

import { Tooltip } from 'ant-design-vue';

/**
 * 嵌在「运踪订阅」按钮文案后的规则问号。
 * 点问号只展开说明，不触发订阅；按钮禁用时仍可悬停（pointer-events: auto）。
 */
defineProps<{
  /** 订阅规则全文（可含换行） */
  title: string;
  ariaLabel: string;
}>();

/** 须在 script 里取全局 document；模板里的 `document` 会当成组件属性，值为 undefined */
const getPopupContainer = () => document.body;
</script>

<template>
  <Tooltip :get-popup-container="getPopupContainer">
    <template #title>
      <div class="whitespace-pre-line text-left">{{ title }}</div>
    </template>
    <span
      class="pointer-events-auto ml-1 inline-flex cursor-help leading-none"
      role="img"
      :aria-label="ariaLabel"
      @click.stop
      @mousedown.stop
    >
      <IconifyIcon
        icon="ant-design:question-circle-outlined"
        class="size-3.5 opacity-60"
      />
    </span>
  </Tooltip>
</template>
