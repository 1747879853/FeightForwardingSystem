import { describe, expect, it, vi } from 'vitest';
import { useListGrouping } from '../../components/list-grouping/use-list-grouping';
import { billGroupFields } from './grouping';

describe('提单复用通用分组', () => {
  it('空分组、字符串 ID、全部与搜索变化遵循通用查询约定', () => {
    const fetchGroups = vi.fn(async () => []);
    const grouping = useListGrouping({
      fields: billGroupFields,
      fetchGroups,
      getGridApi: () => ({ query: vi.fn() }),
    });
    for (const [field, key] of [
      [4, 'CarrierId'],
      [9, 'CodeIssueTypeId'],
    ] as const) {
      grouping.enableField(field);
      grouping.decorateListParams({ Status: 1 });
      const calls = fetchGroups.mock.calls.length;
      grouping.selectItem(null);
      expect(grouping.decorateListParams({ Status: 1 })).toEqual({
        Status: 1,
        [`${key}Empty`]: true,
      });
      grouping.selectItem('181755750091286530');
      expect(grouping.decorateListParams({ Status: 1 })).toEqual({
        Status: 1,
        [key]: '181755750091286530',
      });
      expect(fetchGroups).toHaveBeenCalledTimes(calls);
      expect(grouping.decorateListParams({ Status: 4 })).toEqual({ Status: 4 });
      expect(grouping.selectedItemId.value).toBeUndefined();
      expect(fetchGroups).toHaveBeenCalledTimes(calls + 1);
      grouping.selectItem(undefined);
      expect(grouping.decorateListParams({ Status: 4 })).toEqual({ Status: 4 });
    }
    grouping.disable();
    expect(grouping.decorateListParams({ ClientId: 'client' })).toEqual({
      ClientId: 'client',
    });
  });
});
