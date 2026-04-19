<template>
  <a-modal
    title="选择成员"
    :open="visibleDialog"
    :width="600"
    @cancel="closeDialog"
  >
    <div class="person_body clear">
      <div class="person_tree l">
        <input
          type="text"
          placeholder="搜索成员"
          v-model="searchVal"
          @input="getDebounceData($event)"
        />
        <p class="ellipsis tree_nav" v-if="!searchVal">
          <span @click="getDepartmentList(0)" class="ellipsis">天下</span>
          <span
            v-for="(item, index) in departments.titleDepartments"
            class="ellipsis"
            :key="index + 'a'"
            @click="getDepartmentList(item.id)"
            >{{ item.departmentName }}</span
          >
        </p>
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
import {
  departments,
  getDebounceData,
  getDepartmentList,
  searchVal,
} from './common';
import $func from '../../utils/func';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  data: {
    type: Array,
    default: () => [],
  },
  isDepartment: {
    type: Boolean,
    default: false,
  },
});

const emits = defineEmits(['update:visible', 'change']);

const visibleDialog = computed({
  get() {
    return props.visible;
  },
  set() {
    closeDialog();
  },
});

const checkedDepartmentList = ref([]);
const checkedEmployessList = ref([]);

const list = computed(() => {
  return [
    {
      isDepartment: props.isDepartment,
      type: 'department',
      data: departments.value.childDepartments,
      isActive: (item) => $func.toggleClass(checkedDepartmentList.value, item),
      change: (item) => $func.toChecked(checkedDepartmentList.value, item),
      next: (item) => getDepartmentList(item.id),
    },
    {
      type: 'employee',
      data: departments.value.employees,
      isActive: (item) => $func.toggleClass(checkedEmployessList.value, item),
      change: (item) => $func.toChecked(checkedEmployessList.value, item),
    },
  ];
});

const resList = computed(() => {
  const data = [
    {
      type: 'employee',
      data: checkedEmployessList.value,
      cancel: (item) => $func.removeEle(checkedEmployessList.value, item),
    },
  ];
  if (props.isDepartment) {
    data.unshift({
      type: 'department',
      data: checkedDepartmentList.value,
      cancel: (item) => $func.removeEle(checkedDepartmentList.value, item),
    });
  }
  return data;
});

watch(
  () => props.visible,
  (val) => {
    if (val) {
      getDepartmentList();
      searchVal.value = '';
      checkedEmployessList.value = props.data
        .filter((item) => item.type === 1)
        .map(({ name, targetId }) => ({
          employeeName: name,
          id: targetId,
        }));
      checkedDepartmentList.value = props.data
        .filter((item) => item.type === 3)
        .map(({ name, targetId }) => ({
          departmentName: name,
          id: targetId,
        }));
    }
  },
);

const closeDialog = () => {
  emits('update:visible', false);
};

const total = computed(
  () => checkedDepartmentList.value.length + checkedEmployessList.value.length,
);

const saveDialog = () => {
  const checkedList = [
    ...checkedDepartmentList.value,
    ...checkedEmployessList.value,
  ].map((item) => ({
    type: item.employeeName ? 1 : 3,
    targetId: item.id,
    name: item.employeeName || item.departmentName,
  }));
  emits('change', checkedList);
};

const delList = () => {
  checkedDepartmentList.value = [];
  checkedEmployessList.value = [];
};
</script>

<style>
@import './dialog.css';
</style>
