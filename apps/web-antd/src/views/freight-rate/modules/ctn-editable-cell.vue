<script lang="ts" setup>
/**
 * 运价列表箱型价格只读展示：成本（黄）在前、指导价（红）在后。
 * 字段权限：Cost / SugPrice 被屏蔽时响应省略 key，对应价不展示。
 */
import { computed } from 'vue';

import { FrightModule } from '#/api/system/permission';
import { hasMaskRule, isAlwaysMasked } from '#/composables/use-masked-fields';

interface Props {
  row: any;
  column: any;
}

const props = defineProps<Props>();
const MODULE = FrightModule.SeFreiPriceCtn;

const ctnItem = computed(() => {
  const name = (props.column?.params?.ctnName as string) || '';
  if (!name || !props.row?.seFreiPriceCtns) return undefined;
  return props.row.seFreiPriceCtns.find(
    (item: any) => item.ctnCode?.ctnName === name,
  );
});

function hasKey(obj: Record<string, any> | undefined, key: string) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function formatPrice(value: unknown): string {
  if (value === undefined || value === null || value === '') return '-';
  const num = Number(value);
  return Number.isNaN(num) ? '-' : num.toFixed(2);
}

function canShowProp(prop: 'cost' | 'sugPrice', pascal: string) {
  if (isAlwaysMasked(MODULE, pascal)) return false;
  // 有屏蔽规则时：只有响应里出现该 key 才展示（缺 key = 被裁掉）
  if (hasMaskRule(MODULE, pascal)) return hasKey(ctnItem.value, prop);
  // 无规则：有 key 才展示（兼容未返回字段）
  return hasKey(ctnItem.value, prop);
}

const display = computed(() => {
  const item = ctnItem.value;
  if (!item) {
    return { fullyMasked: false, empty: true, costText: '', sugText: '' };
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
      costText: '',
      sugText: '',
      showCost: false,
      showSug: false,
    };
  }

  return {
    fullyMasked: false,
    empty: false,
    showCost,
    showSug,
    costText: showCost ? formatPrice(item.cost) : '',
    sugText: showSug ? formatPrice(item.sugPrice) : '',
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
      <span v-if="display.showCost" class="ctn-price-cell__cost" title="成本价">
        {{ display.costText }}
      </span>
      <span
        v-if="display.showCost && display.showSug"
        class="ctn-price-cell__sep"
      >
        /
      </span>
      <span v-if="display.showSug" class="ctn-price-cell__sug" title="指导价">
        {{ display.sugText }}
      </span>
    </template>
  </div>
</template>

<style scoped>
.ctn-price-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 4px;
  align-items: baseline;
  min-height: 28px;
  padding: 2px 4px;
  line-height: 1.3;
}

.ctn-price-cell__cost {
  font-weight: 600;
  color: #d48806;
}

.ctn-price-cell__sug {
  font-weight: 600;
  color: #cf1322;
}

.ctn-price-cell__sep {
  color: hsl(var(--muted-foreground));
}

.ctn-price-cell__empty,
.ctn-price-cell__masked {
  color: hsl(var(--muted-foreground));
}
</style>
