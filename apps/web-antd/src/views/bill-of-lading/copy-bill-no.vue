<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { message, Tooltip } from 'ant-design-vue';

const props = defineProps<{
  /** 详情标题等需要稍大的复制按钮 */
  large?: boolean;
  /** 等宽字体，用于详情标题 */
  mono?: boolean;
  /** 没有可展示号码时的占位，例如审核表里的 — */
  placeholder?: string;
  text?: null | string;
  texts?: null | readonly string[];
}>();

const COPY_DELAY = 400;
let timer = 0;
let lastClickAt = 0;

const items = computed(() => {
  let source: readonly (null | string | undefined)[] = [];
  if (props.texts === undefined) {
    if (props.text) source = [props.text];
  } else {
    source = props.texts;
  }
  return source
    .map((item) => (item == null ? '' : String(item).trim()))
    .filter((item) => item.length > 0);
});

function canCopy(value: string) {
  return value !== '未填提单号';
}

function clearTimer() {
  window.clearTimeout(timer);
  timer = 0;
}

async function write(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      message.success('已复制提单号');
      return;
    }
  } catch {
    // HTTP 或未授权剪贴板时继续走 execCommand
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  const ok =
    typeof document.execCommand === 'function' && document.execCommand('copy');
  textarea.remove();
  if (ok) message.success('已复制提单号');
  else message.warning('复制失败，请手动复制');
}

function scheduleCopy(value: string) {
  const now = Date.now();
  // 双击打开详情时，第二次点击会落在延迟内，这时取消复制。
  if (now - lastClickAt < COPY_DELAY) {
    clearTimer();
    lastClickAt = 0;
    return;
  }
  lastClickAt = now;
  clearTimer();
  timer = window.setTimeout(() => {
    timer = 0;
    lastClickAt = 0;
    void write(value);
  }, COPY_DELAY);
}

function copyNow(value: string) {
  clearTimer();
  void write(value);
}

onBeforeUnmount(clearTimer);
</script>

<template>
  <span v-if="items.length" class="copy-bill-nos">
    <template v-for="(item, index) in items" :key="`${item}-${index}`">
      <span v-if="index" class="copy-bill-no__sep">、</span>
      <Tooltip v-if="canCopy(item)" title="点击复制提单号">
        <span
          class="copy-bill-no"
          @click.stop="scheduleCopy(item)"
          @dblclick="clearTimer"
        >
          <span class="copy-bill-no__text" :class="{ 'is-mono': mono }">{{
            item
          }}</span>
          <button
            type="button"
            class="copy-bill-no__btn"
            :class="{ 'is-lg': large }"
            aria-label="复制提单号"
            @click.stop="copyNow(item)"
            @dblclick.stop
          >
            <IconifyIcon icon="ant-design:copy-outlined" />
          </button>
        </span>
      </Tooltip>
      <span v-else class="copy-bill-no__text" :class="{ 'is-mono': mono }">{{
        item
      }}</span>
    </template>
  </span>
  <span v-else-if="placeholder" class="copy-bill-no__empty">{{
    placeholder
  }}</span>
</template>

<style scoped>
.copy-bill-nos {
  line-height: inherit;
  word-break: break-all;
}

.copy-bill-no {
  display: inline;
  white-space: nowrap;
  cursor: pointer;
}

.copy-bill-no:hover .copy-bill-no__text {
  color: hsl(var(--primary));
}

.copy-bill-no__text.is-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.copy-bill-no__sep {
  white-space: normal;
}

.copy-bill-no__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  margin-left: 2px;
  vertical-align: -2px;
  color: #8c95a3;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;
}

.copy-bill-no__btn.is-lg {
  width: 22px;
  height: 22px;
  vertical-align: -3px;
}

.copy-bill-no__btn:hover {
  color: hsl(var(--primary));
  background: hsl(var(--accent));
}

.copy-bill-no__btn :deep(svg) {
  font-size: 13px;
}

.copy-bill-no__btn.is-lg :deep(svg) {
  font-size: 14px;
}

.copy-bill-no__empty {
  color: #c0c4cc;
}
</style>
