import { describe, expect, it } from 'vitest';

import { formatPkgsSay, integerToBritishEn } from './separate-bill-pkgs-say';

describe('integerToBritishEn', () => {
  it('147 带 and 与连字符', () => {
    expect(integerToBritishEn(147)).toBe('one hundred and forty-seven');
  });

  it('整百没有 and', () => {
    expect(integerToBritishEn(100)).toBe('one hundred');
  });

  it('千以上最后一段小于 100 时加 and', () => {
    expect(integerToBritishEn(1001)).toBe('one thousand and one');
  });
});

describe('formatPkgsSay', () => {
  it('按提单样例拼接', () => {
    expect(formatPkgsSay(147, 'CARTONS')).toBe(
      'SAY:ONE HUNDRED AND FORTY-SEVEN CARTONS ONLY.',
    );
  });

  it('件数和包装都空时是 SAY: ONLY.', () => {
    expect(formatPkgsSay(undefined, undefined)).toBe('SAY: ONLY.');
    expect(formatPkgsSay(null, '  ')).toBe('SAY: ONLY.');
  });

  it('只有件数或只有包装时省略空段', () => {
    expect(formatPkgsSay(12, undefined)).toBe('SAY:TWELVE ONLY.');
    expect(formatPkgsSay(undefined, 'CARTONS')).toBe('SAY:CARTONS ONLY.');
  });

  it('包装名转大写', () => {
    expect(formatPkgsSay(1, 'carton')).toBe('SAY:ONE CARTON ONLY.');
  });
});
