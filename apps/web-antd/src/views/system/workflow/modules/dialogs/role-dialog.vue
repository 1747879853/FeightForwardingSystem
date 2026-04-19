<template>
  <a-modal
    title="选择角色"
    :open="visibleDialog"
    :width="600"
    @cancel="closeDialog"
  >
    <div class="person_body clear">
      <div class="person_tree l">
        <input
          type="text"
          placeholder="搜索角色"
          v-model="searchVal"
          @input="getDebounceData($event, 2)"
        />
        <selectBox :list="list" />
      </div>
      <selectResult :total="total" @del="delList" :list="resList" />
    </div>
    <template #footer>
      <a-button @click="closeDialog">取 消</a-button>
      <a-button type="primary" @click="saveDialog">确 定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, watch, ref } from 'vue';
import { Button as AButton, Modal as AModal } from 'ant-design-vue';
import selectBox from '../select-box.vue';
import selectResult from '../select-result.vue';
import $func from '../../utils/func';
import { roles, getDebounceData, getRoleList, searchVal } from './common';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  data: {
    type: Array,
    default: () => [],
  },
});

const checkedRoleList = ref([]);
const emits = defineEmits(['update:visible', 'change']);

const list = computed(() => {
  return [
    {
      type: 'role',
      not: true,
      data: roles.value,
      isActive: (item) =>
        $func.toggleClass(checkedRoleList.value, item, 'roleId'),
      change: (item) => {
        checkedRoleList.value = [item];
      },
    },
  ];
});

const resList = computed(() => {
  return [
    {
      type: 'role',
      data: checkedRoleList.value,
      cancel: (item) => $func.removeEle(checkedRoleList.value, item, 'roleId'),
    },
  ];
});

const visibleDialog = computed({
  get() {
    return props.visible;
  },
  set() {
    closeDialog();
  },
});

watch(
  () => props.visible,
  (val) => {
    if (val) {
      getRoleList();
      searchVal.value = '';
      checkedRoleList.value = props.data.map(({ name, targetId }) => ({
        roleName: name,
        roleId: targetId,
      }));
    }
  },
);

const total = computed(() => checkedRoleList.value.length);

const saveDialog = () => {
  const checkedList = checkedRoleList.value.map((item) => ({
    type: 2,
    targetId: item.roleId,
    name: item.roleName,
  }));
  emits('change', checkedList);
};

const delList = () => {
  checkedRoleList.value = [];
};

const closeDialog = () => {
  emits('update:visible', false);
};
</script>

<style>
@import './dialog.css';
</style>
