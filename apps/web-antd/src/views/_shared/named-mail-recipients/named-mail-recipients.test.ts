import { describe, expect, it } from 'vitest';

import {
  mergeNamedRecipients,
  splitNamedRecipients,
  toNamedRecipientInputs,
  validateNamedRecipientLists,
} from './named-mail-recipients';

describe('具名收件人', () => {
  it('按类型加邮箱去重，名字保留第一次，收件和抄送互不占用', () => {
    const merged = mergeNamedRecipients([
      [
        { recipientType: 0, name: '张三', email: 'A@B.com' },
        { recipientType: 0, name: '后来的', email: 'a@b.com' },
        { recipientType: 1, name: '抄送', email: 'a@b.com' },
      ],
      [{ recipientType: 0, name: '李四', email: 'li@ex.com' }],
    ]);
    expect(merged).toEqual([
      { recipientType: 0, name: '张三', email: 'A@B.com' },
      { recipientType: 1, name: '抄送', email: 'a@b.com' },
      { recipientType: 0, name: '李四', email: 'li@ex.com' },
    ]);
  });

  it('同一列表内重复邮箱不通过，两边可以是同一个邮箱', () => {
    expect(
      validateNamedRecipientLists(
        [
          { name: '', email: 'a@b.com' },
          { name: '', email: 'A@b.com' },
        ],
        [],
      ),
    ).toContain('重复');
    expect(
      validateNamedRecipientLists(
        [{ name: '张三', email: 'a@b.com' }],
        [{ name: '', email: 'a@b.com' }],
      ),
    ).toBe('');
    expect(
      validateNamedRecipientLists([{ name: '', email: '张三 <a@b.com>' }], []),
    ).toContain('格式不正确');
  });

  it('提交时名字为空写成 null，并带上收件类型', () => {
    expect(
      toNamedRecipientInputs(
        [{ name: '  ', email: ' a@b.com ' }],
        [{ name: '抄送', email: 'c@d.com' }],
      ),
    ).toEqual([
      { recipientType: 0, name: null, email: 'a@b.com' },
      { recipientType: 1, name: '抄送', email: 'c@d.com' },
    ]);
    expect(
      splitNamedRecipients([
        { recipientType: 1, name: '抄送', email: 'c@d.com' },
        { recipientType: 0, name: null, email: 'a@b.com' },
      ]),
    ).toEqual({
      to: [{ name: '', email: 'a@b.com' }],
      cc: [{ name: '抄送', email: 'c@d.com' }],
    });
  });
});
