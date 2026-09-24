<script lang="ts" setup>
/**
 * 运价列表箱型价格：成本 | 指导价 分区展示。
 * 每个价格右上角跟涨跌额（涨红跌绿）。
 */
import type { CtnPriceChange } from '../freight-price-change';

import { computed } from 'vue';

import { FrightModule } from '#/api/system/permission';
import { hasMaskRule, isAlwaysMasked } from '#/composables/use-masked-fields';

interface Props {
  row: any;
  column: any;
}

const props = defineProps<Props>();
const MODULE = FrightModule.SeFreiPriceCtn;

const ctnName = computed(() => (props.column?.params?.ctnName as string) || '');

const ctnItem = computed(() => {
  const name = ctnName.value;
  if (!name || !props.row?.seFreiPriceCtns) return undefined;
  return props.row.seFreiPriceCtns.find(
    (item: any) => item.ctnCode?.ctnName === name,
  );
});

const priceChange = computed<CtnPriceChange | undefined>(() => {
  const name = ctnName.value;
  if (!name) return undefined;
  return props.row?._priceChange?.[name] as CtnPriceChange | undefined;
});

function hasKey(obj: Record<string, any> | undefined, key: string) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function formatPrice(value: unknown): string {
  if (value === undefined || value === null || value === '') return '-';
  const num = Number(value);
  return Number.isNaN(num) ? '-' : num.toFixed(2);
}

function formatDelta(delta: number | undefined): string {
  if (delta === undefined) return '';
  const abs = Math.abs(delta);
  const text = Number.isInteger(abs) ? String(abs) : abs.toFixed(2);
  return delta > 0 ? `↑${text}` : `↓${text}`;
}

function canShowProp(prop: 'cost' | 'sugPrice', pascal: string) {
  if (isAlwaysMasked(MODULE, pascal)) return false;
  if (hasMaskRule(MODULE, pascal)) return hasKey(ctnItem.value, prop);
  return hasKey(ctnItem.value, prop);
}

const display = computed(() => {
  const item = ctnItem.value;
  if (!item) {
    return {
      fullyMasked: false,
      empty: true,
      showCost: false,
      showSug: false,
    };
  }

  const showCost = canShowProp('cost', 'Cost');
  const showSug = canShowProp('sugPrice', 'SugPrice');

  if (!showCost && !showSug) {
    const bothAlways =
      isAlwaysMasked(MODULE, 'Cost') && isAlwaysMasked(MODULE, 'SugPrice');
    const bothRuledOut =
      (hasMaskRule(MODULE, 'Cost') || isAlwaysMasked(MODULE, 'Cost')) &&
      (hasMaskRule(MODULE, 'SugPrice') || isAlwaysMasked(MODULE, 'SugPrice'));
    return {
      fullyMasked: bothAlways || bothRuledOut,
      empty: true,
      showCost: false,
      showSug: false,
    };
  }

  const change = priceChange.value;
  return {
    fullyMasked: false,
    empty: false,
    showCost,
    showSug,
    showDivider: showCost && showSug,
    costText: showCost ? formatPrice(item.cost) : '',
    sugText: showSug ? formatPrice(item.sugPrice) : '',
    costDelta: showCost ? change?.costDelta : undefined,
    sugDelta: showSug ? change?.sugDelta : undefined,
  };
});
</script>

<template>
  <div class="ctn-price-cell">
    <template v-if="display.fullyMasked">
      <span class="ctn-price-cell__masked">***</span>
    </template>
    <template v-else-if="display.empty">
      <span class="ctn-price-cell__empty">-</span>
    </template>
    <template v-else>
      <div
        v-if="display.showCost"
        class="ctn-price-cell__block"
        :class="{
          'ctn-price-cell__block--delta': display.costDelta !== undefined,
        }"
      >
        <span
          class="ctn-price-cell__value ctn-price-cell__value--cost"
          title="成本价"
        >
          {{ display.costText }}
          <span
            v-if="display.costDelta !== undefined"
            class="ctn-price-cell__delta"
            :class="
              display.costDelta > 0
                ? 'ctn-price-cell__delta--up'
                : 'ctn-price-cell__delta--down'
            "
            :title="`成本较上期 ${formatDelta(display.costDelta)}`"
          >
            {{ formatDelta(display.costDelta) }}
          </span>
        </span>
      </div>

      <div
        v-if="display.showDivider"
        class="ctn-price-cell__divider"
        aria-hidden="true"
      ></div>

      <div
        v-if="display.showSug"
        class="ctn-price-cell__block"
        :class="{
          'ctn-price-cell__block--delta': display.sugDelta !== undefined,
        }"
      >
        <span
          class="ctn-price-cell__value ctn-price-cell__value--sug"
          title="指导价"
        >
          {{ display.sugText }}
          <span
            v-if="display.sugDelta !== undefined"
            class="ctn-price-cell__delta"
            :class="
              display.sugDelta > 0
                ? 'ctn-price-cell__delta--up'
                : 'ctn-price-cell__delta--down'
            "
            :title="`指导价较上期 ${formatDelta(display.sugDelta)}`"
          >
            {{ formatDelta(display.sugDelta) }}
          </span>
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ctn-price-cell {
  display: flex;
  gap: 0;
  align-items: stretch;
  min-height: 32px;
  padding: 2px 0;
  line-height: 1.2;
}

.ctn-price-cell__block {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 4px 6px 2px;
}

.ctn-price-cell__block--delta {
  /* 给价格右上角徽标留位，避免压到分割线或相邻区 */
  padding-right: 28px;
}

.ctn-price-cell__divider {
  flex: 0 0 1px;
  align-self: stretch;
  margin: 4px 0;
  background: hsl(var(--border));
}

.ctn-price-cell__value {
  position: relative;
  display: inline-block;
  max-width: 100%;
  overflow: visible;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.ctn-price-cell__value--cost {
  color: #d48806;
}

.ctn-price-cell__value--sug {
  color: #cf1322;
}

/* 涨跌贴在对应价格文字的右上角 */
.ctn-price-cell__delta {
  position: absolute;
  top: -8px;
  left: 100%;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  padding: 0 3px;
  margin-left: 1px;
  font-size: 9px;
  font-weight: 600;
  line-height: 1.35;
  color: #fff;
  white-space: nowrap;
  pointer-events: none;
  border-radius: 2px;
}

.ctn-price-cell__delta--up {
  background: #f5222d;
}

.ctn-price-cell__delta--down {
  background: #52c41a;
}

.ctn-price-cell__empty,
.ctn-price-cell__masked {
  padding: 0 6px;
  color: hsl(var(--muted-foreground));
}
</style>
