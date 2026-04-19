<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Input, message, Select, Space, Spin, Switch } from 'ant-design-vue';

import {
  editWorkFlow,
  getTaskTypeOptions,
  getWorkFlowDetail,
  TaskType,
} from '#/api/system/workflow-admin';
import { $t } from '#/locales';

import {
  flatToTree,
  treeToFlat,
  ensureAllRealNodeIds,
  generateUUID,
} from './utils/converter';
import { useWorkflowStore } from './store';
import nodeWrap from './modules/node-wrap.vue';
import addNode from './modules/add-node.vue';
import errorDialog from './modules/dialogs/error-dialog.vue';
import promoterDrawer from './modules/drawers/promoter-drawer.vue';
import approverDrawer from './modules/drawers/approver-drawer.vue';
import copyerDrawer from './modules/drawers/copyer-drawer.vue';
import conditionDrawer from './modules/drawers/condition-drawer.vue';

const route = useRoute();
const router = useRouter();
const store = useWorkflowStore();

const workflowId = computed(() => route.params.id);

const workflowName = ref('');
const taskType = ref(TaskType.PaymentApplication);
const enable = ref(true);
const nodeConfig = ref({});
const flowPermission = ref([]);
const directorMaxLevel = ref(4);
const loading = ref(false);
const saving = ref(false);
const nowVal = ref(100);

const tipList = ref([]);
const tipVisible = ref(false);

const taskTypeOptions = computed(() =>
  getTaskTypeOptions().map((o) => ({ label: o.label, value: o.value })),
);

function isFlatDetail(d) {
  return d && Array.isArray(d.nodes) && Array.isArray(d.transitions);
}

function createDefaultNodeConfig() {
  return {
    id: generateUUID(),
    nodeName: '审核人',
    type: 1,
    error: false,
    passMethod: 0,
    auditors: [],
    _displayStr: '直接通过',
    settype: 1,
    selectMode: 0,
    selectRange: 0,
    directorLevel: 1,
    examineMode: 1,
    noHanderAction: 1,
    examineEndDirectorLevel: 0,
    childNode: null,
    nodeUserList: [],
    conditionList: [],
    conditionNodes: [],
  };
}

async function loadData() {
  if (!workflowId.value) {
    nodeConfig.value = createDefaultNodeConfig();
    return;
  }
  loading.value = true;
  try {
    const detail = await getWorkFlowDetail(workflowId.value);
    if (isFlatDetail(detail)) {
      const { nodeConfig: tree, meta } = flatToTree(detail);
      nodeConfig.value = tree;
      flowPermission.value = detail.flowPermission || [];
      directorMaxLevel.value =
        detail.directorMaxLevel != null ? detail.directorMaxLevel : 4;
      workflowName.value = meta.name || detail.name || '';
      taskType.value =
        meta.taskType != null ? meta.taskType : TaskType.PaymentApplication;
      enable.value = meta.enable !== false;
    } else {
      nodeConfig.value = createDefaultNodeConfig();
      workflowName.value = detail.name || '';
      taskType.value =
        detail.taskType != null ? detail.taskType : TaskType.PaymentApplication;
      enable.value = detail.enable !== false;
    }
  } finally {
    loading.value = false;
  }
}

const reErr = ({ childNode }) => {
  if (childNode) {
    const { type, error, nodeName, conditionNodes } = childNode;
    if (type == 1 || type == 2) {
      if (error) {
        tipList.value.push({
          name: nodeName,
          type: ['', '审核人', '抄送人'][type],
        });
      }
      reErr(childNode);
    } else if (type == 3) {
      reErr(childNode);
    } else if (type == 4) {
      reErr(childNode);
      for (let i = 0; i < conditionNodes.length; i++) {
        if (conditionNodes[i].error) {
          tipList.value.push({
            name: conditionNodes[i].nodeName,
            type: '条件',
          });
        }
        reErr(conditionNodes[i]);
      }
    }
  }
};

async function save() {
  store.setIsTried(true);
  tipList.value = [];
  if (nodeConfig.value.type === 4) {
    reErr({ childNode: nodeConfig.value });
  } else {
    reErr(nodeConfig.value);
  }
  if (tipList.value.length !== 0) {
    tipVisible.value = true;
    return;
  }

  if (!workflowName.value?.trim()) {
    message.error($t('system.workflow.validationName'));
    return;
  }

  saving.value = true;
  try {
    ensureAllRealNodeIds(nodeConfig.value);
    const editDto = treeToFlat(nodeConfig.value, {
      id: workflowId.value || undefined,
      name: workflowName.value.trim(),
      taskType: taskType.value,
      enable: enable.value,
    });
    await editWorkFlow(editDto);
    message.success($t('common.save'));
    router.push({ name: 'SystemWorkflow' });
  } catch {
    // request interceptor shows error
  } finally {
    saving.value = false;
  }
}

function goBack() {
  router.push({ name: 'SystemWorkflow' });
}

function zoomSize(type) {
  if (type === 1) {
    if (nowVal.value <= 50) return;
    nowVal.value -= 10;
  } else {
    if (nowVal.value >= 300) return;
    nowVal.value += 10;
  }
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="workflow-designer-page">
    <!-- Top nav bar -->
    <div class="fd-nav">
      <div class="fd-nav-left">
        <div class="fd-nav-back" @click="goBack">
          <i class="anticon anticon-left"></i>
        </div>
        <div class="fd-nav-title">
          <Input
            v-model:value="workflowName"
            :placeholder="$t('system.workflow.name')"
            :maxlength="255"
            class="workflow-name-input"
          />
        </div>
      </div>
      <div class="fd-nav-right">
        <Space style="margin-right: 16px">
          <span style="font-size: 13px; color: #fff">{{
            $t('system.workflow.taskType')
          }}</span>
          <Select
            v-model:value="taskType"
            :options="taskTypeOptions"
            style="min-width: 140px"
            size="small"
          />
          <span style="font-size: 13px; color: #fff">{{
            $t('system.workflow.enable')
          }}</span>
          <Switch v-model:checked="enable" size="small" />
        </Space>
        <button
          type="button"
          class="button-publish"
          :disabled="saving"
          @click="save"
        >
          <span>{{ saving ? '保存中...' : $t('system.workflow.save') }}</span>
        </button>
      </div>
    </div>

    <!-- Main content -->
    <div class="fd-nav-content">
      <section class="dingflow-design">
        <div class="zoom">
          <div
            class="zoom-out"
            :class="nowVal <= 50 && 'disabled'"
            @click="zoomSize(1)"
          ></div>
          <span>{{ nowVal }}%</span>
          <div
            class="zoom-in"
            :class="nowVal >= 300 && 'disabled'"
            @click="zoomSize(2)"
          ></div>
        </div>
        <div class="box-scale" :style="`transform: scale(${nowVal / 100});`">
          <div class="start-node">
            <div class="start-node-box">
              <div class="start-node-title">流程开始</div>
            </div>
            <addNode v-model:childNodeP="nodeConfig" />
          </div>
          <nodeWrap
            v-model:nodeConfig="nodeConfig"
            v-model:flowPermission="flowPermission"
          />
          <div class="end-node">
            <div class="end-node-circle"></div>
            <div class="end-node-text">流程结束</div>
          </div>
        </div>
      </section>
    </div>

    <!-- Global drawers -->
    <errorDialog v-model:visible="tipVisible" :list="tipList" />
    <promoterDrawer />
    <approverDrawer :directorMaxLevel="directorMaxLevel" />
    <copyerDrawer />
    <conditionDrawer />
  </div>
</template>

<style>
@font-face {
  font-family: anticon;
  src: url('https://at.alicdn.com/t/font_148784_v4ggb6wrjmkotj4i.eot');
  src:
    url('https://at.alicdn.com/t/font_148784_v4ggb6wrjmkotj4i.woff')
      format('woff'),
    url('https://at.alicdn.com/t/font_148784_v4ggb6wrjmkotj4i.ttf')
      format('truetype'),
    url('https://at.alicdn.com/t/font_148784_v4ggb6wrjmkotj4i.svg#iconfont')
      format('svg');
  font-display: fallback;
}

@font-face {
  font-family: IconFont;
  src: url('//at.alicdn.com/t/font_135284_ph2thxxbzgf.eot');
  src:
    url('//at.alicdn.com/t/font_135284_ph2thxxbzgf.eot?#iefix')
      format('embedded-opentype'),
    url('//at.alicdn.com/t/font_135284_ph2thxxbzgf.woff') format('woff'),
    url('//at.alicdn.com/t/font_135284_ph2thxxbzgf.ttf') format('truetype'),
    url('//at.alicdn.com/t/font_135284_ph2thxxbzgf.svg#IconFont') format('svg');
}
</style>

<style scoped>
.workflow-designer-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.fd-nav {
  display: flex;
  align-items: center;
  width: 100%;
  height: 56px;
  font-size: 14px;
  color: #fff;
  background: #3296fa;
}

.fd-nav > * {
  flex: 1;
  width: 100%;
}

.fd-nav .fd-nav-left {
  display: flex;
  align-items: center;
}

.fd-nav .fd-nav-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  text-align: right;
}

.fd-nav .fd-nav-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  font-size: 22px;
  cursor: pointer;
  border-right: 1px solid #1583f2;
}

.fd-nav .fd-nav-back:hover {
  background: #5af;
}

.fd-nav .fd-nav-back:active {
  background: #1583f2;
}

.fd-nav .fd-nav-back .anticon {
  display: inline-block;
  font-style: normal;
  line-height: 56px;
  vertical-align: baseline;
  text-align: center;
  text-transform: none;
  text-rendering: optimizelegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.fd-nav .fd-nav-back .anticon::before {
  display: block;
  font-family: anticon !important;
}

.fd-nav .fd-nav-back .anticon-left::before {
  content: '\E620';
}

.fd-nav .fd-nav-title {
  flex: 1;
  width: 0;
  padding: 0 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fd-nav a {
  margin-left: 12px;
  color: #fff;
}

.fd-nav .button-publish {
  min-width: 80px;
  height: 32px;
  padding: 0 15px;
  margin-right: 15px;
  margin-left: 4px;
  font-size: 14px;
  color: #3296fa;
  cursor: pointer;
  background: #fff;
  border: 1px solid #fff;
  border-color: #fff;
  border-radius: 4px;
  transition: all 0.3s;
}

.fd-nav .button-publish:hover {
  color: #3296fa;
  border-color: #fff;
  box-shadow: 0 10px 20px 0 rgb(0 0 0 / 30%);
}

.fd-nav .button-publish:active {
  color: #3296fa;
  background: #d6eaff;
  box-shadow: none;
}

.fd-nav-content {
  position: relative;
  flex: 1;
  width: 100%;
  height: 100%;
  padding-bottom: 30px;
  overflow: hidden auto;
}

.dingflow-design {
  position: absolute;
  inset: 0;
  width: 100%;
  overflow: auto;
  background-color: #f5f5f7;
}

.dingflow-design .box-scale {
  position: relative;
  display: inline-block;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: center;
  width: 100%;
  min-width: min-content;
  padding: 54.5px 0;
  background-color: #f5f5f7;
  transform: scale(1);
  transform-origin: 50% 0 0;
}

.zoom {
  position: absolute;
  top: 30px;
  right: 40px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 125px;
  height: 40px;
}

.zoom .zoom-in,
.zoom .zoom-out {
  width: 30px;
  height: 30px;
  color: #c1c1cd;
  cursor: pointer;
  background: #fff;
  background-repeat: no-repeat;
  background-size: 100%;
}

.zoom .zoom-out {
  background-image: url('https://gw.alicdn.com/tfs/TB1s0qhBHGYBuNjy0FoXXciBFXa-90-90.png');
}

.zoom .zoom-out.disabled {
  opacity: 0.5;
}

.zoom .zoom-in {
  background-image: url('https://gw.alicdn.com/tfs/TB1UIgJBTtYBeNjy1XdXXXXyVXa-90-90.png');
}

.zoom .zoom-in.disabled {
  opacity: 0.5;
}

.start-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.start-node-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 220px;
  height: 40px;
  user-select: none;
  background: #576a95;
  border-radius: 20px;
  box-shadow: 0 2px 5px 0 rgb(0 0 0 / 10%);
}

.start-node-title {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  letter-spacing: 2px;
}

.end-node {
  font-size: 14px;
  color: rgb(25 31 37 / 40%);
  text-align: left;
  border-radius: 50%;
}

.end-node .end-node-circle {
  width: 10px;
  height: 10px;
  margin: auto;
  background: #dbdcdc;
  border-radius: 50%;
}

.end-node .end-node-text {
  margin-top: 5px;
  text-align: center;
}

.workflow-name-input {
  max-width: 300px;
  color: #fff;
  background: transparent;
  border-color: rgb(255 255 255 / 30%);
}

.workflow-name-input::placeholder {
  color: rgb(255 255 255 / 70%);
}

:deep(.workflow-name-input input::placeholder) {
  color: rgb(255 255 255 / 70%);
}
</style>
