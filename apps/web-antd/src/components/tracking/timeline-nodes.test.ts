import { describe, expect, it, vi } from 'vitest';

vi.mock('#/locales', () => ({ $t: (key: string) => key }));

import { buildContainerTimelineGroups } from './timeline-nodes';

describe('海运按箱轨迹', () => {
  it('保留接口顺序、无时间节点、重复事件和早于实际节点的预计记录', () => {
    const status = [
      { eventCode: 'LOBD', eventTime: '2026/09/20 12:00:00', isEsti: 'N' },
      { eventCode: 'TMPS', isEsti: 'N' },
      { eventCode: 'LOBD', eventTime: '2026/09/01 12:00:00', isEsti: 'Y' },
      { eventCode: 'LOBD', eventTime: '2026/09/01 12:00:00', isEsti: 'Y' },
      { eventCode: 'OTHER' },
    ];
    const groups = buildContainerTimelineGroups({
      containers: [
        { containerNo: 'BOX-A', status },
        { containerNo: 'BOX-B', status: [status[0]!] },
        { containerNo: 'BOX-C', status: [] },
      ],
    });
    expect(groups.map((group) => group.nodes.length)).toEqual([5, 1, 0]);
    expect(groups[0]!.nodes.map((node) => node.title)).toEqual([
      'LOBD',
      'TMPS',
      'LOBD',
      'LOBD',
      'OTHER',
    ]);
    expect(groups[0]!.nodes.map((node) => node.state)).toEqual([
      'completed',
      'completed',
      'estimated',
      'estimated',
      'unknown',
    ]);
    expect(groups[0]!.nodes[1]!.time).toBeUndefined();
    expect(new Set(groups[0]!.nodes.map((node) => node.key)).size).toBe(5);
    expect(status[0]!.eventTime).toBe('2026/09/20 12:00:00');
  });
  it('无跟踪数据时返回空分组', () => {
    expect(buildContainerTimelineGroups(null)).toEqual([]);
  });
});
