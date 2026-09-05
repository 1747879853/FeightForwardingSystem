import { describe, expect, it } from 'vitest';

import { applyRecognizedCtnNo, pickCtnNoFromUpload } from './recognized-ctn-no';

describe('applyRecognizedCtnNo', () => {
  it('空值和字面 null 视为未识别', () => {
    expect(applyRecognizedCtnNo(null)).toBeNull();
    expect(applyRecognizedCtnNo('')).toBeNull();
    expect(applyRecognizedCtnNo('null')).toBeNull();
  });

  it('去掉首尾空格并截到 32 位', () => {
    expect(applyRecognizedCtnNo(' CBHU1234567 ')).toBe('CBHU1234567');
    expect(applyRecognizedCtnNo('A'.repeat(40))).toHaveLength(32);
  });
});

describe('pickCtnNoFromUpload', () => {
  it('优先读 camelCase，兼容 PascalCase', () => {
    expect(pickCtnNoFromUpload({ ctnNo: 'CBHU1234567' })).toBe('CBHU1234567');
    expect(pickCtnNoFromUpload({ CtnNo: 'MSCU1234567' })).toBe('MSCU1234567');
    expect(pickCtnNoFromUpload({ ctnNo: null })).toBeNull();
  });
});
