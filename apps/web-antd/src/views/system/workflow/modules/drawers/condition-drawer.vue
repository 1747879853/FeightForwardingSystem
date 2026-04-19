<template>
  <a-drawer
    :open="visible"
    title="条件设置"
    :width="600"
    :closable="false"
    @close="closeDrawer"
    :destroyOnClose="false"
  >
    <template #extra>
      <select v-model="conditionConfig.priorityLevel" class="priority_level">
        <option
          v-for="item in availablePriorityLevels"
          :value="item"
          :key="item"
        >
          优先级{{ item }}
        </option>
      </select>
    </template>
    <div class="demo-drawer__content">
      <div class="condition_content drawer_content">
        <p class="tip">
          当审批单同时满足「所有且条件」并满足「任意或条件」时进入此流程
        </p>

        <!-- AND 条件区域 -->
        <div class="condition-section">
          <div class="section-header section-header--and">
            <span class="section-title">且条件（必须全部满足）</span>
            <span class="section-badge">{{ andList.length }}</span>
          </div>

          <ul class="condition-list">
            <li
              v-for="(item, index) in andList"
              :key="'and-' + index"
              class="condition-item"
            >
              <div class="condition-row condition-row--and">
                <span class="condition-index">且条件{{ index + 1 }}</span>

                <div class="condition-field">
                  <label class="field-label">条件字段</label>
                  <a-select
                    :value="item.taskTypeCondition"
                    :options="taskTypeConditionOptions"
                    placeholder="请选择条件字段"
                    style="width: 100%"
                    @change="(val) => onTaskTypeConditionChange(item, val)"
                  />
                </div>

                <div
                  class="condition-field"
                  v-if="item.taskTypeCondition != null"
                >
                  <label class="field-label">条件介词</label>
                  <a-select
                    v-model:value="item.shouldBe"
                    :options="
                      getShouldBeOptionsForField(item.taskTypeCondition)
                    "
                    placeholder="请选择介词"
                    style="width: 100%"
                  />
                </div>

                <div
                  class="condition-field"
                  v-if="item.taskTypeCondition != null && item.shouldBe != null"
                >
                  <label class="field-label">值</label>
                  <UserSelect
                    v-if="
                      item.taskTypeCondition ===
                      TaskTypeCondition.PaymentApplicationUserId
                    "
                    v-model="item.value"
                    placeholder="请选择付费申请人"
                    style="width: 100%"
                    :allow-clear="false"
                    @change="
                      (val, opt) => onValueChange(item, val, opt, 'user')
                    "
                  />
                  <OrganizationSelect
                    v-else-if="
                      item.taskTypeCondition ===
                      TaskTypeCondition.PaymentApplicationOrgID
                    "
                    v-model="item.value"
                    placeholder="请选择付费申请人组织"
                    style="width: 100%"
                    :allow-clear="false"
                    @change="(val, opt) => onValueChange(item, val, opt, 'org')"
                  />
                </div>

                <a class="delete-btn" @click="removeAndCondition(index)"
                  >删除</a
                >
              </div>
            </li>
          </ul>

          <a-button
            type="dashed"
            block
            @click="addAndCondition"
            class="add-btn"
          >
            + 添加且条件
          </a-button>
        </div>

        <!-- OR 条件区域 -->
        <div class="condition-section">
          <div class="section-header section-header--or">
            <span class="section-title">或条件（满足任意一个即可）</span>
            <span class="section-badge">{{ orList.length }}</span>
          </div>

          <ul class="condition-list">
            <li
              v-for="(item, index) in orList"
              :key="'or-' + index"
              class="condition-item"
            >
              <div class="condition-row condition-row--or">
                <span class="condition-index condition-index--or"
                  >或条件{{ index + 1 }}</span
                >

                <div class="condition-field">
                  <label class="field-label">条件字段</label>
                  <a-select
                    :value="item.taskTypeCondition"
                    :options="taskTypeConditionOptions"
                    placeholder="请选择条件字段"
                    style="width: 100%"
                    @change="(val) => onTaskTypeConditionChange(item, val)"
                  />
                </div>

                <div
                  class="condition-field"
                  v-if="item.taskTypeCondition != null"
                >
                  <label class="field-label">条件介词</label>
                  <a-select
                    v-model:value="item.shouldBe"
                    :options="
                      getShouldBeOptionsForField(item.taskTypeCondition)
                    "
                    placeholder="请选择介词"
                    style="width: 100%"
                  />
                </div>

                <div
                  class="condition-field"
                  v-if="item.taskTypeCondition != null && item.shouldBe != null"
                >
                  <label class="field-label">值</label>
                  <UserSelect
                    v-if="
                      item.taskTypeCondition ===
                      TaskTypeCondition.PaymentApplicationUserId
                    "
                    v-model="item.value"
                    placeholder="请选择付费申请人"
                    style="width: 100%"
                    :allow-clear="false"
                    @change="
                      (val, opt) => onValueChange(item, val, opt, 'user')
                    "
                  />
                  <OrganizationSelect
                    v-else-if="
                      item.taskTypeCondition ===
                      TaskTypeCondition.PaymentApplicationOrgID
                    "
                    v-model="item.value"
                    placeholder="请选择付费申请人组织"
                    style="width: 100%"
                    :allow-clear="false"
                    @change="(val, opt) => onValueChange(item, val, opt, 'org')"
                  />
                </div>

                <a class="delete-btn" @click="removeOrCondition(index)">删除</a>
              </div>
            </li>
          </ul>

          <a-button type="dashed" block @click="addOrCondition" class="add-btn">
            + 添加或条件
          </a-button>
        </div>
      </div>

      <div class="demo-drawer__footer">
        <a-button type="primary" @click="saveCondition">确 定</a-button>
        <a-button @click="closeDrawer" style="margin-left: 8px">取 消</a-button>
      </div>
    </div>
  </a-drawer>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import {
  Button as AButton,
  Drawer as ADrawer,
  Select as ASelect,
  message,
} from 'ant-design-vue';
import { useWorkflowStore } from '../../store';
import { UserSelect, OrganizationSelect } from '#/adapter/component';
import { TaskTypeCondition, ShouldBe } from '#/api/system/workflow-admin';

const conditionsConfig = ref({ conditionNodes: [] });
const conditionConfig = ref({
  conditionList: [],
  isDefault: false,
  priorityLevel: 1,
});
const PriorityLevel = ref('');

const andList = ref([]);
const orList = ref([]);

const store = useWorkflowStore();

const conditionsConfig1 = computed(() => store.conditionsConfig1);
const conditionDrawer = computed(() => store.conditionDrawer);
const visible = computed(() => conditionDrawer.value);

const availablePriorityLevels = computed(() => {
  const nodes = conditionsConfig.value.conditionNodes;
  if (!nodes || nodes.length === 0) return [];
  const levels = [];
  for (let i = 0; i < nodes.length; i++) {
    if (!nodes[i].isDefault) {
      levels.push(i + 1);
    }
  }
  return levels;
});

const taskTypeConditionOptions = [
  { label: '付费申请人', value: TaskTypeCondition.PaymentApplicationUserId },
  { label: '付费申请人组织', value: TaskTypeCondition.PaymentApplicationOrgID },
];

function getShouldBeOptionsForField(taskTypeCondition) {
  if (taskTypeCondition === TaskTypeCondition.PaymentApplicationUserId) {
    return [
      { label: '等于', value: ShouldBe.Equal },
      { label: '不等于', value: ShouldBe.NotEqual },
    ];
  }
  if (taskTypeCondition === TaskTypeCondition.PaymentApplicationOrgID) {
    return [
      { label: '属于', value: ShouldBe.In },
      { label: '不属于', value: ShouldBe.NotIn },
    ];
  }
  return [
    { label: '等于', value: ShouldBe.Equal },
    { label: '不等于', value: ShouldBe.NotEqual },
  ];
}

function splitConditionList(list) {
  const and = [];
  const or = [];
  if (!Array.isArray(list)) return { and, or };
  for (const c of list) {
    const copy = { ...c };
    if (c.isOr) {
      or.push(copy);
    } else {
      and.push(copy);
    }
  }
  return { and, or };
}

function mergeConditionLists() {
  return [
    ...andList.value.map((c) => ({ ...c, isOr: false })),
    ...orList.value.map((c) => ({ ...c, isOr: true })),
  ];
}

watch(conditionsConfig1, (val) => {
  if (!val || !val.value) return;
  conditionsConfig.value = val.value;
  PriorityLevel.value = val.priorityLevel;
  const node = val.priorityLevel
    ? conditionsConfig.value.conditionNodes[val.priorityLevel - 1]
    : { conditionList: [], isDefault: false, nodeUserList: [] };

  conditionConfig.value = {
    ...node,
    conditionList: Array.isArray(node.conditionList)
      ? [...node.conditionList.map((c) => ({ ...c }))]
      : [],
    isDefault: node.isDefault === true,
  };

  const { and, or } = splitConditionList(conditionConfig.value.conditionList);
  andList.value = and;
  orList.value = or;
});

function onTaskTypeConditionChange(item, val) {
  item.taskTypeCondition = val;
  item.shouldBe = undefined;
  item.value = undefined;
  item.valueText = undefined;

  if (val === TaskTypeCondition.PaymentApplicationUserId) {
    item.shouldBe = ShouldBe.Equal;
  } else if (val === TaskTypeCondition.PaymentApplicationOrgID) {
    item.shouldBe = ShouldBe.In;
  }
}

function onValueChange(item, val, opt, _type) {
  item.value = val;
  if (opt && opt.label) {
    item.valueText = opt.label;
  } else if (val != null) {
    item.valueText = String(val);
  }
}

function createEmptyCondition() {
  return {
    isOr: false,
    taskTypeCondition: undefined,
    shouldBe: undefined,
    value: undefined,
    valueText: undefined,
  };
}

function addAndCondition() {
  andList.value.push(createEmptyCondition());
}

function addOrCondition() {
  orList.value.push({ ...createEmptyCondition(), isOr: true });
}

function removeAndCondition(index) {
  andList.value.splice(index, 1);
}

function removeOrCondition(index) {
  orList.value.splice(index, 1);
}

function buildConditionStr() {
  const andParts = [];
  const orParts = [];

  for (const c of andList.value) {
    if (c.taskTypeCondition == null || c.shouldBe == null) continue;
    const fieldLabel =
      taskTypeConditionOptions.find((o) => o.value === c.taskTypeCondition)
        ?.label || '';
    const shouldBeLabel =
      getShouldBeOptionsForField(c.taskTypeCondition).find(
        (o) => o.value === c.shouldBe,
      )?.label || '';
    const valText = c.valueText || c.value || '';
    andParts.push(`${fieldLabel} ${shouldBeLabel} ${valText}`);
  }

  for (const c of orList.value) {
    if (c.taskTypeCondition == null || c.shouldBe == null) continue;
    const fieldLabel =
      taskTypeConditionOptions.find((o) => o.value === c.taskTypeCondition)
        ?.label || '';
    const shouldBeLabel =
      getShouldBeOptionsForField(c.taskTypeCondition).find(
        (o) => o.value === c.shouldBe,
      )?.label || '';
    const valText = c.valueText || c.value || '';
    orParts.push(`${fieldLabel} ${shouldBeLabel} ${valText}`);
  }

  const parts = [];
  if (andParts.length > 0) {
    parts.push(
      andParts.length === 1 ? andParts[0] : `(${andParts.join(' 且 ')})`,
    );
  }
  if (orParts.length > 0) {
    parts.push(orParts.length === 1 ? orParts[0] : `(${orParts.join(' 或 ')})`);
  }

  return parts.join(' 且 ');
}

function hasIncompleteCondition(list) {
  if (!list || list.length === 0) return true;
  return list.some(
    (c) =>
      c.taskTypeCondition == null ||
      c.shouldBe == null ||
      c.value == null ||
      c.value === '',
  );
}

function saveCondition() {
  const merged = mergeConditionLists();

  if (!conditionConfig.value.isDefault) {
    if (merged.length === 0) {
      message.warning('请至少添加一个条件');
      return;
    }
    if (hasIncompleteCondition(merged)) {
      message.warning('请完整填写条件的所有字段（条件字段、条件介词、条件值）');
      return;
    }
  }

  conditionConfig.value.conditionList = merged;

  const updatedNode = {
    ...conditionsConfig.value.conditionNodes[PriorityLevel.value - 1],
    ...conditionConfig.value,
  };

  updatedNode._conditionDisplayStr = conditionConfig.value.isDefault
    ? '默认路径'
    : buildConditionStr() || '请设置条件';

  updatedNode.error =
    !conditionConfig.value.isDefault && hasIncompleteCondition(merged);

  conditionsConfig.value.conditionNodes.splice(PriorityLevel.value - 1, 1);
  const targetIdx = conditionConfig.value.priorityLevel
    ? conditionConfig.value.priorityLevel - 1
    : PriorityLevel.value - 1;
  conditionsConfig.value.conditionNodes.splice(targetIdx, 0, updatedNode);

  conditionsConfig.value.conditionNodes.forEach((item, index) => {
    item.priorityLevel = index + 1;
  });

  for (let i = 0; i < conditionsConfig.value.conditionNodes.length; i++) {
    const n = conditionsConfig.value.conditionNodes[i];
    if (n.isDefault) {
      n.error = false;
      n._conditionDisplayStr = '默认路径';
    } else {
      n.error = hasIncompleteCondition(n.conditionList);
    }
  }

  store.setConditionsConfig({
    value: conditionsConfig.value,
    flag: true,
    id: conditionsConfig1.value.id,
  });
  closeDrawer();
}

function closeDrawer() {
  store.setCondition(false);
}
</script>

<style scoped>
.priority_level {
  width: 100px;
  height: 32px;
  font-size: 12px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
}

.condition_content {
  padding: 20px 20px 0;
}

.tip {
  width: 100%;
  padding: 0 17px;
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 45px;
  color: #46a6fe;
  background: #f1f9ff;
  border: 1px solid #40a3f7;
  border-radius: 4px;
}

.condition-section {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 4px;
}

.section-header--and {
  color: #1890ff;
  background: #e6f7ff;
  border-left: 3px solid #1890ff;
}

.section-header--or {
  color: #fa8c16;
  background: #fff7e6;
  border-left: 3px solid #fa8c16;
}

.section-title {
  flex: 1;
}

.section-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 12px;
  color: #666;
  background: rgb(0 0 0 / 6%);
  border-radius: 10px;
}

.condition-list {
  padding: 0;
  margin: 0 0 8px;
  list-style: none;
}

.condition-item {
  margin-bottom: 8px;
}

.condition-row {
  position: relative;
  padding: 12px;
  border-radius: 6px;
}

.condition-row--and {
  background: #f0f8ff;
  border: 1px solid #bae7ff;
}

.condition-row--or {
  background: #fff8f0;
  border: 1px solid #ffd591;
}

.condition-index {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #1890ff;
}

.condition-index--or {
  color: #fa8c16;
}

.condition-field {
  margin-bottom: 10px;
}

.field-label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: #666;
}

.delete-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  color: #ff4d4f;
  cursor: pointer;
}

.delete-btn:hover {
  color: #ff7875;
}

.add-btn {
  margin-bottom: 4px;
}

.demo-drawer__footer {
  padding: 20px;
  text-align: right;
}
</style>
