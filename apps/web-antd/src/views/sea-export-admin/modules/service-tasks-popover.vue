<script setup lang="ts">
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { computed, ref, watch } from 'vue';
import { useAccess } from '@vben/access';
import { useUserStore } from '@vben/stores';
import { Button, Empty, message, Modal, Popover, Spin } from 'ant-design-vue';

import { getSeaExportServices } from '#/api/sea-export/sea-export-admin';
import {
  cancelCompleteSeServiceTask,
  completeSeServiceTask,
} from '#/api/sea-export/se-service-task-admin';
import { showGeneratedFeesIfAny } from '#/views/_shared/se-service-task/show-generated-fees';
import { markEntitiesShouldRefresh } from '#/utils/list-refresh-flag';
import {
  getActiveServiceSortId,
  getServiceTaskActions,
} from '../service-task-state';

type Service = SeaExportAdminApi.SeaExportServiceDto;
const props = defineProps<{
  seaExportId: string;
  labels: Map<number, string>;
  processes: Map<number, boolean>;
}>();
const emit = defineEmits<{ refreshed: [services: Service[]] }>();
const { hasAccessByCodes } = useAccess();
const userStore = useUserStore();
const open = ref(false);
const loading = ref(false);
const failed = ref(false);
const busy = ref<string>();
const services = ref<Service[]>([]);
let requestVersion = 0;
const activeSortId = computed(() => getActiveServiceSortId(services.value));
const doneCount = computed(
  () =>
    services.value.filter((item) => item.seServiceTask?.serviceTaskStatus === 1)
      .length,
);
const groups = computed(() => {
  const buckets: { sortId: number; items: Service[] }[] = [];
  for (const item of services.value) {
    const last = buckets.at(-1);
    if (last && last.sortId === item.sortId) last.items.push(item);
    else buckets.push({ sortId: item.sortId, items: [item] });
  }
  return buckets;
});
const label = (item: Service) =>
  props.labels.get(item.serviceType) ?? `服务项${item.serviceType}`;
const actions = (item: Service) =>
  getServiceTaskActions(
    item,
    activeSortId.value,
    userStore.userInfo?.userId,
    hasAccessByCodes(['Admin.Workbench.Operation.Processe']),
  );
const status = (item: Service) => {
  if (item.seServiceTask?.serviceTaskStatus === 1) return '已完成';
  if (!item.seServiceTask?.id) return '未生成任务';
  return item.sortId === activeSortId.value ? '待处理' : '未轮到';
};
const tone = (item: Service) => {
  if (item.seServiceTask?.serviceTaskStatus === 1) return 'done';
  if (!item.seServiceTask?.id) return 'missing';
  return item.sortId === activeSortId.value ? 'active' : 'upcoming';
};
const handlers = (item: Service) =>
  item.seServiceTask?.seServiceTaskUsers
    ?.map((user) => user.userNickName || '-')
    .join('、') || '未分配';
const formatTime = (value?: string | null) =>
  value ? value.replace('T', ' ').slice(0, 16) : '';

async function load() {
  const version = ++requestVersion;
  loading.value = true;
  failed.value = false;
  services.value = [];
  try {
    const result = await getSeaExportServices(props.seaExportId);
    if (version !== requestVersion) return;
    services.value = [...(result ?? [])].sort((a, b) => a.sortId - b.sortId);
    emit('refreshed', services.value);
  } catch {
    if (version === requestVersion) failed.value = true;
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}

watch(
  () => props.seaExportId,
  () => {
    ++requestVersion;
    services.value = [];
    loading.value = false;
    failed.value = false;
    open.value = false;
  },
);

function onOpenChange(value: boolean) {
  if (busy.value) return;
  open.value = value;
  if (value) void load();
}

async function complete(item: Service) {
  const taskId = item.seServiceTask?.id;
  if (busy.value || loading.value || !taskId || !actions(item).canComplete)
    return;
  busy.value = taskId;
  const seaExportId = props.seaExportId;
  try {
    // 与详情共用完成接口：后端校验处理人、必填字段、附件和费用，并生成后续任务。
    const result = await completeSeServiceTask({ id: taskId });
    markEntitiesShouldRefresh('SeaExport', [seaExportId]);
    message.success(`${label(item)}已完成`);
    await load();
    showGeneratedFeesIfAny(result);
  } catch {
    // 业务校验错误由全局拦截器显示；重新查询以避免继续操作过期任务。
    await load();
  } finally {
    busy.value = undefined;
  }
}

function cancel(item: Service) {
  const taskId = item.seServiceTask?.id;
  if (busy.value || loading.value || !taskId || !actions(item).canCancel)
    return;
  busy.value = taskId;
  const seaExportId = props.seaExportId;
  Modal.confirm({
    title: '确认取消完成',
    content: `取消「${label(item)}」服务完成后，所有服务项目都会重新生成任务。是否继续？`,
    okText: '继续',
    cancelText: '取消',
    okType: 'danger',
    onCancel: () => {
      busy.value = undefined;
    },
    onOk: async () => {
      try {
        await cancelCompleteSeServiceTask({ id: taskId });
        markEntitiesShouldRefresh('SeaExport', [seaExportId]);
        message.success(`${label(item)}已取消完成`);
        await load();
      } catch {
        await load();
      } finally {
        busy.value = undefined;
      }
    },
  });
}
</script>

<template>
  <Popover
    :open="open"
    placement="rightTop"
    overlay-class-name="sea-export-service-tasks-popover"
    :trigger="['hover', 'focus']"
    :mouse-enter-delay="0.2"
    :mouse-leave-delay="0.3"
    @open-change="onOpenChange"
  >
    <template #content>
      <div class="service-flow" @click.stop @dblclick.stop>
        <div class="service-flow__head">
          <span class="service-flow__title">本票业务流程</span>
          <span v-if="services.length" class="service-flow__count">
            已完成 {{ doneCount }}/{{ services.length }}
          </span>
        </div>
        <Spin :spinning="loading">
          <div v-if="failed" class="service-flow__state">
            服务项加载失败
            <Button type="link" @click="load">重试</Button>
          </div>
          <Empty
            v-else-if="!loading && services.length === 0"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
            description="本票暂无服务项"
          />
          <div v-else class="service-flow__body">
            <div
              v-for="group in groups"
              :key="group.sortId"
              class="service-flow__group"
              :class="{
                'is-parallel': group.items.length > 1,
                'is-current': group.sortId === activeSortId,
              }"
            >
              <div v-if="group.items.length > 1" class="service-flow__parallel">
                并行
              </div>
              <div
                v-for="item in group.items"
                :key="item.serviceType"
                class="service-flow__item"
                :class="`is-${tone(item)}`"
              >
                <div class="service-flow__axis">
                  <span class="service-flow__dot"></span>
                </div>
                <div class="service-flow__card">
                  <div class="service-flow__row">
                    <span class="service-flow__name">{{ label(item) }}</span>
                    <span
                      v-if="processes.get(item.serviceType)"
                      class="service-flow__process"
                    >
                      主流程
                    </span>
                    <span class="service-flow__status">{{ status(item) }}</span>
                  </div>
                  <div
                    class="service-flow__meta"
                    :class="{
                      'is-plain': item.seServiceTask?.serviceTaskStatus === 1,
                    }"
                  >
                    <div
                      v-if="item.seServiceTask?.serviceTaskStatus === 1"
                      class="service-flow__done"
                    >
                      <div class="service-flow__done-main">
                        <span class="service-flow__done-text">
                          完成人
                          {{ item.seServiceTask.completionUserNickName || '-' }}
                        </span>
                        <Button
                          v-if="actions(item).canCancel"
                          type="link"
                          size="small"
                          danger
                          class="service-flow__cancel"
                          :loading="busy === item.seServiceTask?.id"
                          :disabled="!!busy || loading"
                          @click="cancel(item)"
                        >
                          取消完成
                        </Button>
                      </div>
                      <div
                        v-if="formatTime(item.seServiceTask.completionTime)"
                        class="service-flow__done-time"
                      >
                        {{ formatTime(item.seServiceTask.completionTime) }}
                      </div>
                    </div>
                    <div v-else class="service-flow__meta-line">
                      <span>处理人</span>
                      <strong>{{ handlers(item) }}</strong>
                    </div>
                  </div>
                  <Button
                    v-if="actions(item).canComplete"
                    block
                    size="small"
                    type="primary"
                    :loading="busy === item.seServiceTask?.id"
                    :disabled="!!busy || loading"
                    @click="complete(item)"
                  >
                    完成
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Spin>
      </div>
    </template>
    <span
      tabindex="0"
      class="inline-flex cursor-pointer"
      @click.stop
      @dblclick.stop
      ><slot
    /></span>
  </Popover>
</template>

<style scoped>
.service-flow {
  width: 336px;
  max-width: 80vw;
  color: #1b1c1c;
}

.service-flow__head {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 10px;
  border-bottom: 1px solid #f1f5f9;
}

.service-flow__title {
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  color: #0f172a;
}

.service-flow__count {
  flex-shrink: 0;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 18px;
  color: #64748b;
}

.service-flow__state {
  padding: 28px 16px;
  font-size: 13px;
  line-height: 20px;
  color: #64748b;
  text-align: center;
}

.service-flow__body {
  min-height: 72px;
  max-height: min(32rem, calc(100vh - 160px));
  padding: 8px 12px 12px;
  overflow: auto;
  scrollbar-width: thin;
}

.service-flow__group.is-parallel {
  padding: 6px 6px 2px;
  margin: 4px 0;
  background: #f8fafc;
  border-radius: 12px;
}

.service-flow__group.is-current.is-parallel {
  background: #fffbeb;
  box-shadow: inset 0 0 0 1px #fde68a;
}

.service-flow__parallel {
  margin: 0 0 2px 26px;
  font-size: 11px;
  line-height: 16px;
  color: #94a3b8;
}

.service-flow__item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  column-gap: 8px;
}

.service-flow__axis {
  position: relative;
  display: flex;
  justify-content: center;
}

.service-flow__axis::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  content: '';
  background: #e6ebf2;
  transform: translateX(-50%);
}

.service-flow__group:first-child
  .service-flow__item:first-child
  .service-flow__axis::before {
  top: 14px;
}

.service-flow__group:last-child
  .service-flow__item:last-child
  .service-flow__axis::before {
  bottom: calc(100% - 14px);
}

.service-flow__dot {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  width: 9px;
  height: 9px;
  margin-top: 10px;
  background: #fff;
  border: 2px solid #cbd5e1;
  border-radius: 50%;
}

.service-flow :deep(.ant-empty) {
  margin: 8px 0 16px;
}

.service-flow__item.is-done .service-flow__dot {
  background: #16a34a;
  border-color: #16a34a;
}

.service-flow__item.is-active .service-flow__dot {
  background: #fff;
  border-color: #d97706;
  box-shadow: 0 0 0 3px rgb(217 119 6 / 18%);
}

.service-flow__card {
  min-width: 0;
  padding: 4px 8px 6px;
  margin-bottom: 2px;
  border-radius: 10px;
}

.service-flow__item.is-active .service-flow__card {
  padding: 8px 8px 10px;
  background: #fffbeb;
  box-shadow: inset 0 0 0 1px #fde68a;
}

.service-flow__group.is-current.is-parallel
  .service-flow__item.is-active
  .service-flow__card {
  background: transparent;
  box-shadow: none;
}

.service-flow__row {
  display: flex;
  gap: 6px;
  align-items: center;
  min-height: 22px;
}

.service-flow__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  color: #0f172a;
  white-space: nowrap;
}

.service-flow__item.is-upcoming .service-flow__name,
.service-flow__item.is-missing .service-flow__name {
  font-weight: 500;
  color: #64748b;
}

.service-flow__process,
.service-flow__status {
  flex-shrink: 0;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 500;
  line-height: 18px;
  border-radius: 999px;
}

.service-flow__process {
  color: #1d4ed8;
  background: #eff6ff;
}

.service-flow__status {
  margin-left: auto;
}

.service-flow__item.is-done .service-flow__status {
  color: #005313;
  background: #d8f3e6;
}

.service-flow__item.is-active .service-flow__status {
  color: #854d0e;
  background: #fef3c7;
}

.service-flow__item.is-upcoming .service-flow__status,
.service-flow__item.is-missing .service-flow__status {
  color: #64748b;
  background: #f1f5f9;
}

.service-flow__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  margin-top: 6px;
  background: #f8fafc;
  border-radius: 8px;
}

.service-flow__meta.is-plain {
  padding: 0;
  margin-top: 2px;
  background: transparent;
}

.service-flow__item.is-active .service-flow__meta {
  background: rgb(255 255 255 / 78%);
}

.service-flow__meta-line {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  font-size: 12px;
  line-height: 18px;
}

.service-flow__meta-line span {
  flex-shrink: 0;
  color: rgb(0 0 0 / 45%);
}

.service-flow__meta-line strong {
  min-width: 0;
  font-weight: 500;
  color: #334155;
  text-align: right;
  word-break: break-all;
}

.service-flow__done-main {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.service-flow__done-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  line-height: 18px;
  color: #64748b;
  white-space: nowrap;
}

.service-flow__done-time {
  font-size: 12px;
  line-height: 18px;
  color: #94a3b8;
}

.service-flow__card :deep(.ant-btn-primary) {
  height: 28px;
  margin-top: 8px;
  font-size: 12px;
  border-radius: 6px;
}

.service-flow__card :deep(.service-flow__cancel) {
  flex-shrink: 0;
  height: 22px;
  padding: 0 0 0 8px;
  font-size: 12px;
}
</style>

<style>
.sea-export-service-tasks-popover .ant-popover-inner {
  padding: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e8edf5;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgb(15 23 42 / 12%);
}

.sea-export-service-tasks-popover .ant-popover-inner-content {
  padding: 0;
}
</style>
