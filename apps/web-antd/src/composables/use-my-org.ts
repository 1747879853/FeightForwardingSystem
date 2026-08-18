import type { MyUserOrganizationPathDto } from '#/api/core/user';
import type { SystemOrganizationUnitApi } from '#/api/system/organization-unit';

import { useUserStore } from '@vben/stores';

import {
  formatCompanyPathLabel,
  formatOrgPathLabel,
  getUserOrgCompanyNode,
  pickCompanyNodeFromPath,
} from './use-all-user-org';

export interface MyOrgOption {
  isDefault: boolean;
  label: string;
  value: number;
}

/** 从 userStore 读取「我的全部组织」（GetMy.organizations） */
function getMyOrganizations(): MyUserOrganizationPathDto[] {
  const userStore = useUserStore();
  const orgs = (userStore.userInfo as any)?.organizations;
  return Array.isArray(orgs) ? (orgs as MyUserOrganizationPathDto[]) : [];
}

/** 取一条组织路径中的「直属组织」节点（路径末端，即用户直接挂靠的组织） */
function pickDirectOrgNode(
  path: SystemOrganizationUnitApi.OrganizationUnitDto[] | undefined,
): SystemOrganizationUnitApi.OrganizationUnitDto | undefined {
  if (!path || path.length === 0) return undefined;
  return path[path.length - 1];
}

/**
 * 我的「直属组织」下拉选项（value = 直属组织 id）。
 * 用于数据权限单据「归属组织」录入，选项即本人直属组织范围。
 */
export function getMyOrgOptions(): MyOrgOption[] {
  return getMyOrganizations()
    .map((item) => {
      const node = pickDirectOrgNode(item.oneOrganizationPath);
      if (!node) return null;
      return {
        isDefault: !!item.default,
        label:
          formatOrgPathLabel(item.oneOrganizationPath) ||
          node.displayName ||
          '',
        value: node.id,
      };
    })
    .filter((x): x is MyOrgOption => x !== null);
}

export function getMyCompanyOptions(): MyOrgOption[] {
  return getMyOrganizations()
    .map((item) => {
      const node = pickDirectOrgNode(item.oneOrganizationPath);
      if (!node) return null;
      return {
        isDefault: !!item.default,
        label:
          formatCompanyPathLabel(item.oneOrganizationPath) ||
          node.displayName ||
          '',
        value: node.id,
      };
    })
    .filter((x): x is MyOrgOption => x !== null);
}

/** 我的默认组织 id（对应用户 DefaultOrgId），用于表单默认值 */
export function getMyDefaultOrgId(): number | undefined {
  const orgs = getMyOrganizations();
  const target = orgs.find((o) => o.default) ?? orgs[0];
  return pickDirectOrgNode(target?.oneOrganizationPath)?.id;
}

/** 取某直属组织所在的完整组织路径（从顶到底） */
export function getMyOrgPath(
  orgId?: null | number,
): SystemOrganizationUnitApi.OrganizationUnitDto[] {
  if (orgId === undefined || orgId === null) return [];
  const found = getMyOrganizations().find(
    (o) => pickDirectOrgNode(o.oneOrganizationPath)?.id === orgId,
  );
  return found?.oneOrganizationPath ?? [];
}

/**
 * 取某直属组织的「公司节点」（含本位币、开票信息与公司银行账户 orgBankAccounts）。
 * 规则：从路径中取第一个 isCompany 的节点；找不到则取路径首个节点。
 * 不传 orgId 时使用默认组织。
 */
export function getMyOrgCompanyNode(
  orgId?: null | number,
): SystemOrganizationUnitApi.OrganizationUnitDto | undefined {
  const targetOrgId = orgId ?? getMyDefaultOrgId();
  const path = getMyOrgPath(targetOrgId);
  return pickCompanyNodeFromPath(path);
}

/** 当前登录用户所属的全部公司 id（按组织路径 isCompany 节点去重） */
export function getMyCompanyIds(): Array<number | string> {
  const ids: Array<number | string> = [];
  const seen = new Set<string>();
  for (const item of getMyOrganizations()) {
    const node = pickCompanyNodeFromPath(item.oneOrganizationPath);
    if (node?.id == null) continue;
    const key = String(node.id);
    if (seen.has(key)) continue;
    seen.add(key);
    ids.push(node.id);
  }
  return ids;
}

/**
 * 干系人 UserSelect 的公司过滤范围：
 * 已选归属组织时取该销售组织所属公司；否则取当前登录用户的全部公司。
 */
export function resolveOrderUserCompanyIds(
  headerOrgId?: null | number | string,
  salesUserId?: null | number | string,
): Array<number | string> {
  if (
    headerOrgId != null &&
    headerOrgId !== '' &&
    salesUserId != null &&
    salesUserId !== ''
  ) {
    const company = getUserOrgCompanyNode(salesUserId, headerOrgId);
    if (company?.id != null) return [company.id];
  }
  return getMyCompanyIds();
}
