<script lang="ts" setup>
import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Tooltip } from 'ant-design-vue';

import { $t } from '#/locales';
import { sanitizeVendorText } from '#/utils/vendor-text';

/**
 * 列表主提单号/主运单号列前的运踪异常预警叹号。
 * 无预警时不渲染任何内容，避免干扰单号本身的展示与复制。
 */
interface Props {
  /** 是否存在异常预警（取运踪摘要 hasWarning） */
  hasWarning?: boolean | null;
  /** 预警累计条数 */
  warningCount?: null | number;
  /** 最近一条预警描述（可能含换行） */
  description?: null | string;
  /** 最近一条预警发生时间（服务商原样字符串，直接展示不解析） */
  time?: null | string;
}

const props = withDefaults(defineProps<Props>(), {
  hasWarning: false,
  warningCount: 0,
  description: '',
  time: '',
});

const tooltipText = computed(() => {
  const lines: string[] = [];
  const description = sanitizeVendorText(props.description);
  lines.push(description || $t('tracking.warning.noDescription'));

  const time = props.time?.trim();
  if (time) {
    lines.push(`${$t('tracking.warning.timeLabel')}：${time}`);
  }

  const count = props.warningCount ?? 0;
  if (count > 1) {
    lines.push($t('tracking.warning.countHint', [count]));
  }
  return lines.join('\n');
});
</script>

<template>
  <Tooltip v-if="hasWarning" placement="topLeft">
    <template #title>
      <div class="whitespace-pre-line text-left">{{ tooltipText }}</div>
    </template>
    <IconifyIcon
      icon="ant-design:exclamation-circle-filled"
      class="mr-1 inline-block size-3.5 shrink-0 cursor-help align-[-2px] text-[#faad14]"
      :aria-label="$t('tracking.warning.iconLabel')"
    />
  </Tooltip>
</template>
