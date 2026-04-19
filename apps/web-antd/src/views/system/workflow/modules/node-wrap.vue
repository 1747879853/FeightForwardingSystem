<template>
  <div class="node-wrap" v-if="nodeConfig.type < 3">
    <div
      class="node-wrap-box"
      :class="
        (nodeConfig.type == 0 ? 'start-node ' : '') +
        (isTried && nodeConfig.error ? 'active error' : '')
      "
    >
      <div
        class="title"
        :style="`background: rgb(${bgColors[nodeConfig.type]});`"
      >
        <span v-if="nodeConfig.type == 0">{{ nodeConfig.nodeName }}</span>
        <template v-else>
          <IconifyIcon
            :icon="
              nodeConfig.type == 1
                ? 'mdi:account-check-outline'
                : 'mdi:email-send-outline'
            "
            class="node-title-icon"
          />
          <input
            v-if="isInput"
            type="text"
            class="editable-title-input"
            @blur="blurEvent()"
            @focus="$event.currentTarget.select()"
            v-focus
            v-model="nodeConfig.nodeName"
            :placeholder="defaultText"
          />
          <span v-else class="editable-title" @click="clickEvent()">{{
            nodeConfig.nodeName
          }}</span>
          <i class="anticon anticon-close close" @click="delNode"></i>
        </template>
      </div>
      <div class="content" @click="setPerson">
        <div class="text">
          <span class="placeholder" v-if="!showText"
            >请选择{{ defaultText }}</span
          >
          {{ showText }}
        </div>
        <i class="anticon anticon-right arrow"></i>
      </div>
      <div class="error_tip" v-if="isTried && nodeConfig.error">
        <i class="anticon anticon-exclamation-circle"></i>
      </div>
    </div>
    <addNode
      v-model:childNodeP="nodeConfig.childNode"
      :insideCondition="insideCondition"
    />
  </div>
  <div class="branch-wrap" v-if="nodeConfig.type == 4">
    <div class="branch-box-wrap">
      <div class="branch-box">
        <button class="add-branch" @click="addTerm">添加条件</button>
        <div
          class="col-box"
          v-for="(item, index) in nodeConfig.conditionNodes"
          :key="index"
        >
          <div class="condition-node">
            <div class="condition-node-box">
              <div
                class="auto-judge"
                :class="isTried && item.error ? 'error active' : ''"
              >
                <div
                  class="sort-left"
                  v-if="index != 0 && !item.isDefault"
                  @click="arrTransfer(index, -1)"
                >
                  &lt;
                </div>
                <div class="title-wrapper">
                  <!-- <input
                    v-if="isInputList[index] && !item.isDefault"
                    type="text"
                    class="editable-title-input"
                    @blur="blurEvent(index)"
                    @focus="$event.currentTarget.select()"
                    v-focus
                    v-model="item.nodeName"
                  /> -->
                  <span
                    class="editable-title"
                    @click="!item.isDefault && clickEvent(index)"
                    >{{ item.nodeName }}</span
                  >
                  <span
                    v-if="!item.isDefault"
                    class="priority-title"
                    @click="setPerson(item.priorityLevel)"
                    >优先级{{ item.priorityLevel }}</span
                  >
                  <i
                    v-if="!item.isDefault"
                    class="anticon anticon-close close"
                    @click="delTerm(index)"
                  ></i>
                </div>
                <div
                  class="sort-right"
                  v-if="
                    index != nodeConfig.conditionNodes.length - 1 &&
                    !item.isDefault
                  "
                  @click="arrTransfer(index)"
                >
                  &gt;
                </div>
                <div
                  class="content"
                  @click="!item.isDefault && setPerson(item.priorityLevel)"
                >
                  {{
                    item.isDefault
                      ? '默认路径'
                      : $func.conditionStr(nodeConfig, index)
                  }}
                </div>
                <div class="error_tip" v-if="isTried && item.error">
                  <i class="anticon anticon-exclamation-circle"></i>
                </div>
              </div>
              <addNode
                v-model:childNodeP="item.childNode"
                :insideCondition="true"
              />
            </div>
          </div>
          <nodeWrap
            v-if="item.childNode"
            v-model:nodeConfig="item.childNode"
            :insideCondition="false"
          />
          <template v-if="index == 0">
            <div class="top-left-cover-line"></div>
            <div class="bottom-left-cover-line"></div>
          </template>
          <template v-if="index == nodeConfig.conditionNodes.length - 1">
            <div class="top-right-cover-line"></div>
            <div class="bottom-right-cover-line"></div>
          </template>
        </div>
      </div>
      <addNode
        v-model:childNodeP="nodeConfig.childNode"
        :insideCondition="true"
      />
    </div>
  </div>
  <nodeWrap
    v-if="nodeConfig.childNode"
    v-model:nodeConfig="nodeConfig.childNode"
    :insideCondition="insideCondition"
  />
</template>

<script setup>
import { ref, computed, getCurrentInstance, watch } from 'vue';
import { IconifyIcon } from '@vben/icons';
import $func from '../utils/func';
import { useWorkflowStore } from '../store';
import { bgColors, placeholderList } from '../utils/const';
import addNode from './add-node.vue';
import { getPassMethodOptions } from '#/api/system/workflow-admin';

const _uid = getCurrentInstance().uid;

const passMethodLabels = {};
for (const o of getPassMethodOptions()) {
  passMethodLabels[o.value] = o.label;
}

const props = defineProps({
  nodeConfig: {
    type: Object,
    default: () => ({}),
  },
  flowPermission: {
    type: Object,
    default: () => [],
  },
  insideCondition: {
    type: Boolean,
    default: false,
  },
});

const defaultText = computed(() => {
  return placeholderList[props.nodeConfig.type];
});

const showText = computed(() => {
  if (props.nodeConfig.type == 0)
    return $func.arrToStr(props.flowPermission) || '所有人';
  if (props.nodeConfig.type == 1) {
    if (props.nodeConfig._displayStr) return props.nodeConfig._displayStr;
    const approverStr = $func.setApproverStr(props.nodeConfig);
    const passLabel = passMethodLabels[props.nodeConfig.passMethod];
    if (passLabel && approverStr) {
      return `[${passLabel}] ${approverStr}`;
    }
    return approverStr || passLabel || '';
  }
  return $func.copyerStr(props.nodeConfig);
});

const isInputList = ref({});
const isInput = ref(false);

const resetConditionNodesErr = () => {
  for (let i = 0; i < props.nodeConfig.conditionNodes.length; i++) {
    const n = props.nodeConfig.conditionNodes[i];
    if (n.isDefault === true) {
      n.error = false;
    } else {
      n.error =
        $func.conditionStr(props.nodeConfig, i) == '请设置条件' &&
        i != props.nodeConfig.conditionNodes.length - 1;
    }
  }
};

const emits = defineEmits(['update:flowPermission', 'update:nodeConfig']);
const store = useWorkflowStore();

const isTried = computed(() => store.isTried);
const flowPermission1 = computed(() => store.flowPermission1);
const approverConfig1 = computed(() => store.approverConfig1);
const copyerConfig1 = computed(() => store.copyerConfig1);
const conditionsConfig1 = computed(() => store.conditionsConfig1);

watch(flowPermission1, (flow) => {
  if (flow.flag && flow.id === _uid) {
    emits('update:flowPermission', flow.value);
  }
});

watch(approverConfig1, (approver) => {
  if (approver.flag && approver.id === _uid) {
    emits('update:nodeConfig', approver.value);
  }
});

watch(copyerConfig1, (copyer) => {
  if (copyer.flag && copyer.id === _uid) {
    emits('update:nodeConfig', copyer.value);
  }
});

watch(conditionsConfig1, (condition) => {
  if (condition.flag && condition.id === _uid) {
    emits('update:nodeConfig', condition.value);
  }
});

const clickEvent = (index) => {
  if (index || index === 0) {
    isInputList.value[index] = true;
  } else {
    isInput.value = true;
  }
};

const blurEvent = (index) => {
  if (index || index === 0) {
    isInputList.value[index] = false;
    props.nodeConfig.conditionNodes[index].nodeName =
      props.nodeConfig.conditionNodes[index].nodeName || '条件';
  } else {
    isInput.value = false;
    props.nodeConfig.nodeName = props.nodeConfig.nodeName || defaultText.value;
  }
};

const delNode = () => {
  emits('update:nodeConfig', props.nodeConfig.childNode);
};

const addTerm = () => {
  const conditionNodes = props.nodeConfig.conditionNodes;
  const defaultIndex = conditionNodes.findIndex((n) => n.isDefault);
  const nonDefaultCount = conditionNodes.filter((n) => !n.isDefault).length;

  const newNode = {
    nodeName: '条件' + (nonDefaultCount + 1),
    type: 3,
    priorityLevel: conditionNodes.length + 1,
    isDefault: false,
    conditionList: [],
    nodeUserList: [],
    childNode: null,
    error: true,
  };

  if (defaultIndex >= 0) {
    conditionNodes.splice(defaultIndex, 0, newNode);
  } else {
    conditionNodes.push(newNode);
  }

  conditionNodes.forEach((item, idx) => {
    item.priorityLevel = idx + 1;
  });

  resetConditionNodesErr();
  emits('update:nodeConfig', props.nodeConfig);
};

const delTerm = (index) => {
  if (props.nodeConfig.conditionNodes[index]?.isDefault) return;

  props.nodeConfig.conditionNodes.splice(index, 1);
  props.nodeConfig.conditionNodes.forEach((item, idx) => {
    item.priorityLevel = idx + 1;
  });

  let nonDefaultIdx = 1;
  props.nodeConfig.conditionNodes.forEach((item) => {
    if (!item.isDefault) {
      item.nodeName = `条件${nonDefaultIdx}`;
      nonDefaultIdx++;
    }
  });

  resetConditionNodesErr();
  emits('update:nodeConfig', props.nodeConfig);
  if (props.nodeConfig.conditionNodes.length == 1) {
    if (props.nodeConfig.childNode) {
      if (props.nodeConfig.conditionNodes[0].childNode) {
        reData(
          props.nodeConfig.conditionNodes[0].childNode,
          props.nodeConfig.childNode,
        );
      } else {
        props.nodeConfig.conditionNodes[0].childNode =
          props.nodeConfig.childNode;
      }
    }
    emits('update:nodeConfig', props.nodeConfig.conditionNodes[0].childNode);
  }
};

const reData = (data, addData) => {
  if (!data.childNode) {
    data.childNode = addData;
  } else {
    reData(data.childNode, addData);
  }
};

const setPerson = (priorityLevel) => {
  const { type } = props.nodeConfig;
  if (type == 0) {
    store.setPromoter(true);
    store.setFlowPermission({
      value: props.flowPermission,
      flag: false,
      id: _uid,
    });
  } else if (type == 1) {
    store.setApprover(true);
    store.setApproverConfig({
      value: JSON.parse(JSON.stringify(props.nodeConfig)),
      flag: false,
      id: _uid,
    });
  } else if (type == 2) {
    store.setCopyer(true);
    store.setCopyerConfig({
      value: JSON.parse(JSON.stringify(props.nodeConfig)),
      flag: false,
      id: _uid,
    });
  } else {
    store.setCondition(true);
    store.setConditionsConfig({
      value: JSON.parse(JSON.stringify(props.nodeConfig)),
      priorityLevel,
      flag: false,
      id: _uid,
    });
  }
};

const arrTransfer = (index, type = 1) => {
  const targetIdx = index + type;
  if (props.nodeConfig.conditionNodes[targetIdx]?.isDefault) return;
  if (props.nodeConfig.conditionNodes[index]?.isDefault) return;

  props.nodeConfig.conditionNodes[index] =
    props.nodeConfig.conditionNodes.splice(
      targetIdx,
      1,
      props.nodeConfig.conditionNodes[index],
    )[0];
  props.nodeConfig.conditionNodes.forEach((item, idx) => {
    item.priorityLevel = idx + 1;
  });
  resetConditionNodesErr();
  emits('update:nodeConfig', props.nodeConfig);
};

const vFocus = {
  mounted(el) {
    el.focus();
  },
};
</script>

<style scoped>
.anticon {
  display: inline-block;
  font-style: normal;
  line-height: 1;
  vertical-align: baseline;
  text-align: center;
  text-transform: none;
  text-rendering: optimizelegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.anticon::before {
  display: block;
  font-family: anticon !important;
}

.anticon-close::before {
  content: '\E633';
}

.anticon-right::before {
  content: '\E61F';
}

.anticon-exclamation-circle {
  color: rgb(242 86 67);
}

.anticon-exclamation-circle::before {
  content: '\E62C';
}

.node-title-icon {
  margin-right: 5px;
  font-size: 16px;
  vertical-align: middle;
}

.node-wrap,
.branch-wrap {
  display: inline-flex;
  width: 100%;
}

.node-wrap {
  position: relative;
  flex-grow: 1;
  flex-flow: column wrap;
  align-items: center;
  justify-content: flex-start;
  padding: 0 50px;
}

.node-wrap-box {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  flex-direction: column;
  width: 220px;
  min-height: 72px;
  cursor: pointer;
  background: #fff;
  border-radius: 4px;
}

.node-wrap-box::after {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  content: '';
  border: 1px solid transparent;
  border-radius: 4px;
  box-shadow: 0 2px 5px 0 rgb(0 0 0 / 10%);
  transition: all 0.1s cubic-bezier(0.645, 0.045, 0.355, 1);
}

.node-wrap-box.active::after,
.node-wrap-box:active::after,
.node-wrap-box:hover::after {
  border: 1px solid #3296fa;
  box-shadow: 0 0 6px 0 rgb(50 150 250 / 30%);
}

.node-wrap-box.active .close,
.node-wrap-box:active .close,
.node-wrap-box:hover .close {
  display: block;
}

.node-wrap-box.error::after {
  border: 1px solid #f25643;
  box-shadow: 0 2px 5px 0 rgb(0 0 0 / 10%);
}

.node-wrap-box .title {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 24px;
  padding-right: 30px;
  padding-left: 16px;
  font-size: 12px;
  line-height: 24px;
  color: #fff;
  text-align: left;
  background: #576a95;
  border-radius: 4px 4px 0 0;
}

.node-wrap-box .title :deep(.node-title-icon) {
  margin-right: 5px;
  font-size: 16px;
}

.node-wrap-box .placeholder {
  color: #bfbfbf;
}

.node-wrap-box .close {
  position: absolute;
  top: 50%;
  right: 10px;
  display: none;
  width: 20px;
  height: 20px;
  font-size: 14px;
  line-height: 20px;
  color: #fff;
  text-align: center;
  border-radius: 50%;
  transform: translateY(-50%);
}

.node-wrap-box .content {
  position: relative;
  padding: 16px;
  padding-right: 30px;
  font-size: 14px;
}

.node-wrap-box .content .text {
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.node-wrap-box .content .arrow {
  position: absolute;
  top: 50%;
  right: 10px;
  width: 20px;
  height: 14px;
  font-size: 14px;
  color: #979797;
  transform: translateY(-50%);
}

.start-node.node-wrap-box .content .text {
  display: block;
  white-space: nowrap;
}

.node-wrap-box::before {
  position: absolute;
  top: -12px;
  left: 50%;
  width: 0;
  height: 4px;
  content: '';
  background: #f5f5f7;
  border-color: #cacaca transparent transparent;
  border-style: solid;
  border-width: 8px 6px 4px;
  transform: translateX(-50%);
}

.node-wrap-box.start-node::before {
  content: none;
}

.auto-judge:hover .editable-title,
.node-wrap-box:hover .editable-title {
  border-bottom: 1px dashed #fff;
}

.auto-judge:hover .editable-title {
  border-color: #15bc83;
}

.editable-title {
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 15px;
  white-space: nowrap;
  border-bottom: 1px dashed transparent;
}

.editable-title::before {
  position: absolute;
  inset: 0 40px 0 0;
  content: '';
}

.editable-title:hover {
  border-bottom: 1px dashed #fff;
}

.editable-title-input {
  z-index: 1;
  box-sizing: border-box;
  flex: none;
  width: 100%;
  height: 18px;
  padding-left: 4px;
  font-size: 12px;
  line-height: 18px;
  color: #333;
  text-indent: 0;
  outline: none;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
}

.editable-title-input:focus {
  border-color: #40a9ff;
  box-shadow: 0 0 0 2px rgb(24 144 255 / 20%);
}

.error_tip {
  position: absolute;
  top: 0;
  right: 0;
  font-size: 24px;
  transform: translate(150%, 0);
}

.top-left-cover-line {
  left: -1px;
}

.top-left-cover-line,
.top-right-cover-line {
  position: absolute;
  top: -4px;
  width: 50%;
  height: 8px;
  background-color: #f5f5f7;
}

.top-right-cover-line {
  right: -1px;
}

.bottom-left-cover-line {
  left: -1px;
}

.bottom-left-cover-line,
.bottom-right-cover-line {
  position: absolute;
  bottom: -4px;
  width: 50%;
  height: 8px;
  background-color: #f5f5f7;
}

.bottom-right-cover-line {
  right: -1px;
}

.branch-box-wrap {
  display: flex;
  flex-shrink: 0;
  flex-flow: column wrap;
  align-items: center;
  width: 100%;
  min-height: 270px;
}

.branch-box {
  position: relative;
  display: flex;
  height: auto;
  min-height: 180px;
  margin-top: 15px;
  overflow: visible;
  border-top: 2px solid #ccc;
  border-bottom: 2px solid #ccc;
}

.branch-box .col-box {
  background: #f5f5f7;
}

.branch-box .col-box::before {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 2px;
  height: 100%;
  margin: auto;
  content: '';
  background-color: #cacaca;
}

.add-branch {
  position: absolute;
  top: -16px;
  left: 50%;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  padding: 0 10px;
  font-size: 12px;
  line-height: 30px;
  color: #3296fa;
  cursor: pointer;
  user-select: none;
  outline: none;
  background: #fff;
  border: none;
  border-radius: 15px;
  box-shadow: 0 2px 4px 0 rgb(0 0 0 / 10%);
  transform: translateX(-50%);
  transform-origin: center center;
  transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}

.add-branch:hover {
  box-shadow: 0 8px 16px 0 rgb(0 0 0 / 10%);
  transform: translateX(-50%) scale(1.1);
}

.add-branch:active {
  box-shadow: none;
  transform: translateX(-50%);
}

.col-box {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}

.condition-node {
  min-height: 220px;
}

.condition-node,
.condition-node-box {
  display: inline-flex;
  flex: 1;
  flex-direction: column;
}

.condition-node-box {
  position: relative;
  flex-grow: 1;
  align-items: center;
  justify-content: center;
  padding-top: 30px;
  padding-right: 50px;
  padding-left: 50px;
}

.condition-node-box::before {
  position: absolute;
  inset: 0;
  width: 2px;
  height: 100%;
  margin: auto;
  content: '';
  background-color: #cacaca;
}

.auto-judge {
  position: relative;
  width: 220px;
  min-height: 72px;
  padding: 14px 19px;
  cursor: pointer;
  background: #fff;
  border-radius: 4px;
}

.auto-judge::after {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  content: '';
  border: 1px solid transparent;
  border-radius: 4px;
  box-shadow: 0 2px 5px 0 rgb(0 0 0 / 10%);
  transition: all 0.1s cubic-bezier(0.645, 0.045, 0.355, 1);
}

.auto-judge.active::after,
.auto-judge:active::after,
.auto-judge:hover::after {
  border: 1px solid #3296fa;
  box-shadow: 0 0 6px 0 rgb(50 150 250 / 30%);
}

.auto-judge.active .close,
.auto-judge:active .close,
.auto-judge:hover .close {
  display: block;
}

.auto-judge.error::after {
  border: 1px solid #f25643;
  box-shadow: 0 2px 5px 0 rgb(0 0 0 / 10%);
}

.auto-judge .title-wrapper {
  position: relative;
  font-size: 12px;
  line-height: 16px;
  color: #15bc83;
  text-align: left;
}

.auto-judge .title-wrapper .editable-title {
  display: inline-block;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.auto-judge .title-wrapper .priority-title {
  float: right;
  display: inline-block;
  margin-right: 10px;
  color: rgb(25 31 37 / 56%);
}

.auto-judge .placeholder {
  color: #bfbfbf;
}

.auto-judge .close {
  position: absolute;
  top: -10px;
  right: -10px;
  z-index: 2;
  display: none;
  width: 20px;
  height: 20px;
  font-size: 14px;
  line-height: 20px;
  color: rgb(0 0 0 / 25%);
  text-align: center;
  border-radius: 50%;
}

.auto-judge .content {
  display: -webkit-box;
  margin-top: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 3;
  font-size: 14px;
  color: #191f25;
  text-align: left;
  -webkit-box-orient: vertical;
}

.auto-judge .sort-left,
.auto-judge .sort-right {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 1;
  display: none;
}

.auto-judge .sort-left {
  left: 0;
  border-right: 1px solid #f6f6f6;
}

.auto-judge .sort-right {
  right: 0;
  border-left: 1px solid #f6f6f6;
}

.auto-judge:hover .sort-left,
.auto-judge:hover .sort-right {
  display: flex;
  align-items: center;
}

.auto-judge .sort-left:hover,
.auto-judge .sort-right:hover {
  background: #efefef;
}
</style>
