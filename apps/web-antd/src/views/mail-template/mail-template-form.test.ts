import { describe, expect, it } from 'vitest';

import {
  splitRecipientRows,
  stripUnsupportedPlaceholders,
  toRecipientInputs,
  validateRecipientRows,
  type RecipientRow,
} from './mail-template-form';

describe('mail template form helpers', () => {
  it('strips placeholders the new module does not allow', () => {
    const result = stripUnsupportedPlaceholders(
      '订舱 {{订舱号}} 开船 {{开船时间}}',
      new Set(['订舱号']),
    );
    expect(result.next).toBe('订舱 {{订舱号}} 开船 ');
    expect(result.removed).toEqual(['开船时间']);
  });

  it('keeps a placeholder whole inside html', () => {
    const result = stripUnsupportedPlaceholders(
      '<p>发票 {{发票号}}</p>',
      new Set(['发票号']),
    );
    expect(result.next).toBe('<p>发票 {{发票号}}</p>');
    expect(result.removed).toEqual([]);
  });

  it('rejects a display-name email and duplicate source', () => {
    const rows: RecipientRow[] = [
      {
        key: '1',
        mode: 'email',
        email: '张三 <a@b.com>',
        recipientSource: null,
      },
    ];
    expect(validateRecipientRows(rows, '收件人', new Set([0]))).toContain(
      '格式不正确',
    );

    const sources: RecipientRow[] = [
      { key: '1', mode: 'source', email: '', recipientSource: 0 },
      { key: '2', mode: 'source', email: '', recipientSource: 0 },
    ];
    expect(validateRecipientRows(sources, '抄送人', new Set([0]))).toContain(
      '重复',
    );
  });

  it('builds recipient payload with type and exclusive email or source', () => {
    const payload = toRecipientInputs(
      [{ key: '1', mode: 'email', email: ' a@b.com ', recipientSource: null }],
      [{ key: '2', mode: 'source', email: '', recipientSource: 1 }],
    );
    expect(payload).toEqual([
      { recipientType: 0, email: 'a@b.com', recipientSource: null },
      { recipientType: 1, email: null, recipientSource: 1 },
    ]);
  });

  it('splits detail recipients into to and cc by sort order', () => {
    const split = splitRecipientRows([
      {
        id: 'a',
        recipientType: 0,
        email: 'a@b.com',
        recipientSource: null,
        sortId: 0,
      },
      {
        id: 'b',
        recipientType: 1,
        email: null,
        recipientSource: 10,
        sortId: 1,
      },
    ]);
    expect(split.toRows).toHaveLength(1);
    expect(split.toRows[0]?.mode).toBe('email');
    expect(split.ccRows[0]?.recipientSource).toBe(10);
  });
});
