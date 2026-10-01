import type { ComputedRef, InjectionKey, Ref } from 'vue';

/** 编辑页下发的可写锁定态；基础表单写入，子 Tab 读取 */
export const CLIENT_FORM_LOCKED_REF_KEY: InjectionKey<Ref<boolean>> = Symbol(
  'clientFormLockedRef',
);

/** 基础信息表单的审核锁定态（只读 computed，兼容 inject） */
export const CLIENT_FORM_LOCKED_KEY: InjectionKey<ComputedRef<boolean>> =
  Symbol('clientFormLocked');

/**
 * 编辑页聚合脏检查（含各 Tab）。
 * 基础信息「提交审核」前应走此检查，避免子 Tab 未保存仍提交。
 */
export const CLIENT_EDITOR_IS_DIRTY_KEY: InjectionKey<
  () => boolean | Promise<boolean>
> = Symbol('clientEditorIsDirty');

export function createAddressLocalKey() {
  return `addr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
