<script lang="ts" setup>
import { computed, onActivated, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';

import { getUser } from '#/api';
import { CommissionConfigAdminApi } from '#/api/commission/commission-config-admin';
import { useUnsavedGuard } from '#/composables/use-unsaved-guard';
import { $t } from '#/locales';

import BankAccountPanel from './modules/bank-account-panel.vue';
import CommissionConfigPanel from './modules/commission/commission-config-panel.vue';
import PasswordPanel from './modules/password-panel.vue';
import RoleAssignPanel from './modules/role-assign-panel.vue';
import UserForm from './modules/user-form.vue';
import ViewPermissionsPanel from './modules/view-permissions-panel.vue';

defineOptions({ name: 'SystemUserEdit' });

type TabKey =
  | 'basic'
  | 'viewPermissions'
  | 'roles'
  | 'bankAccount'
  | 'salesCommission'
  | 'operationCommission'
  | 'password';

type FormExpose = {
  isFormDirty?: () => boolean | Promise<boolean>;
};

const route = useRoute();

/** 从路由参数解析用户ID */
const userId = computed<number | undefined>(() => {
  const raw = route.params.id;
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(id) && id > 0 ? id : undefined;
});

const { resetTabTitle, setTabTitle } = useTabs();

/** 已解析出的用户名，用于页签标题「用户编辑-***」 */
const resolvedUserName = ref('');

async function syncTabTitle() {
  if (userId.value == null) return;
  // 已有用户名时直接回写（keep-alive 重新激活时页签可能保留旧标题）
  if (resolvedUserName.value) {
    void setTabTitle(tabTitle.value);
    return;
  }
  try {
    const user = await getUser(userId.value, { silent: true });
    const name = user.nickName || user.userName || '';
    if (name) {
      resolvedUserName.value = name;
      void setTabTitle(tabTitle.value);
    }
  } catch {
    // 获取失败时保留路由默认标题
  }
}

const tabTitle = computed(() =>
  resolvedUserName.value
    ? `${$t('system.user.editTabTitle')}-${resolvedUserName.value}`
    : $t('system.user.editTabTitle'),
);

const formRef = ref<FormExpose | null>(null);
const activeTab = ref<TabKey>('basic');

const tabs = ref<{ key: TabKey; label: string }[]>([
  { key: 'basic', label: $t('system.user.sectionBasicInfo') },
  { key: 'viewPermissions', label: $t('system.user.viewPermissions') },
  { key: 'roles', label: $t('system.user.setRoles') },
  { key: 'bankAccount', label: $t('system.user.bankAccountAction') },
  { key: 'salesCommission', label: $t('commission.salesTab') },
  { key: 'operationCommission', label: $t('commission.operationTab') },
  { key: 'password', label: $t('system.user.changePassword') },
]);

const onTabClick = (tab: { key: TabKey }) => {
  activeTab.value = tab.key;
};

// 未保存拦截：基础信息表单由用户编辑页统一判断
useUnsavedGuard({
  isDirty: async () => {
    const formDirty = formRef.value?.isFormDirty;
    if (formDirty && (await formDirty())) return true;
    return false;
  },
});

onMounted(() => {
  void syncTabTitle();
});

onActivated(() => {
  void syncTabTitle();
});

onBeforeUnmount(() => {
  void resetTabTitle();
});

const contentTabsStyle = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  padding: '8px',
  overflowX: 'auto',
  position: 'sticky',
  top: '0',
  zIndex: 20,
  background: '#fff',
  border: '1px solid #e8e8e8',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
} as const;

const contentTabStyle = {
  padding: '6px 10px',
  fontSize: '12px',
  color: '#595959',
  cursor: 'pointer',
  borderBottom: '2px solid transparent',
  whiteSpace: 'nowrap',
} as const;

const getContentTabStyle = (isActive: boolean) =>
  isActive
    ? {
        ...contentTabStyle,
        fontWeight: 600,
        color: '#1677ff',
        borderBottomColor: '#1677ff',
      }
    : contentTabStyle;
</script>

<template>
  <Page auto-content-height content-class="!p-0">
    <div class="flex min-w-0 flex-col gap-2" style="height: 100%">
      <div class="content-tabs" :style="contentTabsStyle">
        <span
          v-for="tab in tabs"
          :key="tab.key"
          class="content-tab"
          :class="{ 'content-tab--active': activeTab === tab.key }"
          :style="getContentTabStyle(activeTab === tab.key)"
          @click="onTabClick(tab)"
        >
          {{ tab.label }}
        </span>
      </div>
      <div class="flex min-h-0 flex-1 items-stretch gap-3">
        <div class="flex min-h-0 min-w-0 flex-1 flex-col">
          <KeepAlive include="UserAdminForm">
            <UserForm
              v-if="activeTab === 'basic' && userId != null"
              ref="formRef"
              embedded
              :user-id="userId"
            />
          </KeepAlive>
          <KeepAlive include="UserViewPermissionsPanel">
            <ViewPermissionsPanel
              v-if="activeTab === 'viewPermissions' && userId != null"
              :user-id="userId"
            />
          </KeepAlive>
          <KeepAlive include="UserRoleAssignPanel">
            <RoleAssignPanel
              v-if="activeTab === 'roles' && userId != null"
              :user-id="userId"
            />
          </KeepAlive>
          <KeepAlive include="UserBankAccountPanel">
            <BankAccountPanel
              v-if="activeTab === 'bankAccount' && userId != null"
              :user-id="userId"
            />
          </KeepAlive>
          <KeepAlive include="UserCommissionConfigPanel">
            <CommissionConfigPanel
              v-if="activeTab === 'salesCommission' && userId != null"
              :user-id="userId"
              :commission-type="CommissionConfigAdminApi.CommissionType.Sales"
            />
          </KeepAlive>
          <KeepAlive include="UserCommissionConfigPanel">
            <CommissionConfigPanel
              v-if="activeTab === 'operationCommission' && userId != null"
              :user-id="userId"
              :commission-type="
                CommissionConfigAdminApi.CommissionType.Operation
              "
            />
          </KeepAlive>
          <KeepAlive include="UserPasswordPanel">
            <PasswordPanel
              v-if="activeTab === 'password' && userId != null"
              :user-id="userId"
            />
          </KeepAlive>
        </div>
      </div>
    </div>
  </Page>
</template>
