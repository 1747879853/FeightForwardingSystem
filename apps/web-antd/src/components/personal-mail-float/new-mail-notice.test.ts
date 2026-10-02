import { describe, expect, it } from 'vitest';

import {
  formatNewMailNoticeLines,
  normalizeReceivedMails,
} from './new-mail-notice';

describe('formatNewMailNoticeLines', () => {
  it('用发件人名称和主题', () => {
    expect(
      formatNewMailNoticeLines({
        mails: [
          {
            from: { address: 'a@b.com', name: '张三' },
            subject: '订舱确认',
            uid: 1,
          },
        ],
        newCount: 1,
      }),
    ).toEqual(['张三：订舱确认']);
  });

  it('没有名称时用邮箱地址，没有主题时用占位', () => {
    expect(
      formatNewMailNoticeLines({
        mails: [
          { from: { address: 'a@b.com', name: '  ' }, subject: '', uid: 2 },
        ],
        newCount: 1,
      }),
    ).toEqual(['a@b.com：(无主题)']);
  });

  it('超过 5 封时补总数', () => {
    const mails = Array.from({ length: 5 }, (_, index) => ({
      from: { name: `人${index}` },
      subject: `主题${index}`,
      uid: index + 1,
    }));
    const lines = formatNewMailNoticeLines({ mails, newCount: 7 });
    expect(lines).toHaveLength(6);
    expect(lines[5]).toBe('等 7 封新邮件');
  });

  it('没有摘要时仍提示封数', () => {
    expect(formatNewMailNoticeLines({ mails: [], newCount: 2 })).toEqual([
      '2 封新邮件',
    ]);
  });
});

describe('normalizeReceivedMails', () => {
  it('补上推送里的文件夹，并丢掉无效序号', () => {
    expect(
      normalizeReceivedMails({
        folderName: 'INBOX',
        mails: [
          { folderName: '', subject: 'a', uid: 8 },
          { subject: 'b', uid: Number.NaN },
        ],
      }).map((item) => ({ folderName: item.folderName, uid: item.uid })),
    ).toEqual([{ folderName: 'INBOX', uid: 8 }]);
  });
});
