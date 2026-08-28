import { describe, expect, it } from 'vitest';

import { formatPayAppMblNums } from './format-pay-app-mbl-nums';

describe('formatPayAppMblNums', () => {
  it('空数组与缺字段返回空串', () => {
    expect(formatPayAppMblNums(undefined)).toBe('');
    expect(formatPayAppMblNums(null)).toBe('');
    expect(formatPayAppMblNums([])).toBe('');
    expect(formatPayAppMblNums([{ transportOrder: null }])).toBe('');
    expect(formatPayAppMblNums([{ transportOrder: { mblNum: '  ' } }])).toBe(
      '',
    );
  });

  it('多票提单号逗号拼接并保序去重', () => {
    expect(
      formatPayAppMblNums([
        { transportOrder: { mblNum: ' COSU1 ' } },
        { transportOrder: { mblNum: 'MSCU2' } },
        { transportOrder: { mblNum: 'COSU1' } },
        { transportOrder: { mblNum: '' } },
      ]),
    ).toBe('COSU1,MSCU2');
  });
});
