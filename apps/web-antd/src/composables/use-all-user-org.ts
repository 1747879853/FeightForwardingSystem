import type { MyUserOrganizationPathDto } from '#/api/core/user';
import type { SystemOrganizationUnitApi } from '#/api/system/organization-unit';

import { ref } from 'vue';

import { getAllUserOrganizations } from '#/api/system/user-admin';

export interface UserOrgOption {
  isDefault: boolean;
  label: string;
  value: number;
}

/** 全部用户组织映射：userId -> 组织路径列表（模块级缓存，跨组件共享） */
const allUserOrgMap = ref<Map<number, MyUserOrganizationPathDto[]>>(new Map());
/** 是否已完成一次加载 */
const loaded = ref(false);
/** 是否正在加载 */
const loading = ref(false);
/** 进行中的请求（并发合并为一次网络调用） */
let inflight: Promise<void> | null = null;

/**
 * 加载并缓存「全部用户所属组织」。
 * 默认命中缓存直接返回；force=true 时强制刷新。
 */
async function loadAllUserOrganizations(force = false): Promise<void> {
  if (loaded.value && !force) return;
  if (inflight) return inflight;

  loading.value = true;
  inflight = (async () => {
    try {
      const list = await getAllUserOrganizations();
      const map = new Map<number, MyUserOrganizationPathDto[]>();
      for (const item of list) {
        map.set(item.userId, item.organizations ?? []);
      }
      allUserOrgMap.value = map;
      loaded.value = true;
    } finally {
      loading.value = false;
      inflight = null;
    }
  })();

  return inflight;
}

/** 读取某用户的组织路径列表（未加载或不存在时返回空数组） */
function getUserOrganizations(
  userId?: null | number,
): MyUserOrganizationPathDto[] {
  if (userId === undefined || userId === null) return [];
  return allUserOrgMap.value.get(userId) ?? [];
}

/** 取一条组织路径中的「直属组织」节点（路径末端，即用户直接挂靠的组织） */
function pickDirectOrgNode(
  path: SystemOrganizationUnitApi.OrganizationUnitDto[] | undefined,
): SystemOrganizationUnitApi.OrganizationUnitDto | undefined {
  if (!path || path.length === 0) return undefined;
  return path[path.length - 1];
}

/**
 * 某用户的「直属组织」下拉选项（value = 直属组织 id）。
 * 用于业务录入按所选销售取其所属组织范围。
 */
export function getUserOrgOptions(userId?: null | number): UserOrgOption[] {
  return getUserOrganizations(userId)
    .map((item) => {
      const node = pickDirectOrgNode(item.oneOrganizationPath);
      if (!node) return null;
      return {
        isDefault: !!item.default,
        label: node.displayName ?? '',
        value: node.id,
      };
    })
    .filter((x): x is UserOrgOption => x !== null);
}

/** 某用户的默认组织 id（对应用户 DefaultOrgId），用于表单默认值 */
export function getUserDefaultOrgId(
  userId?: null | number,
): number | undefined {
  const orgs = getUserOrganizations(userId);
  const target = orgs.find((o) => o.default) ?? orgs[0];
  return pickDirectOrgNode(target?.oneOrganizationPath)?.id;
}

/** 取某用户某直属组织所在的完整组织路径（从顶到底） */
export function getUserOrgPath(
  userId?: null | number,
  orgId?: null | number,
): SystemOrganizationUnitApi.OrganizationUnitDto[] {
  if (orgId === undefined || orgId === null) return [];
  const found = getUserOrganizations(userId).find(
    (o) => pickDirectOrgNode(o.oneOrganizationPath)?.id === orgId,
  );
  return found?.oneOrganizationPath ?? [];
}

/**
 * 取某用户某直属组织的「公司节点」（含本位币、开票信息与公司银行账户 orgBankAccounts）。
 * 规则：从路径中取第一个 isCompany 的节点；找不到则取路径首个节点。
 * 不传 orgId 时使用该用户默认组织。
 */
export function getUserOrgCompanyNode(
  userId?: null | number,
  orgId?: null | number,
): SystemOrganizationUnitApi.OrganizationUnitDto | undefined {
  const targetOrgId = orgId ?? getUserDefaultOrgId(userId);
  const path = getUserOrgPath(userId, targetOrgId);
  return path.find((n) => n.isCompany) ?? path[0];
}

/** 组合式入口：暴露加载方法与响应式加载状态 */
export function useAllUserOrg() {
  return {
    allUserOrgMap,
    getUserDefaultOrgId,
    getUserOrgCompanyNode,
    getUserOrgOptions,
    getUserOrgPath,
    loadAllUserOrganizations,
    loaded,
    loading,
  };
}
