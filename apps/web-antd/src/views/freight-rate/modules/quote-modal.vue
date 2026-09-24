<script lang="ts" setup>
import type { SeFreiPriceOutDto } from '#/api/sea-export/freight-rate-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { $t } from '#/locales';
import { copyTextToClipboard } from '#/views/schedule-query/copy-text';

import {
  buildFreightQuoteFields,
  buildFreightQuoteText,
} from '../build-freight-quote-text';

defineOptions({ name: 'FreightRateQuoteModal' });

const row = ref<SeFreiPriceOutDto | null>(null);

const quoteText = computed(() =>
  row.value ? buildFreightQuoteText(row.value) : '',
);

const quoteFields = computed(() =>
  row.value ? buildFreightQuoteFields(row.value) : [],
);

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  showCancelButton: false,
  confirmText: $t('seaExport.freightRate.copyQuote'),
  onOpenChange(isOpen) {
    if (!isOpen) {
      row.value = null;
      return;
    }
    const data = modalApi.getData<{ row?: SeFreiPriceOutDto }>();
    row.value = data?.row ?? null;
  },
  async onConfirm() {
    if (!quoteText.value) return false;
    const ok = await copyTextToClipboard(quoteText.value);
    if (ok) {
      message.success($t('seaExport.freightRate.copyQuoteSuccess'));
    } else {
      message.error($t('seaExport.freightRate.copyQuoteFailed'));
    }
    // 复制后仍保留弹窗，方便核对文案
    return false;
  },
});
</script>

<template>
  <Modal :title="$t('seaExport.freightRate.quoteTitle')" class="w-[520px]">
    <div class="freight-quote-body">
      <template v-for="(field, index) in quoteFields" :key="index">
        <div v-if="field.type === 'sep'" class="freight-quote-sep"></div>
        <div v-else class="freight-quote-row">
          <div class="freight-quote-label">{{ field.label }}</div>
          <div class="freight-quote-value">{{ field.value }}</div>
        </div>
      </template>
    </div>
  </Modal>
</template>

<style scoped>
.freight-quote-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 4px 8px;
  font-size: 14px;
  line-height: 1.5;
  color: hsl(var(--foreground));
}

.freight-quote-row {
  display: grid;
  grid-template-columns: 7.5em 1fr;
  gap: 12px;
  align-items: start;
}

.freight-quote-label {
  color: hsl(var(--foreground) / 65%);
  text-align: right;
  white-space: nowrap;
}

.freight-quote-label::after {
  content: '：';
}

.freight-quote-value {
  min-width: 0;
  text-align: left;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.freight-quote-sep {
  height: 1px;
  margin: 6px 0;
  background: hsl(var(--border));
}
</style>
