import { describe, expect, it } from 'vitest';

import {
  pickerIndex,
  pickerLabel,
  pickerNames,
  pickerSelectedId,
} from './named-picker';

const options = [
  { id: '1', name: '上海' },
  { id: '2', name: '宁波' },
];

describe('named-picker', () => {
  it('第 0 项是请选择，选中项下标加一', () => {
    expect(pickerNames(options)).toEqual(['请选择', '上海', '宁波']);
    expect(pickerIndex(options, '')).toBe(0);
    expect(pickerIndex(options, '2')).toBe(2);
  });

  it('从 picker 下标还原 id', () => {
    expect(pickerSelectedId(options, 0)).toBe('');
    expect(pickerSelectedId(options, 1)).toBe('1');
    expect(pickerLabel(options, '2')).toBe('宁波');
    expect(pickerLabel(options, '')).toBe('请选择');
  });
});
