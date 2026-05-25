<script lang="ts" setup>
import { computed, defineAsyncComponent, reactive, ref } from 'vue';
import {
  businessRows,
  emergencyTasks,
  exceptionSummary,
  filterModelDefaults,
  portTabs,
  processingTabs,
  serviceTabs,
  stageSteps,
} from './workbench-data';

const WorkbenchTopNav = defineAsyncComponent(
  () => import('./workbench/components/workbench-top-nav.vue'),
);
const WorkbenchPortHeader = defineAsyncComponent(
  () => import('./workbench/components/workbench-port-header.vue'),
);
const WorkbenchFilterBar = defineAsyncComponent(
  () => import('./workbench/components/workbench-filter-bar.vue'),
);
const WorkbenchEmergencyQueue = defineAsyncComponent(
  () => import('./workbench/components/workbench-emergency-queue.vue'),
);
const WorkbenchBusinessTable = defineAsyncComponent(
  () => import('./workbench/components/workbench-business-table.vue'),
);
const WorkbenchExceptionPanel = defineAsyncComponent(
  () => import('./workbench/components/workbench-exception-panel.vue'),
);

const activeServiceTab = ref('sea-export');
const activePort = ref('shanghai');
const activeProcessingTab = ref('processing');

const filterModel = reactive({ ...filterModelDefaults });
const selectedRowKeys = ref<string[]>([]);

const activePortMeta = computed(
  () => portTabs.find((item) => item.key === activePort.value) ?? portTabs[0],
);

function handleSearch() {
  // 预留接口调用：基于 filterModel + activePort + activeProcessingTab 查询
  console.log('search payload', {
    ...filterModel,
    activePort: activePort.value,
    processingTab: activeProcessingTab.value,
  });
}

function handleReset() {
  Object.assign(filterModel, filterModelDefaults);
}
</script>

<template>
  <div class="workbench-page">
    <WorkbenchTopNav v-model="activeServiceTab" :tabs="serviceTabs" />
    <WorkbenchPortHeader
      :active-port="activePort"
      :active-port-meta="activePortMeta"
      :active-processing-tab="activeProcessingTab"
      :ports="portTabs"
      :processing-tabs="processingTabs"
      @update:active-port="activePort = $event"
      @update:active-processing-tab="activeProcessingTab = $event"
    />
    <div class="workbench-layout">
      <main class="workbench-main">
        <WorkbenchFilterBar
          v-model="filterModel"
          @reset="handleReset"
          @search="handleSearch"
        />
        <WorkbenchEmergencyQueue :tasks="emergencyTasks" />
        <WorkbenchBusinessTable
          :rows="businessRows"
          :selected-row-keys="selectedRowKeys"
          :stage-steps="stageSteps"
          @update:selected-row-keys="selectedRowKeys = $event"
        />
      </main>
      <WorkbenchExceptionPanel :summary="exceptionSummary" />
    </div>
  </div>
</template>

<style scoped>
.workbench-page {
  min-height: calc(100vh - 104px);
  background: #f7f8fa;
}

.workbench-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  padding-top: 20px;
  margin-right: 20px;
}

.workbench-main {
  flex: 1;
  min-width: 760px;
  margin-left: 20px;
}

@media (max-width: 1400px) {
  .workbench-layout {
    flex-direction: column;
  }

  .workbench-main {
    min-width: 100%;
    max-width: 100%;
  }
}
</style>
