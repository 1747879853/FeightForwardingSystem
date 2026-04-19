<template>
  <div class="select-result">
    <p class="clear">
      已选（{{ total }}）
      <a @click="emits('del')">清空</a>
    </p>
    <ul>
      <template v-for="{ type, data, cancel } in list" :key="type">
        <template v-if="type === 'role'">
          <li v-for="item in data" :key="item.roleId">
            <span class="icon-text">🔑</span>
            <span>{{ item.roleName }}</span>
            <a class="cancel" @click="cancel(item)">×</a>
          </li>
        </template>
        <template v-if="type === 'department'">
          <li v-for="item in data" :key="item.id">
            <span class="icon-text">📁</span>
            <span>{{ item.departmentName }}</span>
            <a class="cancel" @click="cancel(item)">×</a>
          </li>
        </template>
        <template v-if="type === 'employee'">
          <li v-for="item in data" :key="item.id">
            <span class="icon-text">👤</span>
            <span>{{ item.employeeName }}</span>
            <a class="cancel" @click="cancel(item)">×</a>
          </li>
        </template>
      </template>
    </ul>
  </div>
</template>

<script setup>
defineProps({
  total: {
    type: Number,
    default: 0,
  },
  list: {
    type: Array,
    default: () => [],
  },
});
const emits = defineEmits(['del']);
</script>

<style scoped>
.select-result {
  width: 276px;
  height: 100%;
  font-size: 12px;
}

.select-result ul {
  height: 460px;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  list-style: none;
}

.select-result ul li {
  margin: 11px 26px 13px 19px;
  line-height: 17px;
}

.select-result ul li span {
  vertical-align: middle;
}

.select-result ul li .cancel {
  float: right;
  font-size: 14px;
  color: #999;
  cursor: pointer;
}

.select-result ul li .cancel:hover {
  color: #f00;
}

.select-result p {
  padding-right: 20px;
  padding-left: 19px;
  line-height: 37px;
  border-bottom: 1px solid #f2f2f2;
}

.select-result p a {
  float: right;
  color: #3296fa;
  cursor: pointer;
}

.icon-text {
  margin-right: 5px;
  font-size: 14px;
}

.clear::after {
  clear: both;
  display: table;
  content: '';
}
</style>
