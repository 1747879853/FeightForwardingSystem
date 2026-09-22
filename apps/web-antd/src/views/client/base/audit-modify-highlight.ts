import type { ClientAdminApi } from '#/api/sea-export/client-admin';

type ClientEdit = ClientAdminApi.ClientEditDto;

/** 表单 fieldName 与申请修改快照字段的对照（仅列出可高亮的表单项） */
export const AUDIT_FORM_FIELD_KEYS = [
  'name',
  'fullName',
  'code',
  'enName',
  'taxNo',
  'taxRate',
  'codeSourceId',
  'phone',
  'mobile',
  'email',
  'url',
  'enterpriseType',
  'orgId',
  'isShared',
  'remark',
  'legalPerson',
  'registeredCapital',
  'establishmentDate',
  'businessTerm',
  'clientType',
  'clientLevel',
  'cargoType',
  'clientCurrencyId',
  'supplierLevel',
  'supplierCurrencyId',
  'laneIds',
] as const;

export type AuditFormFieldKey = (typeof AUDIT_FORM_FIELD_KEYS)[number];

export type AuditChangedSections = {
  addresses: boolean;
  billingPeriods: boolean;
  industry: boolean;
  stakeholders: boolean;
  type: boolean;
};

const EMPTY = Symbol('empty');

function normalizeComparable(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return EMPTY;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? EMPTY : trimmed;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return EMPTY;
    if (value.every((item) => typeof item !== 'object' || item === null)) {
      return [...value].map(String).sort().join(',');
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return normalizeComparable(a) === normalizeComparable(b);
}

function readDtoField(dto: ClientEdit | null | undefined, field: string) {
  if (!dto) return undefined;
  if (field === 'country') return dto.countryId;
  return (dto as Record<string, unknown>)[field];
}

function stakeholderIds(list?: Array<{ userId?: number }> | null): number[] {
  return (list ?? [])
    .map((item) => item.userId)
    .filter((id): id is number => id !== undefined && id !== null);
}

function addressesSignature(dto?: ClientEdit | null): string {
  const list = dto?.addresses ?? [];
  if (list.length === 0) return '';
  return JSON.stringify(
    list.map((item) => ({
      address: item.address ?? '',
      addressType: item.addressType ?? null,
      contactPerson: item.contactPerson ?? '',
      isDefault: !!item.isDefault,
      mobile: item.mobile ?? '',
      name: item.name ?? '',
      remark: item.remark ?? '',
      tel: item.tel ?? '',
    })),
  );
}

function billingSignature(dto?: ClientEdit | null): string {
  const list = dto?.billingPeriods ?? [];
  if (list.length === 0) return '';
  return JSON.stringify(
    list.map((item) => ({
      codeSourceIds: [...(item.codeSourceIds ?? [])].map(String).sort(),
      contractNo: item.contractNo ?? '',
      creditCurrencyId: item.creditCurrencyId ?? null,
      creditLimit: item.creditLimit ?? null,
      organizationUnitIds: [...(item.organizationUnitIds ?? [])]
        .map(String)
        .sort(),
      permanent: !!item.permanent,
      userIds: [...(item.userIds ?? [])].map(String).sort(),
    })),
  );
}

/** 对比申请修改前后，得到需要高亮的表单字段与区块 */
export function computeAuditModifyChanges(
  from?: ClientEdit | null,
  to?: ClientEdit | null,
): {
  fields: Set<string>;
  sections: AuditChangedSections;
} {
  const fields = new Set<string>();
  for (const field of AUDIT_FORM_FIELD_KEYS) {
    if (!valuesEqual(readDtoField(from, field), readDtoField(to, field))) {
      fields.add(field);
    }
  }
  // 国家/省市若存在于表单则一并标记
  if (!valuesEqual(from?.countryId, to?.countryId)) fields.add('country');
  if (!valuesEqual(from?.areaId, to?.areaId)) fields.add('areaId');
  if (!valuesEqual(from?.address, to?.address)) fields.add('address');
  if (!valuesEqual(from?.enAddress, to?.enAddress)) fields.add('enAddress');
  if (!valuesEqual(from?.mainProduct, to?.mainProduct))
    fields.add('mainProduct');
  if (!valuesEqual(from?.enable, to?.enable)) fields.add('enable');
  if (!valuesEqual(from?.enFullName, to?.enFullName)) fields.add('enFullName');
  if (!valuesEqual(from?.source, to?.source)) fields.add('source');

  const sections: AuditChangedSections = {
    type:
      !valuesEqual(from?.isClient, to?.isClient) ||
      !valuesEqual(from?.isSupplier, to?.isSupplier),
    industry: !valuesEqual(from?.industryCategories, to?.industryCategories),
    addresses: addressesSignature(from) !== addressesSignature(to),
    billingPeriods: billingSignature(from) !== billingSignature(to),
    stakeholders:
      !valuesEqual(stakeholderIds(from?.sales), stakeholderIds(to?.sales)) ||
      !valuesEqual(
        stakeholderIds(from?.customerServices),
        stakeholderIds(to?.customerServices),
      ) ||
      !valuesEqual(
        stakeholderIds(from?.operations),
        stakeholderIds(to?.operations),
      ) ||
      !valuesEqual(
        stakeholderIds(from?.documentations),
        stakeholderIds(to?.documentations),
      ) ||
      !valuesEqual(from?.reconcilerUserIds, to?.reconcilerUserIds),
  };

  return { fields, sections };
}
