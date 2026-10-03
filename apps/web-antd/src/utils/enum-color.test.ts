import { describe, expect, it } from 'vitest';

import {
  darkenHex,
  getContrastColor,
  hexToRgba,
  parseHexColor,
  toConfiguredPendingColors,
  toConfiguredStatusColors,
} from './enum-color';

describe('parseHexColor', () => {
  it('接受 #RGB / #RRGGBB，忽略非法值', () => {
    expect(parseHexColor('#0af')).toBe('#00aaff');
    expect(parseHexColor('#1677FF')).toBe('#1677ff');
    expect(parseHexColor('red')).toBeUndefined();
    expect(parseHexColor('')).toBeUndefined();
  });
});

describe('configured status colors', () => {
  it('深色配置用实色底、对比文字', () => {
    expect(getContrastColor('#1677ff')).toBe('#ffffff');
    expect(toConfiguredStatusColors('#1677ff')).toEqual({
      color: '#ffffff',
      background: '#1677ff',
    });
    expect(toConfiguredPendingColors('#1677ff')).toEqual({
      color: getContrastColor(darkenHex('#1677ff', 0.18)),
      background: darkenHex('#1677ff', 0.18),
    });
  });

  it('浅色配置用黑字，和枚举预览一致', () => {
    expect(toConfiguredStatusColors('#c6d129')).toEqual({
      color: '#000000',
      background: '#c6d129',
    });
    expect(hexToRgba('#c6d129', 0.32)).toBe('rgba(198, 209, 41, 0.32)');
  });
});
