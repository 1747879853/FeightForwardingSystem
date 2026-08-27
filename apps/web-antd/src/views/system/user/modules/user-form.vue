<script lang="ts" setup>
import type { SystemUserAdminApi } from '#/api/system/user-admin';
import type { SystemOrganizationUnitApi } from '#/api/system/organization-unit';

import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, message, Radio, Tag, Tree } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  createOrUpdateUserWithDataPermission,
  getUserForEdit,
} from '#/api/system/user-admin';
import {
  getOrganizationUnitTree,
  resolveOrganizationCompanyName,
} from '#/api/system/organization-unit';
import { useUnsavedGuard } from '#/composables/use-unsaved-guard';
import { $t } from '#/locales';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';

import {
  combineUserAttribute,
  parseUserAttribute,
  useFormSchema,
} from '../data';
import {
  avatarUrlToFormValue,
  normalizeAvatarSubmitValue,
} from '../avatar-utils';

defineOptions({ name: 'UserAdminForm' });

const props = withDefaults(
  defineProps<{
    /** 嵌入用户编辑页的基础信息 Tab 时置为 true（不渲染 Page 与返回按钮） */
    embedded?: boolean;
    /** 编辑的用户ID；新建时不传 */
    userId?: number;
  }>(),
  { embedded: false, userId: undefined },
);

const router = useRouter();

// 编辑ID由父级（用户编辑页）传入；独立新建页时为 undefined
const editId = computed<number | undefined>(() => props.userId);
const isEdit = computed(() => editId.value != null);

const submitting = ref(false);
const formData = ref<SystemUserAdminApi.SystemUser>();
const orgTreePromise = ref<ReturnType<typeof getOrganizationUnitTree> | null>(
  null,
);

// 多组织选择相关状态
const selectedOrganizations = ref<
  SystemUserAdminApi.UpdateUserOrganizationPathDto[]
>([]);
const organizationTreeData = ref<any[]>([]); // 使用any类型以兼容Tree组件的key字段要求
const checkedOrgKeys = ref<number[]>([]); // Tree UI显示的选中keys
const actualSelectedIds = ref<Set<number>>(new Set()); // 实际用户选中的节点IDs
const expandedKeys = ref<number[]>([]);
const disabledNodeIds = ref<Set<number>>(new Set()); // 需要禁用的节点IDs

async function ensureOrgTree() {
  if (!orgTreePromise.value) {
    orgTreePromise.value = getOrganizationUnitTree();
  }
  const tree = await orgTreePromise.value;

  // 为Tree组件添加key字段（与id相同）
  const addKeyToTree = (
    nodes: SystemOrganizationUnitApi.OrganizationUnitTreeDto[],
    disableIds: Set<number> = new Set(),
  ): any[] => {
    return nodes.map((node) => ({
      ...node,
      key: node.id,
      disabled: disableIds.has(node.id), // 根据禁用集合设置disabled状态
      children: node.children
        ? addKeyToTree(node.children, disableIds)
        : undefined,
    }));
  };

  organizationTreeData.value = addKeyToTree(tree, disabledNodeIds.value);

  // 不默认展开所有节点，让用户手动展开需要的组织
  expandedKeys.value = [];
  return tree;
}

// 处理树节点选中变化
const handleTreeCheck = (checkedKeys: any) => {
  const keys = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked;

  // 直接使用用户选中的节点（不进行级联）
  // 智能过滤：如果某节点的子节点也被选中，则移除该节点，只保留最深层的节点
  const filterEffectiveNodes = (selectedIds: number[]): number[] => {
    const idSet = new Set(selectedIds);
    const effectiveNodes: number[] = [];

    selectedIds.forEach((id) => {
      // 查找该节点是否有子节点也被选中
      const findNode = (nodes: any[], targetId: number): boolean => {
        for (const node of nodes) {
          if (node.id === targetId) {
            // 找到目标节点，检查其子节点是否有被选中的
            if (node.children && node.children.length > 0) {
              return node.children.some((child: any) => idSet.has(child.id));
            }
            return false;
          }
          if (node.children && node.children.length > 0) {
            if (findNode(node.children, targetId)) {
              return true;
            }
          }
        }
        return false;
      };

      const hasCheckedChild = findNode(organizationTreeData.value, id);

      // 只有当没有子节点被选中时，才认为这是有效节点
      if (!hasCheckedChild) {
        effectiveNodes.push(id);
      }
    });

    return effectiveNodes;
  };

  // 应用智能过滤，只保留每一级的最后一层组织
  const effectiveSelectedIds = filterEffectiveNodes(keys);

  // 更新实际选中的IDs集合
  actualSelectedIds.value = new Set(effectiveSelectedIds);

  // 更新selectedOrganizations，保留原有的default设置
  const newOrgs = effectiveSelectedIds.map((id: number) => {
    const existing = selectedOrganizations.value.find((org) => org.id === id);
    return {
      id,
      default: existing?.default || false,
    };
  });

  selectedOrganizations.value = newOrgs;

  // UI显示与提交数据一致
  checkedOrgKeys.value = effectiveSelectedIds;

  // 更新禁用节点状态
  updateDisabledNodes(effectiveSelectedIds);
};

// 设置默认组织
const setDefaultOrg = (orgId: number) => {
  // 验证是否为选中的节点
  const isSelected = selectedOrganizations.value.some(
    (org) => org.id === orgId,
  );

  if (!isSelected) {
    message.warning('只能将已选中的组织设置为默认组织');
    return;
  }

  // 直接设置默认组织，不进行复杂的叶子节点验证
  // 因为用户已经通过树选择器选择了该节点
  selectedOrganizations.value = selectedOrganizations.value.map((org) => ({
    ...org,
    default: org.id === orgId,
  }));
};

// 查找节点的根节点ID
const findRootNodeId = (nodes: any[], targetId: number): number | null => {
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      // 如果目标ID在当前节点的子树中，则当前节点就是根节点
      if (findNodeInSubtree(node.children, targetId)) {
        return node.id;
      }
    }
  }
  return null;
};

// 检查节点是否在子树中
const findNodeInSubtree = (nodes: any[], targetId: number): boolean => {
  for (const node of nodes) {
    if (node.id === targetId) {
      return true;
    }
    if (node.children && node.children.length > 0) {
      if (findNodeInSubtree(node.children, targetId)) {
        return true;
      }
    }
  }
  return false;
};

// 获取某个根节点下的所有节点IDs
const getAllNodeIdsUnderRoot = (nodes: any[], rootId: number): number[] => {
  const ids: number[] = [];

  const collectIds = (nodeList: any[]) => {
    for (const node of nodeList) {
      ids.push(node.id);
      if (node.children && node.children.length > 0) {
        collectIds(node.children);
      }
    }
  };

  // 找到根节点并收集其下所有节点
  const findRootAndCollect = (nodeList: any[]): boolean => {
    for (const node of nodeList) {
      if (node.id === rootId) {
        collectIds([node]);
        return true;
      }
      if (node.children && node.children.length > 0) {
        if (findRootAndCollect(node.children)) {
          return true;
        }
      }
    }
    return false;
  };

  findRootAndCollect(nodes);
  return ids;
};

// 更新禁用节点列表
const updateDisabledNodes = (selectedIds: number[]) => {
  const newDisabledIds = new Set<number>();

  // 对于每个选中的节点，找到其根节点，并将该根节点下的其他所有节点禁用
  selectedIds.forEach((selectedId) => {
    const rootNodeId = findRootNodeId(organizationTreeData.value, selectedId);
    if (rootNodeId !== null) {
      // 获取该根节点下的所有节点IDs
      const allNodeIdsUnderRoot = getAllNodeIdsUnderRoot(
        organizationTreeData.value,
        rootNodeId,
      );

      // 将除了选中节点之外的所有节点加入禁用集合
      allNodeIdsUnderRoot.forEach((nodeId) => {
        if (nodeId !== selectedId) {
          newDisabledIds.add(nodeId);
        }
      });
    }

    // 对于每个选中的节点，递归禁用其所有子节点
    const disableAllChildren = (nodes: any[], targetId: number) => {
      for (const node of nodes) {
        if (node.id === targetId) {
          // 找到目标节点，将其所有子节点加入禁用集合
          if (node.children && node.children.length > 0) {
            const collectAllChildrenIds = (childNodes: any[]) => {
              childNodes.forEach((child) => {
                newDisabledIds.add(child.id);
                if (child.children && child.children.length > 0) {
                  collectAllChildrenIds(child.children);
                }
              });
            };
            collectAllChildrenIds(node.children);
          }
          return true;
        }
        if (node.children && node.children.length > 0) {
          if (disableAllChildren(node.children, targetId)) {
            return true;
          }
        }
      }
      return false;
    };

    disableAllChildren(organizationTreeData.value, selectedId);
  });

  disabledNodeIds.value = newDisabledIds;

  // 重新构建树数据，应用禁用状态
  const rebuildTreeWithDisabled = (
    nodes: SystemOrganizationUnitApi.OrganizationUnitTreeDto[],
    disableIds: Set<number>,
  ): any[] => {
    return nodes.map((node) => ({
      ...node,
      key: node.id,
      disabled: disableIds.has(node.id),
      children: node.children
        ? rebuildTreeWithDisabled(node.children, disableIds)
        : undefined,
    }));
  };

  organizationTreeData.value = rebuildTreeWithDisabled(
    organizationTreeData.value,
    disabledNodeIds.value,
  );
};

// 移除组织
const removeOrg = (orgId: number) => {
  // 从实际选中IDs中移除
  actualSelectedIds.value.delete(orgId);

  // 从selectedOrganizations中移除
  selectedOrganizations.value = selectedOrganizations.value.filter(
    (org) => org.id !== orgId,
  );

  // 从checkedOrgKeys中移除（UI层面）
  checkedOrgKeys.value = checkedOrgKeys.value.filter((id) => id !== orgId);

  // 重新计算禁用节点列表
  updateDisabledNodes(Array.from(actualSelectedIds.value));
};

// 获取组织显示名称
const getOrgDisplayName = (orgId: number): string => {
  const findNode = (
    nodes: SystemOrganizationUnitApi.OrganizationUnitTreeDto[],
    id: number,
  ): SystemOrganizationUnitApi.OrganizationUnitTreeDto | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const node = findNode(organizationTreeData.value, orgId);
  if (!node) {
    return `ID:${orgId}`;
  }

  // 获取公司名称
  const tree =
    organizationTreeData.value as SystemOrganizationUnitApi.OrganizationUnitTreeDto[];
  const companyName = resolveOrganizationCompanyName(tree, orgId);

  // 如果有公司名称且与组织名称不同，则显示"公司名称 + 组织名称"
  if (companyName && companyName !== node.displayName) {
    return `${companyName} + ${node.displayName}`;
  }

  return node.displayName || `ID:${orgId}`;
};

// 同步公司名称（使用第一个选中的组织的公司）
async function syncCompanyName() {
  if (selectedOrganizations.value.length === 0) {
    await formApi.setFieldValue('companyName', '');
    return;
  }

  const tree = await ensureOrgTree();
  const firstOrgId = selectedOrganizations.value[0]?.id;
  if (!firstOrgId) {
    await formApi.setFieldValue('companyName', '');
    return;
  }

  const companyName = resolveOrganizationCompanyName(tree, firstOrgId);
  await formApi.setFieldValue('companyName', companyName);
}

// 监听组织选择变化
watch(
  () => selectedOrganizations.value,
  () => {
    void syncCompanyName();
  },
  { deep: true },
);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
  },
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});

/**
 * 加载编辑数据
 */
async function loadUserDetail(id: number) {
  try {
    const userDetail = await getUserForEdit(id);
    formData.value = userDetail;

    // 处理organizations数据
    if (userDetail.organizations && userDetail.organizations.length > 0) {
      selectedOrganizations.value = userDetail.organizations.map((org) => ({
        id:
          org.oneOrganizationPath[org.oneOrganizationPath.length - 1]?.id || 0,
        default: org.default,
      }));

      // 初始化实际选中的IDs
      actualSelectedIds.value = new Set(
        selectedOrganizations.value.map((org) => org.id),
      );
      checkedOrgKeys.value = Array.from(actualSelectedIds.value);

      // 只展开已选组织的父节点路径
      const parentIds = new Set<number>();
      userDetail.organizations.forEach((org) => {
        org.oneOrganizationPath.forEach((path) => {
          parentIds.add(path.id);
        });
      });
      expandedKeys.value = Array.from(parentIds);

      // 计算并应用禁用节点
      updateDisabledNodes(Array.from(actualSelectedIds.value));
    }

    await nextTick();
    formApi.setValues({
      id: userDetail.id,
      userName: userDetail.userName,
      nickName: userDetail.nickName,
      emailAddress: userDetail.emailAddress,
      phoneNumber: userDetail.phoneNumber,
      isActive: userDetail.isActive,
      status: userDetail.status,
      avatar: avatarUrlToFormValue(userDetail.avatar),
      userAttributeFlags: parseUserAttribute(userDetail.userAttribute),
      enName: userDetail.enName,
      qq: userDetail.qq,
      employeeID: userDetail.employeeID,
      gender:
        userDetail.gender === 1 || userDetail.gender === 2
          ? userDetail.gender
          : undefined,
      enable: userDetail.enable ?? true,
      idNumber: userDetail.idNumber,
      remark: userDetail.remark,
      emailPwd: userDetail.emailPwd,
      receiveAddrPort: userDetail.receiveAddrPort,
      sendAddrPort: userDetail.sendAddrPort,
      officeTel: userDetail.officeTel,
      senderDisplayName: userDetail.senderDisplayName,
      shouldChangePasswordOnNextLogin:
        userDetail.shouldChangePasswordOnNextLogin,
    });

    await syncCompanyName();
  } catch (error) {
    console.error('获取用户详情失败:', error);
  }
}

/**
 * 提交表单
 */
async function handleSubmit() {
  const { valid } = await formApi.validate();
  if (!valid) return;
  const values = await formApi.getValues();

  // 验证至少选择一个组织
  if (selectedOrganizations.value.length === 0) {
    message.error(
      $t('system.user.organizationRequired') || '请至少选择一个组织',
    );
    return;
  }

  // 验证最多一个默认组织
  const defaultCount = selectedOrganizations.value.filter(
    (org) => org.default,
  ).length;
  if (defaultCount > 1) {
    message.error(
      $t('system.user.onlyOneDefaultOrganization') ||
        '最多只能设置一个默认组织',
    );
    return;
  }

  // 构建提交数据
  const submitData: SystemUserAdminApi.UserInAdminInputDto = {
    userName: values.userName,
    nickName: values.nickName,
    emailAddress: values.emailAddress,
    phoneNumber: values.phoneNumber,
    isActive: values.isActive,
    status: values.status,
    roleIds: values.roleIds,
    avatar: normalizeAvatarSubmitValue(values.avatar, formData.value?.avatar),
    organizations: selectedOrganizations.value, // 使用新的organizations字段
    userAttribute: combineUserAttribute(values.userAttributeFlags ?? []),
    enName: values.enName || undefined,
    qq: values.qq || undefined,
    employeeID: values.employeeID || undefined,
    gender: values.gender ?? null,
    enable: values.enable,
    idNumber: values.idNumber || undefined,
    remark: values.remark || undefined,
    emailPwd: values.emailPwd || undefined,
    receiveAddrPort: values.receiveAddrPort || undefined,
    sendAddrPort: values.sendAddrPort || undefined,
    officeTel: values.officeTel || undefined,
    senderDisplayName: values.senderDisplayName || undefined,
    shouldChangePasswordOnNextLogin: values.shouldChangePasswordOnNextLogin,
  };

  if (!isEdit.value && values.password) {
    submitData.password = values.password;
  }

  if (editId.value != null) {
    submitData.id = editId.value;
  }

  submitting.value = true;
  try {
    const result = await createOrUpdateUserWithDataPermission(submitData);
    message.success($t('ui.actionMessage.operationSuccess'));
    markListShouldRefresh('SystemUser');
    await syncSnapshot();
    // 新建成功后跳转到该用户的编辑页
    if (!isEdit.value) {
      if (result.id != null) {
        router.push(`/system/user/edit/${result.id}`);
      } else {
        router.push('/system/user');
      }
    }
  } catch {
    // 错误已由请求拦截器统一处理
  } finally {
    submitting.value = false;
  }
}

/**
 * 返回用户列表
 */
function handleBack() {
  router.push('/system/user');
}

// ===== 未保存拦截 =====
const formSnapshot = ref<null | string>(null);

async function buildFormSnapshot() {
  const values = await formApi.getValues();
  return JSON.stringify({
    selectedOrganizations: selectedOrganizations.value,
    values,
  });
}

async function syncSnapshot() {
  await nextTick();
  formSnapshot.value = await buildFormSnapshot();
}

async function isFormDirty() {
  if (!formSnapshot.value) return false;
  return (await buildFormSnapshot()) !== formSnapshot.value;
}

// 独立新建页时自行拦截未保存；嵌入编辑页时由编辑页统一判断
useUnsavedGuard({
  enabled: () => !props.embedded,
  isDirty: isFormDirty,
});

defineExpose({ isFormDirty });

onMounted(async () => {
  await ensureOrgTree();
  if (editId.value != null) {
    await loadUserDetail(editId.value);
  }
  await syncSnapshot();
});
</script>

<template>
  <component
    :is="props.embedded ? 'div' : Page"
    v-bind="props.embedded ? {} : { autoContentHeight: true }"
  >
    <div class="mb-3 flex items-center justify-end gap-2">
      <Button v-if="!props.embedded" @click="handleBack">
        {{ $t('common.back') }}
      </Button>
      <Button type="primary" :loading="submitting" @click="handleSubmit">
        {{ $t('common.save') }}
      </Button>
    </div>

    <Form />

    <!-- 多组织选择区域 -->
    <div class="mt-4 rounded border p-3">
      <div class="mb-3 font-medium">
        {{ $t('system.user.organizations') || '所属组织' }}
      </div>

      <!-- 已选组织展示 -->
      <div v-if="selectedOrganizations.length > 0" class="mb-3">
        <div class="mb-2 text-sm text-gray-600">
          {{ $t('system.user.selectedOrganizations') || '已选组织' }}
          <span class="ml-1 text-xs text-gray-400"
            >（点击"设为默认"指定默认组织）</span
          >
        </div>
        <div class="flex flex-wrap gap-2">
          <Tag
            v-for="org in selectedOrganizations"
            :key="org.id"
            closable
            :color="org.default ? 'blue' : 'default'"
            class="text-sm"
            @close="removeOrg(org.id)"
          >
            <div class="flex min-w-0 items-center gap-2">
              <span class="truncate">{{ getOrgDisplayName(org.id) }}</span>
              <template v-if="!org.default">
                <Radio
                  :checked="false"
                  size="small"
                  class="ml-1"
                  @click.stop="setDefaultOrg(org.id)"
                >
                  {{ $t('system.user.setDefault') || '设为默认' }}
                </Radio>
              </template>
              <span
                v-else
                class="ml-1 whitespace-nowrap text-xs font-medium text-blue-600"
              >
                ✓ {{ $t('system.user.isDefault') || '默认' }}
              </span>
            </div>
          </Tag>
        </div>
      </div>

      <!-- 组织树选择器 -->
      <div class="max-h-[400px] overflow-y-auto rounded border bg-gray-50 p-2">
        <Tree
          v-model:expanded-keys="expandedKeys"
          :tree-data="organizationTreeData"
          :field-names="{
            title: 'displayName',
            key: 'id',
            children: 'children',
          }"
          checkable
          :check-strictly="true"
          :checked-keys="checkedOrgKeys"
          block-node
          @check="handleTreeCheck"
        />
      </div>

      <!-- 提示信息 -->
      <div class="mt-2 text-xs text-gray-500">
        {{
          $t('system.user.organizationSelectorTip') ||
          '勾选组织进行选择，点击"设为默认"指定默认组织（最多一个）'
        }}
      </div>
    </div>
  </component>
</template>

<style scoped>
.border {
  border: 1px solid #d9d9d9;
}

.rounded {
  border-radius: 4px;
}
</style>
