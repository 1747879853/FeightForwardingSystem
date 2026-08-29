import { inject } from 'vue';

import { $t } from '#/locales';

import { ORDER_FEE_ADAPTER_KEY, type OrderFeeModuleAdapter } from './types';

/**
 * 获取当前模块的费用录入适配器（由 OrderFeePage / 兼容层包装组件 provide）。
 */
export function useOrderFeeAdapter(): OrderFeeModuleAdapter {
  const adapter = inject(ORDER_FEE_ADAPTER_KEY);
  if (!adapter) {
    throw new Error(
      '[order-fee] 未注入 OrderFeeModuleAdapter，请确认组件位于 OrderFeePage 或兼容层包装组件内',
    );
  }
  return adapter;
}

/**
 * 按模块 i18n 前缀取文案：t('formCardInfo') => $t(`${prefix}.formCardInfo`)
 * @param adapter 可选：provide 方自身调用时显式传入（provide 对自身不可见），子组件走 inject
 */
export function useOrderFeeI18n(adapter?: OrderFeeModuleAdapter) {
  const resolved = adapter ?? useOrderFeeAdapter();
  return {
    t: (key: string) => $t(`${resolved.i18nPrefix}.${key}`),
  };
}
