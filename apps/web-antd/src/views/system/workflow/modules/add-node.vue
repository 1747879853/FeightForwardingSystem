<template>
  <div class="add-node-btn-box">
    <div class="add-node-btn">
      <a-popover v-model:open="visible" placement="rightTop" trigger="click">
        <template #content>
          <div class="add-node-popover-body">
            <a class="add-node-popover-item approver" @click="addType(1)">
              <div class="item-wrapper">
                <IconifyIcon
                  icon="mdi:account-check-outline"
                  class="popover-icon"
                />
              </div>
              <p>审批人</p>
            </a>
            <!-- <a class="add-node-popover-item notifier" @click="addType(2)">
              <div class="item-wrapper">
                <IconifyIcon icon="mdi:email-send-outline" class="popover-icon" />
              </div>
              <p>抄送人</p>
            </a> -->
            <a
              v-if="canAddCondition"
              class="add-node-popover-item condition"
              @click="addType(4)"
            >
              <div class="item-wrapper">
                <IconifyIcon icon="mdi:source-branch" class="popover-icon" />
              </div>
              <p>条件分支</p>
            </a>
          </div>
        </template>
        <button class="btn" type="button">
          <IconifyIcon icon="mdi:plus" class="btn-icon" />
        </button>
      </a-popover>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Popover as APopover } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import { generateUUID } from '../utils/converter';

const props = defineProps({
  childNodeP: {
    type: Object,
    default: () => ({}),
  },
  insideCondition: {
    type: Boolean,
    default: false,
  },
});

const emits = defineEmits(['update:childNodeP']);
const visible = ref(false);

const canAddCondition = computed(
  () => !props.insideCondition && props.childNodeP?.type !== 4,
);

const addType = (type) => {
  visible.value = false;
  if (type !== 4) {
    let data;
    if (type === 1) {
      data = {
        id: generateUUID(),
        nodeName: '审核人',
        error: true,
        type: 1,
        settype: 1,
        selectMode: 0,
        selectRange: 0,
        directorLevel: 1,
        examineMode: 1,
        noHanderAction: 1,
        examineEndDirectorLevel: 0,
        childNode: props.childNodeP,
        nodeUserList: [],
      };
    } else if (type === 2) {
      data = {
        id: generateUUID(),
        nodeName: '抄送人',
        type: 2,
        ccSelfSelectFlag: 1,
        childNode: props.childNodeP,
        nodeUserList: [],
      };
    }
    emits('update:childNodeP', data);
  } else {
    emits('update:childNodeP', {
      nodeName: '路由',
      type: 4,
      childNode: null,
      conditionNodes: [
        {
          nodeName: '条件1',
          error: true,
          type: 3,
          priorityLevel: 1,
          isDefault: false,
          conditionList: [],
          nodeUserList: [],
          childNode: props.childNodeP,
        },
        {
          nodeName: '默认条件',
          error: false,
          type: 3,
          priorityLevel: 2,
          isDefault: true,
          conditionList: [],
          nodeUserList: [],
          childNode: null,
        },
      ],
    });
  }
};
</script>

<style scoped>
.add-node-btn-box {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  width: 240px;
}

.add-node-btn-box::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 2px;
  height: 100%;
  margin: auto;
  content: '';
  background-color: #cacaca;
}

.add-node-btn-box .add-node-btn {
  display: flex;
  flex-grow: 1;
  flex-shrink: 0;
  justify-content: center;
  width: 240px;
  padding: 20px 0 32px;
  user-select: none;
}

.add-node-btn-box .add-node-btn .btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  line-height: 30px;
  cursor: pointer;
  outline: none;
  background: #3296fa;
  border: none;
  border-radius: 50%;
  box-shadow: 0 2px 4px 0 rgb(0 0 0 / 10%);
  transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}

.add-node-btn-box .add-node-btn .btn :deep(.btn-icon) {
  font-size: 16px;
  color: #fff;
}

.add-node-btn-box .add-node-btn .btn:hover {
  box-shadow: 0 13px 27px 0 rgb(0 0 0 / 10%);
  transform: scale(1.3);
}

.add-node-btn-box .add-node-btn .btn:active {
  background: #1e83e9;
  box-shadow: 0 2px 4px 0 rgb(0 0 0 / 10%);
  transform: none;
}
</style>

<style>
.add-node-popover-body {
  display: flex;
}

.add-node-popover-body .add-node-popover-item {
  flex: 1;
  margin-right: 10px;
  color: #191f25 !important;
  text-align: center;
  cursor: pointer;
}

.add-node-popover-body .add-node-popover-item .item-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin-bottom: 5px;
  user-select: none;
  background: #fff;
  border: 1px solid #e2e2e2;
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}

.add-node-popover-body .add-node-popover-item .item-wrapper .popover-icon {
  font-size: 35px;
  line-height: 80px;
}

.add-node-popover-body .add-node-popover-item.approver .item-wrapper {
  color: #ff943e;
}

.add-node-popover-body .add-node-popover-item.notifier .item-wrapper {
  color: #3296fa;
}

.add-node-popover-body .add-node-popover-item.condition .item-wrapper {
  color: #15bc83;
}

.add-node-popover-body .add-node-popover-item:hover .item-wrapper {
  background: #3296fa;
  box-shadow: 0 10px 20px 0 rgb(50 150 250 / 40%);
}

.add-node-popover-body .add-node-popover-item:hover .popover-icon {
  color: #fff;
}

.add-node-popover-body .add-node-popover-item:active .item-wrapper {
  background: #eaeaea;
  box-shadow: none;
}

.add-node-popover-body .add-node-popover-item:active .popover-icon {
  color: inherit;
}
</style>
