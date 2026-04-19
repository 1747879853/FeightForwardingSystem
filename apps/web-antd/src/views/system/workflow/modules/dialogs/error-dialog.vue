<template>
  <a-modal
    title="提示"
    :open="visibleDialog"
    :width="520"
    @cancel="visibleDialog = false"
  >
    <div class="ant-confirm-body">
      <i class="anticon anticon-close-circle" style="color: #f00"></i>
      <span class="ant-confirm-title">当前无法发布</span>
      <div class="ant-confirm-content">
        <div>
          <p class="error-modal-desc">以下内容不完善，需进行修改</p>
          <div class="error-modal-list">
            <div
              class="error-modal-item"
              v-for="(item, index) in list"
              :key="index"
            >
              <div class="error-modal-item-label">流程设计</div>
              <div class="error-modal-item-content">
                {{ item.name }} 未选择{{ item.type }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <a-button @click="visibleDialog = false">我知道了</a-button>
      <a-button type="primary" @click="visibleDialog = false"
        >前往修改</a-button
      >
    </template>
  </a-modal>
</template>

<script setup>
import { computed } from 'vue';
import { Button as AButton, Modal as AModal } from 'ant-design-vue';

const props = defineProps({
  list: {
    type: Array,
    default: () => [],
  },
  visible: {
    type: Boolean,
    default: false,
  },
});

const emits = defineEmits(['update:visible']);

const visibleDialog = computed({
  get() {
    return props.visible;
  },
  set(val) {
    emits('update:visible', val);
  },
});
</script>

<style scoped>
.ant-confirm-body .ant-confirm-title {
  display: block;
  overflow: hidden;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.4;
  color: rgb(0 0 0 / 85%);
}

.ant-confirm-body .ant-confirm-content {
  margin-top: 8px;
  margin-left: 38px;
  font-size: 14px;
  color: rgb(0 0 0 / 65%);
}

.ant-confirm-body > .anticon {
  float: left;
  display: inline-block;
  margin-right: 16px;
  font-size: 22px;
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

.anticon-close-circle::before {
  content: '\E62E';
}

.error-modal-desc {
  margin-bottom: 14px;
  font-size: 13px;
  line-height: 22px;
  color: rgb(25 31 37 / 56%);
}

.error-modal-list {
  max-height: 200px;
  overflow-y: auto;
}

.error-modal-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  margin-bottom: 8px;
  line-height: 21px;
  background: #f6f6f6;
  border-radius: 4px;
}

.error-modal-item-label {
  flex: none;
  padding-right: 10px;
  font-size: 15px;
  color: rgb(25 31 37 / 56%);
}

.error-modal-item-content {
  flex: 1;
  font-size: 13px;
  color: #191f25;
  text-align: right;
}
</style>
