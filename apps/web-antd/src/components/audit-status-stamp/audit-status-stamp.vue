<script setup lang="ts">
import { computed } from 'vue';

defineOptions({ name: 'AuditStatusStamp' });

type AuditStatus = number | string;

interface Props {
  label?: string;
  size?: number | string;
  status: AuditStatus;
}

const props = withDefaults(defineProps<Props>(), {
  label: undefined,
  size: 88,
});

const statusMeta = computed(() => {
  switch (Number(props.status)) {
    case 0:
      return { color: '#1677ff', label: '录入中' };
    case 1:
      return { color: '#1677ff', label: '审核中' };
    case 2:
      return { color: '#ef4444', label: '已驳回' };
    case 3:
      return { color: '#00b377', label: '审核通过' };
    case 4:
      return { color: '#d97706', label: '部分结算' };
    case 5:
      return { color: '#64748b', label: '已结算' };
    default:
      return { color: '#64748b', label: '未知状态' };
  }
});

const displayLabel = computed(() => props.label ?? statusMeta.value.label);
const normalizedSize = computed(() =>
  typeof props.size === 'number' ? `${props.size}px` : props.size,
);
const normalizedTextSize = computed(() =>
  typeof props.size === 'number' ? `${(props.size * 15) / 88}px` : '15px',
);
</script>

<template>
  <div
    class="audit-status-stamp"
    :style="{
      '--audit-status-stamp-color': statusMeta.color,
      '--audit-status-stamp-size': normalizedSize,
      '--audit-status-stamp-text-size': normalizedTextSize,
    }"
    :aria-label="displayLabel"
    role="status"
  >
    <svg
      class="audit-status-stamp__seal"
      viewBox="0 0 88 88"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M44.275 8.25C24.75 8.25 9.075 24.2 9.075 44C9.075 63.8 24.75 79.75 44.275 79.75C63.8 79.75 79.475 63.8 79.475 44C79.475 24.2 63.8 8.25 44.275 8.25ZM44.275 77.275C26.125 77.275 11.55 62.425 11.55 44C11.55 25.575 26.4 10.725 44.275 10.725C62.15 10.725 77 25.575 77 44C77 62.425 62.425 77.275 44.275 77.275Z"
        fill="currentColor"
      />
      <path
        d="M44.275 14.0254C28.05 14.0254 14.85 27.5004 14.85 44.0004C14.85 60.5004 28.05 73.9754 44.275 73.9754C60.5 73.9754 73.7 60.5004 73.7 44.0004C73.7 27.5004 60.5 14.0254 44.275 14.0254ZM67.65 59.9504C62.7 67.6504 53.9 72.6004 44.275 72.6004C28.875 72.6004 16.225 59.6754 16.225 44.0004C16.225 28.3254 28.875 15.4004 44.275 15.4004C59.675 15.4004 72.325 28.3254 72.325 44.0004C72.325 49.2254 70.95 54.4504 68.2 59.1254L67.65 59.9504Z"
        fill="currentColor"
      />
      <path
        d="M43.45 66.5508L44.825 67.3758L46.475 66.8258L46.2 68.4758L47.3 69.8508L45.65 70.1258L44.55 71.5008L43.725 69.8508L42.075 69.3008L43.45 68.2008V66.5508ZM56.925 64.0758L57.2 65.4508L58.575 66.2758L57.2 67.3758L56.925 68.7508L55.55 67.9258H53.9L54.45 66.2758L53.9 64.9008H55.55L56.925 64.0758ZM33 63.8008L34.1 64.9008L35.75 65.1758L34.925 66.5508L35.475 68.2008L33.825 67.9258L32.45 68.7508L32.175 67.1008L30.8 66.0008L32.45 65.4508L33 63.8008ZM61.05 47.3008L62.15 47.5758C60.5 56.3758 53.075 62.7008 44.275 62.7008C40.15 62.7008 36.025 61.3258 32.725 58.5758L33.55 57.7508C36.575 60.2258 40.425 61.6008 44.275 61.6008C52.525 61.3258 59.675 55.5508 61.05 47.3008ZM64.9 55.8258L66.275 56.9258H67.925L67.1 58.3008L67.65 59.9508L66 59.6758L64.625 60.7758L64.35 59.1258L62.975 58.3008L64.625 57.4758L64.9 55.8258ZM44.275 25.3008C48.4 25.3008 52.525 26.6758 55.825 29.4258L55 30.2508C51.975 27.7758 48.125 26.4008 44.275 26.4008C36.025 26.4008 28.875 32.4508 27.5 40.4258L26.4 40.1508C28.05 31.6258 35.475 25.3008 44.275 25.3008ZM26.675 27.7758L26.95 29.4258L28.325 30.5258L26.675 31.3508L26.125 33.0008L25.025 31.9008H23.375L24.2 30.2508L23.65 28.6008L25.3 28.8758L26.675 27.7758ZM32.175 20.3508L33.55 21.4508L35.2 21.1758L34.65 22.8258L35.2 24.4758L33.55 24.2008L32.175 25.3008L31.9 23.6508L30.25 22.8258L31.625 22.0008L32.175 20.3508ZM57.2 19.8008L57.475 21.4508L58.85 22.5508L57.475 23.3758L56.925 24.7508L55.825 23.6508H54.175L54.725 22.0008L54.175 20.3508L55.825 20.6258L57.2 19.8008ZM44.55 17.0508L45.1 18.7008L46.75 19.2508L45.65 20.3508V22.0008L44 21.1758L42.35 21.7258L42.625 20.0758L41.8 18.7008L43.45 18.4258L44.55 17.0508Z"
        fill="currentColor"
      />
    </svg>
    <strong>{{ displayLabel }}</strong>
  </div>
</template>

<style scoped>
.audit-status-stamp {
  position: relative;
  width: var(--audit-status-stamp-size);
  height: var(--audit-status-stamp-size);
  color: var(--audit-status-stamp-color);
}

.audit-status-stamp__seal {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.audit-status-stamp strong {
  position: absolute;
  top: 38%;
  left: 9%;
  width: 82%;
  font-size: var(--audit-status-stamp-text-size);
  font-weight: 700;
  line-height: 1.4;
  text-align: center;
  white-space: nowrap;
  transform: rotate(-14deg);
}
</style>
