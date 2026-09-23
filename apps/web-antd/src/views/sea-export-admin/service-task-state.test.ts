import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { describe, expect, it } from 'vitest';

import {
  getActiveServiceSortId,
  getServiceTaskActions,
} from './service-task-state';

type Service = SeaExportAdminApi.SeaExportServiceDto;
function service(sortId: number, status?: 0 | 1, users = [12]): Service {
  return {
    id: sortId,
    seaExportId: 'order',
    serviceType: sortId,
    sortId,
    seServiceTask:
      status === undefined
        ? null
        : {
            id: `task-${sortId}`,
            serviceTaskStatus: status,
            completionUserId: status === 1 ? 12 : null,
            seServiceTaskUsers: users.map((userId) => ({ userId })),
          },
  };
}

describe('列表服务任务流转与权限', () => {
  it('同组任务未全部完成时不允许跳到下一组', () => {
    const rows = [service(20, 0), service(10, 1), service(10, 0)];
    const active = getActiveServiceSortId(rows);
    expect(active).toBe(10);
    expect(getServiceTaskActions(rows[0]!, active, 12, true).canComplete).toBe(
      false,
    );
    expect(getServiceTaskActions(rows[2]!, active, 12, true).canComplete).toBe(
      true,
    );
    rows[2] = service(10, 1);
    expect(getActiveServiceSortId(rows)).toBe(20);
  });

  it('未生成任务不跳过；全部完成或空列表无当前节点', () => {
    expect(getActiveServiceSortId([service(10), service(20, 0)])).toBe(10);
    expect(getServiceTaskActions(service(10), 10, 12, true).canComplete).toBe(
      false,
    );
    expect(getActiveServiceSortId([service(10, 1)])).toBeNull();
    expect(getActiveServiceSortId([])).toBeNull();
  });

  it('仅有操作权限的处理人可完成，空处理人不放行，兼容字符串用户 ID', () => {
    expect(
      getServiceTaskActions(service(10, 0), 10, '12', true).canComplete,
    ).toBe(true);
    expect(
      getServiceTaskActions(service(10, 0), 10, 13, true).canComplete,
    ).toBe(false);
    expect(
      getServiceTaskActions(service(10, 0), 10, 12, false).canComplete,
    ).toBe(false);
    expect(
      getServiceTaskActions(service(10, 0, []), 10, 12, true).canComplete,
    ).toBe(false);
    expect(
      getServiceTaskActions(service(10, 0), 10, null, true).canComplete,
    ).toBe(false);
  });

  it('转交后的处理人列表为准；取消完成只开放给完成人', () => {
    expect(
      getServiceTaskActions(service(10, 0, [13]), 10, 12, true).canComplete,
    ).toBe(false);
    expect(
      getServiceTaskActions(service(10, 0, [13]), 10, 13, true).canComplete,
    ).toBe(true);
    expect(
      getServiceTaskActions(service(10, 1), null, 12, true).canCancel,
    ).toBe(true);
    expect(
      getServiceTaskActions(service(10, 1), null, 13, true).canCancel,
    ).toBe(false);
    expect(
      getServiceTaskActions(service(10, 1), null, 12, false).canCancel,
    ).toBe(false);
  });
});
