import type { NamedOption } from './named-picker';

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

/** PortCodeAdmin/GetPagedListAsync，对齐 PC PortSelect 下拉两行 */
export interface PortCodePagedItem {
  cnName?: null | string;
  country?: null | { countryEnName?: null | string };
  ediCode?: null | string;
  id: number | string;
  portName?: null | string;
}

export function mapPortOptions(items: PortCodePagedItem[]): NamedOption[] {
  return items
    .map((item) => {
      const ediCode = firstText(item.ediCode);
      const portName = firstText(item.portName);
      const cnName = firstText(item.cnName);
      const countryEnName = firstText(item.country?.countryEnName);
      const name = [ediCode, portName].filter(Boolean).join('/');
      const desc = [countryEnName, cnName].filter(Boolean).join(' / ');
      return {
        desc: name ? desc : '',
        id: String(item.id ?? ''),
        name: name || desc,
      };
    })
    .filter((item) => item.id && item.name);
}

export interface CarrierListItem {
  cnName?: string;
  cnShortName?: string;
  code?: string;
  enName?: string;
  id: number | string;
  logo?: null | { url?: null | string };
}

/** 对齐 PC CarrierSelect：`CODE(简称)`，有 logo 时一并带上 */
export function mapCarrierOptions(items: CarrierListItem[]): NamedOption[] {
  return items
    .map((item) => {
      const shortName = firstText(
        item.cnShortName,
        item.cnName,
        item.enName,
        item.code,
      );
      const code = firstText(item.code);
      return {
        id: String(item.id ?? ''),
        logoUrl: firstText(item.logo?.url) || undefined,
        name: code ? `${code}(${shortName})` : shortName,
      };
    })
    .filter((item) => item.id && item.name);
}

export interface CodeGoodsListItem {
  code?: string;
  id: number | string;
  name?: string;
}

export function mapGoodsOptions(items: CodeGoodsListItem[]): NamedOption[] {
  return items
    .map((item) => ({
      id: String(item.id ?? ''),
      name: String(item.name || item.code || '').trim(),
    }))
    .filter((item) => item.id && item.name);
}

export function sliceNamedOptions(
  items: NamedOption[],
  pageIndex: number,
  pageSize: number,
  keyword = '',
) {
  const kw = keyword.trim().toLowerCase();
  const source = kw
    ? items.filter((item) =>
        `${item.name} ${item.desc ?? ''}`.toLowerCase().includes(kw),
      )
    : items;
  const start = Math.max(0, (pageIndex - 1) * pageSize);
  return {
    items: source.slice(start, start + pageSize),
    totalCount: source.length,
  };
}
