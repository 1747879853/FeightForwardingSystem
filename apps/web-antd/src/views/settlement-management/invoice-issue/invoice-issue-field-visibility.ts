import type { Ref } from 'vue';

import { FrightModule } from '#/api/system/permission';
import {
  hasMaskRule,
  isAlwaysMasked,
  useMaskedFields,
} from '#/composables/use-masked-fields';

const MODULE = FrightModule.InvoiceIssue;

/** 编辑主表时，这些标量被屏蔽就不要提交，避免用空值覆盖库里的原值。 */
const SCALAR_KEYS = [
  'invoiceNo',
  'invoiceIssueTime',
  'require',
  'remark',
  'orgId',
] as const;

export function permissionRowHasKey(
  row: object | null | undefined,
  key: string,
) {
  if (!row) return false;
  const target = key.toLowerCase();
  return Object.keys(row).some((name) => name.toLowerCase() === target);
}

/**
 * 无条件屏蔽：整块隐藏。
 * 条件屏蔽：新建仍显示；编辑时详情 JSON 没有这个 key 才隐藏。
 */
export function issueFieldVisible(
  key: string,
  options: { isEdit: boolean; permissionRow?: null | object },
) {
  if (isAlwaysMasked(MODULE, key)) return false;
  if (!options.isEdit || !options.permissionRow) return true;
  if (!hasMaskRule(MODULE, key)) return true;
  return permissionRowHasKey(options.permissionRow, key);
}

export function omitMaskedIssueScalars<T extends Record<string, any>>(
  payload: T,
  options: { isEdit: boolean; permissionRow?: null | object },
): T {
  const next = { ...payload };
  for (const key of SCALAR_KEYS) {
    if (key in next && !issueFieldVisible(key, options)) {
      delete next[key];
    }
  }
  return next;
}

/**
 * 收件人区域：编辑详情没有这个 key 就整块不渲染。
 * 没配屏蔽规则时后端会返回空数组，key 仍在，区域照常显示。
 */
export function issueMailRecipientsVisible(options: {
  isEdit: boolean;
  permissionRow?: null | object;
}) {
  if (isAlwaysMasked(MODULE, 'invoiceIssueMailRecipients')) return false;
  if (!options.isEdit || !options.permissionRow) return true;
  return permissionRowHasKey(
    options.permissionRow,
    'invoiceIssueMailRecipients',
  );
}

export function useInvoiceIssueFieldVisibility(
  formData: Ref<any>,
  isEdit: Ref<boolean>,
) {
  const { loadMaskedFields } = useMaskedFields();
  void loadMaskedFields();

  function permissionOptions() {
    return {
      isEdit: isEdit.value,
      permissionRow: formData.value?.permissionRow,
    };
  }

  function showIssueField(key: string) {
    return issueFieldVisible(key, permissionOptions());
  }

  function showMailRecipients() {
    return issueMailRecipientsVisible(permissionOptions());
  }

  return { showIssueField, showMailRecipients };
}
