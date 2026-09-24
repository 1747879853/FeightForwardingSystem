import type { MyUserOrganizationPathDto } from '#/api/core/user';
import type { SystemOrganizationUnitApi } from '#/api/system/organization-unit';

import { useUserStore } from '@vben/stores';

import {
  getOrganizationUnit,
  resolveOrganizationCompany,
} from '#/api/system/organization-unit';

import {
  formatCompanyPathLabel,
  formatOrgNodeLabel,
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

/** 取一条组织路径中的「直属组织」节点（路径末端，即用户直接挂靠的组织） */
function pickFirstOrgNode(
  path: SystemOrganizationUnitApi.OrganizationUnitDto[] | undefined,
): SystemOrganizationUnitApi.OrganizationUnitDto | undefined {
  if (!path || path.length === 0) return undefined;
  return path[0];
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

export function getMyTrueCompanyOptions(): MyOrgOption[] {
  return getMyOrganizations()
    .map((item) => {
      const node = pickFirstOrgNode(item.oneOrganizationPath);
      if (!node || !node.isCompany) return null;
      return {
        isDefault: !!item.default,
        label: formatOrgNodeLabel(node),
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

/** 取某直属组织所在的完整组织路径（从顶到底）。
 * 优先按路径末端（直属组织）匹配；未命中时兼容匹配路径中的任意节点（如公司级组织）。
 * orgId 保持 string|number 透传，禁止 Number() 以免雪花丢精度。 */
export function getMyOrgPath(
  orgId?: null | number | string,
): SystemOrganizationUnitApi.OrganizationUnitDto[] {
  if (orgId === undefined || orgId === null || orgId === '') return [];
  const key = String(orgId);
  const orgList = getMyOrganizations();
  const found =
    orgList.find(
      (o) => String(pickDirectOrgNode(o.oneOrganizationPath)?.id ?? '') === key,
    ) ??
    orgList.find((o) =>
      o.oneOrganizationPath?.some((node) => String(node.id) === key),
    );
  return found?.oneOrganizationPath ?? [];
}

/**
 * 取某直属组织的「公司节点」（含本位币、开票信息与公司银行账户 orgBankAccounts）。
 * 规则：从路径中取第一个 isCompany 的节点；找不到则取路径首个节点。
 * 不传 orgId 时使用默认组织。
 */
export function getMyOrgCompanyNode(
  orgId?: null | number | string,
): SystemOrganizationUnitApi.OrganizationUnitDto | undefined {
  const targetOrgId = orgId ?? getMyDefaultOrgId();
  const path = getMyOrgPath(targetOrgId);
  return pickCompanyNodeFromPath(path);
}

/**
 * 根据组织id（公司）获取该公司的银行账户列表（来自用户信息缓存，不发起接口请求）。
 * 传入部门级组织id时会先换算为公司节点；缓存中无银行账户时返回空数组。
 * 用于加载「我司银行」选项等场景。
 */
export function getMyCompanyBankAccounts(
  orgId?: null | number | string,
): SystemOrganizationUnitApi.OrgBankAccountDto[] {
  const companyNode = getMyOrgCompanyNode(orgId);
  return Array.isArray(companyNode?.orgBankAccounts)
    ? companyNode!.orgBankAccounts!
    : [];
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

/**
 * 根据组织id获取对应的公司id（一级组织id）
 * @param orgId 组织id（字符串透传，兼容雪花）
 * @returns 公司id，如果找不到则返回undefined
 */
export function getCompanyIdByOrgId(
  orgId: number | string,
): number | string | undefined {
  if (orgId === undefined || orgId === null || orgId === '') return undefined;
  const path = getMyOrgPath(orgId);
  const companyNode = pickCompanyNodeFromPath(path);
  return companyNode?.id;
}

type DetailOrgNode = {
  displayName?: null | string;
  id?: null | number | string;
  isCompany?: boolean;
  name?: null | string;
  shortName?: null | string;
};

/**
 * 从本人组织缓存里按 id 取节点（用于给详情 orgs 补 shortName）。
 */
function findMyOrgNodeById(
  orgId?: null | number | string,
): SystemOrganizationUnitApi.OrganizationUnitDto | undefined {
  if (orgId === undefined || orgId === null || orgId === '') return undefined;
  const key = String(orgId);
  for (const item of getMyOrganizations()) {
    const hit = item.oneOrganizationPath?.find((n) => String(n.id) === key);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * 详情 orgs 路径展示：接口常只有全称 name，用本地组织缓存补简称后再拼接。
 * @param separator 默认 `/`；审核/工作台等可用 ` / `
 */
export function formatDetailOrgPathLabel(
  path?: DetailOrgNode[] | null,
  separator = '/',
): string {
  if (!path?.length) return '';
  return path
    .map((node) => {
      if (!node) return '';
      const local = findMyOrgNodeById(node.id);
      return formatOrgNodeLabel({
        displayName: node.displayName || local?.displayName,
        name: node.name || local?.displayName || local?.name,
        shortName: node.shortName || local?.shortName,
      });
    })
    .filter(Boolean)
    .join(separator);
}

/**
 * 详情 orgs 中的所属公司展示：优先公司节点，简称优先、全称兜底。
 */
export function formatDetailOrgCompanyLabel(
  orgs?: DetailOrgNode[] | null,
): string {
  if (!orgs?.length) return '';
  const company = orgs.find((o) => o.isCompany) ?? orgs[0];
  if (!company) return '';
  const local =
    (company.id != null ? getMyOrgCompanyNode(company.id) : undefined) ??
    findMyOrgNodeById(company.id);
  return (
    formatOrgNodeLabel(local) ||
    formatOrgNodeLabel({
      displayName: company.displayName || company.name,
      name: company.name,
      shortName: company.shortName,
    })
  );
}

/**
 * 公司简易对象展示（如开票申请列表所属公司列）：简称优先。
 */
export function formatCompanySimpleLabel(
  company?: DetailOrgNode | null,
): string {
  if (!company) return '';
  const local =
    (company.id != null ? getMyOrgCompanyNode(company.id) : undefined) ??
    findMyOrgNodeById(company.id);
  return (
    formatOrgNodeLabel({
      displayName: company.displayName || company.name,
      name: company.name,
      shortName: company.shortName || local?.shortName,
    }) || formatOrgNodeLabel(local)
  );
}

/**
 * 解析任意组织 id 对应的开票公司节点（含税号、开票地址、公司银行账户）。
 *
 * 单据 `orgId` 存的是部门 id。当前登录人不在该部门时，`getMyOrgCompanyNode(deptId)`
 * 会落空；先把部门换算成公司，再从本人组织缓存或单个组织接口取公司开票资料。
 */
export async function resolveMyOrgCompanyNode(
  orgId?: null | number | string,
): Promise<SystemOrganizationUnitApi.OrganizationUnitDto | undefined> {
  const direct = getMyOrgCompanyNode(orgId);
  if (direct) return direct;

  const company = await resolveOrganizationCompany(orgId);
  if (company?.id == null) return undefined;

  const byCompany = getMyOrgCompanyNode(company.id);
  if (byCompany) return byCompany;

  try {
    return await getOrganizationUnit(company.id);
  } catch (error) {
    console.error('加载开票公司信息失败:', error);
    return company;
  }
}
