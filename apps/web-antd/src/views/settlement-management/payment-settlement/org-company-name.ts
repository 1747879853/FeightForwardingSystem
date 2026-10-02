import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

type OrgChainNode = PaymentApplicationAdminApi.OrganizationUnitSimpleDto;

/**
 * 组织串从最高级到本组织。归属组织只展示所属公司，不展示部门。
 * 取最接近本组织的 isCompany 节点，与后端本位币口径一致。
 */
export function formatOrgChainCompanyName(
  orgs?: null | OrgChainNode[],
): string {
  if (!orgs?.length) return '-';

  for (let i = orgs.length - 1; i >= 0; i -= 1) {
    const org = orgs[i];
    if (!org?.isCompany) continue;
    const label = org.shortName?.trim() || org.name?.trim();
    if (label) return label;
  }

  const top = orgs[0];
  return top?.shortName?.trim() || top?.name?.trim() || '-';
}
