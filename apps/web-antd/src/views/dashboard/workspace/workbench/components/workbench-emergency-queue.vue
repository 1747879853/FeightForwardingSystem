<script lang="ts">
export default {
  name: 'WorkbenchEmergencyQueue',
};
</script>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import type { EmergencyTask } from '../../workbench-data';

interface Props {
  tasks: EmergencyTask[];
}

const props = defineProps<Props>();

function parseCountdown(value: string): number {
  const [h = 0, m = 0, s = 0] = value
    .split(':')
    .map((part) => Number(part) || 0);
  return h * 3600 + m * 60 + s;
}

function formatCountdown(totalSeconds: number): string {
  const sec = Math.max(0, totalSeconds);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

const remainingSeconds = ref<Record<string, number>>({});

function syncCountdownFromTasks() {
  const next: Record<string, number> = {};
  for (const task of props.tasks) {
    next[task.id] = parseCountdown(task.countdown);
  }
  remainingSeconds.value = next;
}

syncCountdownFromTasks();
watch(() => props.tasks, syncCountdownFromTasks, { deep: true });

function displayCountdown(taskId: string): string {
  return formatCountdown(remainingSeconds.value[taskId] ?? 0);
}

let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  timer = setInterval(() => {
    const next = { ...remainingSeconds.value };
    for (const id of Object.keys(next)) {
      if (next[id] > 0) {
        next[id] -= 1;
      }
    }
    remainingSeconds.value = next;
  }, 1000);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<template>
  <section class="emergency">
    <header class="emergency__header">
      <div class="emergency__title-wrap">
        <span class="emergency__bar"></span>
        <h3 class="emergency__title">紧急处理任务 (Emergency Queue)</h3>
      </div>
      <button class="emergency__all" type="button">查看全部任务</button>
    </header>

    <div class="emergency__list">
      <article v-for="task in tasks" :key="task.id" class="task-card">
        <div class="task-card__head">
          <span class="task-card__category">
            <IconifyIcon
              class="task-card__category-icon"
              icon="ant-design:warning-filled"
            />
            {{ task.category }}
          </span>
          <span class="task-card__timer">
            <IconifyIcon
              class="task-card__timer-icon"
              icon="ant-design:clock-circle-outlined"
            />
            {{ displayCountdown(task.id) }}
          </span>
        </div>
        <p class="task-card__title">{{ task.title }}</p>
        <div class="task-card__foot">
          <span class="task-card__so">SO: {{ task.soNo }}</span>
          <button class="task-card__action" type="button">立即处理</button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.emergency {
  margin-top: 22px;
}

.emergency__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.emergency__title-wrap {
  display: flex;
  gap: 8px;
  align-items: center;
}

.emergency__bar {
  width: 6px;
  height: 16px;
  background: #eb4747;
  border-radius: 3px;
}

.emergency__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #eb4747;
}

.emergency__all {
  font-size: 12px;
  color: #555d6d;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.emergency__list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.task-card {
  padding: 11px 12px 10px;
  background: #fff;
  border: 1px solid rgb(235 71 71 / 20%);
  border: 0.5px solid #eff0f2;
  border-radius: 16px;
  box-shadow: 0 2px 8px 0 rgb(150 199 217 / 6%);
}

.task-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.task-card__category {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: #eb4747;
}

.task-card__category-icon {
  flex-shrink: 0;
  font-size: 14px;
  color: #eb4747;
}

.task-card__timer {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 0 8px;
  font-size: 12px;
  line-height: 20px;
  color: #eb4747;
  background: rgb(235 71 71 / 10%);
  border-radius: 4px;
}

.task-card__timer-icon {
  flex-shrink: 0;
  font-size: 12px;
  color: #eb4747;
}

.task-card__title {
  min-height: 40px;
  margin: 12px 0;
  font-size: 14px;
  line-height: 20px;
  color: #181b20;
}

.task-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.task-card__so {
  font-size: 12px;
  color: #555d6d;
}

.task-card__action {
  height: 28px;
  padding: 0 11px;
  font-size: 12px;
  color: #eb4747;
  cursor: pointer;
  background: #fff;
  border: 1px solid #eb4747;
  border-radius: 6px;
}

@media (max-width: 1200px) {
  .emergency__list {
    grid-template-columns: 1fr;
  }
}
</style>
