<script setup lang="ts">
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { computed, ref, watch } from 'vue';
import { useAccess } from '@vben/access';
import { useUserStore } from '@vben/stores';
import {
  Button,
  Empty,
  message,
  Modal,
  Popover,
  Spin,
  Tag,
} from 'ant-design-vue';

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
    title="本票业务流程"
    placement="rightTop"
    :trigger="['hover', 'focus']"
    :mouse-enter-delay="0.2"
    :mouse-leave-delay="0.2"
    @open-change="onOpenChange"
  >
    <template #content>
      <div
        class="max-h-[min(24rem,calc(100vh-100px))] w-[460px] max-w-[80vw] overflow-y-auto"
        @click.stop
        @dblclick.stop
      >
        <Spin :spinning="loading">
          <div v-if="failed" class="py-4 text-center">
            服务项加载失败
            <Button type="link" @click="load">重试</Button>
          </div>
          <Empty
            v-else-if="!loading && services.length === 0"
            description="本票暂无服务项"
          />
          <div v-else class="min-h-12">
            <div
              v-for="item in services"
              :key="item.serviceType"
              class="flex items-center gap-3 border-b border-border py-3 last:border-0"
            >
              <div class="min-w-0 flex-1">
                <div class="mb-1 flex items-center gap-2">
                  <span class="font-medium">{{ label(item) }}</span>
                  <Tag v-if="processes.get(item.serviceType)" color="blue"
                    >主流程</Tag
                  >
                  <Tag
                    :color="
                      item.seServiceTask?.serviceTaskStatus === 1
                        ? 'green'
                        : item.sortId === activeSortId
                          ? 'gold'
                          : undefined
                    "
                    >{{ status(item) }}</Tag
                  >
                </div>
                <div class="text-xs text-muted-foreground">
                  <template v-if="item.seServiceTask?.serviceTaskStatus === 1">
                    完成人：{{
                      item.seServiceTask.completionUserNickName || '-'
                    }}
                    <span class="ml-2">{{
                      item.seServiceTask.completionTime
                        ?.replace('T', ' ')
                        .slice(0, 19)
                    }}</span>
                  </template>
                  <template v-else>
                    处理人：{{
                      item.seServiceTask?.seServiceTaskUsers
                        ?.map((user) => user.userNickName || '-')
                        .join('、') || '未分配'
                    }}
                  </template>
                </div>
              </div>
              <Button
                v-if="actions(item).canComplete"
                size="small"
                type="primary"
                :loading="busy === item.seServiceTask?.id"
                :disabled="!!busy || loading"
                @click="complete(item)"
                >完成</Button
              >
              <Button
                v-else-if="actions(item).canCancel"
                size="small"
                danger
                :loading="busy === item.seServiceTask?.id"
                :disabled="!!busy || loading"
                @click="cancel(item)"
                >取消完成</Button
              >
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
