import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#/api/system/permission', () => ({
  FrightModule: { InvoiceIssue: 15 },
  getCurrentUserMaskedFields: vi.fn(),
}));

import { getCurrentUserMaskedFields } from '#/api/system/permission';
import {
  loadMaskedFields,
  resetMaskedFields,
} from '#/composables/use-masked-fields';

import {
  issueFieldVisible,
  issueMailRecipientsVisible,
} from './invoice-issue-field-visibility';

const query = vi.mocked(getCurrentUserMaskedFields);

async function rule(propName: string, alwaysMasked = false) {
  query.mockResolvedValue([
    { frightModule: 15, fields: [{ propName, alwaysMasked }] },
  ] as any);
  await loadMaskedFields(true);
}

beforeEach(() => {
  resetMaskedFields();
  query.mockReset();
});

describe('发票开出字段可见性', () => {
  it('没有规则时，缺 key 也照常显示', () => {
    expect(
      issueFieldVisible('invoiceNo', { isEdit: true, permissionRow: {} }),
    ).toBe(true);
  });

  it('无条件屏蔽整块隐藏，包括新建', async () => {
    await rule('InvoiceNo', true);
    expect(
      issueFieldVisible('invoiceNo', { isEdit: false, permissionRow: null }),
    ).toBe(false);
  });

  it('条件屏蔽只在编辑详情缺少 key 时隐藏', async () => {
    await rule('InvoiceNo');
    expect(
      issueFieldVisible('invoiceNo', { isEdit: false, permissionRow: null }),
    ).toBe(true);
    expect(
      issueFieldVisible('invoiceNo', { isEdit: true, permissionRow: {} }),
    ).toBe(false);
    expect(
      issueFieldVisible('invoiceNo', {
        isEdit: true,
        permissionRow: { invoiceNo: null },
      }),
    ).toBe(true);
  });

  it('编辑详情缺少收件人 key 时不显示收件人区域', () => {
    expect(
      issueMailRecipientsVisible({ isEdit: true, permissionRow: {} }),
    ).toBe(false);
    expect(
      issueMailRecipientsVisible({
        isEdit: true,
        permissionRow: { invoiceIssueMailRecipients: [] },
      }),
    ).toBe(true);
    expect(
      issueMailRecipientsVisible({ isEdit: false, permissionRow: null }),
    ).toBe(true);
  });
});
