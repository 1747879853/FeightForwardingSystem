import { clearOrganizationUnitsCache } from '#/api/system/organization-unit';
import { resetAllUserOrganizations } from '#/composables/use-all-user-org';
import {
  loadMaskedFields,
  resetMaskedFields,
} from '#/composables/use-masked-fields';

/**
 * 丢弃当前 SPA 会话身份缓存（组织路径、字段权限、组织树）。
 * 不包含 biz-select 基础资料（那套有 5 分钟过期，登出时另行清空）。
 */
export function resetSessionIdentityCaches() {
  resetMaskedFields();
  resetAllUserOrganizations();
  clearOrganizationUnitsCache();
}

/**
 * 新会话：清掉上一会话身份缓存后，只重拉字段权限。
 * 组织 map 不预拉，进页选销售或打开归属组织下拉时再静默拉取。
 */
export async function reloadSessionIdentityCaches() {
  resetSessionIdentityCaches();
  await loadMaskedFields(true);
}
