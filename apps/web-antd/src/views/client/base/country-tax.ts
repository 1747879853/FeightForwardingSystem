import type { CountryCodeAdminApi } from '#/api/system/base-data/country-code-admin';

import { getCountryCodeDetail } from '#/api/system/base-data/country-code-admin';

/** 供应商行业类别「个人」对应的 IndustryCategory 字母值 */
export const PERSONAL_SUPPLIER_INDUSTRY = 'v';

/** 默认国家「中国」在主数据中的 id */
export const CHINA_COUNTRY_ID = 47;

export const TAX_NO_REQUIRED_FOR_CN_ENTERPRISE =
  '国家为中国，企业供应商需填写纳税人识别号';

export const TAX_NO_DUPLICATE_MSG = '相同国家下纳税人识别号不能重复';

/** 是否为中国（按固定 id=47 / 代码 CN / 中文名） */
export function isChinaCountry(
  countryId: null | number | string | undefined,
  meta?: null | Pick<
    CountryCodeAdminApi.CountryCodeDto,
    'code' | 'countryName' | 'id'
  >,
  chinaId: null | number | string = CHINA_COUNTRY_ID,
): boolean {
  if (meta?.code === 'CN' || meta?.countryName === '中国') return true;
  if (
    countryId !== undefined &&
    countryId !== null &&
    countryId !== '' &&
    String(countryId) === String(chinaId ?? CHINA_COUNTRY_ID)
  ) {
    return true;
  }
  return false;
}

/** 供应商属性是否勾选了「个人」 */
export function isPersonalSupplierIndustry(
  supplierIndustries?: null | string[],
): boolean {
  return (supplierIndustries ?? []).includes(PERSONAL_SUPPLIER_INDUSTRY);
}

/**
 * 中国 + 非个人供应商属性 → 税号必填。
 * 未勾选供应商、或未勾选「个人」时，按企业口径要求税号。
 */
export function isTaxNoRequiredForChina(
  countryId: null | number | string | undefined,
  supplierIndustries: null | string[] | undefined,
  meta?: null | Pick<
    CountryCodeAdminApi.CountryCodeDto,
    'code' | 'countryName' | 'id'
  >,
  chinaId: null | number | string = CHINA_COUNTRY_ID,
): boolean {
  if (!isChinaCountry(countryId, meta, chinaId)) return false;
  return !isPersonalSupplierIndustry(supplierIndustries);
}

/** 拉取默认国家「中国」（固定 id=47） */
export async function fetchDefaultChinaCountry(): Promise<CountryCodeAdminApi.CountryCodeDto | null> {
  try {
    const detail = await getCountryCodeDetail(CHINA_COUNTRY_ID);
    if (detail?.id) return detail;
  } catch {
    // 详情失败时仍用固定 id 回填，保证新建默认中国
  }
  return {
    id: CHINA_COUNTRY_ID,
    code: 'CN',
    countryName: '中国',
  } as CountryCodeAdminApi.CountryCodeDto;
}
