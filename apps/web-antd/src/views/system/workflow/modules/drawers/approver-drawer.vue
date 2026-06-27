<template>
  <a-drawer
    :open="visible"
    title="审批人设置"
    :width="550"
    :closable="false"
    @close="closeDrawer"
    :destroyOnClose="false"
  >
    <div class="demo-drawer__content">
      <div class="drawer_content">
        <div class="approver_content">
          <div class="form-item">
            <label class="form-label">通过方式</label>
            <a-select
              v-model:value="approverConfig.passMethod"
              :options="passMethodOptions"
              style="width: 100%"
              :allow-clear="false"
              @change="onPassMethodChange"
            />
          </div>

          <template v-if="needsApproverConfig">
            <div class="form-item">
              <label class="form-label">审批人类型</label>
              <a-radio-group
                v-model:value="approverType"
                class="approver-type-group"
                @change="onApproverTypeChange"
              >
                <a-radio value="user">审批用户</a-radio>
                <a-radio value="role">审批角色</a-radio>
                <a-radio value="attribute">用户属性</a-radio>
              </a-radio-group>
            </div>

            <div v-if="approverType === 'user'" class="form-item">
              <label class="form-label">审批用户</label>
              <UserSelect
                v-model="selectedUserIds"
                mode="multiple"
                placeholder="请选择审批用户"
                label-key="userName"
                style="width: 100%"
                @change="onUserChange"
              />
            </div>

            <div v-else-if="approverType === 'role'" class="form-item">
              <label class="form-label">审批角色</label>
              <RoleSelect
                v-model="selectedRoleIds"
                mode="multiple"
                placeholder="请选择审批角色"
                style="width: 100%"
                :allow-clear="false"
                @change="onRoleChange"
              />
            </div>

            <div v-else class="form-item">
              <label class="form-label">用户属性</label>
              <a-select
                v-model:value="selectedUserAttributes"
                mode="multiple"
                :options="userAttributeOptions"
                placeholder="请选择用户属性"
                style="width: 100%"
                :allow-clear="false"
                @change="onUserAttributeChange"
              />
            </div>
          </template>

          <div v-if="approverConfig.passMethod === 0" class="pass-tip">
            <p>直接通过模式不需要配置审批人</p>
          </div>
        </div>
      </div>
      <div class="demo-drawer__footer">
        <a-button type="primary" @click="saveApprover">确 定</a-button>
        <a-button @click="closeDrawer" style="margin-left: 8px">取 消</a-button>
      </div>
    </div>
  </a-drawer>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { message } from 'ant-design-vue';
import {
  Button as AButton,
  Drawer as ADrawer,
  Radio as ARadio,
  RadioGroup as ARadioGroup,
  Select as ASelect,
} from 'ant-design-vue';
import { useWorkflowStore } from '../../store';
import { UserSelect, RoleSelect } from '#/adapter/component';
import {
  getPassMethodOptions,
  WorkFlowPassMethod,
} from '#/api/system/workflow-admin';
import { getUserAttributeOptions } from '#/views/system/user/data';

const props = defineProps({
  directorMaxLevel: {
    type: Number,
    default: 0,
  },
});

const approverConfig = ref({
  passMethod: WorkFlowPassMethod.Pass,
  auditors: [],
  nodeName: '',
  error: false,
});

/** 会签/或签下审批用户、角色、用户属性三选一 */
const approverType = ref('user');

const selectedUserIds = ref([]);
const selectedRoleIds = ref([]);
const selectedUserAttributes = ref([]);

const userShowTexts = ref({});
const roleShowTexts = ref({});

const store = useWorkflowStore();
const approverConfig1 = computed(() => store.approverConfig1);
const visible = computed(() => store.approverDrawer);

const passMethodOptions = getPassMethodOptions().map((o) => ({
  label: o.label,
  value: o.value,
}));

const userAttributeOptions = getUserAttributeOptions().map((o) => ({
  label: o.label,
  value: o.value,
}));

const needsApproverConfig = computed(
  () =>
    approverConfig.value.passMethod === WorkFlowPassMethod.Or ||
    approverConfig.value.passMethod === WorkFlowPassMethod.And,
);

function inferApproverType(auditors) {
  if (!auditors?.length) {
    return 'user';
  }
  if (auditors.some((a) => a.userId != null && a.userId !== 0)) {
    return 'user';
  }
  if (auditors.some((a) => a.roleId != null && a.roleId !== 0)) {
    return 'role';
  }
  if (auditors.some((a) => a.userAttribute != null && a.userAttribute !== 0)) {
    return 'attribute';
  }
  return 'user';
}

function clearApproverSelections() {
  selectedUserIds.value = [];
  selectedRoleIds.value = [];
  selectedUserAttributes.value = [];
  userShowTexts.value = {};
  roleShowTexts.value = {};
}

function mergeAuditorsToSelections(auditors) {
  const type = inferApproverType(auditors);
  approverType.value = type;

  const userIds = [];
  const roleIds = [];
  const attrs = [];
  const uTexts = {};
  const rTexts = {};

  if (auditors?.length) {
    for (const a of auditors) {
      if (
        type === 'user' &&
        a.userId != null &&
        a.userId !== 0 &&
        !userIds.includes(a.userId)
      ) {
        userIds.push(a.userId);
        uTexts[a.userId] = a.showText || String(a.userId);
      } else if (
        type === 'role' &&
        a.roleId != null &&
        a.roleId !== 0 &&
        !roleIds.includes(a.roleId)
      ) {
        roleIds.push(a.roleId);
        rTexts[a.roleId] = a.showText || String(a.roleId);
      } else if (
        type === 'attribute' &&
        a.userAttribute != null &&
        a.userAttribute !== 0 &&
        !attrs.includes(a.userAttribute)
      ) {
        attrs.push(a.userAttribute);
      }
    }
  }

  selectedUserIds.value = userIds;
  selectedRoleIds.value = roleIds;
  selectedUserAttributes.value = attrs;
  userShowTexts.value = uTexts;
  roleShowTexts.value = rTexts;
}

watch(approverConfig1, (val) => {
  if (!val || !val.value) return;
  const node = val.value;
  approverConfig.value = {
    ...node,
    passMethod:
      node.passMethod != null ? node.passMethod : WorkFlowPassMethod.Pass,
    auditors: node.auditors || [],
  };
  mergeAuditorsToSelections(node.auditors);
});

function onPassMethodChange(val) {
  if (val === WorkFlowPassMethod.Pass) {
    approverType.value = 'user';
    clearApproverSelections();
    approverConfig.value.auditors = [];
  } else {
    approverType.value = 'user';
    clearApproverSelections();
  }
}

function onApproverTypeChange() {
  clearApproverSelections();
}

function onUserChange(ids, optionList) {
  if (Array.isArray(optionList)) {
    for (const opt of optionList) {
      if (opt && opt.value != null) {
        userShowTexts.value[opt.value] = opt.label || String(opt.value);
      }
    }
  }
}

function onRoleChange(ids, optionList) {
  if (Array.isArray(optionList)) {
    for (const opt of optionList) {
      if (opt && opt.value != null) {
        roleShowTexts.value[opt.value] = opt.label || String(opt.value);
      }
    }
  }
}

function onUserAttributeChange() {}

function buildAuditors() {
  const auditors = [];

  if (approverType.value === 'user') {
    for (const uid of selectedUserIds.value) {
      auditors.push({
        userId: uid,
        roleId: null,
        userAttribute: 0,
        showText: userShowTexts.value[uid] || String(uid),
      });
    }
    return auditors;
  }

  if (approverType.value === 'role') {
    for (const rid of selectedRoleIds.value) {
      auditors.push({
        userId: null,
        roleId: rid,
        userAttribute: 0,
        showText: roleShowTexts.value[rid] || String(rid),
      });
    }
    return auditors;
  }

  for (const attr of selectedUserAttributes.value) {
    const opt = userAttributeOptions.find((o) => o.value === attr);
    auditors.push({
      userId: null,
      roleId: null,
      userAttribute: attr,
      showText: opt ? opt.label : String(attr),
    });
  }

  return auditors;
}

function getApproverDisplayStr() {
  if (approverType.value === 'user') {
    return selectedUserIds.value
      .map((uid) => userShowTexts.value[uid] || String(uid))
      .join(', ');
  }
  if (approverType.value === 'role') {
    return selectedRoleIds.value
      .map((rid) => roleShowTexts.value[rid] || String(rid))
      .join(', ');
  }
  return selectedUserAttributes.value
    .map((attr) => {
      const opt = userAttributeOptions.find((o) => o.value === attr);
      return opt ? opt.label : String(attr);
    })
    .join(', ');
}

function hasCurrentApproverSelection() {
  if (approverType.value === 'user') {
    return selectedUserIds.value.length > 0;
  }
  if (approverType.value === 'role') {
    return selectedRoleIds.value.length > 0;
  }
  return selectedUserAttributes.value.length > 0;
}

function saveApprover() {
  const isPass = approverConfig.value.passMethod === WorkFlowPassMethod.Pass;

  if (needsApproverConfig.value && !hasCurrentApproverSelection()) {
    const typeLabel =
      approverType.value === 'user'
        ? '审批用户'
        : approverType.value === 'role'
          ? '审批角色'
          : '用户属性';
    message.warning(`请选择${typeLabel}`);
    return;
  }

  const auditors = isPass ? [] : buildAuditors();

  const hasAuditors = auditors.length > 0;
  const error = needsApproverConfig.value && !hasAuditors;

  const passMethodLabel =
    passMethodOptions.find((o) => o.value === approverConfig.value.passMethod)
      ?.label || '';

  const displayStr = isPass
    ? passMethodLabel
    : `[${passMethodLabel}] ${getApproverDisplayStr() || ''}`;

  const nodeValue = {
    ...approverConfig.value,
    passMethod: approverConfig.value.passMethod,
    auditors,
    error,
    _displayStr: displayStr,
    nodeUserList: [],
    settype: 1,
    examineMode:
      approverConfig.value.passMethod === WorkFlowPassMethod.And ? 2 : 1,
  };

  store.setApproverConfig({
    value: nodeValue,
    flag: true,
    id: approverConfig1.value.id,
  });
  closeDrawer();
}

function closeDrawer() {
  store.setApprover(false);
}
</script>

<style scoped>
.approver_content {
  padding: 20px;
}

.form-item {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.approver-type-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.pass-tip {
  padding: 16px;
  margin-top: 10px;
  font-size: 13px;
  color: #52c41a;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 4px;
}

.demo-drawer__footer {
  padding: 20px;
  text-align: right;
}
</style>
