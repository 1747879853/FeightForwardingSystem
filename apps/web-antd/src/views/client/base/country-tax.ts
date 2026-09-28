import type { CountryCodeAdminApi } from '#/api/system/base-data/country-code-admin';

import { getCountryCodePagedList } from '#/api/system/base-data/country-code-admin';

/** 供应商行业类别「个人」对应的 IndustryCategory 字母值 */
export const PERSONAL_SUPPLIER_INDUSTRY = 'v';

export const TAX_NO_REQUIRED_FOR_CN_ENTERPRISE =
  '国家为中国，企业供应商需填写纳税人识别号';

export const TAX_NO_DUPLICATE_MSG = '相同国家下纳税人识别号不能重复';

/** 是否为中国（按代码 CN / 中文名 / 已缓存的中国 id） */
export function isChinaCountry(
  countryId: null | number | string | undefined,
  meta?: null | Pick<
    CountryCodeAdminApi.CountryCodeDto,
    'code' | 'countryName' | 'id'
  >,
  chinaId?: null | number | string,
): boolean {
  if (meta?.code === 'CN' || meta?.countryName === '中国') return true;
  if (
    chinaId !== undefined &&
    chinaId !== null &&
    chinaId !== '' &&
    countryId !== undefined &&
    countryId !== null &&
    countryId !== '' &&
    String(countryId) === String(chinaId)
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
  chinaId?: null | number | string,
): boolean {
  if (!isChinaCountry(countryId, meta, chinaId)) return false;
  return !isPersonalSupplierIndustry(supplierIndustries);
}

/** 拉取默认国家「中国」（优先 Code=CN） */
export async function fetchDefaultChinaCountry(): Promise<CountryCodeAdminApi.CountryCodeDto | null> {
  try {
    const byCode = await getCountryCodePagedList({
      Code: 'CN',
      PageIndex: 1,
      PageSize: 5,
      Status: 0,
    });
    const codeHit = (byCode?.items ?? []).find(
      (item) => item.code === 'CN' || item.countryName === '中国',
    );
    if (codeHit) return codeHit;

    const byName = await getCountryCodePagedList({
      CountryName: '中国',
      PageIndex: 1,
      PageSize: 5,
      Status: 0,
    });
    return (
      (byName?.items ?? []).find(
        (item) => item.code === 'CN' || item.countryName === '中国',
      ) ??
      byName?.items?.[0] ??
      null
    );
  } catch {
    return null;
  }
}
