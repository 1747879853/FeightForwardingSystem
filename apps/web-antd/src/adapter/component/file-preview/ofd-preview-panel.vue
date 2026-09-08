<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

interface Props {
  src?: ArrayBuffer | null;
}

const props = withDefaults(defineProps<Props>(), {
  src: null,
});

const emit = defineEmits<{
  rendered: [];
  error: [];
}>();

const containerRef = ref<HTMLElement | null>(null);

let loadToken = 0;
let resizeObserver: ResizeObserver | null = null;

function readPageSize(page: HTMLElement) {
  const cachedWidth = Number(page.dataset.ofdNaturalWidth);
  const cachedHeight = Number(page.dataset.ofdNaturalHeight);
  if (cachedWidth > 0 && cachedHeight > 0) {
    return { width: cachedWidth, height: cachedHeight };
  }
  const width = Number.parseFloat(page.style.width) || page.offsetWidth;
  const height = Number.parseFloat(page.style.height) || page.offsetHeight;
  if (width > 0 && height > 0) {
    page.dataset.ofdNaturalWidth = String(width);
    page.dataset.ofdNaturalHeight = String(height);
  }
  return { width, height };
}

function fitOfdPages() {
  const el = containerRef.value;
  if (!el) return;
  const avail = Math.max(el.clientWidth - 32, 280);
  const pages = [...el.querySelectorAll<HTMLElement>('.page-container')];
  for (const page of pages) {
    const wrap = page.parentElement;
    if (!wrap?.classList.contains('ofd-page-fit')) continue;
    const { width, height } = readPageSize(page);
    if (!width || !height) continue;
    const scale = Math.min(1, avail / width);
    wrap.style.width = `${width * scale}px`;
    wrap.style.height = `${height * scale}px`;
    page.style.transformOrigin = 'top left';
    page.style.transform = `scale(${scale})`;
  }
}

function wrapOfdPages(root: HTMLElement) {
  const pages = [...root.querySelectorAll<HTMLElement>('.page-container')];
  for (const page of pages) {
    if (page.parentElement?.classList.contains('ofd-page-fit')) continue;
    page.style.margin = '0';
    const wrap = document.createElement('div');
    wrap.className = 'ofd-page-fit';
    page.parentElement?.insertBefore(wrap, page);
    wrap.appendChild(page);
  }
}

function observePanel() {
  resizeObserver?.disconnect();
  if (!containerRef.value || typeof ResizeObserver === 'undefined') return;
  resizeObserver = new ResizeObserver(() => {
    fitOfdPages();
  });
  resizeObserver.observe(containerRef.value);
}

async function loadOfd() {
  const token = ++loadToken;
  containerRef.value?.replaceChildren();

  const src = props.src;
  if (!(src instanceof ArrayBuffer) || src.byteLength === 0) {
    return;
  }

  try {
    const ofdModule = await import('vue-liteofd');
    const LiteOfdCtor = ofdModule.LiteOfd ?? ofdModule.default;
    const liteOfd = new LiteOfdCtor();
    await liteOfd.parse(src);
    if (token !== loadToken) return;
    await nextTick();
    const el = containerRef.value;
    if (!el || token !== loadToken) return;
    const ofdDiv = liteOfd.render(undefined, 'background-color:#fff;');
    el.replaceChildren(ofdDiv);
    wrapOfdPages(el);
    fitOfdPages();
    observePanel();
    emit('rendered');
  } catch (error) {
    if (token !== loadToken) return;
    console.error('[ofd-preview]', error);
    emit('error');
  }
}

watch(
  () => props.src,
  () => {
    void loadOfd();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  loadToken += 1;
  resizeObserver?.disconnect();
  resizeObserver = null;
  containerRef.value?.replaceChildren();
});
</script>

<template>
  <div ref="containerRef" class="ofd-preview-panel"></div>
</template>

<style scoped>
.ofd-preview-panel {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 16px;
  overflow: auto;
  background: #525659;
}

.ofd-preview-panel :deep(.ofd-page-fit) {
  flex-shrink: 0;
  margin: 0 auto 16px;
  overflow: hidden;
}

.ofd-preview-panel :deep(.page-container) {
  flex-shrink: 0;
}
</style>
