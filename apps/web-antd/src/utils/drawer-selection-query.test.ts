import { computed, reactive } from 'vue';
import { describe, expect, it } from 'vitest';

import { createDrawerSelectionQuery } from './drawer-selection-query';

function setup() {
  const selected = reactive(new Set<string>());
  const amounts = new Map<string, number>();
  const query = createDrawerSelectionQuery<{ id: string; amount: number }>(
    (row) => row.id,
    () => {
      selected.clear();
      amounts.clear();
    },
  );
  const picked = computed(() =>
    query.rows.filter((row) => selected.has(row.id)),
  );
  return { query, selected, amounts, picked };
}

describe('抽屉选择查询范围与跨页数据', () => {
  it('首次查询后的首次筛选切换清理选择、金额和旧数据', () => {
    const { query, selected, amounts, picked } = setup();
    query.accept(query.begin({ settlementId: 'a' }), [
      { id: 'a1', amount: 10 },
    ]);
    selected.add('a1');
    amounts.set('a1', 8);
    query.accept(query.begin({ settlementId: 'b' }), [
      { id: 'b1', amount: 20 },
    ]);
    expect(selected.size).toBe(0);
    expect(amounts.size).toBe(0);
    expect(picked.value).toEqual([]);
    expect(query.rows.map((row) => row.id)).toEqual(['b1']);
  });

  it('跨页选择的数量、合计和提交数据一致，取消当前页不丢其他页', () => {
    const { query, selected, picked } = setup();
    query.accept(
      query.begin({ settlementId: 'a', PageIndex: 1, PageSize: 20 }),
      [{ id: '1', amount: 10 }],
    );
    selected.add('1');
    expect(picked.value.length).toBe(1);
    query.accept(
      query.begin({ settlementId: 'a', PageIndex: 2, PageSize: 20 }),
      [{ id: '2', amount: 20 }],
    );
    selected.add('2');
    expect(picked.value.map((row) => row.id)).toEqual(['1', '2']);
    expect(picked.value.reduce((sum, row) => sum + row.amount, 0)).toBe(30);
    selected.delete('2');
    expect(picked.value.map((row) => row.id)).toEqual(['1']);
  });

  it('小写分页参数和每页条数变化不清空，重复加载同一行不重复提交', () => {
    const { query, selected, picked } = setup();
    query.accept(query.begin({ pageIndex: 1, pageSize: 20 }), [
      { id: '1', amount: 10 },
    ]);
    selected.add('1');
    query.accept(query.begin({ pageIndex: 2, pageSize: 50 }), [
      { id: '1', amount: 12 },
    ]);
    expect(picked.value).toEqual([{ id: '1', amount: 12 }]);
  });

  it.each([
    'PaySide',
    'BizType',
    'FeeCodeIds',
    'ETDStart',
    'SaleIds',
    'SettlementStatus',
    'applicationNo',
  ])('%s 变化会清空旧选择', (key) => {
    const { query, selected } = setup();
    query.begin({ settlementId: 'a' });
    selected.add('1');
    query.begin({ settlementId: 'a', [key]: 'new' });
    expect(selected.size).toBe(0);
  });

  it('筛选查询乱序返回时只接受最新请求', () => {
    const { query } = setup();
    const old = query.begin({ settlementId: 'a' });
    const latest = query.begin({ settlementId: 'b' });
    expect(query.accept(latest, [{ id: 'b', amount: 20 }])).toBe(true);
    expect(query.accept(old, [{ id: 'a', amount: 10 }])).toBe(false);
    expect(query.rows.map((row) => row.id)).toEqual(['b']);
  });

  it('重置及重新打开使在途请求失效', () => {
    const { query, selected } = setup();
    const old = query.begin({ settlementId: 'a' });
    selected.add('1');
    query.reset();
    expect(query.accept(old, [{ id: '1', amount: 10 }])).toBe(false);
    expect(query.rows).toEqual([]);
    expect(selected.size).toBe(0);
  });

  it('缓存保留响应式行引用，翻页后仍取得用户修改的金额', () => {
    const { query, selected, picked } = setup();
    const row = reactive({ id: '1', amount: 10 });
    query.accept(query.begin({ pageIndex: 1 }), [row]);
    selected.add('1');
    row.amount = 8;
    query.accept(query.begin({ pageIndex: 2 }), [{ id: '2', amount: 20 }]);
    expect(picked.value[0]?.amount).toBe(8);
  });
});
