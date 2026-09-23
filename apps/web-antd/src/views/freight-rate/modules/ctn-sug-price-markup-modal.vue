<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue';
import { InputNumber, Modal, message } from 'ant-design-vue';

import { useCtnSugPriceMarkup } from './composables/useCtnSugPriceMarkup';

export type CtnMarkupOption = {
  ctnCodeId: string | number;
  ctnName: string;
};

const props = defineProps<{
  ctnTypes: CtnMarkupOption[];
}>();

const emit = defineEmits<{
  applied: [];
}>();

const { markupByCtnId, setMarkups } = useCtnSugPriceMarkup();

const open = ref(false);
const confirming = ref(false);
const draft = reactive<Record<string, number | null>>({});

const sortedTypes = computed(() =>
  [...props.ctnTypes].sort((a, b) =>
    String(a.ctnName).localeCompare(String(b.ctnName), 'zh-CN'),
  ),
);

function syncDraftFromStore() {
  Object.keys(draft).forEach((key) => delete draft[key]);
  sortedTypes.value.forEach((ctn) => {
    const id = String(ctn.ctnCodeId);
    const existing = markupByCtnId.value[id];
    draft[id] = typeof existing === 'number' ? existing : null;
  });
}

function handleOpen() {
  syncDraftFromStore();
  open.value = true;
}

async function handleOk() {
  confirming.value = true;
  try {
    const next: Record<string, number> = {};
    Object.entries(draft).forEach(([id, value]) => {
      if (value === null || value === undefined) return;
      const num = Number(value);
      if (!Number.isNaN(num)) next[id] = num;
    });
    setMarkups(next);
    message.success('加价规则已保存并已按规则生成指导价');
    // 先通知父级立即套用，再关本弹窗；用 Ant Modal 避免嵌套 useVbenModal 误关「批量新增」
    emit('applied');
    open.value = false;
  } finally {
    confirming.value = false;
  }
}

watch(
  () => props.ctnTypes,
  () => {
    if (open.value) syncDraftFromStore();
  },
  { deep: true },
);

defineExpose({
  open: handleOpen,
});
</script>

<template>
  <Modal
    v-model:open="open"
    title="指导价生成规则"
    :confirm-loading="confirming"
    :mask-closable="false"
    :destroy-on-close="false"
    ok-text="保存并应用"
    cancel-text="取消"
    width="560px"
    @ok="handleOk"
  >
    <div class="markup-modal">
      <p class="markup-modal__hint">
        为每个箱型配置一个加价值。保存后立即按「成本 + 加价 =
        指导价」生成；之后也可单独改成本或指导价。
      </p>
      <div v-if="sortedTypes.length === 0" class="markup-modal__empty">
        请先添加箱型列后再配置加价规则
      </div>
      <div v-else class="markup-modal__list">
        <div
          v-for="ctn in sortedTypes"
          :key="String(ctn.ctnCodeId)"
          class="markup-modal__row"
        >
          <span class="markup-modal__name">{{ ctn.ctnName }}</span>
          <span class="markup-modal__formula">成本 +</span>
          <InputNumber
            v-model:value="draft[String(ctn.ctnCodeId)]"
            class="markup-modal__input"
            :precision="0"
            placeholder="加价"
            allow-clear
          />
          <span class="markup-modal__formula">= 指导价</span>
        </div>
      </div>
      <div class="markup-modal__legend">
        <span class="markup-modal__cost">成本价（黄）</span>
        <span class="markup-modal__sep">/</span>
        <span class="markup-modal__sug">指导价（红）</span>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.markup-modal__hint {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
}

.markup-modal__empty {
  padding: 24px;
  color: hsl(var(--muted-foreground));
  text-align: center;
  background: hsl(var(--muted) / 40%);
  border-radius: 8px;
}

.markup-modal__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 360px;
  overflow: auto;
}

.markup-modal__row {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  background: hsl(var(--muted) / 30%);
  border-radius: 8px;
}

.markup-modal__name {
  flex: 0 0 88px;
  font-weight: 600;
}

.markup-modal__formula {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.markup-modal__input {
  width: 120px;
}

.markup-modal__legend {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: flex-end;
  margin-top: 14px;
  font-size: 12px;
}

.markup-modal__cost {
  font-weight: 600;
  color: #d48806;
}

.markup-modal__sug {
  font-weight: 600;
  color: #cf1322;
}

.markup-modal__sep {
  color: hsl(var(--muted-foreground));
}
</style>
