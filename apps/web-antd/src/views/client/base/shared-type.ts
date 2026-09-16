import { ClientAdminApi } from '#/api/sea-export/client-admin';

export const ClientSharedType = ClientAdminApi.ClientSharedType;
export type ClientSharedType = ClientAdminApi.ClientSharedType;

/** 共享类型选项（表单 Segmented / 筛选 / 列表 Tag 共用） */
export function getClientSharedTypeOptions() {
  return [
    {
      value: ClientSharedType.None,
      label: '不共享',
      shortLabel: '不共享',
      color: 'default' as const,
      hint: '仅数据权限范围内或干系人可见',
    },
    {
      value: ClientSharedType.Company,
      label: '共享本公司',
      shortLabel: '本公司',
      color: 'processing' as const,
      hint: '客户归属公司与当前用户所属公司一致时可见',
    },
    {
      value: ClientSharedType.All,
      label: '共享所有人',
      shortLabel: '所有人',
      color: 'success' as const,
      hint: '全集团登录用户均可见',
    },
  ];
}

/** Segmented 紧凑选项（所属公司标题右侧） */
export function getClientSharedTypeSegmentedOptions() {
  return getClientSharedTypeOptions().map((item) => ({
    value: item.value,
    label: item.shortLabel,
  }));
}

/** 列表 CellTag 选项 */
export function getClientSharedTypeTagOptions() {
  return getClientSharedTypeOptions().map((item) => ({
    value: item.value,
    label: item.shortLabel,
    color: item.color,
  }));
}

/** 规范化接口返回值（兼容历史 bool） */
export function normalizeClientSharedType(value: unknown): ClientSharedType {
  if (value === true || value === 'true') return ClientSharedType.All;
  if (value === false || value === 'false') return ClientSharedType.None;
  const num = Number(value);
  if (
    num === ClientSharedType.None ||
    num === ClientSharedType.Company ||
    num === ClientSharedType.All
  ) {
    return num;
  }
  return ClientSharedType.None;
}
