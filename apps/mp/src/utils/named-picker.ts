export interface NamedOption {
  desc?: string;
  id: string;
  logoUrl?: string;
  name: string;
}

export interface PagedOptionQuery {
  keyword?: string;
  pageIndex: number;
  pageSize: number;
}

export interface PagedOptionResult {
  items: NamedOption[];
  totalCount: number;
}

/** 微信 picker 第 0 项是「请选择」 */
export function pickerNames(options: NamedOption[]) {
  return ['请选择', ...options.map((item) => item.name)];
}

export function pickerIndex(options: NamedOption[], id: string) {
  if (!id) return 0;
  const index = options.findIndex((item) => item.id === id);
  return index < 0 ? 0 : index + 1;
}

export function pickerSelectedId(options: NamedOption[], index: number) {
  if (index <= 0) return '';
  return options[index - 1]?.id ?? '';
}

export function pickerLabel(
  options: NamedOption[],
  id: string,
  empty = '请选择',
) {
  return options.find((item) => item.id === id)?.name || empty;
}
