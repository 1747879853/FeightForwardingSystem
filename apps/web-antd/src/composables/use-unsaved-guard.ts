import type { MaybeRefOrGetter } from 'vue';
import type { Router } from 'vue-router';

import {
  getCurrentInstance,
  onActivated,
  onDeactivated,
  onUnmounted,
  toValue,
} from 'vue';

import { Modal } from 'ant-design-vue';

import { $t } from '#/locales';

interface GuardMessage {
  cancelText?: string;
  content?: string;
  okText?: string;
  title?: string;
}

interface UnsavedGuardEntry {
  /** 当前守卫是否生效（未暂停且已启用） */
  active: () => boolean;
  /** 判断是否存在未保存内容，支持同步或异步 */
  isDirty: () => boolean | Promise<boolean>;
  /** 二次确认弹窗的文案（可选，缺省走通用文案） */
  message?: GuardMessage;
}

/** 已登记的未保存守卫集合，key 为每个调用点的唯一标识 */
const guards = new Map<symbol, UnsavedGuardEntry>();

/** 同一时刻只允许弹出一个二次确认，避免导航连续触发时弹窗堆叠 */
let confirming = false;

/**
 * 低阶 API：直接登记一个未保存守卫，返回注销函数。
 * 大多数场景请使用 {@link useUnsavedGuard}，它会自动处理生命周期。
 */
export function registerUnsavedGuard(entry: UnsavedGuardEntry): () => void {
  const id = Symbol('unsaved-guard');
  guards.set(id, entry);
  return () => {
    guards.delete(id);
  };
}

/** 找出第一个处于生效状态且存在未保存内容的守卫 */
async function findDirtyGuard(): Promise<undefined | UnsavedGuardEntry> {
  for (const entry of guards.values()) {
    try {
      if (!entry.active()) {
        continue;
      }
      if (await entry.isDirty()) {
        return entry;
      }
    } catch {
      // 脏检查自身异常时不拦截导航，避免把用户卡在页面上
    }
  }
  return undefined;
}

/** 弹出二次确认，返回用户是否确认离开 */
function confirmLeave(message?: GuardMessage): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };

    Modal.confirm({
      title: message?.title ?? $t('common.unsavedLeaveTitle'),
      content: message?.content ?? $t('common.unsavedLeaveContent'),
      okText: message?.okText ?? $t('common.leave'),
      cancelText: message?.cancelText ?? $t('common.cancel'),
      onOk: () => settle(true),
      onCancel: () => settle(false),
    });
  });
}

/**
 * 安装全局路由离开守卫。
 *
 * 覆盖所有走 vue-router 的导航：切换标签页、点击菜单、浏览器前进后退、
 * 关闭当前标签页（内部走 router.replace）。当存在未保存内容时弹出二次确认，
 * 用户取消则返回 `false` 阻断本次导航。
 *
 * 需在 `createRouterGuard` 中最先注册，确保取消时能尽早中断后续守卫。
 */
export function setupUnsavedNavigationGuard(router: Router): void {
  router.beforeEach(async (to, from) => {
    // 仅 query / hash 变化（同一路径）不视为离开页面
    if (to.path === from.path) {
      return true;
    }
    // 已有确认弹窗时，直接阻断新的导航请求
    if (confirming) {
      return false;
    }
    const dirty = await findDirtyGuard();
    if (!dirty) {
      return true;
    }
    confirming = true;
    try {
      const confirmed = await confirmLeave(dirty.message);
      return confirmed;
    } finally {
      confirming = false;
    }
  });
}

export interface UseUnsavedGuardOptions {
  /** 二次确认弹窗的取消按钮文案 */
  cancelText?: string;
  /** 二次确认弹窗的正文 */
  content?: string;
  /**
   * 是否启用守卫，支持 ref / getter，可用于「仅在页面级表单生效」等场景。
   * 缺省为始终启用。
   */
  enabled?: MaybeRefOrGetter<boolean>;
  /** 未保存内容判断函数，支持同步或异步 */
  isDirty: () => boolean | Promise<boolean>;
  /** 二次确认弹窗的确认按钮文案 */
  okText?: string;
  /** 二次确认弹窗的标题 */
  title?: string;
}

/**
 * 页面级「未保存拦截 + 二次确认」组合式函数。
 *
 * 在组件内调用即可：页面挂载时自动登记脏检查，卸载时自动注销；
 * 若页面被 keep-alive 缓存，失活时自动暂停、激活时自动恢复，避免后台
 * 缓存页误拦其它页面之间的正常跳转。
 *
 * @example
 * ```ts
 * useUnsavedGuard({ isDirty: isFormDirty });
 * ```
 */
export function useUnsavedGuard(options: UseUnsavedGuardOptions): {
  unregister: () => void;
} {
  let paused = false;

  const active = () => {
    if (paused) {
      return false;
    }
    const enabled = toValue(options.enabled ?? true);
    return enabled !== false;
  };

  const unregister = registerUnsavedGuard({
    active,
    isDirty: () => options.isDirty(),
    message: {
      cancelText: options.cancelText,
      content: options.content,
      okText: options.okText,
      title: options.title,
    },
  });

  if (getCurrentInstance()) {
    onActivated(() => {
      paused = false;
    });
    onDeactivated(() => {
      paused = true;
    });
    onUnmounted(() => {
      unregister();
    });
  }

  return { unregister };
}
