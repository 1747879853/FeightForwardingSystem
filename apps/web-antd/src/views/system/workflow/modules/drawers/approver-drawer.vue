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

          <template v-if="approverConfig.passMethod !== 0">
            <div class="form-item">
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

            <div class="form-item">
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

            <div class="form-item">
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
import {
  Button as AButton,
  Drawer as ADrawer,
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

function mergeAuditorsToSelections(auditors) {
  const userIds = [];
  const roleIds = [];
  const attrs = [];
  const uTexts = {};
  const rTexts = {};

  if (auditors && auditors.length) {
    for (const a of auditors) {
      if (a.userId != null && a.userId !== 0) {
        if (!userIds.includes(a.userId)) {
          userIds.push(a.userId);
          uTexts[a.userId] = a.showText || String(a.userId);
        }
      } else if (a.roleId != null && a.roleId !== 0) {
        if (!roleIds.includes(a.roleId)) {
          roleIds.push(a.roleId);
          rTexts[a.roleId] = a.showText || String(a.roleId);
        }
      } else if (a.userAttribute != null && a.userAttribute !== 0) {
        if (!attrs.includes(a.userAttribute)) {
          attrs.push(a.userAttribute);
        }
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
    selectedUserIds.value = [];
    selectedRoleIds.value = [];
    selectedUserAttributes.value = [];
    approverConfig.value.auditors = [];
  }
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

  for (const uid of selectedUserIds.value) {
    auditors.push({
      userId: uid,
      roleId: null,
      userAttribute: 0,
      showText: userShowTexts.value[uid] || String(uid),
    });
  }

  for (const rid of selectedRoleIds.value) {
    auditors.push({
      userId: null,
      roleId: rid,
      userAttribute: 0,
      showText: roleShowTexts.value[rid] || String(rid),
    });
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
  const parts = [];
  for (const uid of selectedUserIds.value) {
    parts.push(userShowTexts.value[uid] || String(uid));
  }
  for (const rid of selectedRoleIds.value) {
    parts.push(roleShowTexts.value[rid] || String(rid));
  }
  for (const attr of selectedUserAttributes.value) {
    const opt = userAttributeOptions.find((o) => o.value === attr);
    parts.push(opt ? opt.label : String(attr));
  }
  return parts.join(', ');
}

function saveApprover() {
  const auditors =
    approverConfig.value.passMethod === WorkFlowPassMethod.Pass
      ? []
      : buildAuditors();

  const hasAuditors = auditors.length > 0;
  const isPass = approverConfig.value.passMethod === WorkFlowPassMethod.Pass;
  const error = !isPass && !hasAuditors;

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
