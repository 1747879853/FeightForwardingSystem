import { readonly, ref } from 'vue';

import { getTenantConfigDetail } from '#/api/system/tenant-config';

/** 租户配置名：业务侧能否搜到未审核通过的客户 */
export const CLIENT_AUDIT_CONFIG_NAME = '可搜索未审核通过客户';

/**
 * 配置为 true 等于「业务侧可搜未审核通过客户」：此时不展示审核状态列、筛选项
 * 与提交审核等操作按钮（能直接搜到未审客户就等于暂未强制走审核流程）。
 */
const auditEnabled = ref(false);
/** 是否已取到配置结果，未取到前先按「不启用」渲染，避免按钮一闪 */
const resolved = ref(false);

let inflight: null | Promise<void> = null;

async function load() {
  try {
    const config = await getTenantConfigDetail(CLIENT_AUDIT_CONFIG_NAME);
    const value = (config?.value ?? '').trim().toLowerCase();
    auditEnabled.value = value !== 'true';
  } catch {
    // 取不到配置按「其余情况」处理：与没配过一致，正常启用审核
    auditEnabled.value = true;
  } finally {
    resolved.value = true;
  }
}

/**
 * 客户审核是否启用（租户配置 `可搜索未审核通过客户` 不为 true 即启用）。
 * 结果按应用生命周期缓存，多个页面共用一次请求。
 */
export function useClientAuditConfig() {
  if (!inflight) {
    inflight = load();
  }

  return {
    auditEnabled: readonly(auditEnabled),
    resolved: readonly(resolved),
    /** 配置在系统设置里改过之后可手动重取 */
    refresh: () => {
      inflight = load();
      return inflight;
    },
    ready: inflight,
  };
}
