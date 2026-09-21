import { requestClient } from '#/api/request';

export namespace TenantConfigApi {
  /** 租户配置项 */
  export interface TenantConfigDto {
    id?: number | string;
    /** 配置名 */
    name?: string;
    /** 配置值（字符串，布尔型配置约定用 'true' / 'false'） */
    value?: null | string;
    /** 备注 */
    remark?: null | string;
  }
}

const API_PREFIX = '/services/app/TenantConfig';

/**
 * 按配置名取当前租户配置，没配过返回 null。
 * 宿主用户（没有租户）不受租户配置约束，同样按 null 处理。
 */
export const getTenantConfigDetail = (name: string) => {
  return requestClient.get<null | TenantConfigApi.TenantConfigDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { name }, skipErrorMessage: true },
  );
};
