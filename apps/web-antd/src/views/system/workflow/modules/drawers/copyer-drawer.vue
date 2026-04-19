<template>
  <a-drawer
    :open="visible"
    title="抄送人设置"
    :width="550"
    :closable="false"
    @close="closeDrawer"
    :destroyOnClose="false"
  >
    <div class="demo-drawer__content">
      <div class="copyer_content drawer_content">
        <a-button type="primary" @click="addCopyer" style="margin-bottom: 20px"
          >添加成员</a-button
        >
        <p class="selected_list">
          <span v-for="(item, index) in copyerConfig.nodeUserList" :key="index"
            >{{ item.name }}
            <a-button
              type="link"
              size="small"
              danger
              @click="
                $func.removeEle(copyerConfig.nodeUserList, item, 'targetId')
              "
              >×</a-button
            >
          </span>
          <a
            v-if="
              copyerConfig.nodeUserList && copyerConfig.nodeUserList.length != 0
            "
            @click="copyerConfig.nodeUserList = []"
            >清除</a
          >
        </p>
        <a-checkbox
          v-model:checked="ccSelfSelectFlag"
          style="margin-bottom: 20px"
          >允许发起人自选抄送人</a-checkbox
        >
      </div>
      <div class="demo-drawer__footer">
        <a-button type="primary" @click="saveCopyer">确 定</a-button>
        <a-button @click="closeDrawer" style="margin-left: 8px">取 消</a-button>
      </div>
      <employees-role-dialog
        v-model:visible="copyerVisible"
        :data="checkedList"
        @change="sureCopyer"
      />
    </div>
  </a-drawer>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import {
  Button as AButton,
  Checkbox as ACheckbox,
  Drawer as ADrawer,
} from 'ant-design-vue';
import $func from '../../utils/func';
import { useWorkflowStore } from '../../store';
import employeesRoleDialog from '../dialogs/employees-role-dialog.vue';

const copyerConfig = ref({});
const ccSelfSelectFlag = ref(false);
const copyerVisible = ref(false);
const checkedList = ref([]);

const store = useWorkflowStore();

const copyerDrawer = computed(() => store.copyerDrawer);
const copyerConfig1 = computed(() => store.copyerConfig1);
const visible = computed(() => copyerDrawer.value);

watch(copyerConfig1, (val) => {
  copyerConfig.value = val.value;
  ccSelfSelectFlag.value = copyerConfig.value.ccSelfSelectFlag !== 0;
});

const addCopyer = () => {
  copyerVisible.value = true;
  checkedList.value = copyerConfig.value.nodeUserList;
};

const sureCopyer = (data) => {
  copyerConfig.value.nodeUserList = data;
  copyerVisible.value = false;
};

const saveCopyer = () => {
  copyerConfig.value.ccSelfSelectFlag = ccSelfSelectFlag.value ? 1 : 0;
  copyerConfig.value.error = !$func.copyerStr(copyerConfig.value);
  store.setCopyerConfig({
    value: copyerConfig.value,
    flag: true,
    id: copyerConfig1.value.id,
  });
  closeDrawer();
};

const closeDrawer = () => {
  store.setCopyer(false);
};
</script>

<style scoped>
.copyer_content {
  padding: 20px 20px 0;
}

.selected_list {
  margin-bottom: 20px;
  line-height: 30px;
}

.selected_list span {
  padding: 3px 6px 3px 9px;
  margin-right: 10px;
  line-height: 12px;
  white-space: nowrap;
  border: 1px solid #dcdcdc;
  border-radius: 2px;
}

.demo-drawer__footer {
  padding: 20px;
  text-align: right;
}
</style>
