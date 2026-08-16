<script lang="ts" setup>
/**
 * 船名/航次 合并输入组件
 * 视觉上合并为一个字段，实际仍为 vessel 和 innerVoyno 两个独立字段
 */
import { computed } from 'vue';

import { $t } from '@vben/locales';

import { IconifyIcon } from '@vben/icons';

import { Button, Input, Tooltip } from 'ant-design-vue';

import { toEnglishUpperCase } from '#/utils/english-upper-case';

interface Props {
  /** 船名（主字段，由表单绑定） */
  value?: string;
  /** 禁用 */
  disabled?: boolean;
  /** 占位符 */
  placeholder?: string;
  /** 表单上下文，用于更新 innerVoyno */
  formContext?: { setFieldValue: (field: string, value: any) => void };
  /** 第二字段名，默认 innerVoyno */
  secondFieldName?: string;
  /** 第二字段的当前值（从 formContext 或外部传入） */
  secondFieldValue?: string;
  /** 与委托信息等区域一致的控件尺寸 */
  size?: 'large' | 'middle' | 'small';
  /** 船名（主字段）flex 伸缩比例，默认 1 */
  mainRatio?: number;
  /** 船次（第二字段）flex 伸缩比例，默认 1 */
  secondRatio?: number;
  /** 是否展示尾部操作按钮（如码头船舶） */
  actionVisible?: boolean;
  /** 操作按钮 loading */
  actionLoading?: boolean;
  /** 操作按钮禁用 */
  actionDisabled?: boolean;
  /** 操作按钮 tooltip 文案 */
  actionTitle?: string;
  /** 操作按钮图标 */
  actionIcon?: string;
}

const props = withDefaults(defineProps<Props>(), {
  value: '',
  secondFieldName: 'innerVoyno',
  secondFieldValue: '',
  size: undefined,
  mainRatio: 1,
  secondRatio: 1,
  actionVisible: false,
  actionLoading: false,
  actionDisabled: false,
  actionTitle: '',
  actionIcon: 'mdi:ferry',
});

const emit = defineEmits<{
  'update:value': [value: string];
  action: [];
}>();

const vesselValue = computed(() => props.value ?? '');

const voyageValue = computed(() => props.secondFieldValue ?? '');
</script>

<template>
  <div class="flex w-full items-center gap-2">
    <Input
      :value="vesselValue"
      :disabled="props.disabled"
      :placeholder="$t('seaExport.export.vessel')"
      :size="props.size"
      class="min-w-0"
      :style="{ flex: props.mainRatio }"
      allow-clear
      @update:value="(v) => emit('update:value', toEnglishUpperCase(v))"
    />
    <Input
      :value="voyageValue"
      :disabled="props.disabled"
      :placeholder="$t('seaExport.export.innerVoyno')"
      :size="props.size"
      class="min-w-0"
      :style="{ flex: props.secondRatio }"
      allow-clear
      @update:value="
        (v) =>
          props.formContext?.setFieldValue(
            props.secondFieldName,
            toEnglishUpperCase(v),
          )
      "
    />
    <Tooltip v-if="props.actionVisible" :title="props.actionTitle">
      <Button
        :size="props.size"
        :loading="props.actionLoading"
        :disabled="props.disabled || props.actionDisabled"
        class="shrink-0 !px-1.5"
        @click="emit('action')"
      >
        <IconifyIcon :icon="props.actionIcon" class="size-4" />
      </Button>
    </Tooltip>
  </div>
</template>
