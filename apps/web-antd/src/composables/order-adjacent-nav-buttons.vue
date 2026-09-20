<script lang="ts" setup>
import { Button, Tooltip } from 'ant-design-vue';

defineProps<{
  canGoNext: boolean;
  canGoPrev: boolean;
  loading?: boolean;
}>();

const emit = defineEmits<{
  next: [];
  prev: [];
}>();
</script>

<template>
  <div class="order-adjacent-nav">
    <Tooltip :title="canGoPrev ? '' : '没有上一票'">
      <span class="order-adjacent-nav__hit">
        <Button
          size="small"
          :disabled="!canGoPrev"
          :loading="loading"
          @click="emit('prev')"
        >
          上一票
        </Button>
      </span>
    </Tooltip>
    <Tooltip :title="canGoNext ? '' : '没有下一票'">
      <span class="order-adjacent-nav__hit">
        <Button
          size="small"
          :disabled="!canGoNext"
          :loading="loading"
          @click="emit('next')"
        >
          下一票
        </Button>
      </span>
    </Tooltip>
  </div>
</template>

<style scoped>
.order-adjacent-nav {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
  margin-left: auto;
}

.order-adjacent-nav__hit {
  display: inline-flex;
}
</style>
