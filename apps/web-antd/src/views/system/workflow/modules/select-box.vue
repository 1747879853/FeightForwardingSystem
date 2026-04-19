<template>
  <ul class="select-box">
    <template v-for="(elem, i) in list" :key="i">
      <template v-if="elem.type === 'role'">
        <li
          v-for="item in elem.data"
          :key="item.roleId"
          class="check_box"
          :class="{
            active: elem.isActive && elem.isActive(item),
            not: elem.not,
          }"
          @click="elem.change(item)"
        >
          <a
            :title="item.description"
            :class="{
              active: elem.isActiveItem && elem.isActiveItem(item),
            }"
          >
            <span class="icon-text">🔑</span>{{ item.roleName }}
          </a>
        </li>
      </template>
      <template v-if="elem.type === 'department'">
        <li
          v-for="item in elem.data"
          :key="item.id"
          class="check_box"
          :class="{ not: !elem.isDepartment }"
        >
          <a
            v-if="elem.isDepartment"
            :class="elem.isActive(item) && 'active'"
            @click="elem.change(item)"
          >
            <span class="icon-text">📁</span>{{ item.departmentName }}
          </a>
          <a v-else>
            <span class="icon-text">📁</span>{{ item.departmentName }}
          </a>
          <i @click="elem.next(item)">下级</i>
        </li>
      </template>
      <template v-if="elem.type === 'employee'">
        <li v-for="item in elem.data" :key="item.id" class="check_box">
          <a
            :class="elem.isActive(item) && 'active'"
            @click="elem.change(item)"
            :title="item.departmentNames"
          >
            <span class="icon-text">👤</span>{{ item.employeeName }}
          </a>
        </li>
      </template>
    </template>
  </ul>
</template>

<script setup>
defineProps({
  list: {
    type: Array,
    default: () => [],
  },
});
</script>

<style scoped>
.select-box {
  height: 420px;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  list-style: none;
}

.select-box li {
  padding: 5px 0;
}

.select-box li i {
  float: right;
  padding-right: 10px;
  padding-left: 24px;
  font-size: 12px;
  font-style: normal;
  color: #3195f8;
  cursor: pointer;
  border-left: 1px solid #eee;
}

.select-box li a.active + i {
  color: #c5c5c5;
  pointer-events: none;
}

.icon-text {
  margin-right: 5px;
  font-size: 14px;
}

.check_box a {
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 2px;
}

.check_box a.active {
  color: #fff;
  background: #3296fa;
}

.check_box.not a {
  cursor: default;
}
</style>
