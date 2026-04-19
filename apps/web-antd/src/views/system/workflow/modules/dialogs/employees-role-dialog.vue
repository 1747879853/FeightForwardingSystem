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
          @input="getDebounceData($event, activeName)"
        />
        <div class="tab-nav">
          <span
            :class="{ active: activeName === '1' }"
            @click="handleClick('1')"
            >组织架构</span
          >
          <span
            :class="{ active: activeName === '2' }"
            @click="handleClick('2')"
            >角色列表</span
          >
        </div>
        <p class="ellipsis tree_nav" v-if="activeName === '1' && !searchVal">
          <span @click="getDepartmentList(0)" class="ellipsis">天下</span>
          <span
            v-for="(item, index) in departments.titleDepartments"
            class="ellipsis"
            :key="index + 'a'"
            @click="getDepartmentList(item.id)"
            >{{ item.departmentName }}</span
          >
        </p>
        <selectBox :list="list" style="height: 360px" />
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
import {
  departments,
  roles,
  getDebounceData,
  getRoleList,
  getDepartmentList,
  searchVal,
} from './common';

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

const checkedRoleList = ref([]);
const checkedEmployessList = ref([]);
const checkedDepartmentList = ref([]);
const activeName = ref('1');

const list = computed(() => {
  if (activeName.value === '2') {
    return [
      {
        type: 'role',
        not: false,
        data: roles.value,
        isActiveItem: (item) =>
          $func.toggleClass(checkedRoleList.value, item, 'roleId'),
        change: (item) =>
          $func.toChecked(checkedRoleList.value, item, 'roleId'),
      },
    ];
  } else {
    return [
      {
        isDepartment: props.isDepartment,
        type: 'department',
        data: departments.value.childDepartments,
        isActive: (item) =>
          $func.toggleClass(checkedDepartmentList.value, item),
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
  }
});

const resList = computed(() => {
  const data = [
    {
      type: 'role',
      data: checkedRoleList.value,
      cancel: (item) => $func.removeEle(checkedRoleList.value, item, 'roleId'),
    },
    {
      type: 'employee',
      data: checkedEmployessList.value,
      cancel: (item) => $func.removeEle(checkedEmployessList.value, item),
    },
  ];
  if (props.isDepartment) {
    data.splice(1, 0, {
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
      activeName.value = '1';
      getDepartmentList();
      searchVal.value = '';
      checkedEmployessList.value = props.data
        .filter((item) => item.type === 1)
        .map(({ name, targetId }) => ({
          employeeName: name,
          id: targetId,
        }));
      checkedRoleList.value = props.data
        .filter((item) => item.type === 2)
        .map(({ name, targetId }) => ({
          roleName: name,
          roleId: targetId,
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

const total = computed(() => {
  return (
    checkedEmployessList.value.length +
    checkedRoleList.value.length +
    checkedDepartmentList.value.length
  );
});

const handleClick = (name) => {
  activeName.value = name;
  searchVal.value = '';
  if (name === '1') {
    getDepartmentList();
  } else {
    getRoleList();
  }
};

const saveDialog = () => {
  const checkedList = [
    ...checkedRoleList.value,
    ...checkedEmployessList.value,
    ...checkedDepartmentList.value,
  ].map((item) => ({
    type: item.employeeName ? 1 : item.roleName ? 2 : 3,
    targetId: item.id || item.roleId,
    name: item.employeeName || item.roleName || item.departmentName,
  }));
  emits('change', checkedList);
};

const delList = () => {
  checkedEmployessList.value = [];
  checkedRoleList.value = [];
  checkedDepartmentList.value = [];
};

const closeDialog = () => {
  emits('update:visible', false);
};
</script>

<style>
@import './dialog.css';
</style>

<style scoped>
.tab-nav {
  display: flex;
  margin-bottom: 10px;
  border-bottom: 1px solid #e8e8e8;
}

.tab-nav span {
  padding: 8px 16px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tab-nav span.active {
  color: #3296fa;
  border-bottom-color: #3296fa;
}
</style>
