import { describe, expect, it } from 'vitest';

import { createSelectionScope } from './selection-scope';

describe('添加费用的筛选范围', () => {
  it('首次加载后第一次切换结算对象，移除旧对象缓存', () => {
    const selected = new Set<string>();
    const scope = createSelectionScope(() => selected.clear());
    scope.update({ PaySide: 1, SettlementId: undefined });
    selected.add('旧结算对象费用');
    scope.update({ PaySide: 1, SettlementId: '中创场站-id' });
    selected.add('中创场站-业务1');
    selected.add('中创场站-业务2');
    expect([...selected]).toEqual(['中创场站-业务1', '中创场站-业务2']);
  });

  it('翻页、改变每页条数和重复查询保留同一对象跨票选择', () => {
    const selected = new Set<string>();
    const scope = createSelectionScope(() => selected.clear());
    scope.update({ SettlementId: 'a', PageIndex: 1, PageSize: 20 });
    selected.add('业务1');
    scope.update({ PageIndex: 2, PageSize: 50, SettlementId: 'a' });
    selected.add('业务2');
    scope.update({ SettlementId: 'a', PageIndex: 2, PageSize: 50 });
    expect([...selected]).toEqual(['业务1', '业务2']);
  });

  it.each(['BizType', 'Keys', 'StatementNum', 'FeeCodeIds', 'ETDStart'])(
    '变化的 %s 筛选也清空隐藏选择',
    (field) => {
      const selected = new Set<string>();
      const scope = createSelectionScope(() => selected.clear());
      scope.update({ SettlementId: 'a' });
      selected.add('旧筛选费用');
      scope.update({ SettlementId: 'a', [field]: 'changed' });
      expect(selected.size).toBe(0);
    },
  );

  it('重新打开后以本次首次加载建立范围', () => {
    const selected = new Set<string>();
    const scope = createSelectionScope(() => selected.clear());
    scope.update({ SettlementId: 'a' });
    scope.reset();
    scope.update({ SettlementId: 'b' });
    selected.add('b的费用');
    scope.update({ SettlementId: 'c' });
    expect(selected.size).toBe(0);
  });
});
