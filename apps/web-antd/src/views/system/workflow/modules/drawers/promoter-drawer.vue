<template>
  <a-drawer
    :open="visible"
    title="发起人"
    :width="550"
    :closable="false"
    @close="closeDrawer"
    :destroyOnClose="false"
  >
    <div class="demo-drawer__content">
      <div class="promoter_content drawer_content">
        <p>{{ $func.arrToStr(flowPermission) || '所有人' }}</p>
        <a-button type="primary" @click="addPromoter">添加/修改发起人</a-button>
      </div>
      <div class="demo-drawer__footer clear">
        <a-button type="primary" @click="savePromoter">确 定</a-button>
        <a-button @click="closeDrawer" style="margin-left: 8px">取 消</a-button>
      </div>
      <employees-dialog
        :isDepartment="true"
        v-model:visible="promoterVisible"
        :data="checkedList"
        @change="surePromoter"
      />
    </div>
  </a-drawer>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { Button as AButton, Drawer as ADrawer } from 'ant-design-vue';
import $func from '../../utils/func';
import { useWorkflowStore } from '../../store';
import employeesDialog from '../dialogs/employees-dialog.vue';

const flowPermission = ref([]);
const promoterVisible = ref(false);
const checkedList = ref([]);

const store = useWorkflowStore();

const visible = computed(() => store.promoterDrawer);
const flowPermission1 = computed(() => store.flowPermission1);

watch(flowPermission1, (val) => {
  flowPermission.value = val.value;
});

const addPromoter = () => {
  checkedList.value = flowPermission.value;
  promoterVisible.value = true;
};

const surePromoter = (data) => {
  flowPermission.value = data;
  promoterVisible.value = false;
};

const savePromoter = () => {
  store.setFlowPermission({
    value: flowPermission.value,
    flag: true,
    id: flowPermission1.value.id,
  });
  closeDrawer();
};

const closeDrawer = () => {
  store.setPromoter(false);
};
</script>

<style scoped>
.promoter_content {
  padding: 0 20px;
}

.promoter_content p {
  padding: 18px 0;
  font-size: 14px;
  line-height: 20px;
  color: #000;
}

.demo-drawer__footer {
  padding: 20px;
  text-align: right;
}
</style>
